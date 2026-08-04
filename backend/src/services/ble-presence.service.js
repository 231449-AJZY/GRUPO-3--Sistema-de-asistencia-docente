const crypto = require('crypto');

const BLE_PROTOCOL_VERSION = 1;
const BLE_MESSAGE_PREFIX = 'UNSAAC_BLE';
const BLE_TOKEN_BYTES = 8;

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function hashText(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('hex');
}

function timingSafeHexEqual(left, right) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getMasterKey() {
  const raw = cleanText(process.env.BLE_MASTER_KEY, 256);
  let key;

  if (/^[a-f0-9]{64}$/i.test(raw)) {
    key = Buffer.from(raw, 'hex');
  } else {
    try {
      key = Buffer.from(raw, 'base64');
    } catch {
      key = Buffer.alloc(0);
    }
  }

  if (key.length !== 32) {
    throw new Error(
      'BLE_MASTER_KEY debe contener exactamente 32 bytes en hexadecimal o Base64.'
    );
  }

  return key;
}

function encryptStationSecret(secret) {
  const secretBuffer = Buffer.isBuffer(secret)
    ? secret
    : Buffer.from(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getMasterKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secretBuffer),
    cipher.final(),
  ]);

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

function decryptStationSecret(station) {
  const encrypted = Buffer.from(station.secreto_cifrado, 'base64');
  const iv = Buffer.from(station.secreto_iv, 'base64');
  const tag = Buffer.from(station.secreto_tag, 'base64');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getMasterKey(),
    iv
  );
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
}

function createStationSecret() {
  return crypto.randomBytes(32);
}

function tokenMessage(stationId, timeSlot) {
  return `${BLE_MESSAGE_PREFIX}|${BLE_PROTOCOL_VERSION}|${stationId}|${timeSlot}`;
}

function calculateBleToken(secret, stationId, timeSlot) {
  return crypto
    .createHmac('sha256', secret)
    .update(tokenMessage(stationId, timeSlot), 'utf8')
    .digest()
    .subarray(0, BLE_TOKEN_BYTES)
    .toString('hex');
}

function parseProofs(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 20)
    .map((raw) => {
      if (!raw || typeof raw !== 'object') {
        return null;
      }

      const stationId = toPositiveInteger(
        raw.stationId ?? raw.estacionId ?? raw.estacion_id
      );
      const timeSlot = toInteger(raw.timeSlot ?? raw.slot ?? raw.time_slot);
      const token = cleanText(raw.token, 64).toLowerCase();
      const rssiAverage = Number(
        raw.rssiAverage ?? raw.rssiPromedio ?? raw.rssi_promedio
      );
      const rssiMin = toInteger(raw.rssiMin ?? raw.rssi_minimo);
      const rssiMax = toInteger(raw.rssiMax ?? raw.rssi_maximo);
      const samples = toInteger(raw.samples ?? raw.muestras);
      const address = cleanText(raw.address ?? raw.direccion, 100);
      const name = cleanText(raw.name ?? raw.nombre, 120);

      if (
        !stationId ||
        timeSlot === null ||
        !/^[a-f0-9]{16}$/.test(token) ||
        !Number.isFinite(rssiAverage) ||
        rssiAverage < -130 ||
        rssiAverage > 0 ||
        rssiMin === null ||
        rssiMax === null ||
        rssiMin < -130 ||
        rssiMin > 0 ||
        rssiMax < -130 ||
        rssiMax > 0 ||
        samples === null ||
        samples < 1 ||
        samples > 100
      ) {
        return null;
      }

      return {
        stationId,
        timeSlot,
        token,
        rssiAverage: Math.round(rssiAverage * 100) / 100,
        rssiMin,
        rssiMax,
        samples,
        address,
        name,
      };
    })
    .filter(Boolean);
}

async function getBleConfiguration(client) {
  const result = await client.query(
    `SELECT
       intervalo_rotacion_seg,
       margen_slots,
       requerir_en_curso,
       requerir_en_ingreso,
       rssi_minimo_default,
       muestras_minimas_default
     FROM configuracion_ble
     WHERE id = 1`
  );

  return (
    result.rows[0] ?? {
      intervalo_rotacion_seg: 15,
      margen_slots: 1,
      requerir_en_curso: true,
      requerir_en_ingreso: false,
      rssi_minimo_default: -75,
      muestras_minimas_default: 3,
    }
  );
}

async function findExpectedStations(
  client,
  { schedule, teacherId, targetType }
) {
  if (targetType === 'CURSO' && schedule) {
    const result = await client.query(
      `SELECT e.*
       FROM estaciones_ble e
       JOIN docentes d
         ON d.id = $1
       WHERE e.estado = 'ACTIVA'
         AND e.tipo IN ('AULA', 'PRUEBA')
         AND (
           e.departamento_id IS NULL OR
           e.departamento_id = d.departamento_id
         )
         AND (
           e.aula IS NULL OR
           BTRIM(e.aula) = '' OR
           LOWER(BTRIM(e.aula)) = LOWER(BTRIM($2))
         )
       ORDER BY
         CASE WHEN LOWER(BTRIM(COALESCE(e.aula, ''))) = LOWER(BTRIM($2))
              THEN 0 ELSE 1 END,
         CASE WHEN e.departamento_id = d.departamento_id THEN 0 ELSE 1 END,
         e.id`,
      [teacherId, schedule.aula ?? '']
    );

    return result.rows;
  }

  const result = await client.query(
    `SELECT e.*
     FROM estaciones_ble e
     JOIN docentes d
       ON d.id = $1
     WHERE e.estado = 'ACTIVA'
       AND e.tipo IN ('INGRESO', 'PRUEBA')
       AND (
         e.departamento_id IS NULL OR
         e.departamento_id = d.departamento_id
       )
     ORDER BY
       CASE WHEN e.departamento_id = d.departamento_id THEN 0 ELSE 1 END,
       e.id`,
    [teacherId]
  );

  return result.rows;
}

function currentSlot(intervalSeconds, referenceTimeMs = Date.now()) {
  const safeReference = Number.isFinite(Number(referenceTimeMs))
    ? Number(referenceTimeMs)
    : Date.now();
  return Math.floor(safeReference / 1000 / intervalSeconds);
}

function validateProofForStation(
  station,
  proof,
  configuration,
  referenceTimeMs = Date.now()
) {
  const interval = Number(
    station.intervalo_rotacion_seg ??
      configuration.intervalo_rotacion_seg ??
      15
  );
  const allowedDrift = Number(configuration.margen_slots ?? 1);
  const serverSlot = currentSlot(interval, referenceTimeMs);
  const slotDifference = Math.abs(serverSlot - proof.timeSlot);
  const minimumRssi = Number(
    station.rssi_minimo ?? configuration.rssi_minimo_default ?? -75
  );
  const minimumSamples = Number(
    station.muestras_minimas ??
      configuration.muestras_minimas_default ??
      3
  );

  if (slotDifference > allowedDrift) {
    return {
      valid: false,
      reason: 'TOKEN_BLE_EXPIRADO',
      detail: { serverSlot, slotDifference, allowedDrift },
    };
  }

  const secret = decryptStationSecret(station);
  const expectedToken = calculateBleToken(
    secret,
    Number(station.id),
    proof.timeSlot
  );

  if (!timingSafeHexEqual(expectedToken, proof.token)) {
    return {
      valid: false,
      reason: 'TOKEN_BLE_INVALIDO',
      detail: { serverSlot, slotDifference },
    };
  }

  if (proof.samples < minimumSamples) {
    return {
      valid: false,
      reason: 'MUESTRAS_BLE_INSUFICIENTES',
      detail: { samples: proof.samples, minimumSamples },
    };
  }

  if (proof.rssiAverage < minimumRssi) {
    return {
      valid: false,
      reason: 'SENAL_BLE_INSUFICIENTE',
      detail: { rssiAverage: proof.rssiAverage, minimumRssi },
    };
  }

  return {
    valid: true,
    reason: null,
    detail: {
      serverSlot,
      slotDifference,
      minimumRssi,
      minimumSamples,
    },
  };
}

async function validateBlePresence(
  client,
  {
    proofs: rawProofs,
    schedule,
    teacherId,
    targetType,
    referenceTimeMs = Date.now(),
  }
) {
  const configuration = await getBleConfiguration(client);
  const required =
    targetType === 'CURSO'
      ? Boolean(configuration.requerir_en_curso)
      : Boolean(configuration.requerir_en_ingreso);

  const expectedStations = await findExpectedStations(client, {
    schedule,
    teacherId,
    targetType,
  });

  if (!required && expectedStations.length === 0) {
    return {
      required: false,
      validated: false,
      station: null,
      proof: null,
      proofHash: null,
      message: 'La presencia BLE no es obligatoria para esta marcación.',
    };
  }

  if (expectedStations.length === 0) {
    const error = new Error(
      targetType === 'CURSO'
        ? 'No existe una estación BLE activa para el aula de esta clase.'
        : 'No existe una estación BLE activa para el ingreso institucional.'
    );
    error.code = 'BLE_STATION_NOT_CONFIGURED';
    error.status = 422;
    throw error;
  }

  const proofs = parseProofs(rawProofs);
  if (proofs.length === 0) {
    const error = new Error(
      'No se detectó una estación Bluetooth institucional cercana.'
    );
    error.code = 'BLE_PROOF_REQUIRED';
    error.status = 422;
    throw error;
  }

  const stationsById = new Map(
    expectedStations.map((station) => [Number(station.id), station])
  );
  const rejected = [];

  for (const proof of proofs) {
    const station = stationsById.get(proof.stationId);
    if (!station) {
      rejected.push({
        stationId: proof.stationId,
        reason: 'ESTACION_NO_CORRESPONDE',
      });
      continue;
    }

    let validation;
    try {
      validation = validateProofForStation(
        station,
        proof,
        configuration,
        referenceTimeMs
      );
    } catch (error) {
      console.error('No se pudo descifrar la estación BLE:', error);
      validation = {
        valid: false,
        reason: 'ESTACION_CREDENCIAL_INVALIDA',
        detail: {},
      };
    }

    if (!validation.valid) {
      rejected.push({
        stationId: proof.stationId,
        reason: validation.reason,
        detail: validation.detail,
      });
      continue;
    }

    const canonicalProof = JSON.stringify({
      version: BLE_PROTOCOL_VERSION,
      stationId: Number(station.id),
      stationCode: station.codigo,
      timeSlot: proof.timeSlot,
      token: proof.token,
      rssiAverage: proof.rssiAverage,
      rssiMin: proof.rssiMin,
      rssiMax: proof.rssiMax,
      samples: proof.samples,
    });

    return {
      required,
      validated: true,
      station,
      proof,
      proofHash: hashText(canonicalProof),
      canonicalProof,
      validation,
      message: `Presencia validada en ${station.nombre}.`,
    };
  }

  const error = new Error(
    'Las estaciones detectadas no cumplen la ubicación, vigencia o intensidad de señal requeridas.'
  );
  error.code = 'BLE_PROOF_REJECTED';
  error.status = 422;
  error.detail = { rejected };
  throw error;
}

module.exports = {
  BLE_PROTOCOL_VERSION,
  BLE_TOKEN_BYTES,
  calculateBleToken,
  createStationSecret,
  decryptStationSecret,
  encryptStationSecret,
  getBleConfiguration,
  hashText,
  parseProofs,
  validateBlePresence,
};
