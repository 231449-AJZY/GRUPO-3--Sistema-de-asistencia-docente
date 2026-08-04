const router = require('express').Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');
const {
  validateBlePresence,
} = require('../services/ble-presence.service');

const CHALLENGE_TTL_SECONDS = 90;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_CHALLENGES = 12;
const RATE_MAX_SUBMISSIONS = 20;
const requestBuckets = new Map();

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanUpperText(value, maxLength = 255) {
  return cleanText(value, maxLength).toUpperCase();
}

function cleanBase64(value, maxLength = 16384) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .slice(0, maxLength);
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isInstallationId(value) {
  return /^[A-Za-z0-9._:-]{16,120}$/.test(value);
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

function isValidSignature(value) {
  return (
    value.length >= 80 &&
    value.length <= 2048 &&
    /^[A-Za-z0-9+/=]+$/.test(value)
  );
}

function hashText(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('hex');
}

function clientIp(req) {
  return cleanText(
    req.ip || req.socket?.remoteAddress || '',
    100
  );
}

function consumeRate(req, scope, maxAttempts) {
  const now = Date.now();
  const key = `${scope}:${clientIp(req) || 'unknown'}`;
  const current = requestBuckets.get(key);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, attempts: 1 });
    return true;
  }

  if (current.attempts >= maxAttempts) {
    return false;
  }

  current.attempts += 1;
  return true;
}

setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [key, value] of requestBuckets.entries()) {
    if (value.startedAt < cutoff) {
      requestBuckets.delete(key);
    }
  }
}, RATE_WINDOW_MS).unref();

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

async function getInstitutionClock(client) {
  const result = await client.query(
    `WITH settings AS (
       SELECT COALESCE(
         (SELECT zona_horaria
          FROM configuracion_institucional
          WHERE id = 1),
         'America/Lima'
       ) AS zona_horaria
     )
     SELECT
       zona_horaria,
       (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria)::date AS fecha_local,
       (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria)::time AS hora_local,
       (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria) AS fecha_hora_local,
       EXTRACT(
         ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE zona_horaria
       )::int AS dia_semana
     FROM settings`
  );

  return result.rows[0];
}

async function findEligibleSchedule(client, teacherId) {
  const result = await client.query(
    `WITH settings AS (
       SELECT COALESCE(
         (SELECT zona_horaria
          FROM configuracion_institucional
          WHERE id = 1),
         'America/Lima'
       ) AS zona_horaria
     ),
     clock AS (
       SELECT
         (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria)::date AS fecha_local,
         (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria)::time AS hora_local,
         EXTRACT(
           ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE zona_horaria
         )::int AS dia_semana
       FROM settings
     ),
     attendance_config AS (
       SELECT
         COALESCE(tolerancia_antes_minutos, 15)::int AS antes,
         COALESCE(tolerancia_despues_minutos, 10)::int AS despues
       FROM configuracion_asistencia
       ORDER BY id
       LIMIT 1
     )
     SELECT
       hc.id AS horario_curso_id,
       hc.docente_id,
       hc.curso_id,
       hc.semestre_id,
       hc.aula,
       hc.dia_semana,
       hc.hora_inicio,
       hc.hora_fin,
       c.codigo AS codigo_curso,
       c.nombre AS curso,
       s.codigo AS semestre,
       clock.fecha_local,
       clock.hora_local,
       attendance_config.antes,
       attendance_config.despues
     FROM horarios_curso hc
     JOIN cursos c
       ON c.id = hc.curso_id
     JOIN semestres s
       ON s.id = hc.semestre_id
     CROSS JOIN clock
     CROSS JOIN attendance_config
     WHERE hc.docente_id = $1
       AND hc.activo = TRUE
       AND c.activo = TRUE
       AND s.activo = TRUE
       AND clock.fecha_local BETWEEN s.fecha_inicio AND s.fecha_fin
       AND hc.dia_semana = clock.dia_semana
       AND clock.hora_local BETWEEN
         hc.hora_inicio - make_interval(mins => attendance_config.antes)
         AND hc.hora_inicio + make_interval(mins => attendance_config.despues)
     ORDER BY ABS(
       EXTRACT(
         EPOCH FROM (clock.hora_local - hc.hora_inicio)
       )
     )
     LIMIT 1`,
    [teacherId]
  );

  return result.rows[0] ?? null;
}

function verifyEcdsaSignature(publicKeyBase64, payload, signatureBase64) {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(
      'sha256',
      Buffer.from(payload, 'utf8'),
      publicKey,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch (error) {
    console.error('No se pudo verificar la firma ECDSA:', error);
    return false;
  }
}

// POST /api/asistencia-movil/clave
// Registra una clave exclusiva de asistencia, protegida por biometría por uso.
router.post(
  '/clave',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error: 'La cuenta no tiene un perfil docente asociado.',
      });
    }

    const installationId = cleanText(
      req.body.uuid_instalacion ?? req.body.installationId,
      120
    );
    const publicKey = cleanBase64(
      req.body.clave_publica ?? req.body.publicKey
    );
    const fingerprint = normalizeFingerprint(
      req.body.huella_clave ?? req.body.keyFingerprint
    );

    if (!isInstallationId(installationId)) {
      return res.status(400).json({
        error: 'No se pudo identificar esta instalación móvil.',
      });
    }

    if (!isValidPublicKey(publicKey) || !fingerprint) {
      return res.status(400).json({
        error: 'La clave biométrica de asistencia no es válida.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const deviceResult = await client.query(
        `SELECT
           id,
           usuario_id,
           docente_id,
           estado,
           clave_publica_asistencia,
           huella_clave_asistencia
         FROM dispositivos_moviles
         WHERE uuid_instalacion = $1
           AND usuario_id = $2
           AND docente_id = $3
         FOR UPDATE`,
        [
          installationId,
          req.user.usuario_id,
          req.user.docente_id,
        ]
      );

      const device = deviceResult.rows[0];

      if (!device) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Este celular no está vinculado a la cuenta docente.',
        });
      }

      if (device.estado !== 'AUTORIZADO') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'El administrador debe autorizar el celular antes de preparar la firma de asistencia.',
        });
      }

      const conflictResult = await client.query(
        `SELECT id
         FROM dispositivos_moviles
         WHERE huella_clave_asistencia = $1
           AND id <> $2
         LIMIT 1`,
        [fingerprint, device.id]
      );

      if (conflictResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'La clave biométrica de asistencia ya pertenece a otro dispositivo.',
        });
      }

      const changed =
        device.huella_clave_asistencia !== fingerprint ||
        device.clave_publica_asistencia !== publicKey;

      await client.query(
        `UPDATE dispositivos_moviles
         SET
           clave_publica_asistencia = $1,
           huella_clave_asistencia = $2,
           algoritmo_clave_asistencia = 'EC_P256_SHA256_BIOMETRIC_PER_USE',
           clave_asistencia_registrada_en = CURRENT_TIMESTAMP,
           version_aplicacion = '0.9.3+20',
           actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [publicKey, fingerprint, device.id]
      );

      await writeAudit(
        client,
        req,
        changed
          ? 'REGISTRAR_CLAVE_ASISTENCIA_MOVIL'
          : 'CONFIRMAR_CLAVE_ASISTENCIA_MOVIL',
        'dispositivos_moviles',
        Number(device.id),
        {
          installationId,
          fingerprint,
          biometricPerUse: true,
        }
      );

      await writeMobileEvent(client, req, {
        deviceId: Number(device.id),
        usuarioId: req.user.usuario_id,
        docenteId: req.user.docente_id,
        type: changed
          ? 'CLAVE_ASISTENCIA_REGISTRADA'
          : 'CLAVE_ASISTENCIA_CONFIRMADA',
        detail: {
          fingerprint,
          biometricPerUse: true,
        },
      });

      await client.query('COMMIT');

      return res.json({
        preparada: true,
        dispositivo_id: Number(device.id),
        huella_clave: fingerprint,
        mensaje:
          'La firma biométrica de asistencia quedó preparada en este celular.',
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);

      if (error.code === '23505') {
        return res.status(409).json({
          error:
            'La clave biométrica de asistencia ya está registrada en otro celular.',
        });
      }

      console.error(
        'Error al registrar clave de asistencia móvil:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo preparar la firma biométrica de asistencia.',
      });
    } finally {
      client.release();
    }
  }
);

// POST /api/asistencia-movil/desafios
// Es público para permitir marcación rápida sin iniciar sesión.
router.post('/desafios', async (req, res) => {
  if (!consumeRate(req, 'challenge', RATE_MAX_CHALLENGES)) {
    return res.status(429).json({
      error:
        'Se realizaron demasiados intentos. Espere un minuto.',
    });
  }

  const code = cleanUpperText(req.body.codigo ?? req.body.code, 30);
  const installationId = cleanText(
    req.body.uuid_instalacion ?? req.body.installationId,
    120
  );
  const bleProofs =
    req.body.pruebas_ble ?? req.body.bleProofs ?? [];

  if (code.length < 3 || !isInstallationId(installationId)) {
    return res.status(400).json({
      error: 'Ingrese un código y un dispositivo válidos.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const deviceResult = await client.query(
      `SELECT
         dm.id,
         dm.uuid_instalacion,
         dm.usuario_id,
         dm.docente_id,
         dm.estado,
         dm.clave_publica_asistencia,
         dm.huella_clave_asistencia,
         u.codigo,
         u.nombres,
         u.apellidos,
         u.activo
       FROM dispositivos_moviles dm
       JOIN usuarios u
         ON u.id = dm.usuario_id
       WHERE dm.uuid_instalacion = $1
         AND UPPER(u.codigo) = UPPER($2)
       FOR UPDATE OF dm`,
      [installationId, code]
    );

    const device = deviceResult.rows[0];

    if (!device || device.estado !== 'AUTORIZADO' || !device.activo) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error:
          'El código no corresponde a un dispositivo móvil autorizado.',
      });
    }

    if (
      !device.clave_publica_asistencia ||
      !device.huella_clave_asistencia
    ) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:
          'La firma biométrica todavía no está preparada. Inicie sesión una vez como docente y actualice el estado del celular.',
      });
    }

    await client.query(
      `UPDATE desafios_marcacion_movil
       SET estado = 'EXPIRADO'
       WHERE dispositivo_id = $1
         AND estado = 'VIGENTE'
         AND expira_en <= CURRENT_TIMESTAMP`,
      [device.id]
    );

    const clock = await getInstitutionClock(client);
    const schedule = await findEligibleSchedule(
      client,
      Number(device.docente_id)
    );

    let targetType = 'INGRESO_INSTITUCIONAL';
    let scheduleId = null;
    let course = null;

    if (schedule) {
      targetType = 'CURSO';
      scheduleId = Number(schedule.horario_curso_id);
      course = {
        id: scheduleId,
        codigo: schedule.codigo_curso,
        nombre: schedule.curso,
        aula: schedule.aula,
        hora_inicio: schedule.hora_inicio,
        hora_fin: schedule.hora_fin,
        semestre: schedule.semestre,
      };

      const duplicateCourse = await client.query(
        `SELECT id
         FROM registros_asistencia_curso
         WHERE horario_curso_id = $1
           AND fecha = $2`,
        [scheduleId, clock.fecha_local]
      );

      if (duplicateCourse.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'La asistencia de esta clase ya fue registrada hoy.',
          code: 'ASISTENCIA_DUPLICADA',
        });
      }
    } else {
      const duplicateEntry = await client.query(
        `SELECT id
         FROM registros_ingreso_institucional
         WHERE docente_id = $1
           AND fecha = $2`,
        [device.docente_id, clock.fecha_local]
      );

      if (duplicateEntry.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'El ingreso institucional de hoy ya fue registrado y no hay una clase dentro de la ventana de marcación.',
          code: 'INGRESO_DUPLICADO',
        });
      }
    }

    const blePresence = await validateBlePresence(client, {
      proofs: bleProofs,
      schedule,
      teacherId: Number(device.docente_id),
      targetType,
    });

    const challengeId = crypto.randomUUID();
    const nonce = crypto.randomBytes(32).toString('base64url');
    const issuedAt = new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + CHALLENGE_TTL_SECONDS * 1000
    );

    const canonicalPayload = JSON.stringify({
      version: 1,
      type: 'UNSAAC_MOBILE_ATTENDANCE',
      challengeId,
      nonce,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      installationId,
      deviceId: Number(device.id),
      teacherId: Number(device.docente_id),
      teacherCode: device.codigo,
      target: targetType,
      scheduleId,
      targetDate: String(clock.fecha_local),
      blePresence: {
        required: blePresence.required,
        validated: blePresence.validated,
        stationId: blePresence.station
          ? Number(blePresence.station.id)
          : null,
        stationCode: blePresence.station?.codigo ?? null,
        proofHash: blePresence.proofHash,
        rssiAverage: blePresence.proof?.rssiAverage ?? null,
        samples: blePresence.proof?.samples ?? null,
      },
    });

    await client.query(
      `INSERT INTO desafios_marcacion_movil (
         id,
         nonce_hash,
         dispositivo_id,
         usuario_id,
         docente_id,
         horario_curso_id,
         tipo_objetivo,
         fecha_objetivo,
         contenido_firmado,
         contenido_hash,
         estacion_ble_id,
         presencia_ble_requerida,
         presencia_ble_validada,
         prueba_ble_hash,
         estado,
         expira_en,
         ip_origen
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
         $12,
         $13,
         $14,
         'VIGENTE',
         $15,
         NULLIF($16, '')::inet
       )`,
      [
        challengeId,
        hashText(nonce),
        device.id,
        device.usuario_id,
        device.docente_id,
        scheduleId,
        targetType,
        clock.fecha_local,
        canonicalPayload,
        hashText(canonicalPayload),
        blePresence.station
          ? Number(blePresence.station.id)
          : null,
        blePresence.required,
        blePresence.validated,
        blePresence.proofHash,
        expiresAt,
        clientIp(req),
      ]
    );

    if (
      blePresence.validated &&
      blePresence.station &&
      blePresence.proof
    ) {
      await client.query(
        `INSERT INTO detecciones_ble_movil (
           desafio_id,
           estacion_id,
           dispositivo_id,
           docente_id,
           time_slot,
           token_hash,
           rssi_promedio,
           rssi_minimo,
           rssi_maximo,
           muestras,
           umbral_rssi,
           umbral_muestras,
           prueba_valida,
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
           $7,
           $8,
           $9,
           $10,
           $11,
           $12,
           TRUE,
           $13::jsonb,
           NULLIF($14, '')::inet
         )`,
        [
          challengeId,
          blePresence.station.id,
          device.id,
          device.docente_id,
          blePresence.proof.timeSlot,
          hashText(blePresence.proof.token),
          blePresence.proof.rssiAverage,
          blePresence.proof.rssiMin,
          blePresence.proof.rssiMax,
          blePresence.proof.samples,
          Number(blePresence.station.rssi_minimo),
          Number(blePresence.station.muestras_minimas),
          JSON.stringify({
            address: blePresence.proof.address,
            name: blePresence.proof.name,
            validation: blePresence.validation.detail,
          }),
          clientIp(req),
        ]
      );

      await client.query(
        `UPDATE estaciones_ble
         SET
           ultima_deteccion_en = CURRENT_TIMESTAMP,
           ultima_deteccion_rssi = $1,
           actualizada_en = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [
          Math.round(blePresence.proof.rssiAverage),
          blePresence.station.id,
        ]
      );

      await client.query(
        `INSERT INTO eventos_seguridad_ble (
           estacion_id,
           dispositivo_id,
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
           NULL,
           'PRESENCIA_BLE_VALIDADA',
           'EXITO',
           $4::jsonb,
           NULLIF($5, '')::inet
         )`,
        [
          blePresence.station.id,
          device.id,
          device.docente_id,
          JSON.stringify({
            challengeId,
            scheduleId,
            rssiAverage: blePresence.proof.rssiAverage,
            samples: blePresence.proof.samples,
            proofHash: blePresence.proofHash,
          }),
          clientIp(req),
        ]
      );
    }

    await writeMobileEvent(client, req, {
      deviceId: Number(device.id),
      usuarioId: Number(device.usuario_id),
      docenteId: Number(device.docente_id),
      type: 'DESAFIO_ASISTENCIA_EMITIDO',
      detail: {
        challengeId,
        targetType,
        scheduleId,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await client.query('COMMIT');

    return res.status(201).json({
      desafio: {
        id: challengeId,
        contenido: canonicalPayload,
        expira_en: expiresAt.toISOString(),
        vigencia_segundos: CHALLENGE_TTL_SECONDS,
        objetivo: targetType,
        fecha: String(clock.fecha_local),
        docente: {
          codigo: device.codigo,
          nombres: device.nombres,
          apellidos: device.apellidos,
        },
        curso: course,
        presencia_ble: {
          requerida: blePresence.required,
          validada: blePresence.validated,
          mensaje: blePresence.message,
          estacion: blePresence.station
            ? {
                id: Number(blePresence.station.id),
                codigo: blePresence.station.codigo,
                nombre: blePresence.station.nombre,
                aula: blePresence.station.aula,
              }
            : null,
          rssi_promedio: blePresence.proof?.rssiAverage ?? null,
          muestras: blePresence.proof?.samples ?? null,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error.status && error.status >= 400 && error.status < 500) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code ?? 'BLE_VALIDATION_FAILED',
        detail: error.detail ?? undefined,
      });
    }

    console.error('Error al emitir desafío de asistencia:', error);
    return res.status(500).json({
      error: 'No se pudo preparar la marcación móvil.',
    });
  } finally {
    client.release();
  }
});

// POST /api/asistencia-movil/marcar
router.post('/marcar', async (req, res) => {
  if (!consumeRate(req, 'submit', RATE_MAX_SUBMISSIONS)) {
    return res.status(429).json({
      error:
        'Se realizaron demasiados intentos. Espere un minuto.',
    });
  }

  const challengeId = cleanText(
    req.body.desafio_id ?? req.body.challengeId,
    50
  );
  const installationId = cleanText(
    req.body.uuid_instalacion ?? req.body.installationId,
    120
  );
  const signatureBase64 = cleanBase64(
    req.body.firma ?? req.body.signature,
    2048
  );

  if (
    !isUuid(challengeId) ||
    !isInstallationId(installationId) ||
    !isValidSignature(signatureBase64)
  ) {
    return res.status(400).json({
      error: 'La respuesta biométrica está incompleta o no es válida.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const challengeResult = await client.query(
      `SELECT
         dmm.*,
         dm.uuid_instalacion,
         dm.estado AS estado_dispositivo,
         dm.clave_publica_asistencia,
         dm.huella_clave_asistencia,
         u.codigo,
         u.nombres,
         u.apellidos,
         u.activo AS usuario_activo
       FROM desafios_marcacion_movil dmm
       JOIN dispositivos_moviles dm
         ON dm.id = dmm.dispositivo_id
       JOIN usuarios u
         ON u.id = dmm.usuario_id
       WHERE dmm.id = $1
       FOR UPDATE OF dmm, dm`,
      [challengeId]
    );

    const challenge = challengeResult.rows[0];

    if (!challenge) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'El desafío de asistencia no existe.',
      });
    }

    if (challenge.estado !== 'VIGENTE') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error:
          'El desafío ya fue utilizado, rechazado o venció.',
      });
    }

    if (new Date(challenge.expira_en).getTime() <= Date.now()) {
      await client.query(
        `UPDATE desafios_marcacion_movil
         SET estado = 'EXPIRADO'
         WHERE id = $1`,
        [challengeId]
      );
      await client.query('COMMIT');
      return res.status(410).json({
        error:
          'La confirmación biométrica tardó demasiado. Intente nuevamente.',
      });
    }

    if (
      challenge.uuid_instalacion !== installationId ||
      challenge.estado_dispositivo !== 'AUTORIZADO' ||
      !challenge.usuario_activo
    ) {
      await client.query(
        `UPDATE desafios_marcacion_movil
         SET
           estado = 'RECHAZADO',
           rechazado_en = CURRENT_TIMESTAMP,
           motivo_rechazo = 'DISPOSITIVO_NO_AUTORIZADO',
           intentos = intentos + 1
         WHERE id = $1`,
        [challengeId]
      );

      await writeMobileEvent(client, req, {
        deviceId: Number(challenge.dispositivo_id),
        usuarioId: Number(challenge.usuario_id),
        docenteId: Number(challenge.docente_id),
        type: 'MARCACION_DISPOSITIVO_NO_AUTORIZADO',
        result: 'BLOQUEADO',
        detail: { challengeId },
      });

      await client.query('COMMIT');
      return res.status(403).json({
        error:
          'Este celular ya no está autorizado para marcar asistencia.',
      });
    }

    const payloadHash = hashText(challenge.contenido_firmado);
    const payloadMatches = payloadHash === challenge.contenido_hash;
    const signatureVerified =
      payloadMatches &&
      verifyEcdsaSignature(
        challenge.clave_publica_asistencia,
        challenge.contenido_firmado,
        signatureBase64
      );

    if (!signatureVerified) {
      await client.query(
        `UPDATE desafios_marcacion_movil
         SET
           estado = 'RECHAZADO',
           rechazado_en = CURRENT_TIMESTAMP,
           motivo_rechazo = 'FIRMA_INVALIDA',
           intentos = intentos + 1
         WHERE id = $1`,
        [challengeId]
      );

      await client.query(
        `INSERT INTO firmas_marcacion_movil (
           desafio_id,
           dispositivo_id,
           docente_id,
           algoritmo,
           firma_base64,
           contenido_hash,
           firma_verificada,
           resultado,
           detalle,
           ip_origen
         )
         VALUES (
           $1,
           $2,
           $3,
           'SHA256withECDSA',
           $4,
           $5,
           FALSE,
           'RECHAZADA',
           $6::jsonb,
           NULLIF($7, '')::inet
         )`,
        [
          challengeId,
          challenge.dispositivo_id,
          challenge.docente_id,
          signatureBase64,
          payloadHash,
          JSON.stringify({ reason: 'FIRMA_INVALIDA' }),
          clientIp(req),
        ]
      );

      await writeMobileEvent(client, req, {
        deviceId: Number(challenge.dispositivo_id),
        usuarioId: Number(challenge.usuario_id),
        docenteId: Number(challenge.docente_id),
        type: 'FIRMA_ASISTENCIA_INVALIDA',
        result: 'BLOQUEADO',
        detail: { challengeId },
      });

      await client.query('COMMIT');
      return res.status(403).json({
        error:
          'La firma criptográfica del celular no pudo verificarse.',
      });
    }

    const clock = await getInstitutionClock(client);

    if (String(clock.fecha_local) !== String(challenge.fecha_objetivo)) {
      await client.query(
        `UPDATE desafios_marcacion_movil
         SET
           estado = 'RECHAZADO',
           rechazado_en = CURRENT_TIMESTAMP,
           motivo_rechazo = 'FECHA_CAMBIO'
         WHERE id = $1`,
        [challengeId]
      );
      await client.query('COMMIT');
      return res.status(409).json({
        error:
          'La fecha institucional cambió durante la marcación. Intente nuevamente.',
      });
    }

    let eligibleSchedule = null;

    if (challenge.tipo_objetivo === 'CURSO') {
      eligibleSchedule = await findEligibleSchedule(
        client,
        Number(challenge.docente_id)
      );

      if (
        !eligibleSchedule ||
        Number(eligibleSchedule.horario_curso_id) !==
          Number(challenge.horario_curso_id)
      ) {
        await client.query(
          `UPDATE desafios_marcacion_movil
           SET
             estado = 'RECHAZADO',
             rechazado_en = CURRENT_TIMESTAMP,
             motivo_rechazo = 'FUERA_DE_HORARIO'
           WHERE id = $1`,
          [challengeId]
        );

        await writeMobileEvent(client, req, {
          deviceId: Number(challenge.dispositivo_id),
          usuarioId: Number(challenge.usuario_id),
          docenteId: Number(challenge.docente_id),
          type: 'MARCACION_FUERA_DE_HORARIO',
          result: 'BLOQUEADO',
          detail: { challengeId },
        });

        await client.query('COMMIT');
        return res.status(409).json({
          error:
            'La ventana permitida para esta clase ya terminó.',
        });
      }
    }

    const configResult = await client.query(
      `SELECT
         COALESCE(hora_ingreso_limite, '09:00:00'::time) AS hora_ingreso_limite
       FROM configuracion_asistencia
       ORDER BY id
       LIMIT 1`
    );
    const entryLimit =
      configResult.rows[0]?.hora_ingreso_limite ?? '09:00:00';
    const entryState =
      String(clock.hora_local) <= String(entryLimit)
        ? 'PUNTUAL'
        : 'TARDANZA';
    const mobileReaderId = `MOVIL:${challenge.dispositivo_id}`;

    const entryInsert = await client.query(
      `INSERT INTO registros_ingreso_institucional (
         docente_id,
         fecha,
         hora_registro,
         dispositivo_id,
         estado,
         observacion
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         'Marcación móvil firmada y verificada'
       )
       ON CONFLICT (docente_id, fecha)
       DO NOTHING
       RETURNING id, fecha, hora_registro, estado`,
      [
        challenge.docente_id,
        clock.fecha_local,
        clock.hora_local,
        mobileReaderId,
        entryState,
      ]
    );

    let entryRecord = entryInsert.rows[0] ?? null;
    const entryWasCreated = Boolean(entryRecord);

    if (!entryRecord) {
      const existingEntry = await client.query(
        `SELECT id, fecha, hora_registro, estado
         FROM registros_ingreso_institucional
         WHERE docente_id = $1
           AND fecha = $2`,
        [challenge.docente_id, clock.fecha_local]
      );
      entryRecord = existingEntry.rows[0] ?? null;
    }

    let courseRecord = null;
    let courseWasCreated = false;
    let courseInfo = null;
    let finalState = entryRecord?.estado ?? entryState;
    let duplicate = false;

    if (challenge.tipo_objetivo === 'CURSO') {
      const courseState =
        String(clock.hora_local) >
        String(eligibleSchedule.hora_inicio)
          ? 'TARDANZA'
          : 'PRESENTE';

      const courseInsert = await client.query(
        `INSERT INTO registros_asistencia_curso (
           horario_curso_id,
           docente_id,
           fecha,
           hora_registro,
           dispositivo_id,
           estado,
           observacion
         )
         VALUES (
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           'Marcación móvil firmada y verificada'
         )
         ON CONFLICT (horario_curso_id, fecha)
         DO NOTHING
         RETURNING id, fecha, hora_registro, estado`,
        [
          challenge.horario_curso_id,
          challenge.docente_id,
          clock.fecha_local,
          clock.hora_local,
          mobileReaderId,
          courseState,
        ]
      );

      courseRecord = courseInsert.rows[0] ?? null;
      courseWasCreated = Boolean(courseRecord);

      if (!courseRecord) {
        const existingCourse = await client.query(
          `SELECT id, fecha, hora_registro, estado
           FROM registros_asistencia_curso
           WHERE horario_curso_id = $1
             AND fecha = $2`,
          [challenge.horario_curso_id, clock.fecha_local]
        );
        courseRecord = existingCourse.rows[0] ?? null;
        duplicate = true;
      }

      courseInfo = {
        horario_curso_id: Number(
          eligibleSchedule.horario_curso_id
        ),
        codigo: eligibleSchedule.codigo_curso,
        nombre: eligibleSchedule.curso,
        aula: eligibleSchedule.aula,
        hora_inicio: eligibleSchedule.hora_inicio,
        hora_fin: eligibleSchedule.hora_fin,
        semestre: eligibleSchedule.semestre,
      };
      finalState = courseRecord?.estado ?? courseState;
    } else if (!entryWasCreated) {
      duplicate = true;
    }

    const resultCode = duplicate ? 'DUPLICADA' : 'REGISTRADA';

    await client.query(
      `UPDATE desafios_marcacion_movil
       SET
         estado = 'UTILIZADO',
         utilizado_en = CURRENT_TIMESTAMP,
         intentos = intentos + 1
       WHERE id = $1`,
      [challengeId]
    );

    const signatureResult = await client.query(
      `INSERT INTO firmas_marcacion_movil (
         desafio_id,
         dispositivo_id,
         docente_id,
         registro_ingreso_id,
         registro_asistencia_id,
         algoritmo,
         firma_base64,
         contenido_hash,
         firma_verificada,
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
         'SHA256withECDSA',
         $6,
         $7,
         TRUE,
         $8,
         $9::jsonb,
         NULLIF($10, '')::inet
       )
       RETURNING id, creado_en`,
      [
        challengeId,
        challenge.dispositivo_id,
        challenge.docente_id,
        entryRecord?.id ?? null,
        courseRecord?.id ?? null,
        signatureBase64,
        payloadHash,
        resultCode,
        JSON.stringify({
          target: challenge.tipo_objetivo,
          entryWasCreated,
          courseWasCreated,
          finalState,
        }),
        clientIp(req),
      ]
    );

    await client.query(
      `UPDATE dispositivos_moviles
       SET
         ultimo_acceso = CURRENT_TIMESTAMP,
         actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [challenge.dispositivo_id]
    );

    await writeAudit(
      client,
      req,
      duplicate
        ? 'MARCACION_MOVIL_DUPLICADA'
        : 'REGISTRAR_ASISTENCIA_MOVIL',
      challenge.tipo_objetivo === 'CURSO'
        ? 'registros_asistencia_curso'
        : 'registros_ingreso_institucional',
      challenge.tipo_objetivo === 'CURSO'
        ? courseRecord?.id ?? null
        : entryRecord?.id ?? null,
      {
        challengeId,
        deviceId: Number(challenge.dispositivo_id),
        signatureVerified: true,
        target: challenge.tipo_objetivo,
        state: finalState,
      }
    );

    await writeMobileEvent(client, req, {
      deviceId: Number(challenge.dispositivo_id),
      usuarioId: Number(challenge.usuario_id),
      docenteId: Number(challenge.docente_id),
      type: duplicate
        ? 'MARCACION_ASISTENCIA_DUPLICADA'
        : 'ASISTENCIA_MOVIL_REGISTRADA',
      result: duplicate ? 'ADVERTENCIA' : 'EXITO',
      detail: {
        challengeId,
        signatureId: Number(signatureResult.rows[0].id),
        target: challenge.tipo_objetivo,
        state: finalState,
        courseId: courseInfo?.horario_curso_id ?? null,
      },
    });

    await client.query('COMMIT');

    const responseBody = {
      registrada: !duplicate,
      duplicada: duplicate,
      firma_verificada: true,
      objetivo: challenge.tipo_objetivo,
      estado: finalState,
      fecha: String(clock.fecha_local),
      hora_servidor: String(clock.hora_local),
      docente: {
        codigo: challenge.codigo,
        nombres: challenge.nombres,
        apellidos: challenge.apellidos,
      },
      curso: courseInfo,
      ingreso_institucional: entryRecord
        ? {
            id: Number(entryRecord.id),
            estado: entryRecord.estado,
            nuevo: entryWasCreated,
          }
        : null,
      asistencia_curso: courseRecord
        ? {
            id: Number(courseRecord.id),
            estado: courseRecord.estado,
            nueva: courseWasCreated,
          }
        : null,
      firma: {
        id: Number(signatureResult.rows[0].id),
        algoritmo: 'SHA256withECDSA',
      },
      mensaje: duplicate
        ? 'La asistencia ya había sido registrada para este objetivo.'
        : challenge.tipo_objetivo === 'CURSO'
          ? `Asistencia de clase registrada como ${finalState}.`
          : `Ingreso institucional registrado como ${finalState}.`,
    };

    return res.status(duplicate ? 409 : 201).json(responseBody);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'La marcación ya fue procesada.',
      });
    }

    console.error('Error al registrar asistencia móvil:', error);
    return res.status(500).json({
      error: 'No se pudo registrar la asistencia móvil.',
    });
  } finally {
    client.release();
  }
});

// GET /api/asistencia-movil/mis-marcaciones
router.get(
  '/mis-marcaciones',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error: 'La cuenta no tiene un perfil docente asociado.',
      });
    }

    try {
      const result = await pool.query(
        `SELECT *
         FROM v_marcaciones_moviles_unificadas
         WHERE docente_id = $1
         ORDER BY creado_en DESC
         LIMIT 30`,
        [req.user.docente_id]
      );

      return res.json({ marcaciones: result.rows });
    } catch (error) {
      console.error(
        'Error al consultar historial móvil docente:',
        error
      );
      return res.status(500).json({
        error: 'No se pudo consultar el historial móvil.',
      });
    }
  }
);

// GET /api/asistencia-movil/resumen
router.get(
  '/resumen',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const limit = Math.min(
      Math.max(toPositiveInteger(req.query.limit) ?? 30, 1),
      100
    );

    try {
      const [clock, summaryResult, recentResult, rejectedResult] =
        await Promise.all([
          getInstitutionClock(pool),
          pool.query(
            `WITH settings AS (
               SELECT COALESCE(
                 (SELECT zona_horaria
                  FROM configuracion_institucional
                  WHERE id = 1),
                 'America/Lima'
               ) AS zona_horaria
             ),
             today AS (
               SELECT
                 (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria)::date AS fecha
               FROM settings
             )
             SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (
                 WHERE v.resultado = 'REGISTRADA'
               )::int AS registradas,
               COUNT(*) FILTER (
                 WHERE v.resultado = 'DUPLICADA'
               )::int AS duplicadas,
               COUNT(*) FILTER (
                 WHERE v.firma_verificada = TRUE
               )::int AS firmas_verificadas,
               COUNT(*) FILTER (
                 WHERE v.metodo_verificacion = 'QR_DINAMICO'
               )::int AS qr_dinamicos,
               COUNT(*) FILTER (
                 WHERE v.tipo_objetivo = 'CURSO'
               )::int AS cursos,
               COUNT(*) FILTER (
                 WHERE v.tipo_objetivo = 'INGRESO_INSTITUCIONAL'
               )::int AS ingresos
             FROM v_marcaciones_moviles_unificadas v
             CROSS JOIN settings
             CROSS JOIN today
             WHERE (v.creado_en AT TIME ZONE settings.zona_horaria)::date = today.fecha`
          ),
          pool.query(
            `WITH settings AS (
               SELECT COALESCE(
                 (SELECT zona_horaria
                  FROM configuracion_institucional
                  WHERE id = 1),
                 'America/Lima'
               ) AS zona_horaria
             )
             SELECT v.*
             FROM v_marcaciones_moviles_unificadas v
             CROSS JOIN settings
             WHERE (
               v.creado_en AT TIME ZONE settings.zona_horaria
             )::date = (
               CURRENT_TIMESTAMP AT TIME ZONE settings.zona_horaria
             )::date
             ORDER BY v.creado_en DESC
             LIMIT $1`,
            [limit]
          ),
          pool.query(
            `SELECT
               dmm.id,
               dmm.tipo_objetivo,
               dmm.estado,
               dmm.motivo_rechazo,
               dmm.creado_en,
               dmm.expira_en,
               u.codigo AS codigo_docente,
               u.nombres,
               u.apellidos,
               dm.fabricante,
               dm.modelo
             FROM desafios_marcacion_movil dmm
             JOIN usuarios u
               ON u.id = dmm.usuario_id
             JOIN dispositivos_moviles dm
               ON dm.id = dmm.dispositivo_id
             WHERE dmm.estado IN ('RECHAZADO', 'EXPIRADO')
             ORDER BY dmm.creado_en DESC
             LIMIT 20`
          ),
        ]);

      return res.json({
        fecha: String(clock.fecha_local),
        resumen: summaryResult.rows[0] ?? {
          total: 0,
          registradas: 0,
          duplicadas: 0,
          firmas_verificadas: 0,
          qr_dinamicos: 0,
          cursos: 0,
          ingresos: 0,
        },
        marcaciones: recentResult.rows,
        rechazadas: rejectedResult.rows,
      });
    } catch (error) {
      console.error(
        'Error al consultar resumen de asistencia móvil:',
        error
      );
      return res.status(500).json({
        error:
          'No se pudo consultar el resumen de asistencia móvil.',
      });
    }
  }
);

const HISTORY_METHODS = new Set([
  'QR_DINAMICO',
  'BIOMETRIA_MOVIL',
  'OFFLINE_SINCRONIZADO',
  'LECTOR_BIOMETRICO',
  'MANUAL',
]);
const HISTORY_RESULTS = new Set([
  'REGISTRADA',
  'DUPLICADA',
  'RECHAZADA',
  'PENDIENTE',
  'REQUIERE_REVISION',
]);
const HISTORY_TARGETS = new Set([
  'CURSO',
  'INGRESO_INSTITUCIONAL',
]);

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ''));
}

function normalizeHistoryFilter(value, allowed) {
  const normalized = cleanUpperText(value, 80);
  return allowed.has(normalized) ? normalized : null;
}

function buildHistoryWhere(query) {
  const conditions = [];
  const values = [];

  function add(condition, value) {
    values.push(value);
    conditions.push(condition.replace('?', `$${values.length}`));
  }

  const search = cleanText(query.q, 120);
  if (search) {
    add(
      `(CONCAT_WS(' ', h.nombres, h.apellidos) ILIKE ?
        OR h.codigo_docente ILIKE $${values.length + 1}
        OR COALESCE(h.email, '') ILIKE $${values.length + 1}
        OR COALESCE(h.curso, '') ILIKE $${values.length + 1}
        OR COALESCE(h.codigo_curso, '') ILIKE $${values.length + 1}
        OR COALESCE(h.fabricante, '') ILIKE $${values.length + 1}
        OR COALESCE(h.modelo, '') ILIKE $${values.length + 1})`,
      `%${search}%`
    );
  }

  const teacherId = toPositiveInteger(query.docenteId);
  if (teacherId) {
    add('h.docente_id = ?', teacherId);
  }

  const method = normalizeHistoryFilter(
    query.metodo,
    HISTORY_METHODS
  );
  if (method) {
    add('h.metodo_verificacion = ?', method);
  }

  const result = normalizeHistoryFilter(
    query.resultado,
    HISTORY_RESULTS
  );
  if (result) {
    add('h.resultado = ?', result);
  }

  const target = normalizeHistoryFilter(
    query.tipo,
    HISTORY_TARGETS
  );
  if (target) {
    add('h.tipo_objetivo = ?', target);
  }

  if (isIsoDate(query.desde)) {
    add('h.fecha >= ?::date', String(query.desde));
  }

  if (isIsoDate(query.hasta)) {
    add('h.fecha <= ?::date', String(query.hasta));
  }

  return {
    sql:
      conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '',
    values,
  };
}

async function getCleanupTeacher(client, teacherId, lock = false) {
  const result = await client.query(
    `SELECT
       d.id AS docente_id,
       u.id AS usuario_id,
       u.codigo,
       u.nombres,
       u.apellidos,
       u.email
     FROM docentes d
     JOIN usuarios u
       ON u.id = d.usuario_id
     WHERE d.id = $1
     ${lock ? 'FOR UPDATE OF d, u' : ''}`,
    [teacherId]
  );

  return result.rows[0] ?? null;
}

async function getCleanupCounts(client, teacherId, date) {
  const result = await client.query(
    `SELECT
       (SELECT COUNT(*)::int
        FROM usos_qr_asistencia
        WHERE docente_id = $1
          AND (utilizado_en AT TIME ZONE 'America/Lima')::date = $2::date
       ) AS qr,
       (SELECT COUNT(*)::int
        FROM marcaciones_offline
        WHERE docente_id = $1
          AND fecha_local_estimada = $2::date
       ) AS offline,
       (SELECT COUNT(*)::int
        FROM firmas_marcacion_movil
        WHERE docente_id = $1
          AND (creado_en AT TIME ZONE 'America/Lima')::date = $2::date
       ) AS firmas,
       (SELECT COUNT(*)::int
        FROM desafios_marcacion_movil
        WHERE docente_id = $1
          AND fecha_objetivo = $2::date
       ) AS desafios,
       (SELECT COUNT(*)::int
        FROM registros_asistencia_curso
        WHERE docente_id = $1
          AND fecha = $2::date
       ) AS cursos,
       (SELECT COUNT(*)::int
        FROM registros_ingreso_institucional
        WHERE docente_id = $1
          AND fecha = $2::date
       ) AS ingresos`,
    [teacherId, date]
  );

  const row = result.rows[0] ?? {};
  const counts = {
    qr: Number(row.qr ?? 0),
    offline: Number(row.offline ?? 0),
    firmas: Number(row.firmas ?? 0),
    desafios: Number(row.desafios ?? 0),
    cursos: Number(row.cursos ?? 0),
    ingresos: Number(row.ingresos ?? 0),
  };

  return {
    ...counts,
    total: Object.values(counts).reduce(
      (sum, value) => sum + value,
      0
    ),
  };
}

async function collectCleanupBackup(client, teacherId, date) {
  const queries = {
    usos_qr_asistencia: `SELECT * FROM usos_qr_asistencia
      WHERE docente_id = $1
        AND (utilizado_en AT TIME ZONE 'America/Lima')::date = $2::date
      ORDER BY id`,
    marcaciones_offline: `SELECT * FROM marcaciones_offline
      WHERE docente_id = $1
        AND fecha_local_estimada = $2::date
      ORDER BY id`,
    firmas_marcacion_movil: `SELECT * FROM firmas_marcacion_movil
      WHERE docente_id = $1
        AND (creado_en AT TIME ZONE 'America/Lima')::date = $2::date
      ORDER BY id`,
    desafios_marcacion_movil: `SELECT * FROM desafios_marcacion_movil
      WHERE docente_id = $1
        AND fecha_objetivo = $2::date
      ORDER BY creado_en`,
    registros_asistencia_curso: `SELECT * FROM registros_asistencia_curso
      WHERE docente_id = $1
        AND fecha = $2::date
      ORDER BY id`,
    registros_ingreso_institucional: `SELECT * FROM registros_ingreso_institucional
      WHERE docente_id = $1
        AND fecha = $2::date
      ORDER BY id`,
  };

  const backup = {};
  for (const [table, sql] of Object.entries(queries)) {
    const result = await client.query(sql, [teacherId, date]);
    backup[table] = result.rows;
  }

  return backup;
}

function writeCleanupBackup(teacher, date, records) {
  const projectRoot = path.resolve(__dirname, '../../..');
  const backupRoot = path.resolve(
    projectRoot,
    '..',
    '..',
    'Copias de seguridad'
  );

  fs.mkdirSync(backupRoot, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');
  const safeCode = String(teacher.codigo ?? teacher.docente_id)
    .replace(/[^A-Za-z0-9_-]/g, '-');
  const backupPath = path.join(
    backupRoot,
    `LIMPIEZA-PRUEBAS-${safeCode}-${date}-${timestamp}.json`
  );

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        creado_en: new Date().toISOString(),
        fecha: date,
        docente: teacher,
        registros: records,
      },
      null,
      2
    ),
    'utf8'
  );

  return backupPath;
}

// GET /api/asistencia-movil/historial
router.get(
  '/historial',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const limit = Math.min(
      Math.max(toPositiveInteger(req.query.limit) ?? 50, 1),
      200
    );
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const where = buildHistoryWhere(req.query);

    try {
      const recordsValues = [
        ...where.values,
        limit,
        offset,
      ];
      const limitIndex = where.values.length + 1;
      const offsetIndex = where.values.length + 2;

      const [records, summary] = await Promise.all([
        pool.query(
          `SELECT h.*
           FROM v_historial_asistencia_unificado h
           ${where.sql}
           ORDER BY h.fecha DESC, h.hora DESC, h.creado_en DESC
           LIMIT $${limitIndex}
           OFFSET $${offsetIndex}`,
          recordsValues
        ),
        pool.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE h.resultado = 'REGISTRADA'
             )::int AS registradas,
             COUNT(*) FILTER (
               WHERE h.resultado = 'DUPLICADA'
             )::int AS duplicadas,
             COUNT(*) FILTER (
               WHERE h.resultado = 'RECHAZADA'
             )::int AS rechazadas,
             COUNT(*) FILTER (
               WHERE h.metodo_verificacion = 'QR_DINAMICO'
             )::int AS qr,
             COUNT(*) FILTER (
               WHERE h.metodo_verificacion = 'BIOMETRIA_MOVIL'
             )::int AS biometria,
             COUNT(*) FILTER (
               WHERE h.metodo_verificacion = 'OFFLINE_SINCRONIZADO'
             )::int AS offline,
             COUNT(*) FILTER (
               WHERE h.metodo_verificacion IN (
                 'MANUAL', 'LECTOR_BIOMETRICO'
               )
             )::int AS otros,
             COUNT(*) FILTER (
               WHERE h.tipo_objetivo = 'CURSO'
             )::int AS cursos,
             COUNT(*) FILTER (
               WHERE h.tipo_objetivo = 'INGRESO_INSTITUCIONAL'
             )::int AS ingresos
           FROM v_historial_asistencia_unificado h
           ${where.sql}`,
          where.values
        ),
      ]);

      return res.json({
        total: Number(summary.rows[0]?.total ?? 0),
        limit,
        offset,
        resumen: summary.rows[0] ?? {},
        marcaciones: records.rows,
      });
    } catch (error) {
      console.error('Error al consultar historial unificado:', error);
      return res.status(500).json({
        error: 'No se pudo consultar el historial institucional.',
      });
    }
  }
);

// POST /api/asistencia-movil/limpieza-pruebas/vista-previa
router.post(
  '/limpieza-pruebas/vista-previa',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const teacherId = toPositiveInteger(req.body?.docenteId);
    const date = cleanText(req.body?.fecha, 10);

    if (!teacherId || !isIsoDate(date)) {
      return res.status(400).json({
        error: 'Seleccione un docente y una fecha válida.',
      });
    }

    try {
      const teacher = await getCleanupTeacher(pool, teacherId);
      if (!teacher) {
        return res.status(404).json({
          error: 'El docente seleccionado no existe.',
        });
      }

      const [counts, records] = await Promise.all([
        getCleanupCounts(pool, teacherId, date),
        pool.query(
          `SELECT *
           FROM v_historial_asistencia_unificado
           WHERE docente_id = $1
             AND fecha = $2::date
           ORDER BY hora DESC, creado_en DESC
           LIMIT 50`,
          [teacherId, date]
        ),
      ]);

      return res.json({
        docente: teacher,
        fecha: date,
        conteos: counts,
        marcaciones: records.rows,
      });
    } catch (error) {
      console.error('Error al preparar limpieza de pruebas:', error);
      return res.status(500).json({
        error: 'No se pudo preparar la vista previa de limpieza.',
      });
    }
  }
);

// POST /api/asistencia-movil/limpieza-pruebas/ejecutar
router.post(
  '/limpieza-pruebas/ejecutar',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const teacherId = toPositiveInteger(req.body?.docenteId);
    const date = cleanText(req.body?.fecha, 10);
    const confirmation = cleanUpperText(
      req.body?.confirmacion,
      20
    );

    if (!teacherId || !isIsoDate(date)) {
      return res.status(400).json({
        error: 'Seleccione un docente y una fecha válida.',
      });
    }

    if (confirmation !== 'ELIMINAR') {
      return res.status(400).json({
        error: 'Escriba ELIMINAR para confirmar la limpieza.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const teacher = await getCleanupTeacher(
        client,
        teacherId,
        true
      );
      if (!teacher) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El docente seleccionado no existe.',
        });
      }

      const records = await collectCleanupBackup(
        client,
        teacherId,
        date
      );
      const backupPath = writeCleanupBackup(
        teacher,
        date,
        records
      );

      const deleted = {};

      let result = await client.query(
        `DELETE FROM usos_qr_asistencia
         WHERE docente_id = $1
           AND (utilizado_en AT TIME ZONE 'America/Lima')::date = $2::date
         RETURNING id`,
        [teacherId, date]
      );
      deleted.usos_qr_asistencia = result.rowCount;

      result = await client.query(
        `DELETE FROM marcaciones_offline
         WHERE docente_id = $1
           AND fecha_local_estimada = $2::date
         RETURNING id`,
        [teacherId, date]
      );
      deleted.marcaciones_offline = result.rowCount;

      result = await client.query(
        `DELETE FROM firmas_marcacion_movil
         WHERE docente_id = $1
           AND (creado_en AT TIME ZONE 'America/Lima')::date = $2::date
         RETURNING id`,
        [teacherId, date]
      );
      deleted.firmas_marcacion_movil = result.rowCount;

      result = await client.query(
        `DELETE FROM desafios_marcacion_movil
         WHERE docente_id = $1
           AND fecha_objetivo = $2::date
         RETURNING id`,
        [teacherId, date]
      );
      deleted.desafios_marcacion_movil = result.rowCount;

      result = await client.query(
        `DELETE FROM registros_asistencia_curso
         WHERE docente_id = $1
           AND fecha = $2::date
         RETURNING id`,
        [teacherId, date]
      );
      deleted.registros_asistencia_curso = result.rowCount;

      result = await client.query(
        `DELETE FROM registros_ingreso_institucional
         WHERE docente_id = $1
           AND fecha = $2::date
         RETURNING id`,
        [teacherId, date]
      );
      deleted.registros_ingreso_institucional = result.rowCount;

      await writeAudit(
        client,
        req,
        'LIMPIAR_MARCACIONES_PRUEBA',
        'docentes',
        teacherId,
        {
          fecha: date,
          docente: teacher.codigo,
          eliminados: deleted,
          respaldo: backupPath,
        }
      );

      await client.query('COMMIT');

      return res.json({
        mensaje:
          'Las marcaciones de prueba fueron eliminadas. La cuenta, los horarios y el dispositivo se conservaron.',
        respaldo: backupPath,
        eliminados: deleted,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al limpiar marcaciones de prueba:', error);
      return res.status(500).json({
        error:
          'No se pudo completar la limpieza. No se confirmó ningún cambio en PostgreSQL.',
      });
    } finally {
      client.release();
    }
  }
);

router.use('/qr', require('./asistencia-qr.routes'));

module.exports = router;
