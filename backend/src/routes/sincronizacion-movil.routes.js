'use strict';

const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');

const LINK_EXPIRATION_MINUTES = 5;
const ACTIVE_DEVICE_STATES = ['PENDIENTE', 'AUTORIZADO', 'SUSPENDIDO'];

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
  return (
    value.length >= 100 &&
    value.length <= 8192 &&
    /^[A-Za-z0-9+/=]+$/.test(value)
  );
}

function clientIp(req) {
  return cleanText(req.ip || req.socket?.remoteAddress || '', 100);
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
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
  const sdkInt = toPositiveInteger(body.sdk_int ?? body.sdkInt);
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
    errors.sdkInt = 'No se pudo identificar el nivel de Android.';
  }

  if (!appVersion) {
    errors.appVersion =
      'No se pudo identificar la versión de la aplicación.';
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

async function writeAudit(
  client,
  req,
  action,
  table,
  recordId,
  detail = {},
  actorUserId = null
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
      actorUserId ?? req.user?.usuario_id ?? null,
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
    actorUserId = null,
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
      actorUserId ?? req.user?.usuario_id ?? null,
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

async function getDeviceById(client, deviceId) {
  const result = await client.query(
    `${DEVICE_SELECT}
     WHERE dm.id = $1`,
    [deviceId]
  );

  return result.rows[0] ?? null;
}

// POST /api/dispositivos/sincronizacion/crear
// El administrador genera un QR de un solo uso para un docente concreto.
router.post(
  '/crear',
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
           u.activo,
           dm.id AS dispositivo_id,
           dm.estado AS dispositivo_estado,
           dm.fabricante,
           dm.modelo
         FROM docentes d
         JOIN usuarios u
           ON u.id = d.usuario_id
         LEFT JOIN LATERAL (
           SELECT id, estado, fabricante, modelo
           FROM dispositivos_moviles
           WHERE docente_id = d.id
             AND estado = ANY($2::varchar[])
           ORDER BY actualizado_en DESC
           LIMIT 1
         ) dm ON TRUE
         WHERE d.id = $1
         FOR UPDATE OF d, u`,
        [teacherId, ACTIVE_DEVICE_STATES]
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
            'No se puede sincronizar un dispositivo con un docente inactivo.',
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
           CURRENT_TIMESTAMP + ($5 || ' minutes')::interval
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
        'GENERAR_QR_SINCRONIZACION_MOVIL',
        'solicitudes_vinculacion_dispositivo',
        requestRecord.id,
        {
          docenteId: teacher.docente_id,
          codigo: teacher.codigo,
          dispositivoActualId: teacher.dispositivo_id ?? null,
          dispositivoActualEstado: teacher.dispositivo_estado ?? null,
          expiraEn: requestRecord.expira_en,
          autorizaAlEscanear: true,
        }
      );

      await writeMobileEvent(client, req, {
        usuarioId: teacher.usuario_id,
        docenteId: teacher.docente_id,
        type: 'QR_SINCRONIZACION_GENERADO',
        detail: {
          solicitudId: requestRecord.id,
          expiraEn: requestRecord.expira_en,
          dispositivoActualId: teacher.dispositivo_id ?? null,
          dispositivoActualEstado: teacher.dispositivo_estado ?? null,
        },
      });

      await client.query('COMMIT');

      const qrPayload = JSON.stringify({
        version: 1,
        type: 'UNSAAC_DEVICE_LINK',
        purpose: 'SYNC_AND_AUTHORIZE',
        token,
        expiresAt: requestRecord.expira_en,
        teacherCode: teacher.codigo,
      });

      const qrImage = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 360,
        color: {
          dark: '#061B34',
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
          dispositivo_actual: teacher.dispositivo_id
            ? {
                id: Number(teacher.dispositivo_id),
                estado: teacher.dispositivo_estado,
                fabricante: teacher.fabricante,
                modelo: teacher.modelo,
              }
            : null,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error(
        'Error al generar QR de sincronización móvil:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo generar el QR de sincronización y autorización.',
      });
    } finally {
      client.release();
    }
  }
);

// POST /api/dispositivos/sincronizacion/completar
// La sesión docente, el QR administrativo y la clave local autorizan el móvil.
router.post(
  '/completar',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error: 'La cuenta no tiene un perfil docente asociado.',
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
           creado_por,
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
          error: 'El QR no existe o ya no es reconocido.',
        });
      }

      if (linkRequest.estado !== 'VIGENTE') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'El QR ya fue utilizado, cancelado o venció.',
        });
      }

      if (new Date(linkRequest.expira_en).getTime() <= Date.now()) {
        await client.query(
          `UPDATE solicitudes_vinculacion_dispositivo
           SET estado = 'EXPIRADA'
           WHERE id = $1`,
          [linkRequest.id]
        );
        await client.query('COMMIT');
        return res.status(410).json({
          error: 'El QR venció. Genere uno nuevo desde la página.',
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
          type: 'SINCRONIZACION_DOCENTE_NO_COINCIDE',
          result: 'BLOQUEADO',
          detail: {
            solicitudId: linkRequest.id,
          },
        });
        await client.query('COMMIT');
        return res.status(403).json({
          error: 'El QR fue generado para otro docente.',
        });
      }

      const sameInstallationResult = await client.query(
        `SELECT id, docente_id, usuario_id, estado
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
          type: 'SINCRONIZACION_DISPOSITIVO_OTRO_DOCENTE',
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

      const conflictingDeviceResult = await client.query(
        `SELECT id, uuid_instalacion, estado, fabricante, modelo
         FROM dispositivos_moviles
         WHERE docente_id = $1
           AND estado = ANY($2::varchar[])
           AND uuid_instalacion <> $3
         ORDER BY actualizado_en DESC
         LIMIT 1
         FOR UPDATE`,
        [
          req.user.docente_id,
          ACTIVE_DEVICE_STATES,
          installationId,
        ]
      );

      const conflictingDevice =
        conflictingDeviceResult.rows[0] ?? null;

      if (
        conflictingDevice &&
        conflictingDevice.estado !== 'PENDIENTE'
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            `El docente ya tiene otro celular ${String(
              conflictingDevice.estado
            ).toLowerCase()}: ${conflictingDevice.fabricante} ${conflictingDevice.modelo}. Revóquelo desde la página antes de reemplazarlo.`,
        });
      }

      if (conflictingDevice?.estado === 'PENDIENTE') {
        await client.query(
          `UPDATE dispositivos_moviles
           SET
             estado = 'REVOCADO',
             motivo_estado = 'Reemplazado mediante sincronización QR administrada',
             revocado_por = $1,
             revocado_en = CURRENT_TIMESTAMP,
             actualizado_en = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [linkRequest.creado_por, conflictingDevice.id]
        );

        await writeMobileEvent(client, req, {
          deviceId: Number(conflictingDevice.id),
          usuarioId: req.user.usuario_id,
          docenteId: req.user.docente_id,
          type: 'DISPOSITIVO_PENDIENTE_REEMPLAZADO_POR_QR',
          result: 'ADVERTENCIA',
          actorUserId: linkRequest.creado_por,
          detail: {
            solicitudId: linkRequest.id,
            installationIdAnterior:
              conflictingDevice.uuid_instalacion,
            installationIdNuevo: installationId,
          },
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
             estado = 'AUTORIZADO',
             solicitud_id = $13,
             motivo_estado = NULL,
             autorizado_por = $14,
             autorizado_en = CURRENT_TIMESTAMP,
             rechazado_por = NULL,
             rechazado_en = NULL,
             suspendido_por = NULL,
             suspendido_en = NULL,
             revocado_por = NULL,
             revocado_en = NULL,
             actualizado_en = CURRENT_TIMESTAMP
           WHERE id = $15
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
            linkRequest.creado_por,
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
             solicitud_id,
             autorizado_por,
             autorizado_en
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
             'AUTORIZADO',
             $14,
             $15,
             CURRENT_TIMESTAMP
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
            linkRequest.creado_por,
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
        'SINCRONIZAR_Y_AUTORIZAR_MOVIL_QR',
        'dispositivos_moviles',
        deviceId,
        {
          solicitudId: linkRequest.id,
          installationId,
          fingerprint,
          manufacturer,
          model,
          autorizadoAutomaticamente: true,
          docenteEscaneoUsuarioId: req.user.usuario_id,
        },
        linkRequest.creado_por
      );

      await writeMobileEvent(client, req, {
        deviceId,
        usuarioId: req.user.usuario_id,
        docenteId: req.user.docente_id,
        type: 'MOVIL_SINCRONIZADO_Y_AUTORIZADO',
        actorUserId: linkRequest.creado_por,
        detail: {
          solicitudId: linkRequest.id,
          manufacturer,
          model,
          fingerprint,
          biometricAvailable,
          autorizadoAutomaticamente: true,
        },
      });

      const device = await getDeviceById(client, deviceId);

      await client.query('COMMIT');

      return res.status(201).json({
        dispositivo: device,
        autorizado: true,
        mensaje:
          'Sincronización completada. Este celular quedó autorizado.',
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);

      if (error.code === '23505') {
        return res.status(409).json({
          error:
            'El docente o el dispositivo ya tiene una vinculación activa incompatible.',
        });
      }

      console.error(
        'Error al completar sincronización móvil:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo sincronizar y autorizar el celular.',
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
