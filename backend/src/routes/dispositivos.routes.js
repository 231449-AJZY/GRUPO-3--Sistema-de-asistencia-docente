const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');

const DEVICE_STATES = new Set([
  'PENDIENTE',
  'AUTORIZADO',
  'SUSPENDIDO',
  'RECHAZADO',
  'REVOCADO',
]);

const ACTIVE_DEVICE_STATES = [
  'PENDIENTE',
  'AUTORIZADO',
  'SUSPENDIDO',
];

const TRANSITIONS = {
  aprobar: {
    allowed: new Set(['PENDIENTE']),
    target: 'AUTORIZADO',
    action: 'APROBAR_DISPOSITIVO_MOVIL',
    event: 'DISPOSITIVO_APROBADO',
  },
  rechazar: {
    allowed: new Set(['PENDIENTE']),
    target: 'RECHAZADO',
    action: 'RECHAZAR_DISPOSITIVO_MOVIL',
    event: 'DISPOSITIVO_RECHAZADO',
  },
  suspender: {
    allowed: new Set(['AUTORIZADO']),
    target: 'SUSPENDIDO',
    action: 'SUSPENDER_DISPOSITIVO_MOVIL',
    event: 'DISPOSITIVO_SUSPENDIDO',
  },
  reactivar: {
    allowed: new Set(['SUSPENDIDO']),
    target: 'AUTORIZADO',
    action: 'REACTIVAR_DISPOSITIVO_MOVIL',
    event: 'DISPOSITIVO_REACTIVADO',
  },
  revocar: {
    allowed: new Set([
      'PENDIENTE',
      'AUTORIZADO',
      'SUSPENDIDO',
      'RECHAZADO',
    ]),
    target: 'REVOCADO',
    action: 'REVOCAR_DISPOSITIVO_MOVIL',
    event: 'DISPOSITIVO_REVOCADO',
  },
};

const LINK_EXPIRATION_MINUTES = 5;
const QUICK_VALIDATION_WINDOW_MS = 60_000;
const QUICK_VALIDATION_MAX_ATTEMPTS = 12;
const quickValidationAttempts = new Map();

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanUpperText(value, maxLength = 255) {
  return cleanText(value, maxLength).toUpperCase();
}

function cleanBase64(value, maxLength = 8192) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .slice(0, maxLength);
}

function normalizeDeviceState(value) {
  const state = cleanUpperText(value, 30);

  if (!DEVICE_STATES.has(state)) {
    return null;
  }

  return state;
}

function hashToken(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('hex');
}

function generateLinkToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function normalizeFingerprint(value) {
  const fingerprint = cleanText(value, 64).toLowerCase();
  return /^[a-f0-9]{64}$/.test(fingerprint) ? fingerprint : null;
}

function isValidPublicKey(value) {
  if (value.length < 100 || value.length > 8192) {
    return false;
  }

  return /^[A-Za-z0-9+/=]+$/.test(value);
}

function clientIp(req) {
  return cleanText(req.ip || req.socket?.remoteAddress || '', 100);
}

async function writeAudit(
  client,
  req,
  action,
  table,
  recordId,
  detail = {}
) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5::jsonb,
       NULLIF($6, '')::inet
     )`,
    [
      req.user?.usuario_id ?? null,
      action,
      table,
      recordId ?? null,
      JSON.stringify(detail),
      clientIp(req),
    ]
  );
}

async function writeMobileEvent(
  client,
  req,
  {
    deviceId = null,
    usuarioId = null,
    docenteId = null,
    type,
    result = 'EXITO',
    detail = {},
  }
) {
  await client.query(
    `INSERT INTO eventos_seguridad_movil (
       dispositivo_id,
       usuario_id,
       docente_id,
       actor_usuario_id,
       tipo,
       resultado,
       detalle,
       ip_origen
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7::jsonb,
       NULLIF($8, '')::inet
     )`,
    [
      deviceId,
      usuarioId,
      docenteId,
      req.user?.usuario_id ?? null,
      type,
      result,
      JSON.stringify(detail),
      clientIp(req),
    ]
  );
}

const DEVICE_SELECT = `
  SELECT
    dm.id,
    dm.uuid_instalacion,
    dm.usuario_id,
    dm.docente_id,
    dm.fabricante,
    dm.modelo,
    dm.plataforma,
    dm.version_sistema,
    dm.sdk_int,
    dm.version_aplicacion,
    dm.huella_clave,
    dm.algoritmo_clave,
    dm.huella_clave_asistencia,
    dm.algoritmo_clave_asistencia,
    dm.clave_asistencia_registrada_en,
    dm.biometria_disponible,
    dm.tipos_biometria,
    dm.estado,
    dm.motivo_estado,
    dm.autorizado_en,
    dm.rechazado_en,
    dm.suspendido_en,
    dm.revocado_en,
    dm.ultimo_acceso,
    dm.creado_en,
    dm.actualizado_en,
    u.codigo AS codigo_docente,
    u.nombres,
    u.apellidos,
    u.email,
    u.activo AS usuario_activo,
    dep.nombre AS departamento,
    administrador.nombres || ' ' || administrador.apellidos AS autorizado_por_nombre
  FROM dispositivos_moviles dm
  JOIN usuarios u
    ON u.id = dm.usuario_id
  JOIN docentes d
    ON d.id = dm.docente_id
  LEFT JOIN departamentos_academicos dep
    ON dep.id = d.departamento_id
  LEFT JOIN usuarios administrador
    ON administrador.id = dm.autorizado_por
`;

async function getDeviceById(client, deviceId, { forUpdate = false } = {}) {
  const result = await client.query(
    `${DEVICE_SELECT}
     WHERE dm.id = $1
     ${forUpdate ? 'FOR UPDATE OF dm' : ''}`,
    [deviceId]
  );

  return result.rows[0] ?? null;
}

function validateDevicePayload(body) {
  const errors = {};

  const token = cleanText(body.token, 300);
  const installationId = cleanText(
    body.uuid_instalacion ?? body.installationId,
    120
  );
  const publicKey = cleanBase64(
    body.clave_publica ?? body.publicKey
  );
  const fingerprint = normalizeFingerprint(
    body.huella_clave ?? body.keyFingerprint
  );
  const manufacturer = cleanText(
    body.fabricante ?? body.manufacturer,
    80
  );
  const model = cleanText(body.modelo ?? body.model, 120);
  const platform = cleanUpperText(
    body.plataforma ?? body.platform ?? 'ANDROID',
    30
  );
  const systemVersion = cleanText(
    body.version_sistema ?? body.systemVersion,
    80
  );
  const sdkInt = toPositiveInteger(
    body.sdk_int ?? body.sdkInt
  );
  const appVersion = cleanText(
    body.version_aplicacion ?? body.appVersion,
    40
  );
  const biometricAvailable =
    body.biometria_disponible === true ||
    body.biometricAvailable === true;
  const biometricTypes = Array.isArray(
    body.tipos_biometria ?? body.biometricTypes
  )
    ? (body.tipos_biometria ?? body.biometricTypes)
        .map((item) => cleanUpperText(item, 30))
        .filter(Boolean)
        .slice(0, 10)
        .join(',')
    : cleanUpperText(
        body.tipos_biometria ?? body.biometricTypes,
        200
      );

  if (!token || token.length < 20) {
    errors.token = 'El código QR es inválido o está incompleto.';
  }

  if (
    !installationId ||
    !/^[A-Za-z0-9._:-]{16,120}$/.test(installationId)
  ) {
    errors.installationId =
      'No se pudo identificar de forma segura esta instalación.';
  }

  if (!isValidPublicKey(publicKey)) {
    errors.publicKey =
      'La clave pública del dispositivo no tiene un formato válido.';
  }

  if (!fingerprint) {
    errors.keyFingerprint =
      'La huella criptográfica de la clave no es válida.';
  }

  if (!manufacturer) {
    errors.manufacturer =
      'No se pudo identificar el fabricante del celular.';
  }

  if (!model) {
    errors.model = 'No se pudo identificar el modelo del celular.';
  }

  if (platform !== 'ANDROID') {
    errors.platform =
      'En esta etapa únicamente se admite la aplicación Android.';
  }

  if (!systemVersion) {
    errors.systemVersion =
      'No se pudo identificar la versión de Android.';
  }

  if (!sdkInt) {
    errors.sdkInt =
      'No se pudo identificar el nivel de Android.';
  }

  if (!appVersion) {
    errors.appVersion =
      'No se pudo identificar la versión de la aplicación.';
  }

  if (!biometricAvailable) {
    errors.biometricAvailable =
      'El dispositivo debe tener biometría configurada.';
  }

  return {
    errors,
    values: {
      token,
      installationId,
      publicKey,
      fingerprint,
      manufacturer,
      model,
      platform,
      systemVersion,
      sdkInt,
      appVersion,
      biometricAvailable,
      biometricTypes,
    },
  };
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function consumeQuickValidationAttempt(req) {
  const now = Date.now();
  const key = clientIp(req) || 'unknown';
  const current = quickValidationAttempts.get(key);

  if (
    !current ||
    now - current.startedAt >= QUICK_VALIDATION_WINDOW_MS
  ) {
    quickValidationAttempts.set(key, {
      startedAt: now,
      attempts: 1,
    });
    return true;
  }

  if (current.attempts >= QUICK_VALIDATION_MAX_ATTEMPTS) {
    return false;
  }

  current.attempts += 1;
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - QUICK_VALIDATION_WINDOW_MS * 2;

  for (const [key, value] of quickValidationAttempts.entries()) {
    if (value.startedAt < cutoff) {
      quickValidationAttempts.delete(key);
    }
  }
}, QUICK_VALIDATION_WINDOW_MS).unref();

// GET /api/dispositivos
router.get(
  '/',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    try {
      await pool.query(
        `UPDATE solicitudes_vinculacion_dispositivo
         SET estado = 'EXPIRADA'
         WHERE estado = 'VIGENTE'
           AND expira_en <= CURRENT_TIMESTAMP`
      );

      const search = cleanText(req.query.search, 120);
      const state = req.query.estado
        ? normalizeDeviceState(req.query.estado)
        : null;

      if (req.query.estado && !state) {
        return res.status(400).json({
          error: 'El estado solicitado no es válido.',
        });
      }

      const parameters = [];
      const filters = [];

      if (search) {
        parameters.push(`%${search}%`);
        const index = parameters.length;
        filters.push(
          `(u.codigo ILIKE $${index}
            OR u.nombres ILIKE $${index}
            OR u.apellidos ILIKE $${index}
            OR dm.fabricante ILIKE $${index}
            OR dm.modelo ILIKE $${index}
            OR dm.uuid_instalacion ILIKE $${index})`
        );
      }

      if (state) {
        parameters.push(state);
        filters.push(`dm.estado = $${parameters.length}`);
      }

      const where =
        filters.length > 0
          ? `WHERE ${filters.join(' AND ')}`
          : '';

      const [
        devicesResult,
        requestsResult,
        teachersResult,
        summaryResult,
        eventsResult,
      ] = await Promise.all([
        pool.query(
          `${DEVICE_SELECT}
           ${where}
           ORDER BY
             CASE dm.estado
               WHEN 'PENDIENTE' THEN 1
               WHEN 'AUTORIZADO' THEN 2
               WHEN 'SUSPENDIDO' THEN 3
               WHEN 'RECHAZADO' THEN 4
               ELSE 5
             END,
             dm.actualizado_en DESC`,
          parameters
        ),
        pool.query(
          `SELECT
             sv.id,
             sv.docente_id,
             sv.usuario_id,
             sv.estado,
             sv.expira_en,
             sv.utilizado_en,
             sv.cancelado_en,
             sv.creado_en,
             u.codigo AS codigo_docente,
             u.nombres,
             u.apellidos,
             creador.nombres || ' ' || creador.apellidos AS creado_por_nombre
           FROM solicitudes_vinculacion_dispositivo sv
           JOIN usuarios u
             ON u.id = sv.usuario_id
           LEFT JOIN usuarios creador
             ON creador.id = sv.creado_por
           ORDER BY sv.creado_en DESC
           LIMIT 50`
        ),
        pool.query(
          `SELECT
             d.id AS docente_id,
             u.id AS usuario_id,
             u.codigo,
             u.nombres,
             u.apellidos,
             u.email,
             dep.nombre AS departamento,
             dm.id AS dispositivo_id,
             dm.estado AS dispositivo_estado
           FROM docentes d
           JOIN usuarios u
             ON u.id = d.usuario_id
           LEFT JOIN departamentos_academicos dep
             ON dep.id = d.departamento_id
           LEFT JOIN LATERAL (
             SELECT id, estado
             FROM dispositivos_moviles
             WHERE docente_id = d.id
               AND estado = ANY($1::varchar[])
             ORDER BY actualizado_en DESC
             LIMIT 1
           ) dm ON TRUE
           WHERE u.activo = TRUE
           ORDER BY u.apellidos, u.nombres`,
          [ACTIVE_DEVICE_STATES]
        ),
        pool.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE estado = 'PENDIENTE'
             )::int AS pendientes,
             COUNT(*) FILTER (
               WHERE estado = 'AUTORIZADO'
             )::int AS autorizados,
             COUNT(*) FILTER (
               WHERE estado = 'SUSPENDIDO'
             )::int AS suspendidos,
             COUNT(*) FILTER (
               WHERE estado = 'RECHAZADO'
             )::int AS rechazados,
             COUNT(*) FILTER (
               WHERE estado = 'REVOCADO'
             )::int AS revocados
           FROM dispositivos_moviles`
        ),
        pool.query(
          `SELECT
             esm.id,
             esm.tipo,
             esm.resultado,
             esm.detalle,
             esm.creado_en,
             esm.dispositivo_id,
             COALESCE(
               actor.nombres || ' ' || actor.apellidos,
               'Sistema'
             ) AS actor,
             COALESCE(
               docente_usuario.nombres || ' ' || docente_usuario.apellidos,
               ''
             ) AS docente
           FROM eventos_seguridad_movil esm
           LEFT JOIN usuarios actor
             ON actor.id = esm.actor_usuario_id
           LEFT JOIN docentes d
             ON d.id = esm.docente_id
           LEFT JOIN usuarios docente_usuario
             ON docente_usuario.id = d.usuario_id
           ORDER BY esm.creado_en DESC
           LIMIT 30`
        ),
      ]);

      return res.json({
        dispositivos: devicesResult.rows,
        solicitudes: requestsResult.rows,
        docentes: teachersResult.rows,
        resumen: summaryResult.rows[0] ?? {
          total: 0,
          pendientes: 0,
          autorizados: 0,
          suspendidos: 0,
          rechazados: 0,
          revocados: 0,
        },
        eventos: eventsResult.rows,
      });
    } catch (error) {
      console.error(
        'Error al listar dispositivos móviles:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo cargar la información de dispositivos móviles.',
      });
    }
  }
);

// POST /api/dispositivos/vinculaciones
router.post(
  '/vinculaciones',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const teacherId = toPositiveInteger(
      req.body.docente_id ?? req.body.docenteId
    );

    if (!teacherId) {
      return res.status(400).json({
        error: 'Seleccione un docente válido.',
        fields: {
          docenteId: 'Seleccione un docente válido.',
        },
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const teacherResult = await client.query(
        `SELECT
           d.id AS docente_id,
           u.id AS usuario_id,
           u.codigo,
           u.nombres,
           u.apellidos,
           u.activo
         FROM docentes d
         JOIN usuarios u
           ON u.id = d.usuario_id
         WHERE d.id = $1
         FOR UPDATE OF d, u`,
        [teacherId]
      );

      const teacher = teacherResult.rows[0];

      if (!teacher) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El docente seleccionado no existe.',
        });
      }

      if (!teacher.activo) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'No se puede vincular un dispositivo a un docente inactivo.',
        });
      }

      const activeDeviceResult = await client.query(
        `SELECT id, estado, fabricante, modelo
         FROM dispositivos_moviles
         WHERE docente_id = $1
           AND estado = ANY($2::varchar[])
         LIMIT 1`,
        [teacherId, ACTIVE_DEVICE_STATES]
      );

      if (activeDeviceResult.rows.length > 0) {
        const device = activeDeviceResult.rows[0];
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            `El docente ya tiene un dispositivo ${String(
              device.estado
            ).toLowerCase()}: ${device.fabricante} ${device.modelo}.`,
        });
      }

      await client.query(
        `UPDATE solicitudes_vinculacion_dispositivo
         SET
           estado = 'CANCELADA',
           cancelado_en = CURRENT_TIMESTAMP
         WHERE docente_id = $1
           AND estado = 'VIGENTE'`,
        [teacherId]
      );

      const token = generateLinkToken();
      const tokenHash = hashToken(token);

      const requestResult = await client.query(
        `INSERT INTO solicitudes_vinculacion_dispositivo (
           token_hash,
           docente_id,
           usuario_id,
           creado_por,
           estado,
           expira_en
         )
         VALUES (
           $1,
           $2,
           $3,
           $4,
           'VIGENTE',
           CURRENT_TIMESTAMP
             + ($5 || ' minutes')::interval
         )
         RETURNING
           id,
           docente_id,
           usuario_id,
           estado,
           expira_en,
           creado_en`,
        [
          tokenHash,
          teacher.docente_id,
          teacher.usuario_id,
          req.user.usuario_id,
          LINK_EXPIRATION_MINUTES,
        ]
      );

      const requestRecord = requestResult.rows[0];

      await writeAudit(
        client,
        req,
        'GENERAR_QR_VINCULACION_MOVIL',
        'solicitudes_vinculacion_dispositivo',
        requestRecord.id,
        {
          docenteId: teacher.docente_id,
          codigo: teacher.codigo,
          expiraEn: requestRecord.expira_en,
        }
      );

      await writeMobileEvent(client, req, {
        usuarioId: teacher.usuario_id,
        docenteId: teacher.docente_id,
        type: 'QR_VINCULACION_GENERADO',
        detail: {
          solicitudId: requestRecord.id,
          expiraEn: requestRecord.expira_en,
        },
      });

      await client.query('COMMIT');

      const qrPayload = JSON.stringify({
        version: 1,
        type: 'UNSAAC_DEVICE_LINK',
        token,
        expiresAt: requestRecord.expira_en,
        teacherCode: teacher.codigo,
      });

      const qrImage = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 360,
        color: {
          dark: '#172033',
          light: '#FFFFFFFF',
        },
      });

      return res.status(201).json({
        solicitud: {
          ...requestRecord,
          codigo_docente: teacher.codigo,
          nombres: teacher.nombres,
          apellidos: teacher.apellidos,
          qr_payload: qrPayload,
          qr_image: qrImage,
          vigencia_minutos: LINK_EXPIRATION_MINUTES,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error(
        'Error al generar QR de vinculación:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo generar el código de vinculación.',
      });
    } finally {
      client.release();
    }
  }
);

// PATCH /api/dispositivos/vinculaciones/:id/cancelar
router.patch(
  '/vinculaciones/:id/cancelar',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const requestId = toPositiveInteger(req.params.id);

    if (!requestId) {
      return res.status(400).json({
        error: 'La solicitud indicada no es válida.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE solicitudes_vinculacion_dispositivo
         SET
           estado = 'CANCELADA',
           cancelado_en = CURRENT_TIMESTAMP
         WHERE id = $1
           AND estado = 'VIGENTE'
         RETURNING id, docente_id, usuario_id`,
        [requestId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'La solicitud ya fue utilizada, cancelada o venció.',
        });
      }

      const record = result.rows[0];

      await writeAudit(
        client,
        req,
        'CANCELAR_QR_VINCULACION_MOVIL',
        'solicitudes_vinculacion_dispositivo',
        requestId,
        {}
      );

      await writeMobileEvent(client, req, {
        usuarioId: record.usuario_id,
        docenteId: record.docente_id,
        type: 'QR_VINCULACION_CANCELADO',
        detail: {
          solicitudId: requestId,
        },
      });

      await client.query('COMMIT');

      return res.json({
        mensaje: 'La solicitud de vinculación fue cancelada.',
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error(
        'Error al cancelar solicitud de vinculación:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo cancelar la solicitud de vinculación.',
      });
    } finally {
      client.release();
    }
  }
);

// POST /api/dispositivos/vinculaciones/solicitar
router.post(
  '/vinculaciones/solicitar',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error:
          'La cuenta no tiene un perfil docente asociado.',
      });
    }

    const validation = validateDevicePayload(req.body);

    if (hasErrors(validation.errors)) {
      return res.status(400).json({
        error:
          'Revise la información enviada por la aplicación móvil.',
        fields: validation.errors,
      });
    }

    const {
      token,
      installationId,
      publicKey,
      fingerprint,
      manufacturer,
      model,
      platform,
      systemVersion,
      sdkInt,
      appVersion,
      biometricAvailable,
      biometricTypes,
    } = validation.values;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `SELECT
           id,
           docente_id,
           usuario_id,
           estado,
           expira_en
         FROM solicitudes_vinculacion_dispositivo
         WHERE token_hash = $1
         FOR UPDATE`,
        [hashToken(token)]
      );

      const linkRequest = requestResult.rows[0];

      if (!linkRequest) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error:
            'El código QR no existe o ya no es reconocido.',
        });
      }

      if (linkRequest.estado !== 'VIGENTE') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'El código QR ya fue utilizado, cancelado o venció.',
        });
      }

      if (
        new Date(linkRequest.expira_en).getTime() <= Date.now()
      ) {
        await client.query(
          `UPDATE solicitudes_vinculacion_dispositivo
           SET estado = 'EXPIRADA'
           WHERE id = $1`,
          [linkRequest.id]
        );
        await client.query('COMMIT');
        return res.status(410).json({
          error:
            'El código QR venció. Solicite uno nuevo al administrador.',
        });
      }

      if (
        Number(linkRequest.docente_id) !==
          Number(req.user.docente_id) ||
        Number(linkRequest.usuario_id) !==
          Number(req.user.usuario_id)
      ) {
        await writeMobileEvent(client, req, {
          usuarioId: req.user.usuario_id,
          docenteId: req.user.docente_id,
          type: 'VINCULACION_DOCENTE_NO_COINCIDE',
          result: 'BLOQUEADO',
          detail: {
            solicitudId: linkRequest.id,
          },
        });
        await client.query('COMMIT');
        return res.status(403).json({
          error:
            'El código QR fue generado para otro docente.',
        });
      }

      const conflictingDeviceResult = await client.query(
        `SELECT id, uuid_instalacion, estado, fabricante, modelo
         FROM dispositivos_moviles
         WHERE docente_id = $1
           AND estado = ANY($2::varchar[])
           AND uuid_instalacion <> $3
         LIMIT 1
         FOR UPDATE`,
        [
          req.user.docente_id,
          ACTIVE_DEVICE_STATES,
          installationId,
        ]
      );

      if (conflictingDeviceResult.rows.length > 0) {
        const existing = conflictingDeviceResult.rows[0];
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            `El docente ya tiene otro dispositivo ${String(
              existing.estado
            ).toLowerCase()}: ${existing.fabricante} ${existing.modelo}.`,
        });
      }

      const sameInstallationResult = await client.query(
        `SELECT id, docente_id, usuario_id
         FROM dispositivos_moviles
         WHERE uuid_instalacion = $1
         FOR UPDATE`,
        [installationId]
      );

      const sameInstallation =
        sameInstallationResult.rows[0] ?? null;

      if (
        sameInstallation &&
        Number(sameInstallation.docente_id) !==
          Number(req.user.docente_id)
      ) {
        await writeMobileEvent(client, req, {
          deviceId: sameInstallation.id,
          usuarioId: req.user.usuario_id,
          docenteId: req.user.docente_id,
          type: 'DISPOSITIVO_ASOCIADO_A_OTRO_DOCENTE',
          result: 'BLOQUEADO',
          detail: {
            solicitudId: linkRequest.id,
          },
        });
        await client.query('COMMIT');
        return res.status(409).json({
          error:
            'Este celular ya está asociado a otra cuenta docente.',
        });
      }

      const fingerprintConflictResult = await client.query(
        `SELECT id, docente_id
         FROM dispositivos_moviles
         WHERE huella_clave = $1
           AND uuid_instalacion <> $2
         LIMIT 1`,
        [fingerprint, installationId]
      );

      if (fingerprintConflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'La clave criptográfica ya pertenece a otro dispositivo registrado.',
        });
      }

      let deviceResult;

      if (sameInstallation) {
        deviceResult = await client.query(
          `UPDATE dispositivos_moviles
           SET
             usuario_id = $1,
             docente_id = $2,
             fabricante = $3,
             modelo = $4,
             plataforma = $5,
             version_sistema = $6,
             sdk_int = $7,
             version_aplicacion = $8,
             clave_publica = $9,
             huella_clave = $10,
             algoritmo_clave = 'EC_P256_SHA256',
             biometria_disponible = $11,
             tipos_biometria = $12,
             estado = 'PENDIENTE',
             solicitud_id = $13,
             motivo_estado = NULL,
             autorizado_por = NULL,
             autorizado_en = NULL,
             rechazado_por = NULL,
             rechazado_en = NULL,
             suspendido_por = NULL,
             suspendido_en = NULL,
             revocado_por = NULL,
             revocado_en = NULL,
             actualizado_en = CURRENT_TIMESTAMP
           WHERE id = $14
           RETURNING id`,
          [
            req.user.usuario_id,
            req.user.docente_id,
            manufacturer,
            model,
            platform,
            systemVersion,
            sdkInt,
            appVersion,
            publicKey,
            fingerprint,
            biometricAvailable,
            biometricTypes,
            linkRequest.id,
            sameInstallation.id,
          ]
        );
      } else {
        deviceResult = await client.query(
          `INSERT INTO dispositivos_moviles (
             uuid_instalacion,
             usuario_id,
             docente_id,
             fabricante,
             modelo,
             plataforma,
             version_sistema,
             sdk_int,
             version_aplicacion,
             clave_publica,
             huella_clave,
             algoritmo_clave,
             biometria_disponible,
             tipos_biometria,
             estado,
             solicitud_id
           )
           VALUES (
             $1,
             $2,
             $3,
             $4,
             $5,
             $6,
             $7,
             $8,
             $9,
             $10,
             $11,
             'EC_P256_SHA256',
             $12,
             $13,
             'PENDIENTE',
             $14
           )
           RETURNING id`,
          [
            installationId,
            req.user.usuario_id,
            req.user.docente_id,
            manufacturer,
            model,
            platform,
            systemVersion,
            sdkInt,
            appVersion,
            publicKey,
            fingerprint,
            biometricAvailable,
            biometricTypes,
            linkRequest.id,
          ]
        );
      }

      const deviceId = Number(deviceResult.rows[0].id);

      await client.query(
        `UPDATE solicitudes_vinculacion_dispositivo
         SET
           estado = 'UTILIZADA',
           utilizado_en = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [linkRequest.id]
      );

      await writeAudit(
        client,
        req,
        'SOLICITAR_VINCULACION_MOVIL',
        'dispositivos_moviles',
        deviceId,
        {
          solicitudId: linkRequest.id,
          installationId,
          fingerprint,
          manufacturer,
          model,
        }
      );

      await writeMobileEvent(client, req, {
        deviceId,
        usuarioId: req.user.usuario_id,
        docenteId: req.user.docente_id,
        type: 'VINCULACION_SOLICITADA',
        detail: {
          solicitudId: linkRequest.id,
          manufacturer,
          model,
          fingerprint,
        },
      });

      const device = await getDeviceById(client, deviceId);

      await client.query('COMMIT');

      return res.status(201).json({
        dispositivo: device,
        mensaje:
          'La solicitud fue enviada. El administrador debe autorizar este celular.',
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);

      if (error.code === '23505') {
        return res.status(409).json({
          error:
            'El docente o el dispositivo ya tiene una vinculación activa.',
        });
      }

      console.error(
        'Error al solicitar vinculación móvil:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo registrar la solicitud de vinculación.',
      });
    } finally {
      client.release();
    }
  }
);

// GET /api/dispositivos/mio
router.get(
  '/mio',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error:
          'La cuenta no tiene un perfil docente asociado.',
      });
    }

    const installationId = cleanText(
      req.query.uuid_instalacion ?? req.query.installationId,
      120
    );

    try {
      const parameters = [req.user.docente_id];
      let installationFilter = '';

      if (installationId) {
        parameters.push(installationId);
        installationFilter = `AND dm.uuid_instalacion = $2`;
      }

      const result = await pool.query(
        `${DEVICE_SELECT}
         WHERE dm.docente_id = $1
           ${installationFilter}
         ORDER BY dm.actualizado_en DESC
         LIMIT 1`,
        parameters
      );

      return res.json({
        dispositivo: result.rows[0] ?? null,
      });
    } catch (error) {
      console.error(
        'Error al consultar dispositivo del docente:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo consultar el estado del dispositivo.',
      });
    }
  }
);

// POST /api/dispositivos/validar-vinculo-rapido
router.post(
  '/validar-vinculo-rapido',
  async (req, res) => {
    if (!consumeQuickValidationAttempt(req)) {
      return res.status(429).json({
        error:
          'Se realizaron demasiados intentos. Espere un minuto.',
      });
    }

    const code = cleanUpperText(
      req.body.codigo ?? req.body.code,
      20
    );
    const installationId = cleanText(
      req.body.uuid_instalacion ?? req.body.installationId,
      120
    );

    if (
      !code ||
      !installationId ||
      !/^[A-Za-z0-9._:-]{16,120}$/.test(installationId)
    ) {
      return res.status(400).json({
        error:
          'No se pudo validar el código y el dispositivo.',
      });
    }

    try {
      const result = await pool.query(
        `SELECT
           dm.id,
           dm.estado,
           u.codigo,
           u.nombres,
           u.apellidos
         FROM dispositivos_moviles dm
         JOIN usuarios u
           ON u.id = dm.usuario_id
         WHERE dm.uuid_instalacion = $1
           AND UPPER(u.codigo) = UPPER($2)
           AND dm.estado = 'AUTORIZADO'
           AND u.activo = TRUE
         LIMIT 1`,
        [installationId, code]
      );

      const record = result.rows[0];

      if (!record) {
        return res.status(403).json({
          error:
            'El código no corresponde a un dispositivo móvil autorizado.',
        });
      }

      return res.json({
        vinculado: true,
        docente: {
          codigo: record.codigo,
          nombres: record.nombres,
          apellidos: record.apellidos,
        },
        dispositivo: {
          id: Number(record.id),
          estado: record.estado,
        },
      });
    } catch (error) {
      console.error(
        'Error al validar vínculo rápido:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo validar el vínculo del dispositivo.',
      });
    }
  }
);

async function transitionDevice(req, res, transitionName) {
  const deviceId = toPositiveInteger(req.params.id);
  const transition = TRANSITIONS[transitionName];

  if (!deviceId || !transition) {
    return res.status(400).json({
      error: 'La operación solicitada no es válida.',
    });
  }

  const reason = cleanText(
    req.body?.motivo ?? req.body?.reason,
    255
  );

  if (
    ['rechazar', 'suspender', 'revocar'].includes(
      transitionName
    ) &&
    reason.length < 5
  ) {
    return res.status(400).json({
      error:
        'Indique un motivo de al menos cinco caracteres.',
      fields: {
        motivo:
          'Indique un motivo de al menos cinco caracteres.',
      },
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await getDeviceById(client, deviceId, {
      forUpdate: true,
    });

    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'El dispositivo móvil no existe.',
      });
    }

    if (!transition.allowed.has(current.estado)) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:
          `No se puede ${transitionName} un dispositivo con estado ${String(
            current.estado
          ).toLowerCase()}.`,
      });
    }

    const updates = {
      autorizado_por: null,
      autorizado_en: null,
      rechazado_por: null,
      rechazado_en: null,
      suspendido_por: null,
      suspendido_en: null,
      revocado_por: null,
      revocado_en: null,
    };

    if (transitionName === 'aprobar') {
      updates.autorizado_por = req.user.usuario_id;
      updates.autorizado_en = new Date();
    }

    if (transitionName === 'rechazar') {
      updates.rechazado_por = req.user.usuario_id;
      updates.rechazado_en = new Date();
    }

    if (transitionName === 'suspender') {
      updates.suspendido_por = req.user.usuario_id;
      updates.suspendido_en = new Date();
    }

    if (transitionName === 'reactivar') {
      updates.autorizado_por = req.user.usuario_id;
      updates.autorizado_en = new Date();
    }

    if (transitionName === 'revocar') {
      updates.revocado_por = req.user.usuario_id;
      updates.revocado_en = new Date();
    }

    await client.query(
      `UPDATE dispositivos_moviles
       SET
         estado = $1,
         motivo_estado = $2,
         autorizado_por = $3,
         autorizado_en = $4,
         rechazado_por = $5,
         rechazado_en = $6,
         suspendido_por = $7,
         suspendido_en = $8,
         revocado_por = $9,
         revocado_en = $10,
         actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        transition.target,
        reason || null,
        updates.autorizado_por,
        updates.autorizado_en,
        updates.rechazado_por,
        updates.rechazado_en,
        updates.suspendido_por,
        updates.suspendido_en,
        updates.revocado_por,
        updates.revocado_en,
        deviceId,
      ]
    );

    await writeAudit(
      client,
      req,
      transition.action,
      'dispositivos_moviles',
      deviceId,
      {
        estadoAnterior: current.estado,
        estadoNuevo: transition.target,
        motivo: reason || null,
      }
    );

    await writeMobileEvent(client, req, {
      deviceId,
      usuarioId: current.usuario_id,
      docenteId: current.docente_id,
      type: transition.event,
      detail: {
        estadoAnterior: current.estado,
        estadoNuevo: transition.target,
        motivo: reason || null,
      },
    });

    const updated = await getDeviceById(client, deviceId);

    await client.query('COMMIT');

    return res.json({
      dispositivo: updated,
      mensaje:
        `El dispositivo fue ${transition.target.toLowerCase()} correctamente.`,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(
      `Error al ${transitionName} dispositivo móvil:`,
      error
    );
    return res.status(500).json({
      error:
        'No se pudo actualizar el estado del dispositivo.',
    });
  } finally {
    client.release();
  }
}

router.patch(
  '/:id/aprobar',
  autenticar,
  soloRol('Administrador'),
  (req, res) => transitionDevice(req, res, 'aprobar')
);

router.patch(
  '/:id/rechazar',
  autenticar,
  soloRol('Administrador'),
  (req, res) => transitionDevice(req, res, 'rechazar')
);

router.patch(
  '/:id/suspender',
  autenticar,
  soloRol('Administrador'),
  (req, res) => transitionDevice(req, res, 'suspender')
);

router.patch(
  '/:id/reactivar',
  autenticar,
  soloRol('Administrador'),
  (req, res) => transitionDevice(req, res, 'reactivar')
);

router.delete(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  (req, res) => transitionDevice(req, res, 'revocar')
);

router.use('/sincronizacion', require('./sincronizacion-movil.routes'));

module.exports = router;
