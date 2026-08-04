'use strict';

const crypto = require('crypto');
const router = require('express').Router();

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');

const FINGERS = new Set([
  'PULGAR_DERECHO',
  'INDICE_DERECHO',
  'MEDIO_DERECHO',
  'ANULAR_DERECHO',
  'MENIQUE_DERECHO',
  'PULGAR_IZQUIERDO',
  'INDICE_IZQUIERDO',
  'MEDIO_IZQUIERDO',
  'ANULAR_IZQUIERDO',
  'MENIQUE_IZQUIERDO',
]);

const DEVICE_STATES = new Set([
  'CONECTADO',
  'ADVERTENCIA',
  'DESCONECTADO',
  'MANTENIMIENTO',
]);

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanUpper(value, maxLength = 80) {
  return cleanText(value, maxLength).toUpperCase();
}

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function boundedInteger(value, minimum, maximum, fallback = null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, minimum), maximum);
}

function requestIp(req) {
  const raw =
    req.ip ||
    req.socket?.remoteAddress ||
    null;

  return raw && raw !== '::1'
    ? raw.replace(/^::ffff:/, '')
    : null;
}

function getTemplateKey() {
  const raw = cleanText(
    process.env.BIOMETRIC_TEMPLATE_KEY,
    500
  );

  if (!raw) {
    const error = new Error(
      'BIOMETRIC_TEMPLATE_KEY no está configurada.'
    );
    error.code = 'BIOMETRIC_KEY_MISSING';
    throw error;
  }

  const key = Buffer.from(raw, 'base64');

  if (key.length !== 32) {
    const error = new Error(
      'BIOMETRIC_TEMPLATE_KEY debe contener 32 bytes en Base64.'
    );
    error.code = 'BIOMETRIC_KEY_INVALID';
    throw error;
  }

  return key;
}

function decodeTemplate(value) {
  const raw = String(value ?? '').trim();

  if (!raw) {
    const error = new Error(
      'La plantilla biométrica es obligatoria.'
    );
    error.code = 'TEMPLATE_REQUIRED';
    throw error;
  }

  if (/^data:image\//i.test(raw)) {
    const error = new Error(
      'No se permite almacenar imágenes crudas de huellas.'
    );
    error.code = 'RAW_IMAGE_FORBIDDEN';
    throw error;
  }

  const normalized = raw.replace(
    /^data:application\/octet-stream;base64,/i,
    ''
  );

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    const error = new Error(
      'La plantilla no tiene un formato Base64 válido.'
    );
    error.code = 'TEMPLATE_INVALID';
    throw error;
  }

  const template = Buffer.from(normalized, 'base64');

  if (template.length < 32 || template.length > 131072) {
    const error = new Error(
      'La plantilla debe tener entre 32 bytes y 128 KB.'
    );
    error.code = 'TEMPLATE_SIZE_INVALID';
    throw error;
  }

  return template;
}

function encryptTemplate(template) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    getTemplateKey(),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(template),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.from(
    JSON.stringify({
      version: 1,
      algorithm: 'AES-256-GCM',
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      data: encrypted.toString('base64'),
    }),
    'utf8'
  );
}

function deviceStateSql(alias = 'd') {
  return `CASE
    WHEN ${alias}.activo = FALSE THEN 'DESCONECTADO'
    WHEN ${alias}.estado = 'MANTENIMIENTO' THEN 'MANTENIMIENTO'
    WHEN ${alias}.ultima_actividad_en IS NULL THEN 'DESCONECTADO'
    WHEN ${alias}.ultima_actividad_en >= CURRENT_TIMESTAMP - INTERVAL '2 minutes'
      THEN CASE
        WHEN ${alias}.estado = 'ADVERTENCIA'
          OR ${alias}.porcentaje_senal < 50
          THEN 'ADVERTENCIA'
        ELSE 'CONECTADO'
      END
    ELSE 'DESCONECTADO'
  END`;
}

async function registerAudit(
  client,
  req,
  action,
  tableName,
  recordId,
  detail
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
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [
      Number(req.user.id) || null,
      action,
      tableName,
      recordId,
      JSON.stringify(detail ?? {}),
      requestIp(req),
    ]
  );
}

async function upsertDevice(client, body, userId) {
  const code = cleanUpper(
    body?.codigo ??
      body?.code ??
      body?.dispositivo_codigo,
    80
  );

  if (!code) {
    return null;
  }

  const requestedState = cleanUpper(
    body?.estado ?? body?.status,
    24
  );
  const state = DEVICE_STATES.has(requestedState)
    ? requestedState
    : 'CONECTADO';

  const result = await client.query(
    `INSERT INTO dispositivos_biometricos (
       codigo,
       nombre,
       fabricante,
       modelo,
       numero_serie,
       ubicacion,
       ip_address,
       puerto,
       mac_address,
       version_firmware,
       version_sdk,
       agente_id,
       estado,
       porcentaje_senal,
       registros_pendientes,
       sincronizacion_automatica,
       activo,
       mensaje,
       ultima_actividad_en,
       creado_por,
       actualizado_por
     )
     VALUES (
       $1, $2, $3, $4, NULLIF($5, ''), $6, NULLIF($7, ''),
       $8, NULLIF($9, ''), NULLIF($10, ''), NULLIF($11, ''),
       NULLIF($12, ''), $13, $14, $15, $16, TRUE, $17,
       CURRENT_TIMESTAMP, $18, $18
     )
     ON CONFLICT (codigo)
     DO UPDATE SET
       nombre = EXCLUDED.nombre,
       fabricante = EXCLUDED.fabricante,
       modelo = EXCLUDED.modelo,
       numero_serie = COALESCE(
         EXCLUDED.numero_serie,
         dispositivos_biometricos.numero_serie
       ),
       ubicacion = EXCLUDED.ubicacion,
       ip_address = EXCLUDED.ip_address,
       puerto = EXCLUDED.puerto,
       mac_address = EXCLUDED.mac_address,
       version_firmware = EXCLUDED.version_firmware,
       version_sdk = EXCLUDED.version_sdk,
       agente_id = EXCLUDED.agente_id,
       estado = EXCLUDED.estado,
       porcentaje_senal = EXCLUDED.porcentaje_senal,
       registros_pendientes = EXCLUDED.registros_pendientes,
       sincronizacion_automatica =
         EXCLUDED.sincronizacion_automatica,
       activo = TRUE,
       mensaje = EXCLUDED.mensaje,
       ultima_actividad_en = CURRENT_TIMESTAMP,
       actualizado_por = EXCLUDED.actualizado_por,
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING *`,
    [
      code,
      cleanText(body?.nombre ?? body?.name ?? code, 160),
      cleanText(body?.fabricante ?? body?.manufacturer, 120),
      cleanText(body?.modelo ?? body?.model, 120),
      cleanText(
        body?.numero_serie ??
          body?.serialNumber ??
          body?.serial,
        160
      ),
      cleanText(body?.ubicacion ?? body?.location, 180),
      cleanText(
        body?.ip_address ??
          body?.ipAddress ??
          body?.ip,
        64
      ),
      boundedInteger(body?.puerto ?? body?.port, 1, 65535),
      cleanText(
        body?.mac_address ??
          body?.macAddress,
        32
      ),
      cleanText(
        body?.version_firmware ??
          body?.firmwareVersion,
        80
      ),
      cleanText(
        body?.version_sdk ??
          body?.sdkVersion,
        80
      ),
      cleanText(body?.agente_id ?? body?.agentId, 160),
      state,
      boundedInteger(
        body?.porcentaje_senal ??
          body?.signalPercentage,
        0,
        100,
        100
      ),
      boundedInteger(
        body?.registros_pendientes ??
          body?.pendingRecords,
        0,
        1000000,
        0
      ),
      body?.sincronizacion_automatica ??
        body?.automaticSync ??
        true,
      cleanText(body?.mensaje ?? body?.message, 500),
      userId,
    ]
  );

  return result.rows[0] ?? null;
}

router.use(autenticar, soloRol('Administrador'));

router.get('/dashboard', async (_req, res) => {
  try {
    const [
      teachers,
      devices,
      capturesToday,
      recentCaptures,
      recentEvents,
    ] = await Promise.all([
      pool.query(
        `WITH finger_counts AS (
           SELECT
             docente_id,
             COUNT(*) FILTER (WHERE activo = TRUE)::int AS fingerprints
           FROM datos_biometricos
           GROUP BY docente_id
         )
         SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE COALESCE(fc.fingerprints, 0) >= 10
           )::int AS completed,
           COUNT(*) FILTER (
             WHERE COALESCE(fc.fingerprints, 0) BETWEEN 1 AND 9
           )::int AS in_progress,
           COUNT(*) FILTER (
             WHERE COALESCE(fc.fingerprints, 0) = 0
           )::int AS pending,
           COALESCE(SUM(fc.fingerprints), 0)::int AS fingerprints
         FROM docentes d
         JOIN usuarios u ON u.id = d.usuario_id
         LEFT JOIN finger_counts fc ON fc.docente_id = d.id
         WHERE u.activo = TRUE`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE activo = TRUE)::int AS total,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'CONECTADO'
           )::int AS connected,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'ADVERTENCIA'
           )::int AS warning,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'DESCONECTADO'
           )::int AS disconnected,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'MANTENIMIENTO'
           )::int AS maintenance,
           COALESCE(SUM(registros_pendientes), 0)::int AS pending_records,
           MAX(ultima_actividad_en) AS last_activity
         FROM dispositivos_biometricos d`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM datos_biometricos
         WHERE activo = TRUE
           AND enrolado_en::date = (
             CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima'
           )::date`
      ),
      pool.query(
        `SELECT
           db.id,
           db.docente_id,
           u.codigo AS teacher_code,
           CONCAT_WS(' ', u.nombres, u.apellidos) AS teacher,
           dep.nombre AS department,
           db.dedo AS finger,
           db.calidad AS quality,
           db.dispositivo_codigo AS device_code,
           db.version_sdk AS sdk_version,
           db.enrolado_en AS enrolled_at,
           admin.email AS enrolled_by
         FROM datos_biometricos db
         JOIN docentes d ON d.id = db.docente_id
         JOIN usuarios u ON u.id = d.usuario_id
         LEFT JOIN departamentos_academicos dep
           ON dep.id = d.departamento_id
         LEFT JOIN usuarios admin
           ON admin.id = db.enrolado_por
         WHERE db.activo = TRUE
         ORDER BY db.enrolado_en DESC, db.id DESC
         LIMIT 8`
      ),
      pool.query(
        `SELECT
           eb.id,
           eb.tipo AS type,
           eb.resultado AS result,
           eb.calidad AS quality,
           eb.detalle AS detail,
           eb.creado_en AS created_at,
           CONCAT_WS(' ', u.nombres, u.apellidos) AS teacher,
           dev.codigo AS device_code
         FROM eventos_biometricos eb
         LEFT JOIN docentes d ON d.id = eb.docente_id
         LEFT JOIN usuarios u ON u.id = d.usuario_id
         LEFT JOIN dispositivos_biometricos dev
           ON dev.id = eb.dispositivo_id
         ORDER BY eb.creado_en DESC, eb.id DESC
         LIMIT 10`
      ),
    ]);

    const teacher = teachers.rows[0] ?? {};
    const device = devices.rows[0] ?? {};
    const totalTeachers = Number(teacher.total ?? 0);
    const completedTeachers = Number(teacher.completed ?? 0);
    const pendingTeachers =
      Number(teacher.pending ?? 0) +
      Number(teacher.in_progress ?? 0);
    const totalDevices = Number(device.total ?? 0);
    const connectedDevices = Number(device.connected ?? 0);
    const warningDevices = Number(device.warning ?? 0);
    const disconnectedDevices =
      Number(device.disconnected ?? 0) +
      Number(device.maintenance ?? 0);

    const alerts = [];

    if (pendingTeachers > 0) {
      alerts.push({
        type: 'PENDING_ENROLLMENT',
        tone: 'info',
        title: 'Docentes con registro incompleto',
        description:
          `${pendingTeachers} docente(s) requieren completar sus huellas.`,
        href: '/admin/biometria/captura',
      });
    }

    if (warningDevices > 0) {
      alerts.push({
        type: 'DEVICE_WARNING',
        tone: 'warning',
        title: 'Lectores con advertencias',
        description:
          `${warningDevices} lector(es) reportan señal baja o una incidencia.`,
        href: '/admin/biometria/dispositivos',
      });
    }

    if (disconnectedDevices > 0) {
      alerts.push({
        type: 'DEVICE_OFFLINE',
        tone: 'danger',
        title: 'Lectores no disponibles',
        description:
          `${disconnectedDevices} lector(es) están desconectados o en mantenimiento.`,
        href: '/admin/biometria/dispositivos',
      });
    }

    if (totalDevices === 0) {
      alerts.push({
        type: 'NO_READERS',
        tone: 'warning',
        title: 'No existen lectores registrados',
        description:
          'Conecte el puente local de captura para registrar el primer lector.',
        href: '/admin/biometria/dispositivos',
      });
    }

    return res.json({
      summary: {
        totalTeachers,
        completedTeachers,
        inProgressTeachers: Number(teacher.in_progress ?? 0),
        pendingTeachers: Number(teacher.pending ?? 0),
        activeFingerprints: Number(teacher.fingerprints ?? 0),
        capturesToday: Number(capturesToday.rows[0]?.total ?? 0),
        totalDevices,
        connectedDevices,
        warningDevices,
        disconnectedDevices: Number(device.disconnected ?? 0),
        maintenanceDevices: Number(device.maintenance ?? 0),
        pendingRecords: Number(device.pending_records ?? 0),
        coveragePercent:
          totalTeachers > 0
            ? Math.round(
                (completedTeachers / totalTeachers) * 100
              )
            : 0,
        deviceAvailabilityPercent:
          totalDevices > 0
            ? Math.round(
                (connectedDevices / totalDevices) * 100
              )
            : 0,
        lastDeviceActivity: device.last_activity ?? null,
      },
      alerts,
      recentCaptures: recentCaptures.rows,
      recentEvents: recentEvents.rows,
      security: {
        storesRawImages: false,
        templateEncryption: 'AES-256-GCM',
        templateKeyConfigured:
          Boolean(process.env.BIOMETRIC_TEMPLATE_KEY),
      },
    });
  } catch (error) {
    console.error(
      'Error al cargar el dashboard biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo obtener el estado del módulo biométrico.',
    });
  }
});

router.get('/docentes', async (req, res) => {
  const search = cleanText(req.query.search, 120);
  const values = [];
  let searchSql = '';

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    searchSql = `AND (
      LOWER(CONCAT_WS(' ', u.nombres, u.apellidos))
        LIKE $${values.length}
      OR LOWER(u.codigo) LIKE $${values.length}
      OR LOWER(COALESCE(d.dni, '')) LIKE $${values.length}
      OR LOWER(COALESCE(dep.nombre, '')) LIKE $${values.length}
    )`;
  }

  try {
    const result = await pool.query(
      `SELECT
         d.id,
         u.codigo,
         d.dni,
         u.nombres,
         u.apellidos,
         u.email,
         dep.nombre AS departamento,
         d.categoria,
         u.activo,
         COUNT(db.id) FILTER (WHERE db.activo = TRUE)::int
           AS fingerprints,
         CASE
           WHEN COUNT(db.id) FILTER (WHERE db.activo = TRUE) >= 10
             THEN 'REGISTRADO'
           WHEN COUNT(db.id) FILTER (WHERE db.activo = TRUE) > 0
             THEN 'EN_PROCESO'
           ELSE 'PENDIENTE'
         END AS biometric_status
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       LEFT JOIN departamentos_academicos dep
         ON dep.id = d.departamento_id
       LEFT JOIN datos_biometricos db
         ON db.docente_id = d.id
       WHERE u.activo = TRUE
       ${searchSql}
       GROUP BY
         d.id,
         u.codigo,
         d.dni,
         u.nombres,
         u.apellidos,
         u.email,
         dep.nombre,
         d.categoria,
         u.activo
       ORDER BY u.apellidos, u.nombres
       LIMIT 500`,
      values
    );

    return res.json({
      teachers: result.rows,
    });
  } catch (error) {
    console.error(
      'Error al consultar docentes biométricos:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo consultar el catálogo biométrico de docentes.',
    });
  }
});

router.get('/docentes/:id/huellas', async (req, res) => {
  const teacherId = positiveInteger(req.params.id);

  if (!teacherId) {
    return res.status(400).json({
      error: 'El docente indicado no es válido.',
    });
  }

  try {
    const teacher = await pool.query(
      `SELECT
         d.id,
         u.codigo,
         d.dni,
         u.nombres,
         u.apellidos,
         u.email,
         dep.nombre AS departamento
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       LEFT JOIN departamentos_academicos dep
         ON dep.id = d.departamento_id
       WHERE d.id = $1
         AND u.activo = TRUE`,
      [teacherId]
    );

    if (!teacher.rows[0]) {
      return res.status(404).json({
        error: 'No se encontró el docente.',
      });
    }

    const fingerprints = await pool.query(
      `SELECT
         id,
         dedo AS finger,
         calidad AS quality,
         dispositivo_codigo AS device_code,
         version_sdk AS sdk_version,
         captura_origen AS source,
         enrolado_en AS enrolled_at,
         actualizado_en AS updated_at
       FROM datos_biometricos
       WHERE docente_id = $1
         AND activo = TRUE
       ORDER BY dedo`,
      [teacherId]
    );

    return res.json({
      teacher: teacher.rows[0],
      fingerprints: fingerprints.rows,
    });
  } catch (error) {
    console.error(
      'Error al consultar huellas del docente:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudieron consultar las huellas del docente.',
    });
  }
});

router.get('/capturas/recientes', async (req, res) => {
  const limit = boundedInteger(
    req.query.limit,
    1,
    100,
    20
  );

  try {
    const result = await pool.query(
      `SELECT
         db.id,
         db.docente_id,
         u.codigo AS teacher_code,
         CONCAT_WS(' ', u.nombres, u.apellidos) AS teacher,
         dep.nombre AS department,
         db.dedo AS finger,
         db.calidad AS quality,
         db.dispositivo_codigo AS device_code,
         db.version_sdk AS sdk_version,
         db.enrolado_en AS enrolled_at,
         db.actualizado_en AS updated_at,
         admin.email AS enrolled_by
       FROM datos_biometricos db
       JOIN docentes d ON d.id = db.docente_id
       JOIN usuarios u ON u.id = d.usuario_id
       LEFT JOIN departamentos_academicos dep
         ON dep.id = d.departamento_id
       LEFT JOIN usuarios admin
         ON admin.id = db.enrolado_por
       WHERE db.activo = TRUE
       ORDER BY db.enrolado_en DESC, db.id DESC
       LIMIT $1`,
      [limit]
    );

    return res.json({
      captures: result.rows,
    });
  } catch (error) {
    console.error(
      'Error al consultar capturas biométricas:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudieron consultar las capturas recientes.',
    });
  }
});

router.post('/enrolamientos', async (req, res) => {
  const teacherId = positiveInteger(
    req.body?.docente_id ??
      req.body?.teacherId
  );
  const finger = cleanUpper(
    req.body?.dedo ??
      req.body?.finger,
    40
  );
  const quality = boundedInteger(
    req.body?.calidad ??
      req.body?.quality,
    0,
    100
  );

  if (!teacherId) {
    return res.status(400).json({
      error: 'Seleccione un docente válido.',
    });
  }

  if (!FINGERS.has(finger)) {
    return res.status(400).json({
      error: 'Seleccione un dedo válido.',
    });
  }

  if (quality === null) {
    return res.status(400).json({
      error:
        'La calidad de captura debe estar entre 0 y 100.',
    });
  }

  if (quality < 60) {
    return res.status(422).json({
      error:
        'La calidad es insuficiente. Repita la captura.',
      minimum_quality: 60,
    });
  }

  if (
    req.body?.imagen_base64 ||
    req.body?.image_base64 ||
    req.body?.raw_image
  ) {
    return res.status(400).json({
      error:
        'El servidor no acepta imágenes crudas de huellas.',
    });
  }

  let template;

  try {
    template = decodeTemplate(
      req.body?.plantilla_base64 ??
        req.body?.templateBase64
    );
  } catch (error) {
    return res.status(400).json({
      error: error.message,
      code: error.code,
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const teacher = await client.query(
      `SELECT d.id
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE d.id = $1
         AND u.activo = TRUE
       FOR UPDATE`,
      [teacherId]
    );

    if (!teacher.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'No se encontró el docente activo.',
      });
    }

    const device = await upsertDevice(
      client,
      req.body?.dispositivo ??
        req.body?.device ??
        {
          codigo:
            req.body?.dispositivo_codigo ??
            req.body?.deviceCode,
          nombre:
            req.body?.dispositivo_codigo ??
            req.body?.deviceCode,
          version_sdk:
            req.body?.version_sdk ??
            req.body?.sdkVersion,
        },
      Number(req.user.id) || null
    );

    const encryptedTemplate = encryptTemplate(template);
    const templateHash = crypto
      .createHash('sha256')
      .update(template)
      .digest('hex');
    const sdkVersion = cleanText(
      req.body?.version_sdk ??
        req.body?.sdkVersion,
      20
    );
    const metadata = {
      ...(typeof req.body?.metadata === 'object' &&
      req.body?.metadata
        ? req.body.metadata
        : {}),
      template_bytes: template.length,
      encrypted_at: new Date().toISOString(),
    };

    const enrollment = await client.query(
      `INSERT INTO datos_biometricos (
         docente_id,
         tipo,
         dedo,
         plantilla_cifrada,
         version_sdk,
         activo,
         enrolado_en,
         enrolado_por,
         calidad,
         dispositivo_codigo,
         plantilla_hash,
         captura_origen,
         metadata,
         actualizado_en,
         revocado_en,
         revocado_por,
         motivo_revocacion
       )
       VALUES (
         $1, 'HUELLA', $2, $3, NULLIF($4, ''), TRUE,
         CURRENT_TIMESTAMP, $5, $6, NULLIF($7, ''), $8,
         'PUENTE_LOCAL', $9::jsonb, CURRENT_TIMESTAMP,
         NULL, NULL, NULL
       )
       ON CONFLICT (docente_id, tipo, dedo)
       DO UPDATE SET
         plantilla_cifrada = EXCLUDED.plantilla_cifrada,
         version_sdk = EXCLUDED.version_sdk,
         activo = TRUE,
         enrolado_en = CURRENT_TIMESTAMP,
         enrolado_por = EXCLUDED.enrolado_por,
         calidad = EXCLUDED.calidad,
         dispositivo_codigo = EXCLUDED.dispositivo_codigo,
         plantilla_hash = EXCLUDED.plantilla_hash,
         captura_origen = EXCLUDED.captura_origen,
         metadata = EXCLUDED.metadata,
         actualizado_en = CURRENT_TIMESTAMP,
         revocado_en = NULL,
         revocado_por = NULL,
         motivo_revocacion = NULL
       RETURNING
         id,
         docente_id,
         dedo,
         calidad,
         dispositivo_codigo,
         version_sdk,
         enrolado_en`,
      [
        teacherId,
        finger,
        encryptedTemplate,
        sdkVersion,
        Number(req.user.id) || null,
        quality,
        device?.codigo ?? cleanUpper(
          req.body?.dispositivo_codigo ??
            req.body?.deviceCode,
          80
        ),
        templateHash,
        JSON.stringify(metadata),
      ]
    );

    const record = enrollment.rows[0];

    if (device) {
      await client.query(
        `UPDATE dispositivos_biometricos
         SET plantillas_registradas = (
           SELECT COUNT(*)::int
           FROM datos_biometricos
           WHERE activo = TRUE
             AND dispositivo_codigo = $1
         ),
         ultima_actividad_en = CURRENT_TIMESTAMP,
         actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [device.codigo, device.id]
      );
    }

    await client.query(
      `INSERT INTO eventos_biometricos (
         tipo,
         resultado,
         docente_id,
         dato_biometrico_id,
         dispositivo_id,
         calidad,
         detalle,
         usuario_id,
         ip_origen
       )
       VALUES (
         'ENROLAMIENTO',
         'EXITOSO',
         $1,
         $2,
         $3,
         $4,
         $5::jsonb,
         $6,
         $7
       )`,
      [
        teacherId,
        record.id,
        device?.id ?? null,
        quality,
        JSON.stringify({
          finger,
          sdk_version: sdkVersion || null,
          template_hash: templateHash,
          stores_raw_image: false,
        }),
        Number(req.user.id) || null,
        requestIp(req),
      ]
    );

    await registerAudit(
      client,
      req,
      'ENROLAR_HUELLA',
      'datos_biometricos',
      Number(record.id),
      {
        docente_id: teacherId,
        dedo: finger,
        calidad: quality,
        dispositivo_codigo:
          device?.codigo ?? record.dispositivo_codigo,
        plantilla_hash: templateHash,
        imagen_cruda_almacenada: false,
      }
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Huella biométrica registrada correctamente.',
      enrollment: record,
      security: {
        rawImageStored: false,
        encrypted: true,
        algorithm: 'AES-256-GCM',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (
      error.code === 'BIOMETRIC_KEY_MISSING' ||
      error.code === 'BIOMETRIC_KEY_INVALID'
    ) {
      return res.status(503).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error(
      'Error al registrar enrolamiento biométrico:',
      error
    );

    return res.status(500).json({
      error:
        'No se pudo guardar la plantilla biométrica.',
    });
  } finally {
    client.release();
  }
});

router.delete('/enrolamientos/:id', async (req, res) => {
  const enrollmentId = positiveInteger(req.params.id);
  const reason = cleanText(
    req.body?.motivo ?? req.body?.reason,
    255
  );

  if (!enrollmentId) {
    return res.status(400).json({
      error: 'El enrolamiento indicado no es válido.',
    });
  }

  if (reason.length < 5) {
    return res.status(400).json({
      error:
        'Indique un motivo de al menos cinco caracteres.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT id, docente_id, dedo, dispositivo_codigo
       FROM datos_biometricos
       WHERE id = $1
         AND activo = TRUE
       FOR UPDATE`,
      [enrollmentId]
    );

    if (!current.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error:
          'No se encontró un enrolamiento activo.',
      });
    }

    const record = current.rows[0];

    await client.query(
      `UPDATE datos_biometricos
       SET activo = FALSE,
           revocado_en = CURRENT_TIMESTAMP,
           revocado_por = $2,
           motivo_revocacion = $3,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [
        enrollmentId,
        Number(req.user.id) || null,
        reason,
      ]
    );

    const device = record.dispositivo_codigo
      ? await client.query(
          `SELECT id
           FROM dispositivos_biometricos
           WHERE codigo = $1`,
          [record.dispositivo_codigo]
        )
      : { rows: [] };

    await client.query(
      `INSERT INTO eventos_biometricos (
         tipo,
         resultado,
         docente_id,
         dato_biometrico_id,
         dispositivo_id,
         detalle,
         usuario_id,
         ip_origen
       )
       VALUES (
         'REVOCACION',
         'REVOCADO',
         $1,
         $2,
         $3,
         $4::jsonb,
         $5,
         $6
       )`,
      [
        record.docente_id,
        enrollmentId,
        device.rows[0]?.id ?? null,
        JSON.stringify({
          finger: record.dedo,
          reason,
        }),
        Number(req.user.id) || null,
        requestIp(req),
      ]
    );

    await registerAudit(
      client,
      req,
      'REVOCAR_HUELLA',
      'datos_biometricos',
      enrollmentId,
      {
        docente_id: record.docente_id,
        dedo: record.dedo,
        motivo: reason,
      }
    );

    await client.query('COMMIT');

    return res.json({
      message:
        'La huella fue revocada correctamente.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'Error al revocar enrolamiento biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo revocar la plantilla biométrica.',
    });
  } finally {
    client.release();
  }
});

router.get('/dispositivos', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         d.id,
         d.codigo,
         d.nombre,
         d.fabricante,
         d.modelo,
         d.numero_serie,
         d.ubicacion,
         d.ip_address,
         d.puerto,
         d.mac_address,
         d.version_firmware,
         d.version_sdk,
         d.agente_id,
         ${deviceStateSql('d')} AS estado_actual,
         d.estado AS estado_reportado,
         d.porcentaje_senal,
         d.registros_pendientes,
         d.plantillas_registradas,
         d.sincronizacion_automatica,
         d.activo,
         d.mensaje,
         d.ultima_actividad_en,
         d.ultima_sincronizacion_en,
         d.ultimo_diagnostico_en,
         d.creado_en,
         d.actualizado_en
       FROM dispositivos_biometricos d
       ORDER BY
         CASE ${deviceStateSql('d')}
           WHEN 'CONECTADO' THEN 0
           WHEN 'ADVERTENCIA' THEN 1
           WHEN 'MANTENIMIENTO' THEN 2
           ELSE 3
         END,
         d.nombre`
    );

    const summary = result.rows.reduce(
      (current, device) => {
        current.total += 1;
        const state = device.estado_actual;

        if (state === 'CONECTADO') current.connected += 1;
        if (state === 'ADVERTENCIA') current.warning += 1;
        if (state === 'DESCONECTADO') current.disconnected += 1;
        if (state === 'MANTENIMIENTO') current.maintenance += 1;

        current.pendingRecords += Number(
          device.registros_pendientes ?? 0
        );

        return current;
      },
      {
        total: 0,
        connected: 0,
        warning: 0,
        disconnected: 0,
        maintenance: 0,
        pendingRecords: 0,
      }
    );

    return res.json({
      summary,
      devices: result.rows,
    });
  } catch (error) {
    console.error(
      'Error al consultar lectores biométricos:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudieron consultar los lectores biométricos.',
    });
  }
});

router.post('/dispositivos/heartbeat', async (req, res) => {
  const code = cleanUpper(
    req.body?.codigo ?? req.body?.code,
    80
  );

  if (!code) {
    return res.status(400).json({
      error:
        'El código del lector biométrico es obligatorio.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const device = await upsertDevice(
      client,
      req.body,
      Number(req.user.id) || null
    );

    await client.query('COMMIT');

    return res.json({
      message:
        'Estado del lector actualizado correctamente.',
      device,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'Error al registrar heartbeat biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo actualizar el estado del lector.',
    });
  } finally {
    client.release();
  }
});

router.patch('/dispositivos/:id', async (req, res) => {
  const deviceId = positiveInteger(req.params.id);

  if (!deviceId) {
    return res.status(400).json({
      error: 'El lector indicado no es válido.',
    });
  }

  const requestedState = cleanUpper(
    req.body?.estado ?? req.body?.status,
    24
  );

  if (
    requestedState &&
    !DEVICE_STATES.has(requestedState)
  ) {
    return res.status(400).json({
      error: 'El estado solicitado no es válido.',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE dispositivos_biometricos
       SET nombre = COALESCE(NULLIF($2, ''), nombre),
           ubicacion = COALESCE(NULLIF($3, ''), ubicacion),
           estado = COALESCE(NULLIF($4, ''), estado),
           sincronizacion_automatica = COALESCE($5, sincronizacion_automatica),
           activo = COALESCE($6, activo),
           mensaje = COALESCE(NULLIF($7, ''), mensaje),
           actualizado_por = $8,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        deviceId,
        cleanText(req.body?.nombre ?? req.body?.name, 160),
        cleanText(req.body?.ubicacion ?? req.body?.location, 180),
        requestedState,
        typeof req.body?.sincronizacion_automatica === 'boolean'
          ? req.body.sincronizacion_automatica
          : typeof req.body?.automaticSync === 'boolean'
            ? req.body.automaticSync
            : null,
        typeof req.body?.activo === 'boolean'
          ? req.body.activo
          : typeof req.body?.active === 'boolean'
            ? req.body.active
            : null,
        cleanText(req.body?.mensaje ?? req.body?.message, 500),
        Number(req.user.id) || null,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'No se encontró el lector biométrico.',
      });
    }

    return res.json({
      message: 'Lector biométrico actualizado.',
      device: result.rows[0],
    });
  } catch (error) {
    console.error(
      'Error al actualizar lector biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo actualizar el lector biométrico.',
    });
  }
});

router.post('/dispositivos/:id/diagnostico', async (req, res) => {
  const deviceId = positiveInteger(req.params.id);
  const resultValue = cleanUpper(
    req.body?.resultado ?? req.body?.result,
    30
  );
  const result =
    resultValue === 'EXITOSO'
      ? 'EXITOSO'
      : resultValue === 'ADVERTENCIA'
        ? 'ADVERTENCIA'
        : 'FALLIDO';

  if (!deviceId) {
    return res.status(400).json({
      error: 'El lector indicado no es válido.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE dispositivos_biometricos
       SET ultimo_diagnostico_en = CURRENT_TIMESTAMP,
           estado = CASE
             WHEN $2 = 'EXITOSO' THEN 'CONECTADO'
             WHEN $2 = 'ADVERTENCIA' THEN 'ADVERTENCIA'
             ELSE 'DESCONECTADO'
           END,
           mensaje = $3,
           actualizado_por = $4,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        deviceId,
        result,
        cleanText(
          req.body?.mensaje ??
            req.body?.message ??
            'Diagnóstico recibido desde el puente local.',
          500
        ),
        Number(req.user.id) || null,
      ]
    );

    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'No se encontró el lector biométrico.',
      });
    }

    await client.query(
      `INSERT INTO eventos_biometricos (
         tipo,
         resultado,
         dispositivo_id,
         detalle,
         usuario_id,
         ip_origen
       )
       VALUES (
         'DIAGNOSTICO',
         $1,
         $2,
         $3::jsonb,
         $4,
         $5
       )`,
      [
        result,
        deviceId,
        JSON.stringify(
          typeof req.body?.detalle === 'object'
            ? req.body.detalle
            : {}
        ),
        Number(req.user.id) || null,
        requestIp(req),
      ]
    );

    await client.query('COMMIT');

    return res.json({
      message:
        'Resultado del diagnóstico registrado.',
      device: updated.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      'Error al registrar diagnóstico biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo registrar el diagnóstico.',
    });
  } finally {
    client.release();
  }
});


// PASO_8J2_PUENTE_LOCAL
const http = require('http');
const https = require('https');

function getBridgeSettings() {
  const rawUrl = cleanText(
    process.env.BIOMETRIC_BRIDGE_URL ||
      'http://127.0.0.1:4765',
    500
  );
  const token = cleanText(
    process.env.BIOMETRIC_BRIDGE_TOKEN,
    500
  );

  if (!token) {
    const error = new Error(
      'BIOMETRIC_BRIDGE_TOKEN no está configurado.'
    );
    error.code = 'BRIDGE_TOKEN_MISSING';
    throw error;
  }

  let url;

  try {
    url = new URL(rawUrl);
  } catch {
    const error = new Error(
      'BIOMETRIC_BRIDGE_URL no es válida.'
    );
    error.code = 'BRIDGE_URL_INVALID';
    throw error;
  }

  if (
    !['127.0.0.1', 'localhost', '::1'].includes(
      url.hostname
    )
  ) {
    const error = new Error(
      'Por seguridad, el puente debe ejecutarse en localhost.'
    );
    error.code = 'BRIDGE_NOT_LOCAL';
    throw error;
  }

  return { url, token };
}

function bridgeRequest(pathname, options = {}) {
  return new Promise((resolve, reject) => {
    let settings;

    try {
      settings = getBridgeSettings();
    } catch (error) {
      reject(error);
      return;
    }

    const target = new URL(pathname, settings.url);
    const transport =
      target.protocol === 'https:' ? https : http;
    const body = options.body
      ? JSON.stringify(options.body)
      : '';

    const request = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${settings.token}`,
          ...(body
            ? {
                'Content-Type': 'application/json',
                'Content-Length':
                  Buffer.byteLength(body),
              }
            : {}),
        },
        timeout: options.timeoutMs || 35000,
      },
      (response) => {
        const chunks = [];
        let size = 0;

        response.on('data', (chunk) => {
          size += chunk.length;

          if (size > 1024 * 1024) {
            request.destroy(
              new Error(
                'La respuesta del puente es demasiado grande.'
              )
            );
            return;
          }

          chunks.push(chunk);
        });

        response.on('end', () => {
          const text = Buffer.concat(chunks).toString(
            'utf8'
          );
          let payload = null;

          try {
            payload = text ? JSON.parse(text) : {};
          } catch {
            const error = new Error(
              'El puente devolvió JSON inválido.'
            );
            error.code = 'BRIDGE_INVALID_JSON';
            reject(error);
            return;
          }

          if (
            response.statusCode < 200 ||
            response.statusCode >= 300
          ) {
            const error = new Error(
              cleanText(
                payload?.error ||
                  'El puente rechazó la operación.',
                500
              )
            );
            error.code = cleanText(
              payload?.code ||
                'BRIDGE_OPERATION_FAILED',
              80
            );
            error.statusCode = response.statusCode;
            reject(error);
            return;
          }

          resolve(payload);
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(
        Object.assign(
          new Error(
            'El puente biométrico no respondió a tiempo.'
          ),
          { code: 'BRIDGE_TIMEOUT' }
        )
      );
    });

    request.on('error', (error) => {
      if (!error.code) {
        error.code = 'BRIDGE_UNAVAILABLE';
      }

      reject(error);
    });

    if (body) {
      request.write(body);
    }

    request.end();
  });
}

router.get('/puente/estado', async (_req, res) => {
  try {
    const status = await bridgeRequest('/health', {
      timeoutMs: 5000,
    });

    return res.json({
      online: true,
      ...status,
    });
  } catch (error) {
    return res.status(503).json({
      online: false,
      code:
        error.code || 'BRIDGE_UNAVAILABLE',
      error:
        error.message ||
        'El puente biométrico local no está disponible.',
      adapterConfigured: false,
      adapterAvailable: false,
      storesRawImages: false,
    });
  }
});

router.post('/puente/diagnostico', async (_req, res) => {
  try {
    const result = await bridgeRequest(
      '/diagnostic',
      {
        method: 'POST',
        body: {},
        timeoutMs: 20000,
      }
    );

    return res.json(result);
  } catch (error) {
    return res.status(
      error.statusCode || 503
    ).json({
      ok: false,
      code:
        error.code || 'BRIDGE_DIAGNOSTIC_FAILED',
      error:
        error.message ||
        'No se pudo ejecutar el diagnóstico local.',
    });
  }
});

router.post('/puente/capturar', async (req, res) => {
  const finger = cleanUpper(
    req.body?.dedo ??
      req.body?.finger,
    40
  );

  if (!FINGERS.has(finger)) {
    return res.status(400).json({
      error: 'Seleccione un dedo válido.',
      code: 'FINGER_INVALID',
    });
  }

  try {
    const capture = await bridgeRequest(
      '/capture',
      {
        method: 'POST',
        body: {
          finger,
          timeoutMs: boundedInteger(
            req.body?.timeout_ms ??
              req.body?.timeoutMs,
            5000,
            90000,
            30000
          ),
          options:
            req.body?.options &&
            typeof req.body.options === 'object'
              ? req.body.options
              : {},
        },
        timeoutMs: 95000,
      }
    );

    if (
      capture?.rawImage ||
      capture?.raw_image ||
      capture?.imageBase64 ||
      capture?.image_base64
    ) {
      return res.status(502).json({
        error:
          'El puente devolvió una imagen cruda no permitida.',
        code: 'RAW_IMAGE_FORBIDDEN',
      });
    }

    let template;

    try {
      template = decodeTemplate(
        capture?.templateBase64
      );
    } catch (error) {
      return res.status(502).json({
        error: error.message,
        code: error.code,
      });
    }

    const quality = boundedInteger(
      capture?.quality,
      0,
      100
    );

    if (quality === null) {
      return res.status(502).json({
        error:
          'El puente no devolvió una calidad válida.',
        code: 'QUALITY_INVALID',
      });
    }

    return res.json({
      ok: true,
      finger,
      quality,
      templateBase64:
        template.toString('base64'),
      templateBytes: template.length,
      templateSha256: crypto
        .createHash('sha256')
        .update(template)
        .digest('hex'),
      sdkVersion: cleanText(
        capture?.sdkVersion,
        80
      ) || null,
      device:
        capture?.device &&
        typeof capture.device === 'object'
          ? capture.device
          : {},
      metadata: {
        ...(capture?.metadata &&
        typeof capture.metadata === 'object'
          ? capture.metadata
          : {}),
        bridge_version:
          cleanText(
            capture?.bridgeVersion,
            40
          ) || null,
        captured_at:
          cleanText(
            capture?.capturedAt,
            80
          ) || new Date().toISOString(),
        stores_raw_image: false,
      },
      security: {
        rawImageStored: false,
        templateOnly: true,
        transport:
          'Puente localhost -> backend -> memoria temporal del navegador',
      },
    });
  } catch (error) {
    return res.status(
      error.statusCode || 503
    ).json({
      ok: false,
      code:
        error.code || 'BRIDGE_CAPTURE_FAILED',
      error:
        error.message ||
        'No se pudo capturar la huella.',
    });
  }
});


// PASO_8J3_DISPOSITIVOS_REALES
const STEP8J3_CONNECTION_TYPES = new Set([
  'PUENTE_LOCAL',
  'AGENTE_REMOTO',
  'RED',
]);

function step8j3Boolean(value, fallback = null) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

function step8j3NullableText(value, maxLength = 255) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}

function step8j3DeviceInput(body = {}, options = {}) {
  const requireIdentity = options.requireIdentity === true;
  const code = cleanUpper(body.codigo ?? body.code, 80);
  const name = cleanText(body.nombre ?? body.name, 160);

  if (requireIdentity && !code) {
    const error = new Error('El código del lector es obligatorio.');
    error.statusCode = 400;
    error.code = 'DEVICE_CODE_REQUIRED';
    throw error;
  }

  if (requireIdentity && !name) {
    const error = new Error('El nombre del lector es obligatorio.');
    error.statusCode = 400;
    error.code = 'DEVICE_NAME_REQUIRED';
    throw error;
  }

  const rawConnectionType = cleanUpper(
    body.tipo_conexion ?? body.connectionType ?? 'PUENTE_LOCAL',
    30
  );
  const connectionType = STEP8J3_CONNECTION_TYPES.has(rawConnectionType)
    ? rawConnectionType
    : 'PUENTE_LOCAL';

  const rawState = cleanUpper(body.estado ?? body.status, 24);
  const state = DEVICE_STATES.has(rawState) ? rawState : null;

  let port = null;
  if (
    body.puerto !== undefined &&
    body.puerto !== null &&
    String(body.puerto).trim() !== ''
  ) {
    port = boundedInteger(body.puerto, 1, 65535, null);
    if (port === null) {
      const error = new Error('El puerto debe estar entre 1 y 65535.');
      error.statusCode = 400;
      error.code = 'DEVICE_PORT_INVALID';
      throw error;
    }
  }

  return {
    code,
    name,
    manufacturer: step8j3NullableText(
      body.fabricante ?? body.manufacturer,
      120
    ),
    model: step8j3NullableText(body.modelo ?? body.model, 120),
    serialNumber: step8j3NullableText(
      body.numero_serie ?? body.serialNumber ?? body.serial,
      160
    ),
    location: step8j3NullableText(
      body.ubicacion ?? body.location,
      180
    ),
    ipAddress: step8j3NullableText(
      body.ip_address ?? body.ipAddress,
      64
    ),
    port,
    macAddress: step8j3NullableText(
      cleanUpper(body.mac_address ?? body.macAddress, 32),
      32
    ),
    firmwareVersion: step8j3NullableText(
      body.version_firmware ?? body.firmwareVersion,
      80
    ),
    sdkVersion: step8j3NullableText(
      body.version_sdk ?? body.sdkVersion,
      80
    ),
    agentId: step8j3NullableText(
      body.agente_id ?? body.agentId,
      160
    ),
    connectionType,
    state,
    automaticSync: step8j3Boolean(
      body.sincronizacion_automatica ?? body.automaticSync,
      null
    ),
    active: step8j3Boolean(body.activo ?? body.active, null),
    message: step8j3NullableText(
      body.mensaje ?? body.message,
      500
    ),
  };
}

function step8j3DeviceSelect(alias = 'd') {
  return `
    ${alias}.id,
    ${alias}.codigo,
    ${alias}.nombre,
    ${alias}.fabricante,
    ${alias}.modelo,
    ${alias}.numero_serie,
    ${alias}.ubicacion,
    ${alias}.ip_address,
    ${alias}.puerto,
    ${alias}.mac_address,
    ${alias}.version_firmware,
    ${alias}.version_sdk,
    ${alias}.agente_id,
    ${alias}.tipo_conexion,
    ${deviceStateSql(alias)} AS estado_actual,
    ${alias}.estado AS estado_reportado,
    ${alias}.porcentaje_senal,
    ${alias}.registros_pendientes,
    ${alias}.plantillas_registradas,
    ${alias}.sincronizacion_automatica,
    ${alias}.activo,
    ${alias}.mensaje,
    ${alias}.ultima_actividad_en,
    ${alias}.ultima_sincronizacion_en,
    ${alias}.ultimo_diagnostico_en,
    ${alias}.ultima_latencia_ms,
    ${alias}.ultimo_error_codigo,
    ${alias}.diagnostico_detalle,
    ${alias}.retirado_en,
    ${alias}.creado_en,
    ${alias}.actualizado_en`;
}

async function step8j3LoadDevice(client, deviceId) {
  const result = await client.query(
    `SELECT ${step8j3DeviceSelect('d')}
     FROM dispositivos_biometricos d
     WHERE d.id = $1`,
    [deviceId]
  );

  return result.rows[0] ?? null;
}

function step8j3ReportedDevice(payload) {
  const candidates = [
    payload?.result?.device,
    payload?.result?.reader,
    payload?.device,
    payload?.reader,
  ];

  const value = candidates.find(
    (candidate) => candidate && typeof candidate === 'object'
  );

  return value ?? {};
}

function step8j3DeviceMatches(registered, reported) {
  const registeredCode = cleanUpper(registered?.codigo, 80);
  const reportedCode = cleanUpper(
    reported?.codigo ?? reported?.code,
    80
  );
  const registeredSerial = cleanUpper(
    registered?.numero_serie,
    160
  );
  const reportedSerial = cleanUpper(
    reported?.numero_serie ??
      reported?.serialNumber ??
      reported?.serial,
    160
  );

  if (reportedCode && registeredCode === reportedCode) return true;
  if (
    reportedSerial &&
    registeredSerial &&
    registeredSerial === reportedSerial
  ) {
    return true;
  }

  return false;
}

async function step8j3RegisterDeviceEvent(
  client,
  req,
  deviceId,
  type,
  result,
  detail
) {
  await client.query(
    `INSERT INTO eventos_biometricos (
       tipo,
       resultado,
       dispositivo_id,
       detalle,
       usuario_id,
       ip_origen
     )
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)`,
    [
      type,
      result,
      deviceId,
      JSON.stringify(detail ?? {}),
      Number(req.user.id) || null,
      requestIp(req),
    ]
  );
}

async function step8j3ExecuteRealDiagnostic(req, deviceId) {
  const currentResult = await pool.query(
    `SELECT *
     FROM dispositivos_biometricos
     WHERE id = $1`,
    [deviceId]
  );
  const current = currentResult.rows[0];

  if (!current) {
    const error = new Error('No se encontró el lector biométrico.');
    error.statusCode = 404;
    error.code = 'DEVICE_NOT_FOUND';
    throw error;
  }

  const startedAt = Date.now();
  let bridgeStatus = null;
  let diagnosticPayload = null;
  let reported = {};
  let diagnosticOk = false;
  let matched = false;
  let state = 'DESCONECTADO';
  let result = 'FALLIDO';
  let message = 'El puente biométrico no está disponible.';
  let errorCode = null;

  try {
    bridgeStatus = await bridgeRequest('/health', {
      timeoutMs: 6000,
    });

    if (
      bridgeStatus?.adapterConfigured !== true ||
      bridgeStatus?.adapterAvailable !== true
    ) {
      state = 'ADVERTENCIA';
      result = 'ADVERTENCIA';
      errorCode = bridgeStatus?.adapterConfigured
        ? 'ADAPTER_NOT_AVAILABLE'
        : 'ADAPTER_NOT_CONFIGURED';
      message = bridgeStatus?.message ||
        'El puente está activo, pero el adaptador del fabricante no está disponible.';
    } else {
      diagnosticPayload = await bridgeRequest('/diagnostic', {
        method: 'POST',
        body: {},
        timeoutMs: 25000,
      });
      reported = step8j3ReportedDevice(diagnosticPayload);
      diagnosticOk =
        diagnosticPayload?.ok !== false &&
        diagnosticPayload?.result?.ok !== false;
      matched = step8j3DeviceMatches(current, reported);

      if (diagnosticOk && matched) {
        state = 'CONECTADO';
        result = 'EXITOSO';
        message = 'El lector respondió mediante el SDK y coincide con el registro institucional.';
      } else if (diagnosticOk) {
        state = 'ADVERTENCIA';
        result = 'ADVERTENCIA';
        errorCode = 'DEVICE_IDENTITY_MISMATCH';
        message =
          'El SDK respondió, pero el lector configurado no coincide con el código o número de serie registrado.';
      } else {
        state = 'DESCONECTADO';
        result = 'FALLIDO';
        errorCode = cleanUpper(
          diagnosticPayload?.result?.code ??
            diagnosticPayload?.code ??
            'SDK_DIAGNOSTIC_FAILED',
          80
        );
        message = cleanText(
          diagnosticPayload?.result?.error ??
            diagnosticPayload?.result?.message ??
            diagnosticPayload?.error ??
            'El SDK rechazó el diagnóstico.',
          500
        );
      }
    }
  } catch (error) {
    errorCode = cleanUpper(
      error?.code ?? 'BRIDGE_UNAVAILABLE',
      80
    );
    message = cleanText(
      error?.message ??
        'No se pudo conectar con el puente biométrico local.',
      500
    );
    state = 'DESCONECTADO';
    result = 'FALLIDO';
  }

  const latencyMs = Math.max(Date.now() - startedAt, 0);
  const detail = {
    source: 'PASO_8J3_DIAGNOSTICO_REAL',
    tested_at: new Date().toISOString(),
    latency_ms: latencyMs,
    bridge: bridgeStatus
      ? {
          online: true,
          bridgeVersion: bridgeStatus.bridgeVersion ?? null,
          protocolVersion: bridgeStatus.protocolVersion ?? null,
          adapterConfigured: bridgeStatus.adapterConfigured === true,
          adapterAvailable: bridgeStatus.adapterAvailable === true,
        }
      : {
          online: false,
        },
    matched,
    registered_device: {
      codigo: current.codigo,
      numero_serie: current.numero_serie,
    },
    reported_device: reported,
    diagnostic_result:
      diagnosticPayload?.result &&
      typeof diagnosticPayload.result === 'object'
        ? diagnosticPayload.result
        : {},
    stores_raw_images: false,
  };

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE dispositivos_biometricos
       SET estado = $2,
           porcentaje_senal = $3,
           mensaje = $4,
           ultimo_diagnostico_en = CURRENT_TIMESTAMP,
           ultima_latencia_ms = $5,
           ultimo_error_codigo = $6,
           diagnostico_detalle = $7::jsonb,
           ultima_actividad_en = CASE
             WHEN $8 = TRUE THEN CURRENT_TIMESTAMP
             ELSE ultima_actividad_en
           END,
           fabricante = COALESCE(NULLIF($9, ''), fabricante),
           modelo = COALESCE(NULLIF($10, ''), modelo),
           numero_serie = COALESCE(NULLIF($11, ''), numero_serie),
           version_firmware = COALESCE(NULLIF($12, ''), version_firmware),
           version_sdk = COALESCE(NULLIF($13, ''), version_sdk),
           agente_id = COALESCE(NULLIF($14, ''), agente_id),
           actualizado_por = $15,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        deviceId,
        state,
        state === 'CONECTADO' ? 100 : state === 'ADVERTENCIA' ? 55 : 0,
        message,
        latencyMs,
        errorCode,
        JSON.stringify(detail),
        diagnosticOk && matched,
        cleanText(reported?.fabricante ?? reported?.manufacturer, 120),
        cleanText(reported?.modelo ?? reported?.model, 120),
        cleanText(
          reported?.numero_serie ??
            reported?.serialNumber ??
            reported?.serial,
          160
        ),
        cleanText(
          reported?.version_firmware ?? reported?.firmwareVersion,
          80
        ),
        cleanText(reported?.version_sdk ?? reported?.sdkVersion, 80),
        cleanText(reported?.agente_id ?? reported?.agentId, 160),
        Number(req.user.id) || null,
      ]
    );

    await step8j3RegisterDeviceEvent(
      client,
      req,
      deviceId,
      'DIAGNOSTICO_REAL',
      result,
      detail
    );

    await registerAudit(
      client,
      req,
      'DIAGNOSTICAR_LECTOR_BIOMETRICO',
      'dispositivos_biometricos',
      deviceId,
      {
        resultado: result,
        estado: state,
        latencia_ms: latencyMs,
        codigo_error: errorCode,
        coincidencia_identidad: matched,
      }
    );

    await client.query('COMMIT');

    return {
      ok: result === 'EXITOSO',
      result,
      state,
      message,
      latencyMs,
      errorCode,
      matched,
      bridgeStatus,
      detail,
      device: updated.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

router.post('/dispositivos', async (req, res) => {
  let input;

  try {
    input = step8j3DeviceInput(req.body, {
      requireIdentity: true,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message,
      code: error.code,
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO dispositivos_biometricos (
         codigo,
         nombre,
         fabricante,
         modelo,
         numero_serie,
         ubicacion,
         ip_address,
         puerto,
         mac_address,
         version_firmware,
         version_sdk,
         agente_id,
         tipo_conexion,
         estado,
         sincronizacion_automatica,
         activo,
         mensaje,
         creado_por,
         actualizado_por
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
         $11, $12, $13, $14, $15, $16, $17, $18, $18
       )
       RETURNING id`,
      [
        input.code,
        input.name,
        input.manufacturer,
        input.model,
        input.serialNumber,
        input.location,
        input.ipAddress,
        input.port,
        input.macAddress,
        input.firmwareVersion,
        input.sdkVersion,
        input.agentId,
        input.connectionType,
        input.state ?? 'DESCONECTADO',
        input.automaticSync ?? true,
        input.active ?? true,
        input.message ?? 'Lector registrado; pendiente de diagnóstico real.',
        Number(req.user.id) || null,
      ]
    );

    const deviceId = inserted.rows[0].id;

    await step8j3RegisterDeviceEvent(
      client,
      req,
      deviceId,
      'DISPOSITIVO_REGISTRADO',
      'EXITOSO',
      {
        codigo: input.code,
        tipo_conexion: input.connectionType,
        stores_raw_images: false,
      }
    );

    await registerAudit(
      client,
      req,
      'REGISTRAR_LECTOR_BIOMETRICO',
      'dispositivos_biometricos',
      deviceId,
      {
        codigo: input.code,
        nombre: input.name,
        tipo_conexion: input.connectionType,
      }
    );

    const device = await step8j3LoadDevice(client, deviceId);
    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Lector biométrico registrado correctamente.',
      device,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(409).json({
        error:
          'Ya existe un lector con el mismo código o número de serie.',
        code: 'DEVICE_DUPLICATE',
      });
    }

    console.error('Error al registrar lector biométrico:', error);
    return res.status(500).json({
      error: 'No se pudo registrar el lector biométrico.',
    });
  } finally {
    client.release();
  }
});

router.get('/dispositivos/:id', async (req, res) => {
  const deviceId = positiveInteger(req.params.id);

  if (!deviceId) {
    return res.status(400).json({
      error: 'El lector indicado no es válido.',
    });
  }

  try {
    const [deviceResult, eventResult] = await Promise.all([
      pool.query(
        `SELECT ${step8j3DeviceSelect('d')}
         FROM dispositivos_biometricos d
         WHERE d.id = $1`,
        [deviceId]
      ),
      pool.query(
        `SELECT
           e.id,
           e.tipo AS type,
           e.resultado AS result,
           e.detalle AS detail,
           e.creado_en AS created_at,
           COALESCE(u.email, 'Sistema') AS performed_by
         FROM eventos_biometricos e
         LEFT JOIN usuarios u ON u.id = e.usuario_id
         WHERE e.dispositivo_id = $1
         ORDER BY e.creado_en DESC, e.id DESC
         LIMIT 40`,
        [deviceId]
      ),
    ]);

    if (!deviceResult.rows[0]) {
      return res.status(404).json({
        error: 'No se encontró el lector biométrico.',
      });
    }

    return res.json({
      device: deviceResult.rows[0],
      events: eventResult.rows,
      security: {
        storesRawImages: false,
        diagnosticsUseLocalBridge: true,
      },
    });
  } catch (error) {
    console.error('Error al consultar detalle del lector:', error);
    return res.status(500).json({
      error: 'No se pudo consultar el detalle del lector.',
    });
  }
});

router.put('/dispositivos/:id', async (req, res) => {
  const deviceId = positiveInteger(req.params.id);

  if (!deviceId) {
    return res.status(400).json({
      error: 'El lector indicado no es válido.',
    });
  }

  let input;

  try {
    input = step8j3DeviceInput(req.body, {
      requireIdentity: true,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      error: error.message,
      code: error.code,
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE dispositivos_biometricos
       SET codigo = $2,
           nombre = $3,
           fabricante = $4,
           modelo = $5,
           numero_serie = $6,
           ubicacion = $7,
           ip_address = $8,
           puerto = $9,
           mac_address = $10,
           version_firmware = $11,
           version_sdk = $12,
           agente_id = $13,
           tipo_conexion = $14,
           sincronizacion_automatica = COALESCE($15, sincronizacion_automatica),
           activo = COALESCE($16, activo),
           retirado_en = CASE
             WHEN COALESCE($16, activo) = FALSE
               THEN COALESCE(retirado_en, CURRENT_TIMESTAMP)
             ELSE NULL
           END,
           retirado_por = CASE
             WHEN COALESCE($16, activo) = FALSE THEN $18
             ELSE NULL
           END,
           mensaje = COALESCE($17, mensaje),
           actualizado_por = $18,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [
        deviceId,
        input.code,
        input.name,
        input.manufacturer,
        input.model,
        input.serialNumber,
        input.location,
        input.ipAddress,
        input.port,
        input.macAddress,
        input.firmwareVersion,
        input.sdkVersion,
        input.agentId,
        input.connectionType,
        input.automaticSync,
        input.active,
        input.message,
        Number(req.user.id) || null,
      ]
    );

    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'No se encontró el lector biométrico.',
      });
    }

    await registerAudit(
      client,
      req,
      'ACTUALIZAR_LECTOR_BIOMETRICO',
      'dispositivos_biometricos',
      deviceId,
      {
        codigo: input.code,
        nombre: input.name,
        tipo_conexion: input.connectionType,
        sincronizacion_automatica: input.automaticSync,
        activo: input.active,
      }
    );

    const device = await step8j3LoadDevice(client, deviceId);
    await client.query('COMMIT');

    return res.json({
      message: 'Lector biométrico actualizado correctamente.',
      device,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      return res.status(409).json({
        error:
          'Ya existe un lector con el mismo código o número de serie.',
        code: 'DEVICE_DUPLICATE',
      });
    }

    console.error('Error al actualizar lector biométrico:', error);
    return res.status(500).json({
      error: 'No se pudo actualizar el lector biométrico.',
    });
  } finally {
    client.release();
  }
});

router.post('/dispositivos/:id/accion', async (req, res) => {
  const deviceId = positiveInteger(req.params.id);
  const action = cleanUpper(req.body?.accion ?? req.body?.action, 40);
  const allowed = new Set([
    'ACTIVAR',
    'REACTIVAR',
    'MANTENIMIENTO',
    'RETIRAR',
  ]);

  if (!deviceId || !allowed.has(action)) {
    return res.status(400).json({
      error: 'El lector o la acción indicada no es válida.',
    });
  }

  const next = {
    ACTIVAR: {
      active: true,
      state: 'DESCONECTADO',
      message: 'Lector activado; pendiente de diagnóstico.',
    },
    REACTIVAR: {
      active: true,
      state: 'DESCONECTADO',
      message: 'Lector reactivado; pendiente de diagnóstico.',
    },
    MANTENIMIENTO: {
      active: true,
      state: 'MANTENIMIENTO',
      message: 'Lector colocado en mantenimiento por el administrador.',
    },
    RETIRAR: {
      active: false,
      state: 'DESCONECTADO',
      message: 'Lector retirado del servicio institucional.',
    },
  }[action];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE dispositivos_biometricos
       SET activo = $2,
           estado = $3,
           mensaje = $4,
           retirado_en = CASE
             WHEN $5 = 'RETIRAR' THEN CURRENT_TIMESTAMP
             ELSE NULL
           END,
           retirado_por = CASE
             WHEN $5 = 'RETIRAR' THEN $6
             ELSE NULL
           END,
           actualizado_por = $6,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [
        deviceId,
        next.active,
        next.state,
        cleanText(req.body?.motivo ?? next.message, 500),
        action,
        Number(req.user.id) || null,
      ]
    );

    if (!updated.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'No se encontró el lector biométrico.',
      });
    }

    const eventResult = action === 'RETIRAR'
      ? 'REVOCADO'
      : action === 'MANTENIMIENTO'
        ? 'ADVERTENCIA'
        : 'EXITOSO';

    await step8j3RegisterDeviceEvent(
      client,
      req,
      deviceId,
      `DISPOSITIVO_${action}`,
      eventResult,
      {
        accion: action,
        motivo: cleanText(req.body?.motivo ?? next.message, 500),
      }
    );

    await registerAudit(
      client,
      req,
      `${action}_LECTOR_BIOMETRICO`,
      'dispositivos_biometricos',
      deviceId,
      {
        accion: action,
        motivo: cleanText(req.body?.motivo ?? next.message, 500),
      }
    );

    const device = await step8j3LoadDevice(client, deviceId);
    await client.query('COMMIT');

    return res.json({
      message: next.message,
      device,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al cambiar estado del lector:', error);
    return res.status(500).json({
      error: 'No se pudo cambiar el estado del lector.',
    });
  } finally {
    client.release();
  }
});

router.post('/dispositivos/:id/diagnostico-real', async (req, res) => {
  const deviceId = positiveInteger(req.params.id);

  if (!deviceId) {
    return res.status(400).json({
      error: 'El lector indicado no es válido.',
    });
  }

  try {
    const diagnostic = await step8j3ExecuteRealDiagnostic(req, deviceId);

    return res.json({
      message: diagnostic.message,
      diagnostic,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error('Error en diagnóstico real del lector:', error);
    return res.status(500).json({
      error: 'No se pudo ejecutar el diagnóstico real.',
    });
  }
});

router.post('/dispositivos/diagnostico-general', async (req, res) => {
  try {
    const activeResult = await pool.query(
      `SELECT id, codigo, numero_serie
       FROM dispositivos_biometricos
       WHERE activo = TRUE
       ORDER BY id`
    );

    let bridgeStatus = null;
    let localDiagnostic = null;
    let matchedDevice = null;
    let warning = null;

    try {
      bridgeStatus = await bridgeRequest('/health', {
        timeoutMs: 6000,
      });

      const bridgeDevice = bridgeStatus?.device ?? {};
      matchedDevice = activeResult.rows.find((device) =>
        step8j3DeviceMatches(device, bridgeDevice)
      ) ?? null;

      if (
        matchedDevice &&
        bridgeStatus?.adapterConfigured === true &&
        bridgeStatus?.adapterAvailable === true
      ) {
        localDiagnostic = await step8j3ExecuteRealDiagnostic(
          req,
          Number(matchedDevice.id)
        );
      } else if (!matchedDevice) {
        warning =
          'El puente está activo, pero su lector configurado aún no está registrado o no coincide con los registros.';
      } else {
        warning = bridgeStatus?.message ??
          'El adaptador del fabricante no está disponible.';
      }
    } catch (error) {
      warning = cleanText(
        error?.message ??
          'El puente biométrico local no está disponible.',
        500
      );
    }

    const statusResult = await pool.query(
      `SELECT
         id,
         codigo,
         nombre,
         ${deviceStateSql('d')} AS estado_actual,
         activo,
         ultima_actividad_en,
         ultimo_diagnostico_en,
         ultima_latencia_ms,
         ultimo_error_codigo,
         mensaje
       FROM dispositivos_biometricos d
       ORDER BY nombre`
    );

    const summary = statusResult.rows.reduce(
      (current, device) => {
        current.total += 1;
        if (!device.activo) current.retired += 1;
        if (device.estado_actual === 'CONECTADO') current.connected += 1;
        if (device.estado_actual === 'ADVERTENCIA') current.warning += 1;
        if (device.estado_actual === 'DESCONECTADO') current.disconnected += 1;
        if (device.estado_actual === 'MANTENIMIENTO') current.maintenance += 1;
        return current;
      },
      {
        total: 0,
        connected: 0,
        warning: 0,
        disconnected: 0,
        maintenance: 0,
        retired: 0,
      }
    );

    const auditClient = await pool.connect();
    try {
      await registerAudit(
        auditClient,
        req,
        'DIAGNOSTICO_GENERAL_LECTORES',
        'dispositivos_biometricos',
        null,
        {
          total: summary.total,
          lector_local_diagnosticado: matchedDevice?.codigo ?? null,
          puente_activo: Boolean(bridgeStatus),
          advertencia: warning,
          metodologia:
            'El lector local se prueba mediante SDK; los demás se evalúan por heartbeat y actividad real.',
        }
      );
    } finally {
      auditClient.release();
    }

    return res.json({
      message:
        localDiagnostic?.ok
          ? 'Diagnóstico general completado. El lector local respondió y los demás fueron evaluados por actividad real.'
          : 'Diagnóstico general completado con observaciones.',
      summary,
      bridge: bridgeStatus
        ? {
            online: true,
            adapterConfigured: bridgeStatus.adapterConfigured === true,
            adapterAvailable: bridgeStatus.adapterAvailable === true,
            bridgeVersion: bridgeStatus.bridgeVersion ?? null,
            device: bridgeStatus.device ?? null,
          }
        : {
            online: false,
          },
      localDiagnostic,
      warning,
      devices: statusResult.rows,
      methodology:
        'No se simulan pruebas. Solo el lector conectado al puente se prueba mediante el SDK; los demás conservan su estado derivado de heartbeat y última actividad.',
    });
  } catch (error) {
    console.error('Error en diagnóstico general biométrico:', error);
    return res.status(500).json({
      error: 'No se pudo completar el diagnóstico general.',
    });
  }
});

// PASO_8J4_CIERRE_BIOMETRICO_ADMIN
const STEP8J4_SYNC_STATES = new Set([
  'PENDIENTE',
  'EN_PROCESO',
  'SINCRONIZADO',
  'FALLIDO',
  'CANCELADO',
]);

function step8j4Date(value) {
  const text = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text
    : null;
}

function step8j4Pagination(query = {}) {
  const page = boundedInteger(query.page, 1, 100000, 1);
  const limit = boundedInteger(query.limit, 1, 100, 25);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function step8j4HistoryWhere(query = {}) {
  const values = [];
  const clauses = [];

  function add(clause, value) {
    values.push(value);
    clauses.push(
      clause.replace('?', `${values.length}`)
    );
  }

  const search = cleanText(query.search, 120);
  const result = cleanUpper(query.result, 30);
  const type = cleanUpper(query.type, 60);
  const deviceId = positiveInteger(query.deviceId);
  const teacherId = positiveInteger(query.teacherId);
  const dateFrom = step8j4Date(query.dateFrom);
  const dateTo = step8j4Date(query.dateTo);

  if (search) {
    values.push(search);
    const placeholder = `${values.length}`;
    clauses.push(
      `(COALESCE(d.codigo, '') ILIKE '%' || ${placeholder} || '%' OR
        COALESCE(d.nombre, '') ILIKE '%' || ${placeholder} || '%' OR
        COALESCE(doc.codigo, '') ILIKE '%' || ${placeholder} || '%' OR
        COALESCE(doc.nombres, '') ILIKE '%' || ${placeholder} || '%' OR
        COALESCE(doc.apellidos, '') ILIKE '%' || ${placeholder} || '%' OR
        e.tipo ILIKE '%' || ${placeholder} || '%')`
    );
  }

  if (result) {
    add('e.resultado = ?', result);
  }

  if (type) {
    add('e.tipo = ?', type);
  }

  if (deviceId) {
    add('e.dispositivo_id = ?', deviceId);
  }

  if (teacherId) {
    add('e.docente_id = ?', teacherId);
  }

  if (dateFrom) {
    add('e.creado_en >= ?::date', dateFrom);
  }

  if (dateTo) {
    add(
      `e.creado_en < (?::date + INTERVAL '1 day')`,
      dateTo
    );
  }

  return {
    sql: clauses.length
      ? `WHERE ${clauses.join(' AND ')}`
      : '',
    values,
  };
}

router.get('/sincronizacion', async (_req, res) => {
  try {
    const [devicesResult, jobsResult, summaryResult] =
      await Promise.all([
        pool.query(
          `SELECT
             d.id,
             d.codigo,
             d.nombre,
             d.ubicacion,
             d.tipo_conexion,
             d.sincronizacion_automatica,
             d.activo,
             d.registros_pendientes,
             d.ultima_sincronizacion_en,
             d.ultima_actividad_en,
             ${deviceStateSql('d')} AS estado_actual,
             d.mensaje
           FROM dispositivos_biometricos d
           ORDER BY d.activo DESC, d.nombre ASC`
        ),
        pool.query(
          `SELECT
             s.id,
             s.dispositivo_id,
             COALESCE(d.codigo, 'LECTOR-RETIRADO') AS device_code,
             COALESCE(d.nombre, 'Lector retirado') AS device_name,
             s.estado,
             s.registros_detectados,
             s.registros_procesados,
             s.registros_fallidos,
             s.codigo_resultado,
             s.mensaje,
             s.detalle,
             s.solicitado_en,
             s.iniciado_en,
             s.completado_en,
             CONCAT_WS(' ', u.nombres, u.apellidos) AS requested_by
           FROM sincronizaciones_biometricas s
           LEFT JOIN dispositivos_biometricos d
             ON d.id = s.dispositivo_id
           LEFT JOIN usuarios u
             ON u.id = s.solicitado_por
           ORDER BY s.solicitado_en DESC
           LIMIT 100`
        ),
        pool.query(
          `SELECT
             COUNT(*)::int AS total_jobs,
             COUNT(*) FILTER (
               WHERE estado = 'SINCRONIZADO'
             )::int AS synchronized_jobs,
             COUNT(*) FILTER (
               WHERE estado = 'FALLIDO'
             )::int AS failed_jobs,
             COUNT(*) FILTER (
               WHERE estado IN ('PENDIENTE', 'EN_PROCESO')
             )::int AS pending_jobs,
             COALESCE(
               SUM(registros_detectados),
               0
             )::int AS detected_records,
             COALESCE(
               SUM(registros_procesados),
               0
             )::int AS processed_records,
             MAX(completado_en) AS last_completed_at
           FROM sincronizaciones_biometricas`
        ),
      ]);

    const deviceSummary = devicesResult.rows.reduce(
      (summary, device) => {
        summary.total += 1;
        summary.pendingRecords += Number(
          device.registros_pendientes ?? 0
        );
        if (device.sincronizacion_automatica) {
          summary.automatic += 1;
        }
        if (device.estado_actual === 'CONECTADO') {
          summary.connected += 1;
        }
        return summary;
      },
      {
        total: 0,
        connected: 0,
        automatic: 0,
        pendingRecords: 0,
      }
    );

    return res.json({
      summary: {
        ...deviceSummary,
        ...summaryResult.rows[0],
      },
      devices: devicesResult.rows,
      jobs: jobsResult.rows,
      methodology:
        'No se inventan transferencias. Un lector sin registros pendientes se verifica como sincronizado; un lector con pendientes requiere una capacidad de sincronización expuesta por el adaptador oficial.',
    });
  } catch (error) {
    console.error(
      'Error al cargar sincronización biométrica:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo cargar el control de sincronización biométrica.',
    });
  }
});

router.post(
  '/sincronizacion/:id/ejecutar',
  async (req, res) => {
    const deviceId = positiveInteger(req.params.id);

    if (!deviceId) {
      return res.status(400).json({
        error: 'El lector biométrico no es válido.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const deviceResult = await client.query(
        `SELECT
           d.*,
           ${deviceStateSql('d')} AS estado_actual
         FROM dispositivos_biometricos d
         WHERE d.id = $1
         FOR UPDATE`,
        [deviceId]
      );

      const device = deviceResult.rows[0];

      if (!device) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El lector biométrico no existe.',
        });
      }

      let bridgeStatus = null;

      if (device.tipo_conexion === 'PUENTE_LOCAL') {
        try {
          bridgeStatus = await bridgeRequest('/status', {
            method: 'GET',
            timeoutMs: 7000,
          });
        } catch (error) {
          bridgeStatus = {
            online: false,
            code:
              cleanText(error?.code, 80) ||
              'BRIDGE_UNAVAILABLE',
            message:
              cleanText(error?.message, 300) ||
              'El puente local no respondió.',
          };
        }
      }

      const detected = Math.max(
        Number(device.registros_pendientes ?? 0),
        0
      );

      let state = 'SINCRONIZADO';
      let processed = 0;
      let failed = 0;
      let resultCode = 'NO_PENDING_RECORDS';
      let message =
        'Verificación completada: el lector no reporta registros pendientes.';

      if (!device.activo) {
        state = 'FALLIDO';
        failed = detected;
        resultCode = 'DEVICE_RETIRED';
        message =
          'El lector está retirado y no puede sincronizarse.';
      } else if (
        device.estado_actual === 'MANTENIMIENTO'
      ) {
        state = 'FALLIDO';
        failed = detected;
        resultCode = 'DEVICE_MAINTENANCE';
        message =
          'El lector está en mantenimiento y no puede sincronizarse.';
      } else if (detected > 0) {
        state = 'FALLIDO';
        failed = detected;
        resultCode = 'ADAPTER_SYNC_UNSUPPORTED';
        message =
          'El lector reporta registros pendientes, pero el adaptador oficial todavía no expone una operación de transferencia. No se modificaron los contadores.';
      }

      const now = new Date();

      const insertResult = await client.query(
        `INSERT INTO sincronizaciones_biometricas (
           dispositivo_id,
           estado,
           registros_detectados,
           registros_procesados,
           registros_fallidos,
           codigo_resultado,
           mensaje,
           detalle,
           solicitado_por,
           solicitado_en,
           iniciado_en,
           completado_en,
           actualizado_en
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8::jsonb, $9,
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
         )
         RETURNING *`,
        [
          deviceId,
          state,
          detected,
          processed,
          failed,
          resultCode,
          message,
          JSON.stringify({
            source:
              'PASO_8J4_SINCRONIZACION_REAL',
            deviceState: device.estado_actual,
            connectionType: device.tipo_conexion,
            bridge: bridgeStatus,
            rawImagesStored: false,
            countersModified: false,
            checkedAt: now.toISOString(),
          }),
          Number(req.user.id) || null,
        ]
      );

      if (state === 'SINCRONIZADO') {
        await client.query(
          `UPDATE dispositivos_biometricos
           SET ultima_sincronizacion_en =
                 CURRENT_TIMESTAMP,
               actualizado_en =
                 CURRENT_TIMESTAMP,
               actualizado_por = $2,
               mensaje = $3
           WHERE id = $1`,
          [
            deviceId,
            Number(req.user.id) || null,
            message,
          ]
        );
      }

      const eventResult =
        state === 'SINCRONIZADO'
          ? 'EXITOSO'
          : 'FALLIDO';

      await client.query(
        `INSERT INTO eventos_biometricos (
           tipo,
           resultado,
           dispositivo_id,
           detalle,
           usuario_id,
           ip_origen
         )
         VALUES (
           'SINCRONIZACION_DISPOSITIVO',
           $1,
           $2,
           $3::jsonb,
           $4,
           $5
         )`,
        [
          eventResult,
          deviceId,
          JSON.stringify({
            synchronizationId:
              insertResult.rows[0].id,
            resultCode,
            detected,
            processed,
            failed,
            message,
          }),
          Number(req.user.id) || null,
          requestIp(req),
        ]
      );

      await registerAudit(
        client,
        req,
        'EJECUTAR_SINCRONIZACION_BIOMETRICA',
        'sincronizaciones_biometricas',
        insertResult.rows[0].id,
        {
          deviceId,
          deviceCode: device.codigo,
          state,
          resultCode,
          detected,
          processed,
          failed,
          rawImagesStored: false,
        }
      );

      await client.query('COMMIT');

      return res.status(201).json({
        message,
        job: {
          ...insertResult.rows[0],
          device_code: device.codigo,
          device_name: device.nombre,
        },
        honestExecution: true,
      });
    } catch (error) {
      await client
        .query('ROLLBACK')
        .catch(() => undefined);
      console.error(
        'Error al ejecutar sincronización biométrica:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo ejecutar la verificación de sincronización.',
      });
    } finally {
      client.release();
    }
  }
);

router.get('/historial', async (req, res) => {
  try {
    const pagination = step8j4Pagination(req.query);
    const where = step8j4HistoryWhere(req.query);
    const limitIndex = where.values.length + 1;
    const offsetIndex = where.values.length + 2;

    const [rowsResult, countResult, summaryResult] =
      await Promise.all([
        pool.query(
          `SELECT
             e.id,
             e.tipo,
             e.resultado,
             e.calidad,
             e.detalle,
             e.creado_en,
             e.docente_id,
             e.dispositivo_id,
             doc.codigo AS teacher_code,
             CONCAT_WS(
               ' ',
               doc.nombres,
               doc.apellidos
             ) AS teacher,
             doc.departamento AS department,
             d.codigo AS device_code,
             d.nombre AS device_name,
             CONCAT_WS(
               ' ',
               u.nombres,
               u.apellidos
             ) AS performed_by
           FROM eventos_biometricos e
           LEFT JOIN docentes doc
             ON doc.id = e.docente_id
           LEFT JOIN dispositivos_biometricos d
             ON d.id = e.dispositivo_id
           LEFT JOIN usuarios u
             ON u.id = e.usuario_id
           ${where.sql}
           ORDER BY e.creado_en DESC, e.id DESC
           LIMIT ${limitIndex}
           OFFSET ${offsetIndex}`,
          [
            ...where.values,
            pagination.limit,
            pagination.offset,
          ]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM eventos_biometricos e
           LEFT JOIN docentes doc
             ON doc.id = e.docente_id
           LEFT JOIN dispositivos_biometricos d
             ON d.id = e.dispositivo_id
           ${where.sql}`,
          where.values
        ),
        pool.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE e.resultado = 'EXITOSO'
             )::int AS successful,
             COUNT(*) FILTER (
               WHERE e.resultado = 'FALLIDO'
             )::int AS failed,
             COUNT(*) FILTER (
               WHERE e.resultado = 'ADVERTENCIA'
             )::int AS warnings,
             COUNT(*) FILTER (
               WHERE e.resultado = 'REVOCADO'
             )::int AS revoked,
             COUNT(DISTINCT e.docente_id)
               FILTER (
                 WHERE e.docente_id IS NOT NULL
               )::int AS teachers,
             COUNT(DISTINCT e.dispositivo_id)
               FILTER (
                 WHERE e.dispositivo_id IS NOT NULL
               )::int AS devices
           FROM eventos_biometricos e
           LEFT JOIN docentes doc
             ON doc.id = e.docente_id
           LEFT JOIN dispositivos_biometricos d
             ON d.id = e.dispositivo_id
           ${where.sql}`,
          where.values
        ),
      ]);

    const total = Number(
      countResult.rows[0]?.total ?? 0
    );

    return res.json({
      summary: summaryResult.rows[0],
      records: rowsResult.rows,
      pagination: {
        ...pagination,
        total,
        totalPages: Math.max(
          Math.ceil(total / pagination.limit),
          1
        ),
      },
      security: {
        storesRawImages: false,
        containsTemplates: false,
      },
    });
  } catch (error) {
    console.error(
      'Error al consultar historial biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo consultar el historial biométrico.',
    });
  }
});

router.get('/reportes', async (req, res) => {
  try {
    const dateFrom =
      step8j4Date(req.query.dateFrom) ||
      new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10);
    const dateTo =
      step8j4Date(req.query.dateTo) ||
      new Date().toISOString().slice(0, 10);

    if (dateFrom > dateTo) {
      return res.status(400).json({
        error:
          'La fecha inicial no puede ser posterior a la fecha final.',
      });
    }

    const rangeValues = [dateFrom, dateTo];
    const rangeSql =
      `e.creado_en >= $1::date AND
       e.creado_en < ($2::date + INTERVAL '1 day')`;

    const [
      eventSummaryResult,
      byResultResult,
      byTypeResult,
      byDeviceResult,
      byDepartmentResult,
      qualityResult,
      deviceResult,
      syncResult,
      integrityResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS total_events,
           COUNT(*) FILTER (
             WHERE resultado = 'EXITOSO'
           )::int AS successful_events,
           COUNT(*) FILTER (
             WHERE resultado = 'FALLIDO'
           )::int AS failed_events,
           COUNT(*) FILTER (
             WHERE resultado = 'ADVERTENCIA'
           )::int AS warning_events,
           COUNT(*) FILTER (
             WHERE resultado = 'REVOCADO'
           )::int AS revoked_events,
           COUNT(DISTINCT docente_id)
             FILTER (
               WHERE docente_id IS NOT NULL
             )::int AS involved_teachers,
           COUNT(DISTINCT dispositivo_id)
             FILTER (
               WHERE dispositivo_id IS NOT NULL
             )::int AS involved_devices
         FROM eventos_biometricos e
         WHERE ${rangeSql}`,
        rangeValues
      ),
      pool.query(
        `SELECT
           resultado AS label,
           COUNT(*)::int AS value
         FROM eventos_biometricos e
         WHERE ${rangeSql}
         GROUP BY resultado
         ORDER BY value DESC, label`,
        rangeValues
      ),
      pool.query(
        `SELECT
           tipo AS label,
           COUNT(*)::int AS value
         FROM eventos_biometricos e
         WHERE ${rangeSql}
         GROUP BY tipo
         ORDER BY value DESC, label
         LIMIT 12`,
        rangeValues
      ),
      pool.query(
        `SELECT
           COALESCE(d.codigo, 'SIN-DISPOSITIVO') AS code,
           COALESCE(d.nombre, 'Sin dispositivo asociado') AS label,
           COUNT(*)::int AS value,
           COUNT(*) FILTER (
             WHERE e.resultado = 'FALLIDO'
           )::int AS failed
         FROM eventos_biometricos e
         LEFT JOIN dispositivos_biometricos d
           ON d.id = e.dispositivo_id
         WHERE ${rangeSql}
         GROUP BY d.codigo, d.nombre
         ORDER BY value DESC, label
         LIMIT 10`,
        rangeValues
      ),
      pool.query(
        `SELECT
           COALESCE(
             doc.departamento,
             'Sin departamento'
           ) AS label,
           COUNT(*)::int AS value,
           COUNT(DISTINCT e.docente_id)
             FILTER (
               WHERE e.docente_id IS NOT NULL
             )::int AS teachers
         FROM eventos_biometricos e
         LEFT JOIN docentes doc
           ON doc.id = e.docente_id
         WHERE ${rangeSql}
         GROUP BY doc.departamento
         ORDER BY value DESC, label
         LIMIT 12`,
        rangeValues
      ),
      pool.query(
        `SELECT
           ROUND(AVG(calidad)::numeric, 2) AS average,
           MIN(calidad)::int AS minimum,
           MAX(calidad)::int AS maximum,
           COUNT(*) FILTER (
             WHERE calidad IS NOT NULL
           )::int AS samples
         FROM eventos_biometricos e
         WHERE ${rangeSql}`,
        rangeValues
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total_devices,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'CONECTADO'
           )::int AS connected_devices,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'ADVERTENCIA'
           )::int AS warning_devices,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'DESCONECTADO'
           )::int AS disconnected_devices,
           COUNT(*) FILTER (
             WHERE ${deviceStateSql('d')} = 'MANTENIMIENTO'
           )::int AS maintenance_devices,
           COALESCE(
             SUM(registros_pendientes),
             0
           )::int AS pending_records
         FROM dispositivos_biometricos d
         WHERE d.activo = TRUE`
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS total_jobs,
           COUNT(*) FILTER (
             WHERE estado = 'SINCRONIZADO'
           )::int AS synchronized_jobs,
           COUNT(*) FILTER (
             WHERE estado = 'FALLIDO'
           )::int AS failed_jobs,
           COALESCE(
             SUM(registros_detectados),
             0
           )::int AS detected_records,
           COALESCE(
             SUM(registros_procesados),
             0
           )::int AS processed_records
         FROM sincronizaciones_biometricas
         WHERE solicitado_en >= $1::date
           AND solicitado_en <
             ($2::date + INTERVAL '1 day')`,
        rangeValues
      ),
      pool.query(
        `SELECT
           (SELECT COUNT(*)::int
            FROM datos_biometricos
            WHERE activo = TRUE) AS active_templates,
           (SELECT COUNT(DISTINCT docente_id)::int
            FROM datos_biometricos
            WHERE activo = TRUE) AS enrolled_teachers,
           (SELECT COUNT(*)::int
            FROM datos_biometricos
            WHERE activo = TRUE
              AND (
                plantilla_hash IS NULL OR
                plantilla_hash !~ '^[a-f0-9]{64}

              )) AS invalid_hashes,
           (SELECT COUNT(*)::int
            FROM datos_biometricos
            WHERE metadata ?| ARRAY[
              'image',
              'rawImage',
              'raw_image',
              'fingerprintImage'
            ]) AS suspicious_raw_metadata`
      ),
    ]);

    return res.json({
      generatedAt: new Date().toISOString(),
      range: {
        dateFrom,
        dateTo,
      },
      summary: {
        ...eventSummaryResult.rows[0],
        ...deviceResult.rows[0],
        ...syncResult.rows[0],
        ...integrityResult.rows[0],
      },
      byResult: byResultResult.rows,
      byType: byTypeResult.rows,
      byDevice: byDeviceResult.rows,
      byDepartment: byDepartmentResult.rows,
      quality: qualityResult.rows[0],
      integrity: {
        ...integrityResult.rows[0],
        templateKeyConfigured:
          Boolean(
            cleanText(
              process.env.BIOMETRIC_TEMPLATE_KEY,
              500
            )
          ),
        storesRawImages: false,
        encryption: 'AES-256-GCM',
      },
      methodology:
        'El reporte agrega únicamente eventos, contadores y metadatos operativos. No devuelve plantillas ni imágenes biométricas.',
    });
  } catch (error) {
    console.error(
      'Error al generar reporte biométrico:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo generar el reporte biométrico.',
    });
  }
});

router.get('/integridad', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         to_regclass(
           'public.dispositivos_biometricos'
         ) IS NOT NULL AS devices_table,
         to_regclass(
           'public.eventos_biometricos'
         ) IS NOT NULL AS events_table,
         to_regclass(
           'public.sincronizaciones_biometricas'
         ) IS NOT NULL AS synchronization_table,
         (SELECT COUNT(*)::int
          FROM datos_biometricos
          WHERE activo = TRUE) AS active_templates,
         (SELECT COUNT(*)::int
          FROM datos_biometricos
          WHERE activo = TRUE
            AND plantilla_hash IS NULL) AS missing_hashes,
         (SELECT COUNT(*)::int
          FROM datos_biometricos
          WHERE metadata ?| ARRAY[
            'image',
            'rawImage',
            'raw_image',
            'fingerprintImage'
          ]) AS suspicious_raw_metadata`
    );

    return res.json({
      ...result.rows[0],
      templateKeyConfigured:
        Boolean(
          cleanText(
            process.env.BIOMETRIC_TEMPLATE_KEY,
            500
          )
        ),
      storesRawImages: false,
      encryption: 'AES-256-GCM',
      closedModules: [
        'DASHBOARD',
        'CAPTURA',
        'DISPOSITIVOS',
        'SINCRONIZACION',
        'HISTORIAL',
        'REPORTES',
      ],
    });
  } catch (error) {
    console.error(
      'Error al verificar integridad biométrica:',
      error
    );
    return res.status(500).json({
      error:
        'No se pudo verificar la integridad biométrica.',
    });
  }
});

module.exports = router;
