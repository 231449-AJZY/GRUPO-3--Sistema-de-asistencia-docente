const router = require('express').Router();
const crypto = require('crypto');

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');
const {
  hashText,
  validateBlePresence,
} = require('../services/ble-presence.service');

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_SYNC = 12;
const requestBuckets = new Map();

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanBase64(value, maxLength = 16384) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .slice(0, maxLength);
}

function toInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toPositiveInteger(value) {
  const parsed = toInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '')
  );
}

function isInstallationId(value) {
  return /^[A-Za-z0-9._:-]{16,120}$/.test(String(value ?? ''));
}

function normalizeFingerprint(value) {
  const fingerprint = cleanText(value, 64).toLowerCase();
  return /^[a-f0-9]{64}$/.test(fingerprint) ? fingerprint : null;
}

function isValidSignature(value) {
  return (
    value.length >= 80 &&
    value.length <= 2048 &&
    /^[A-Za-z0-9+/=]+$/.test(value)
  );
}

function clientIp(req) {
  return cleanText(
    req.ip || req.socket?.remoteAddress || '',
    100
  );
}

function consumeRate(req) {
  const now = Date.now();
  const key = clientIp(req) || 'unknown';
  const current = requestBuckets.get(key);

  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestBuckets.set(key, { startedAt: now, attempts: 1 });
    return true;
  }

  if (current.attempts >= RATE_MAX_SYNC) {
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
    console.error('No se pudo verificar la firma offline:', error);
    return false;
  }
}

async function writeAudit(
  client,
  req,
  action,
  table,
  recordId,
  detail = {}
) {
  try {
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
  } catch (error) {
    console.warn('No se pudo escribir auditoría offline:', error.message);
  }
}

async function getOfflineConfiguration(client) {
  const result = await client.query(
    `SELECT
       vigencia_credencial_horas,
       antiguedad_maxima_horas,
       maximo_pendientes_dispositivo,
       tolerancia_reloj_segundos
     FROM configuracion_asistencia_offline
     WHERE id = 1`
  );

  return (
    result.rows[0] ?? {
      vigencia_credencial_horas: 24,
      antiguedad_maxima_horas: 12,
      maximo_pendientes_dispositivo: 50,
      tolerancia_reloj_segundos: 180,
    }
  );
}

async function getInstitutionClock(client, epochMs = null) {
  const result = await client.query(
    `WITH settings AS (
       SELECT COALESCE(
         (SELECT zona_horaria
          FROM configuracion_institucional
          WHERE id = 1),
         'America/Lima'
       ) AS zona_horaria
     ),
     source AS (
       SELECT CASE
         WHEN $1::bigint IS NULL THEN CURRENT_TIMESTAMP
         ELSE to_timestamp($1::double precision / 1000.0)
       END AS momento
     )
     SELECT
       settings.zona_horaria,
       (source.momento AT TIME ZONE settings.zona_horaria)::date
         AS fecha_local,
       (source.momento AT TIME ZONE settings.zona_horaria)::time
         AS hora_local,
       EXTRACT(
         ISODOW FROM source.momento AT TIME ZONE settings.zona_horaria
       )::int AS dia_semana,
       EXTRACT(EPOCH FROM source.momento)::bigint * 1000
         AS epoch_ms
     FROM settings, source`,
    [epochMs]
  );

  return result.rows[0];
}

function timeToMinutes(value) {
  const match = String(value ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function scheduleFromSnapshot(snapshot, scheduleId) {
  if (!Array.isArray(snapshot)) {
    return null;
  }

  return (
    snapshot.find(
      (item) =>
        Number(item?.horario_curso_id ?? item?.id) === Number(scheduleId)
    ) ?? null
  );
}

function isWithinScheduleWindow(
  schedule,
  clock,
  beforeMinutes,
  afterMinutes
) {
  if (!schedule || Number(schedule.dia_semana) !== Number(clock.dia_semana)) {
    return false;
  }

  const start = timeToMinutes(schedule.hora_inicio);
  const current = timeToMinutes(clock.hora_local);

  if (start === null || current === null) {
    return false;
  }

  return (
    current >= start - Number(beforeMinutes) &&
    current <= start + Number(afterMinutes)
  );
}

async function insertSyncAttempt(
  client,
  req,
  {
    batchId,
    deviceId,
    localId,
    result,
    code,
    message,
    detail = {},
  }
) {
  await client.query(
    `INSERT INTO intentos_sincronizacion_movil (
       lote_id,
       dispositivo_id,
       local_id,
       intento,
       resultado,
       codigo,
       mensaje,
       detalle,
       ip_origen
     )
     VALUES (
       $1,
       $2,
       $3,
       1,
       $4,
       $5,
       $6,
       $7::jsonb,
       NULLIF($8, '')::inet
     )`,
    [
      batchId,
      deviceId,
      isUuid(localId) ? localId : null,
      result,
      code,
      cleanText(message, 500),
      JSON.stringify(detail),
      clientIp(req),
    ]
  );
}

async function persistRejectedRecord(
  client,
  {
    batchId,
    credential,
    record,
    content,
    contentHash,
    signature,
    parsed,
    result,
    reason,
    clock = null,
    bleDetail = {},
    signatureVerified = false,
    clockTrusted = false,
    bleValidated = false,
  }
) {
  const localId = isUuid(record.localId)
    ? record.localId
    : crypto.randomUUID();
  const estimatedAt =
    parsed?.estimatedAt && !Number.isNaN(Date.parse(parsed.estimatedAt))
      ? new Date(parsed.estimatedAt)
      : new Date();
  const localClock =
    clock ??
    (await getInstitutionClock(client, estimatedAt.getTime()));
  const rejectedSequence =
    toPositiveInteger(parsed?.sequence) ??
    Number(credential.ultima_secuencia) +
      1000000 +
      crypto.randomInt(1, 900000);

  const inserted = await client.query(
    `INSERT INTO marcaciones_offline (
       local_id,
       lote_id,
       credencial_id,
       dispositivo_id,
       docente_id,
       horario_curso_id,
       estacion_ble_id,
       secuencia,
       fecha_hora_estimada,
       fecha_local_estimada,
       hora_local_estimada,
       contenido_firmado,
       contenido_hash,
       firma_base64,
       firma_verificada,
       reloj_confiable,
       presencia_ble_validada,
       resultado,
       motivo_resultado,
       detalle_reloj,
       detalle_ble
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20::jsonb, $21::jsonb
     )
     ON CONFLICT (local_id)
     DO UPDATE SET
       lote_id = EXCLUDED.lote_id,
       resultado = EXCLUDED.resultado,
       motivo_resultado = EXCLUDED.motivo_resultado,
       recibido_en = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      localId,
      batchId,
      credential.id,
      credential.dispositivo_id,
      credential.docente_id,
      toPositiveInteger(parsed?.scheduleId),
      toPositiveInteger(parsed?.stationId),
      rejectedSequence,
      estimatedAt,
      localClock.fecha_local,
      localClock.hora_local,
      content || '{}',
      contentHash || hashText(content || '{}'),
      signature || '',
      signatureVerified,
      clockTrusted,
      bleValidated,
      result,
      reason,
      JSON.stringify({
        estimatedAt: estimatedAt.toISOString(),
        ...parsed?.clock,
      }),
      JSON.stringify(bleDetail),
    ]
  );

  if (result === 'REQUIERE_REVISION') {
    await client.query(
      `INSERT INTO conflictos_sincronizacion (
         marcacion_offline_id,
         tipo,
         detalle
       )
       VALUES ($1, $2, $3::jsonb)`,
      [
        inserted.rows[0].id,
        reason,
        JSON.stringify({
          localId,
          estimatedAt: estimatedAt.toISOString(),
        }),
      ]
    );
  }

  return Number(inserted.rows[0].id);
}

async function processOfflineRecord(
  client,
  req,
  {
    batchId,
    device,
    credential,
    configuration,
    record,
  }
) {
  const localId = cleanText(record?.localId, 50);
  const content = String(record?.content ?? '');
  const signature = cleanBase64(record?.signature, 2048);
  const fingerprint = normalizeFingerprint(
    record?.keyFingerprint
  );
  const contentHash = hashText(content);

  if (
    !isUuid(localId) ||
    content.length < 80 ||
    content.length > 50000 ||
    !isValidSignature(signature) ||
    !fingerprint
  ) {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed: null,
      result: 'RECHAZADA',
      reason: 'REGISTRO_INCOMPLETO',
    });

    return {
      localId,
      id,
      status: 'RECHAZADA',
      code: 'REGISTRO_INCOMPLETO',
      message: 'La marcación offline está incompleta.',
    };
  }

  const duplicateResult = await client.query(
    `SELECT id, resultado, motivo_resultado
     FROM marcaciones_offline
     WHERE local_id = $1`,
    [localId]
  );

  if (duplicateResult.rows.length > 0) {
    const duplicate = duplicateResult.rows[0];
    return {
      localId,
      id: Number(duplicate.id),
      status: 'DUPLICADA',
      code: 'LOCAL_ID_DUPLICADO',
      message: 'La marcación ya había sido sincronizada.',
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed: null,
      result: 'RECHAZADA',
      reason: 'CONTENIDO_JSON_INVALIDO',
    });

    return {
      localId,
      id,
      status: 'RECHAZADA',
      code: 'CONTENIDO_JSON_INVALIDO',
      message: 'El contenido firmado no es un JSON válido.',
    };
  }

  const signatureVerified =
    fingerprint === device.huella_clave_asistencia &&
    verifyEcdsaSignature(
      device.clave_publica_asistencia,
      content,
      signature
    );

  if (!signatureVerified) {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed,
      result: 'RECHAZADA',
      reason: 'FIRMA_INVALIDA',
      signatureVerified: false,
    });

    return {
      localId,
      id,
      status: 'RECHAZADA',
      code: 'FIRMA_INVALIDA',
      message: 'La firma criptográfica no pudo verificarse.',
    };
  }

  const sequence = toPositiveInteger(parsed.sequence);
  const estimatedEpochMs = Number(parsed.estimatedEpochMs);
  const currentElapsedMs = Number(parsed.currentElapsedRealtimeMs);
  const bootCount = toInteger(parsed.bootCount);
  const scheduleId = toPositiveInteger(parsed.scheduleId);
  const bleProofs = Array.isArray(parsed.bleProofs)
    ? parsed.bleProofs
    : [];

  const identityMatches =
    parsed.version === 1 &&
    parsed.type === 'UNSAAC_OFFLINE_ATTENDANCE' &&
    parsed.localId === localId &&
    parsed.credentialId === credential.id &&
    parsed.installationId === device.uuid_instalacion &&
    Number(parsed.deviceId) === Number(device.dispositivo_id) &&
    Number(parsed.teacherId) === Number(device.docente_id) &&
    String(parsed.teacherCode).toUpperCase() ===
      String(device.codigo).toUpperCase() &&
    sequence !== null &&
    scheduleId !== null &&
    Number.isFinite(estimatedEpochMs) &&
    Number.isFinite(currentElapsedMs) &&
    bootCount !== null;

  if (!identityMatches) {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed,
      result: 'RECHAZADA',
      reason: 'IDENTIDAD_OFFLINE_NO_COINCIDE',
      signatureVerified: true,
    });

    return {
      localId,
      id,
      status: 'RECHAZADA',
      code: 'IDENTIDAD_OFFLINE_NO_COINCIDE',
      message: 'La identidad firmada no coincide con la credencial.',
    };
  }

  if (sequence <= Number(credential.ultima_secuencia)) {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed,
      result: 'DUPLICADA',
      reason: 'SECUENCIA_REUTILIZADA',
      signatureVerified: true,
    });

    return {
      localId,
      id,
      status: 'DUPLICADA',
      code: 'SECUENCIA_REUTILIZADA',
      message: 'La secuencia offline ya fue utilizada.',
    };
  }

  const expectedEpochMs =
    Number(credential.servidor_epoch_ms) +
    (currentElapsedMs - Number(credential.dispositivo_elapsed_ms));
  const clockDifferenceMs = Math.abs(
    expectedEpochMs - estimatedEpochMs
  );
  const clockTrusted =
    bootCount === Number(credential.dispositivo_boot_count) &&
    currentElapsedMs >= Number(credential.dispositivo_elapsed_ms) &&
    clockDifferenceMs <=
      Number(configuration.tolerancia_reloj_segundos) * 1000;

  const estimatedAt = new Date(estimatedEpochMs);
  const ageMs = Date.now() - estimatedEpochMs;
  const withinCredential =
    estimatedAt.getTime() >= new Date(credential.emitida_en).getTime() &&
    estimatedAt.getTime() <= new Date(credential.expira_en).getTime();
  const withinMaximumAge =
    ageMs >= -Number(configuration.tolerancia_reloj_segundos) * 1000 &&
    ageMs <=
      Number(configuration.antiguedad_maxima_horas) * 60 * 60 * 1000;
  const clock = await getInstitutionClock(client, estimatedEpochMs);
  const scheduleSnapshot = scheduleFromSnapshot(
    credential.horarios_snapshot,
    scheduleId
  );
  const attendanceConfig =
    credential.configuracion_snapshot?.asistencia ?? {};
  const beforeMinutes = Number(
    attendanceConfig.tolerancia_antes_minutos ?? 15
  );
  const afterMinutes = Number(
    attendanceConfig.tolerancia_despues_minutos ?? 10
  );
  const snapshotWindowValid = isWithinScheduleWindow(
    scheduleSnapshot,
    clock,
    beforeMinutes,
    afterMinutes
  );

  if (
    !clockTrusted ||
    !withinCredential ||
    !withinMaximumAge ||
    !snapshotWindowValid
  ) {
    const reason = !clockTrusted
      ? 'RELOJ_NO_CONFIABLE'
      : !withinCredential
        ? 'CREDENCIAL_NO_VIGENTE_AL_MARCAR'
        : !withinMaximumAge
          ? 'MARCACION_DEMASIADO_ANTIGUA'
          : 'FUERA_DE_HORARIO_SNAPSHOT';

    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed,
      result: 'REQUIERE_REVISION',
      reason,
      clock,
      signatureVerified: true,
      clockTrusted,
      bleDetail: { proofs: bleProofs.length },
    });

    return {
      localId,
      id,
      status: 'REQUIERE_REVISION',
      code: reason,
      message:
        'La marcación quedó pendiente de revisión administrativa.',
    };
  }

  const currentScheduleResult = await client.query(
    `SELECT
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
       s.codigo AS semestre
     FROM horarios_curso hc
     JOIN cursos c ON c.id = hc.curso_id
     JOIN semestres s ON s.id = hc.semestre_id
     WHERE hc.id = $1
       AND hc.docente_id = $2
       AND hc.activo = TRUE`,
    [scheduleId, device.docente_id]
  );

  const currentSchedule = currentScheduleResult.rows[0] ?? null;

  if (
    !currentSchedule ||
    Number(currentSchedule.dia_semana) !==
      Number(scheduleSnapshot.dia_semana) ||
    String(currentSchedule.hora_inicio).slice(0, 5) !==
      String(scheduleSnapshot.hora_inicio).slice(0, 5)
  ) {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed,
      result: 'REQUIERE_REVISION',
      reason: 'HORARIO_CAMBIO_DESPUES_DE_MARCAR',
      clock,
      signatureVerified: true,
      clockTrusted: true,
      bleDetail: { proofs: bleProofs.length },
    });

    return {
      localId,
      id,
      status: 'REQUIERE_REVISION',
      code: 'HORARIO_CAMBIO_DESPUES_DE_MARCAR',
      message:
        'El horario cambió y la marcación requiere revisión.',
    };
  }

  let blePresence;
  try {
    blePresence = await validateBlePresence(client, {
      proofs: bleProofs,
      schedule: currentSchedule,
      teacherId: Number(device.docente_id),
      targetType: 'CURSO',
      referenceTimeMs: estimatedEpochMs,
    });
  } catch (error) {
    const id = await persistRejectedRecord(client, {
      batchId,
      credential,
      record: { ...record, localId },
      content,
      contentHash,
      signature,
      parsed,
      result: 'RECHAZADA',
      reason: error.code ?? 'PRESENCIA_BLE_INVALIDA',
      clock,
      signatureVerified: true,
      clockTrusted: true,
      bleDetail: error.detail ?? {},
    });

    return {
      localId,
      id,
      status: 'RECHAZADA',
      code: error.code ?? 'PRESENCIA_BLE_INVALIDA',
      message: error.message,
    };
  }

  const mobileReaderId = `MOVIL-OFFLINE:${device.dispositivo_id}`;
  const entryLimitResult = await client.query(
    `SELECT
       COALESCE(hora_ingreso_limite, '09:00:00'::time)
         AS hora_ingreso_limite
     FROM configuracion_asistencia
     ORDER BY id
     LIMIT 1`
  );
  const entryLimit =
    entryLimitResult.rows[0]?.hora_ingreso_limite ?? '09:00:00';
  const entryState =
    String(clock.hora_local) <= String(entryLimit)
      ? 'PUNTUAL'
      : 'TARDANZA';

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
       $1, $2, $3, $4, $5,
       'Marcación offline firmada y sincronizada'
     )
     ON CONFLICT (docente_id, fecha)
     DO NOTHING
     RETURNING id, estado`,
    [
      device.docente_id,
      clock.fecha_local,
      clock.hora_local,
      mobileReaderId,
      entryState,
    ]
  );

  let entryRecord = entryInsert.rows[0] ?? null;
  if (!entryRecord) {
    const existing = await client.query(
      `SELECT id, estado
       FROM registros_ingreso_institucional
       WHERE docente_id = $1
         AND fecha = $2`,
      [device.docente_id, clock.fecha_local]
    );
    entryRecord = existing.rows[0] ?? null;
  }

  const courseState =
    String(clock.hora_local) > String(currentSchedule.hora_inicio)
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
       $1, $2, $3, $4, $5, $6,
       'Marcación offline firmada y sincronizada'
     )
     ON CONFLICT (horario_curso_id, fecha)
     DO NOTHING
     RETURNING id, estado`,
    [
      scheduleId,
      device.docente_id,
      clock.fecha_local,
      clock.hora_local,
      mobileReaderId,
      courseState,
    ]
  );

  let courseRecord = courseInsert.rows[0] ?? null;
  const duplicate = !courseRecord;
  if (!courseRecord) {
    const existing = await client.query(
      `SELECT id, estado
       FROM registros_asistencia_curso
       WHERE horario_curso_id = $1
         AND fecha = $2`,
      [scheduleId, clock.fecha_local]
    );
    courseRecord = existing.rows[0] ?? null;
  }

  const resultCode = duplicate ? 'DUPLICADA' : 'REGISTRADA';
  const insertResult = await client.query(
    `INSERT INTO marcaciones_offline (
       local_id,
       lote_id,
       credencial_id,
       dispositivo_id,
       docente_id,
       horario_curso_id,
       estacion_ble_id,
       secuencia,
       fecha_hora_estimada,
       fecha_local_estimada,
       hora_local_estimada,
       contenido_firmado,
       contenido_hash,
       firma_base64,
       firma_verificada,
       reloj_confiable,
       presencia_ble_validada,
       resultado,
       motivo_resultado,
       detalle_reloj,
       detalle_ble,
       registro_ingreso_id,
       registro_asistencia_id
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11, $12, $13, $14,
       TRUE, TRUE, TRUE, $15, $16, $17::jsonb, $18::jsonb,
       $19, $20
     )
     RETURNING id`,
    [
      localId,
      batchId,
      credential.id,
      device.dispositivo_id,
      device.docente_id,
      scheduleId,
      Number(blePresence.station.id),
      sequence,
      estimatedAt,
      clock.fecha_local,
      clock.hora_local,
      content,
      contentHash,
      signature,
      resultCode,
      duplicate ? 'ASISTENCIA_YA_EXISTENTE' : null,
      JSON.stringify({
        expectedEpochMs,
        estimatedEpochMs,
        differenceMs: clockDifferenceMs,
        bootCount,
      }),
      JSON.stringify({
        stationId: Number(blePresence.station.id),
        stationCode: blePresence.station.codigo,
        stationName: blePresence.station.nombre,
        proofHash: blePresence.proofHash,
        rssiAverage: blePresence.proof.rssiAverage,
        samples: blePresence.proof.samples,
      }),
      entryRecord?.id ?? null,
      courseRecord?.id ?? null,
    ]
  );

  await client.query(
    `UPDATE credenciales_offline_dispositivo
     SET
       ultima_secuencia = GREATEST(ultima_secuencia, $1),
       actualizada_en = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [sequence, credential.id]
  );
  credential.ultima_secuencia = Math.max(
    Number(credential.ultima_secuencia),
    sequence
  );

  await client.query(
    `UPDATE dispositivos_moviles
     SET
       ultimo_acceso = CURRENT_TIMESTAMP,
       version_aplicacion = '0.8.5+13',
       actualizado_en = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [device.dispositivo_id]
  );

  return {
    localId,
    id: Number(insertResult.rows[0].id),
    status: resultCode,
    code: duplicate ? 'ASISTENCIA_DUPLICADA' : 'SINCRONIZADA',
    message: duplicate
      ? 'La asistencia de esta clase ya estaba registrada.'
      : `Asistencia offline sincronizada como ${courseState}.`,
    attendance: {
      course: currentSchedule.curso,
      classroom: currentSchedule.aula,
      date: String(clock.fecha_local),
      time: String(clock.hora_local),
      state: courseRecord?.estado ?? courseState,
    },
  };
}

// Prepara la credencial y el horario cifrado localmente por la app.
router.post(
  '/preparar',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error: 'La cuenta no tiene un perfil docente asociado.',
      });
    }

    const installationId = cleanText(
      req.body.installationId ?? req.body.uuid_instalacion,
      120
    );
    const elapsedRealtimeMs = Number(req.body.elapsedRealtimeMs);
    const bootCount = toInteger(req.body.bootCount) ?? 0;

    if (
      !isInstallationId(installationId) ||
      !Number.isFinite(elapsedRealtimeMs) ||
      elapsedRealtimeMs < 0
    ) {
      return res.status(400).json({
        error:
          'No se pudo establecer el reloj seguro del dispositivo.',
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
           dm.huella_clave_asistencia,
           dm.clave_publica_asistencia,
           u.codigo,
           u.nombres,
           u.apellidos,
           u.email,
           u.activo,
           dep.nombre AS departamento
         FROM dispositivos_moviles dm
         JOIN usuarios u ON u.id = dm.usuario_id
         JOIN docentes d ON d.id = dm.docente_id
         LEFT JOIN departamentos_academicos dep
           ON dep.id = d.departamento_id
         WHERE dm.uuid_instalacion = $1
           AND dm.usuario_id = $2
           AND dm.docente_id = $3
         FOR UPDATE OF dm`,
        [
          installationId,
          req.user.usuario_id,
          req.user.docente_id,
        ]
      );

      const device = deviceResult.rows[0];

      if (
        !device ||
        device.estado !== 'AUTORIZADO' ||
        !device.activo ||
        !device.huella_clave_asistencia ||
        !device.clave_publica_asistencia
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'El celular debe estar autorizado y tener la firma biométrica preparada.',
        });
      }

      const configuration = await getOfflineConfiguration(client);
      const clock = await getInstitutionClock(client);
      const attendanceConfigResult = await client.query(
        `SELECT
           COALESCE(tolerancia_antes_minutos, 15)::int
             AS tolerancia_antes_minutos,
           COALESCE(tolerancia_despues_minutos, 10)::int
             AS tolerancia_despues_minutos
         FROM configuracion_asistencia
         ORDER BY id
         LIMIT 1`
      );
      const attendanceConfig =
        attendanceConfigResult.rows[0] ?? {
          tolerancia_antes_minutos: 15,
          tolerancia_despues_minutos: 10,
        };

      const schedulesResult = await client.query(
        `SELECT
           hc.id AS horario_curso_id,
           hc.dia_semana,
           hc.hora_inicio,
           hc.hora_fin,
           hc.aula,
           c.codigo AS codigo_curso,
           c.nombre AS curso,
           s.codigo AS semestre,
           s.fecha_inicio,
           s.fecha_fin
         FROM horarios_curso hc
         JOIN cursos c ON c.id = hc.curso_id
         JOIN semestres s ON s.id = hc.semestre_id
         WHERE hc.docente_id = $1
           AND hc.activo = TRUE
           AND s.activo = TRUE
           AND $2::date BETWEEN s.fecha_inicio AND s.fecha_fin
         ORDER BY hc.dia_semana, hc.hora_inicio, hc.id`,
        [device.docente_id, clock.fecha_local]
      );

      if (schedulesResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'No existen horarios activos para preparar la marcación offline.',
        });
      }

      await client.query(
        `UPDATE credenciales_offline_dispositivo
         SET
           estado = 'REVOCADA',
           revocada_en = CURRENT_TIMESTAMP,
           motivo_revocacion = 'RENOVADA',
           actualizada_en = CURRENT_TIMESTAMP
         WHERE dispositivo_id = $1
           AND estado = 'ACTIVA'`,
        [device.id]
      );

      const credentialId = crypto.randomUUID();
      const serverEpochMs = Date.now();
      const expiresAt = new Date(
        serverEpochMs +
          Number(configuration.vigencia_credencial_horas) *
            60 *
            60 *
            1000
      );
      const configurationSnapshot = {
        timezone: clock.zona_horaria,
        asistencia: attendanceConfig,
        offline: configuration,
      };

      await client.query(
        `INSERT INTO credenciales_offline_dispositivo (
           id,
           dispositivo_id,
           usuario_id,
           docente_id,
           huella_clave_asistencia,
           estado,
           emitida_en,
           expira_en,
           servidor_epoch_ms,
           dispositivo_elapsed_ms,
           dispositivo_boot_count,
           horarios_snapshot,
           configuracion_snapshot
         )
         VALUES (
           $1, $2, $3, $4, $5, 'ACTIVA',
           CURRENT_TIMESTAMP, $6, $7, $8, $9, $10::jsonb, $11::jsonb
         )`,
        [
          credentialId,
          device.id,
          device.usuario_id,
          device.docente_id,
          device.huella_clave_asistencia,
          expiresAt,
          serverEpochMs,
          Math.round(elapsedRealtimeMs),
          bootCount,
          JSON.stringify(schedulesResult.rows),
          JSON.stringify(configurationSnapshot),
        ]
      );

      await client.query(
        `UPDATE dispositivos_moviles
         SET
           version_aplicacion = '0.8.5+13',
           actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [device.id]
      );

      await writeAudit(
        client,
        req,
        'PREPARAR_CREDENCIAL_ASISTENCIA_OFFLINE',
        'credenciales_offline_dispositivo',
        null,
        {
          credentialId,
          deviceId: Number(device.id),
          expiresAt: expiresAt.toISOString(),
          schedules: schedulesResult.rows.length,
        }
      );

      await client.query('COMMIT');

      return res.json({
        credencial: {
          id: credentialId,
          issuedAt: new Date(serverEpochMs).toISOString(),
          expiresAt: expiresAt.toISOString(),
          serverEpochMs,
          anchorElapsedRealtimeMs: Math.round(elapsedRealtimeMs),
          bootCount,
          maxAgeHours: Number(
            configuration.antiguedad_maxima_horas
          ),
          maxPending: Number(
            configuration.maximo_pendientes_dispositivo
          ),
          clockToleranceSeconds: Number(
            configuration.tolerancia_reloj_segundos
          ),
          installationId: device.uuid_instalacion,
          deviceId: Number(device.id),
          keyFingerprint: device.huella_clave_asistencia,
          teacher: {
            id: Number(device.docente_id),
            code: device.codigo,
            names: device.nombres,
            surnames: device.apellidos,
            email: device.email,
            department: device.departamento,
          },
          attendance: {
            beforeMinutes: Number(
              attendanceConfig.tolerancia_antes_minutos
            ),
            afterMinutes: Number(
              attendanceConfig.tolerancia_despues_minutos
            ),
          },
          schedules: schedulesResult.rows.map((schedule) => ({
            id: Number(schedule.horario_curso_id),
            dayOfWeek: Number(schedule.dia_semana),
            startTime: String(schedule.hora_inicio),
            endTime: String(schedule.hora_fin),
            classroom: schedule.aula,
            courseCode: schedule.codigo_curso,
            courseName: schedule.curso,
            semester: schedule.semestre,
            semesterStart: String(schedule.fecha_inicio),
            semesterEnd: String(schedule.fecha_fin),
          })),
        },
        mensaje:
          'Modo offline preparado. La credencial y los horarios se guardarán cifrados en el celular.',
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al preparar modo offline:', error);
      return res.status(500).json({
        error:
          'No se pudo preparar el funcionamiento sin conexión.',
      });
    } finally {
      client.release();
    }
  }
);

router.post('/sincronizar', async (req, res) => {
  if (!consumeRate(req)) {
    return res.status(429).json({
      error:
        'Se realizaron demasiadas sincronizaciones. Espere un minuto.',
    });
  }

  const installationId = cleanText(
    req.body.installationId ?? req.body.uuid_instalacion,
    120
  );
  const credentialId = cleanText(
    req.body.credentialId ?? req.body.credencial_id,
    50
  );
  const batchId = cleanText(
    req.body.batchId ?? req.body.lote_id,
    50
  );
  const records = Array.isArray(req.body.records)
    ? req.body.records.slice(0, 50)
    : [];

  if (
    !isInstallationId(installationId) ||
    !isUuid(credentialId) ||
    !isUuid(batchId) ||
    records.length === 0
  ) {
    return res.status(400).json({
      error: 'El lote de sincronización está incompleto.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const credentialResult = await client.query(
      `SELECT
         cod.*,
         dm.uuid_instalacion,
         dm.estado AS estado_dispositivo,
         dm.clave_publica_asistencia,
         dm.huella_clave_asistencia,
         u.codigo,
         u.nombres,
         u.apellidos,
         u.activo
       FROM credenciales_offline_dispositivo cod
       JOIN dispositivos_moviles dm
         ON dm.id = cod.dispositivo_id
       JOIN usuarios u
         ON u.id = cod.usuario_id
       WHERE cod.id = $1
         AND dm.uuid_instalacion = $2
       FOR UPDATE OF cod, dm`,
      [credentialId, installationId]
    );

    const credential = credentialResult.rows[0];

    if (
      !credential ||
      credential.estado === 'REVOCADA' ||
      credential.estado_dispositivo !== 'AUTORIZADO' ||
      !credential.activo
    ) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error:
          'La credencial offline o el dispositivo ya no están autorizados.',
      });
    }

    const existingBatch = await client.query(
      `SELECT id, estado
       FROM lotes_sincronizacion_movil
       WHERE id = $1`,
      [batchId]
    );

    if (existingBatch.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Este lote de sincronización ya fue procesado.',
      });
    }

    const configuration = await getOfflineConfiguration(client);

    await client.query(
      `INSERT INTO lotes_sincronizacion_movil (
         id,
         dispositivo_id,
         credencial_id,
         estado,
         total_registros,
         ip_origen
       )
       VALUES (
         $1, $2, $3, 'PROCESANDO', $4,
         NULLIF($5, '')::inet
       )`,
      [
        batchId,
        credential.dispositivo_id,
        credential.id,
        records.length,
        clientIp(req),
      ]
    );

    const results = [];

    for (let index = 0; index < records.length; index += 1) {
      const savepoint = `registro_${index}`;
      await client.query(`SAVEPOINT ${savepoint}`);

      try {
        const result = await processOfflineRecord(client, req, {
          batchId,
          device: credential,
          credential,
          configuration,
          record: records[index],
        });
        results.push(result);

        await insertSyncAttempt(client, req, {
          batchId,
          deviceId: Number(credential.dispositivo_id),
          localId: result.localId,
          result: result.status,
          code: result.code,
          message: result.message,
        });
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      } catch (error) {
        await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        const localId = cleanText(records[index]?.localId, 50);
        const failure = {
          localId,
          status: 'RECHAZADA',
          code: 'ERROR_INTERNO_REGISTRO',
          message:
            'La marcación no pudo procesarse y fue aislada del resto del lote.',
        };
        results.push(failure);

        await insertSyncAttempt(client, req, {
          batchId,
          deviceId: Number(credential.dispositivo_id),
          localId,
          result: failure.status,
          code: failure.code,
          message: failure.message,
          detail: { error: error.message },
        });
        await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        console.error('Error en registro offline aislado:', error);
      }
    }

    const summary = {
      registered: results.filter(
        (item) => item.status === 'REGISTRADA'
      ).length,
      duplicated: results.filter(
        (item) => item.status === 'DUPLICADA'
      ).length,
      rejected: results.filter(
        (item) => item.status === 'RECHAZADA'
      ).length,
      review: results.filter(
        (item) => item.status === 'REQUIERE_REVISION'
      ).length,
    };
    const batchState =
      summary.rejected > 0 || summary.review > 0
        ? summary.registered > 0 || summary.duplicated > 0
          ? 'PARCIAL'
          : 'RECHAZADO'
        : 'COMPLETADO';

    await client.query(
      `UPDATE lotes_sincronizacion_movil
       SET
         estado = $1,
         registrados = $2,
         duplicados = $3,
         rechazados = $4,
         requieren_revision = $5,
         completado_en = CURRENT_TIMESTAMP,
         detalle = $6::jsonb
       WHERE id = $7`,
      [
        batchState,
        summary.registered,
        summary.duplicated,
        summary.rejected,
        summary.review,
        JSON.stringify({ results }),
        batchId,
      ]
    );

    if (
      new Date(credential.expira_en).getTime() <= Date.now() &&
      credential.estado === 'ACTIVA'
    ) {
      await client.query(
        `UPDATE credenciales_offline_dispositivo
         SET
           estado = 'EXPIRADA',
           actualizada_en = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [credential.id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      batchId,
      state: batchState,
      summary,
      results,
      message:
        batchState === 'COMPLETADO'
          ? 'Todas las marcaciones pendientes fueron procesadas.'
          : 'La sincronización terminó con observaciones.',
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al sincronizar marcaciones offline:', error);
    return res.status(500).json({
      error:
        'No se pudo completar la sincronización offline.',
    });
  } finally {
    client.release();
  }
});

router.get(
  '/dashboard',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    try {
      const summaryResult = await pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE resultado = 'REGISTRADA'
           )::int AS registradas,
           COUNT(*) FILTER (
             WHERE resultado = 'DUPLICADA'
           )::int AS duplicadas,
           COUNT(*) FILTER (
             WHERE resultado = 'RECHAZADA'
           )::int AS rechazadas,
           COUNT(*) FILTER (
             WHERE resultado = 'REQUIERE_REVISION'
           )::int AS requieren_revision,
           COUNT(*) FILTER (
             WHERE recibido_en >= CURRENT_DATE
           )::int AS recibidas_hoy
         FROM marcaciones_offline`
      );

      const recordsResult = await pool.query(
        `SELECT *
         FROM v_sincronizacion_movil_reciente
         ORDER BY recibido_en DESC
         LIMIT 100`
      );

      const batchesResult = await pool.query(
        `SELECT
           l.*,
           dm.fabricante,
           dm.modelo,
           u.codigo AS codigo_docente,
           u.nombres,
           u.apellidos
         FROM lotes_sincronizacion_movil l
         JOIN dispositivos_moviles dm ON dm.id = l.dispositivo_id
         JOIN credenciales_offline_dispositivo c
           ON c.id = l.credencial_id
         JOIN usuarios u ON u.id = c.usuario_id
         ORDER BY l.iniciado_en DESC
         LIMIT 30`
      );

      const conflictsResult = await pool.query(
        `SELECT
           c.*,
           mo.local_id,
           mo.resultado,
           u.codigo AS codigo_docente,
           u.nombres,
           u.apellidos,
           curso.nombre AS curso,
           hc.aula
         FROM conflictos_sincronizacion c
         JOIN marcaciones_offline mo
           ON mo.id = c.marcacion_offline_id
         JOIN docentes d ON d.id = mo.docente_id
         JOIN usuarios u ON u.id = d.usuario_id
         LEFT JOIN horarios_curso hc
           ON hc.id = mo.horario_curso_id
         LEFT JOIN cursos curso ON curso.id = hc.curso_id
         WHERE c.estado = 'ABIERTO'
         ORDER BY c.creado_en DESC
         LIMIT 50`
      );

      return res.json({
        resumen: summaryResult.rows[0],
        registros: recordsResult.rows,
        lotes: batchesResult.rows,
        conflictos: conflictsResult.rows,
      });
    } catch (error) {
      console.error('Error al consultar sincronización offline:', error);
      return res.status(500).json({
        error:
          'No se pudo consultar el panel de sincronización.',
      });
    }
  }
);

router.post(
  '/registros/:id/revisar',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const recordId = toPositiveInteger(req.params.id);
    const action = cleanText(req.body.action, 20).toUpperCase();
    const observation = cleanText(req.body.observation, 500);

    if (
      !recordId ||
      !['ACEPTAR', 'RECHAZAR'].includes(action) ||
      observation.length < 5
    ) {
      return res.status(400).json({
        error:
          'Indique una acción válida y una observación de al menos cinco caracteres.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const recordResult = await client.query(
        `SELECT mo.*, hc.hora_inicio
         FROM marcaciones_offline mo
         LEFT JOIN horarios_curso hc
           ON hc.id = mo.horario_curso_id
         WHERE mo.id = $1
         FOR UPDATE OF mo`,
        [recordId]
      );
      const record = recordResult.rows[0];

      if (!record || record.resultado !== 'REQUIERE_REVISION') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error:
            'La marcación no existe o ya no requiere revisión.',
        });
      }

      let finalResult = 'RECHAZADA';
      let attendanceId = null;

      if (action === 'ACEPTAR' && record.horario_curso_id) {
        const state =
          String(record.hora_local_estimada) >
          String(record.hora_inicio)
            ? 'TARDANZA'
            : 'PRESENTE';
        const inserted = await client.query(
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
             $1, $2, $3, $4, $5, $6, $7
           )
           ON CONFLICT (horario_curso_id, fecha)
           DO NOTHING
           RETURNING id`,
          [
            record.horario_curso_id,
            record.docente_id,
            record.fecha_local_estimada,
            record.hora_local_estimada,
            `MOVIL-OFFLINE:${record.dispositivo_id}`,
            state,
            `Marcación offline aceptada por administrador: ${observation}`,
          ]
        );

        if (inserted.rows.length > 0) {
          finalResult = 'REGISTRADA';
          attendanceId = inserted.rows[0].id;
        } else {
          finalResult = 'DUPLICADA';
        }
      }

      await client.query(
        `UPDATE marcaciones_offline
         SET
           resultado = $1,
           motivo_resultado = $2,
           registro_asistencia_id = COALESCE($3, registro_asistencia_id),
           revisado_en = CURRENT_TIMESTAMP,
           revisado_por = $4,
           observacion_revision = $5
         WHERE id = $6`,
        [
          finalResult,
          action === 'ACEPTAR'
            ? 'REVISION_ADMINISTRATIVA_ACEPTADA'
            : 'REVISION_ADMINISTRATIVA_RECHAZADA',
          attendanceId,
          req.user.usuario_id,
          observation,
          recordId,
        ]
      );

      await client.query(
        `UPDATE conflictos_sincronizacion
         SET
           estado = 'RESUELTO',
           resuelto_en = CURRENT_TIMESTAMP,
           resuelto_por = $1,
           resolucion = $2
         WHERE marcacion_offline_id = $3
           AND estado = 'ABIERTO'`,
        [req.user.usuario_id, observation, recordId]
      );

      await writeAudit(
        client,
        req,
        action === 'ACEPTAR'
          ? 'ACEPTAR_MARCACION_OFFLINE'
          : 'RECHAZAR_MARCACION_OFFLINE',
        'marcaciones_offline',
        recordId,
        { finalResult, observation }
      );

      await client.query('COMMIT');

      return res.json({
        message:
          action === 'ACEPTAR'
            ? `Marcación revisada con resultado ${finalResult}.`
            : 'Marcación rechazada administrativamente.',
        result: finalResult,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al revisar marcación offline:', error);
      return res.status(500).json({
        error:
          'No se pudo completar la revisión administrativa.',
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
