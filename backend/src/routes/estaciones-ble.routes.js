const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');
const {
  createStationSecret,
  decryptStationSecret,
  encryptStationSecret,
  hashText,
} = require('../services/ble-presence.service');

const PROVISION_TTL_MINUTES = 5;
const STATION_TYPES = new Set(['AULA', 'INGRESO', 'PRUEBA']);
const STATION_STATES = new Set([
  'PENDIENTE',
  'ACTIVA',
  'SUSPENDIDA',
  'REVOCADA',
]);

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanUpperText(value, maxLength = 255) {
  return cleanText(value, maxLength).toUpperCase();
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function toInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function clientIp(req) {
  return cleanText(req.ip || req.socket?.remoteAddress || '', 100);
}

function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
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

async function writeBleEvent(
  client,
  req,
  {
    stationId = null,
    deviceId = null,
    teacherId = null,
    type,
    result = 'EXITO',
    detail = {},
  }
) {
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
       $4,
       $5,
       $6,
       $7::jsonb,
       NULLIF($8, '')::inet
     )`,
    [
      stationId,
      deviceId,
      teacherId,
      req.user?.usuario_id ?? null,
      type,
      result,
      JSON.stringify(detail),
      clientIp(req),
    ]
  );
}

async function getStation(client, stationId, { forUpdate = false } = {}) {
  const result = await client.query(
    `SELECT
       e.*,
       dep.nombre AS departamento
     FROM estaciones_ble e
     LEFT JOIN departamentos_academicos dep
       ON dep.id = e.departamento_id
     WHERE e.id = $1
     ${forUpdate ? 'FOR UPDATE OF e' : ''}`,
    [stationId]
  );

  return result.rows[0] ?? null;
}

function stationResponse(station) {
  return {
    id: Number(station.id),
    uuid: station.uuid,
    codigo: station.codigo,
    nombre: station.nombre,
    tipo: station.tipo,
    departamento_id: station.departamento_id
      ? Number(station.departamento_id)
      : null,
    departamento: station.departamento ?? null,
    aula: station.aula ?? null,
    rssi_minimo: Number(station.rssi_minimo),
    muestras_minimas: Number(station.muestras_minimas),
    intervalo_rotacion_seg: Number(station.intervalo_rotacion_seg),
    estado: station.estado,
    motivo_estado: station.motivo_estado ?? null,
    provisionada_en: station.provisionada_en ?? null,
    ultima_deteccion_en: station.ultima_deteccion_en ?? null,
    ultima_deteccion_rssi:
      station.ultima_deteccion_rssi === null ||
      station.ultima_deteccion_rssi === undefined
        ? null
        : Number(station.ultima_deteccion_rssi),
    detecciones_hoy:
      station.detecciones_hoy === null ||
      station.detecciones_hoy === undefined
        ? 0
        : Number(station.detecciones_hoy),
    creada_en: station.creada_en,
    actualizada_en: station.actualizada_en,
    creada_por_nombre: station.creada_por_nombre ?? null,
    provisionada_por_nombre: station.provisionada_por_nombre ?? null,
  };
}

// GET /api/estaciones-ble/dashboard
router.get(
  '/dashboard',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    try {
      const [stations, departments, configuration, events, provisionings] =
        await Promise.all([
          pool.query(
            `SELECT *
             FROM v_estaciones_ble_resumen
             ORDER BY
               CASE estado
                 WHEN 'ACTIVA' THEN 0
                 WHEN 'PENDIENTE' THEN 1
                 WHEN 'SUSPENDIDA' THEN 2
                 ELSE 3
               END,
               nombre`
          ),
          pool.query(
            `SELECT id, codigo, nombre
             FROM departamentos_academicos
             WHERE activo = TRUE
             ORDER BY nombre`
          ),
          pool.query(
            `SELECT *
             FROM configuracion_ble
             WHERE id = 1`
          ),
          pool.query(
            `SELECT
               ev.id,
               ev.estacion_id,
               ev.tipo,
               ev.resultado,
               ev.detalle,
               ev.creado_en,
               e.codigo AS estacion_codigo,
               e.nombre AS estacion_nombre,
               actor.nombres || ' ' || actor.apellidos AS actor
             FROM eventos_seguridad_ble ev
             LEFT JOIN estaciones_ble e
               ON e.id = ev.estacion_id
             LEFT JOIN usuarios actor
               ON actor.id = ev.actor_usuario_id
             ORDER BY ev.creado_en DESC
             LIMIT 40`
          ),
          pool.query(
            `UPDATE codigos_provisionamiento_ble
             SET estado = 'EXPIRADO'
             WHERE estado = 'VIGENTE'
               AND expira_en <= CURRENT_TIMESTAMP
             RETURNING id`
          ),
        ]);

      const summary = stations.rows.reduce(
        (accumulator, station) => {
          accumulator.total += 1;
          const key = station.estado.toLowerCase();
          if (Object.prototype.hasOwnProperty.call(accumulator, key)) {
            accumulator[key] += 1;
          }
          accumulator.detecciones_hoy += Number(
            station.detecciones_hoy ?? 0
          );
          return accumulator;
        },
        {
          total: 0,
          pendiente: 0,
          activa: 0,
          suspendida: 0,
          revocada: 0,
          detecciones_hoy: 0,
        }
      );

      return res.json({
        estaciones: stations.rows.map(stationResponse),
        departamentos: departments.rows.map((value) => ({
          id: Number(value.id),
          codigo: value.codigo,
          nombre: value.nombre,
        })),
        configuracion: configuration.rows[0],
        resumen: summary,
        eventos: events.rows,
        codigos_expirados: provisionings.rowCount,
      });
    } catch (error) {
      console.error('Error al consultar estaciones BLE:', error);
      return res.status(500).json({
        error: 'No se pudieron consultar las estaciones Bluetooth.',
      });
    }
  }
);

// POST /api/estaciones-ble
router.post(
  '/',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const code = cleanUpperText(req.body.codigo, 40);
    const name = cleanText(req.body.nombre, 160);
    const type = cleanUpperText(req.body.tipo, 20);
    const departmentId = toPositiveInteger(req.body.departamento_id);
    const classroom = cleanText(req.body.aula, 120) || null;
    const minimumRssi = toInteger(req.body.rssi_minimo ?? -75);
    const minimumSamples = toInteger(req.body.muestras_minimas ?? 3);
    const intervalSeconds = toInteger(
      req.body.intervalo_rotacion_seg ?? 15
    );

    const fields = {};
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      fields.codigo =
        'Use entre 3 y 40 caracteres: letras, números, guion o guion bajo.';
    }
    if (name.length < 3) {
      fields.nombre = 'Ingrese un nombre de al menos tres caracteres.';
    }
    if (!STATION_TYPES.has(type)) {
      fields.tipo = 'Seleccione un tipo de estación válido.';
    }
    if (minimumRssi === null || minimumRssi < -110 || minimumRssi > -20) {
      fields.rssi_minimo = 'El RSSI debe estar entre -110 y -20 dBm.';
    }
    if (
      minimumSamples === null ||
      minimumSamples < 1 ||
      minimumSamples > 30
    ) {
      fields.muestras_minimas = 'Las muestras deben estar entre 1 y 30.';
    }
    if (
      intervalSeconds === null ||
      intervalSeconds < 5 ||
      intervalSeconds > 120
    ) {
      fields.intervalo_rotacion_seg =
        'El intervalo debe estar entre 5 y 120 segundos.';
    }
    if (type === 'AULA' && !classroom) {
      fields.aula = 'Una estación de aula requiere el nombre del aula.';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: 'Revise los datos de la estación.',
        fields,
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (departmentId) {
        const department = await client.query(
          `SELECT id
           FROM departamentos_academicos
           WHERE id = $1
             AND activo = TRUE`,
          [departmentId]
        );

        if (department.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({
            error: 'La carrera o departamento seleccionado no está activo.',
          });
        }
      }

      const protectedSecret = encryptStationSecret(createStationSecret());
      const inserted = await client.query(
        `INSERT INTO estaciones_ble (
           uuid,
           codigo,
           nombre,
           tipo,
           departamento_id,
           aula,
           rssi_minimo,
           muestras_minimas,
           intervalo_rotacion_seg,
           secreto_cifrado,
           secreto_iv,
           secreto_tag,
           estado,
           creada_por
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
           'PENDIENTE',
           $13
         )
         RETURNING *`,
        [
          crypto.randomUUID(),
          code,
          name,
          type,
          departmentId,
          classroom,
          minimumRssi,
          minimumSamples,
          intervalSeconds,
          protectedSecret.encrypted,
          protectedSecret.iv,
          protectedSecret.tag,
          req.user.usuario_id,
        ]
      );

      const station = inserted.rows[0];

      await writeAudit(
        client,
        req,
        'CREAR_ESTACION_BLE',
        'estaciones_ble',
        Number(station.id),
        {
          code,
          name,
          type,
          departmentId,
          classroom,
          minimumRssi,
          minimumSamples,
          intervalSeconds,
        }
      );

      await writeBleEvent(client, req, {
        stationId: Number(station.id),
        type: 'ESTACION_BLE_CREADA',
        detail: { code, type, classroom },
      });

      await client.query('COMMIT');

      return res.status(201).json({
        mensaje: 'Estación Bluetooth creada correctamente.',
        estacion: stationResponse(station),
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);

      if (error.code === '23505') {
        return res.status(409).json({
          error: 'Ya existe una estación con ese código.',
        });
      }

      console.error('Error al crear estación BLE:', error);
      return res.status(500).json({
        error: 'No se pudo crear la estación Bluetooth.',
      });
    } finally {
      client.release();
    }
  }
);

// POST /api/estaciones-ble/:id/provisionamiento
router.post(
  '/:id/provisionamiento',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const stationId = toPositiveInteger(req.params.id);
    if (!stationId) {
      return res.status(400).json({ error: 'Estación no válida.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const station = await getStation(client, stationId, {
        forUpdate: true,
      });

      if (!station) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'La estación Bluetooth no existe.',
        });
      }

      if (station.estado === 'REVOCADA') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Una estación revocada no puede volver a provisionarse.',
        });
      }

      await client.query(
        `UPDATE codigos_provisionamiento_ble
         SET
           estado = 'CANCELADO',
           cancelado_en = CURRENT_TIMESTAMP
         WHERE estacion_id = $1
           AND estado = 'VIGENTE'`,
        [stationId]
      );

      const requestId = crypto.randomUUID();
      const token = generateToken();
      const expiresAt = new Date(
        Date.now() + PROVISION_TTL_MINUTES * 60_000
      );

      await client.query(
        `INSERT INTO codigos_provisionamiento_ble (
           id,
           estacion_id,
           token_hash,
           estado,
           expira_en,
           creado_por
         )
         VALUES ($1, $2, $3, 'VIGENTE', $4, $5)`,
        [
          requestId,
          stationId,
          hashText(token),
          expiresAt,
          req.user.usuario_id,
        ]
      );

      const payload = JSON.stringify({
        type: 'UNSAAC_BLE_STATION_PROVISION',
        version: 1,
        requestId,
        token,
        stationId,
        stationCode: station.codigo,
        stationName: station.nombre,
        expiresAt: expiresAt.toISOString(),
      });
      const qrImage = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 420,
      });

      await writeBleEvent(client, req, {
        stationId,
        type: 'CODIGO_PROVISIONAMIENTO_BLE_GENERADO',
        detail: {
          requestId,
          expiresAt: expiresAt.toISOString(),
        },
      });

      await client.query('COMMIT');

      return res.status(201).json({
        provisionamiento: {
          id: requestId,
          estacion_id: stationId,
          estacion_codigo: station.codigo,
          estacion_nombre: station.nombre,
          expira_en: expiresAt.toISOString(),
          vigencia_minutos: PROVISION_TTL_MINUTES,
          qr_payload: payload,
          qr_image: qrImage,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al generar provisionamiento BLE:', error);
      return res.status(500).json({
        error: 'No se pudo generar el QR de la estación.',
      });
    } finally {
      client.release();
    }
  }
);

// POST /api/estaciones-ble/provisionar
// Lo consume un segundo teléfono Android con una sesión Administrador.
router.post(
  '/provisionar',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const requestId = cleanText(req.body.requestId ?? req.body.solicitud_id, 50);
    const token = cleanText(req.body.token, 200);
    const installationId = cleanText(
      req.body.installationId ?? req.body.uuid_instalacion,
      120
    );

    if (
      !/^[0-9a-f-]{36}$/i.test(requestId) ||
      token.length < 30 ||
      installationId.length < 16
    ) {
      return res.status(400).json({
        error: 'El código de provisionamiento está incompleto.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const requestResult = await client.query(
        `SELECT
           cp.*,
           e.codigo,
           e.nombre,
           e.tipo,
           e.aula,
           e.departamento_id,
           e.rssi_minimo,
           e.muestras_minimas,
           e.intervalo_rotacion_seg,
           e.estado AS estacion_estado,
           e.secreto_cifrado,
           e.secreto_iv,
           e.secreto_tag,
           dep.nombre AS departamento
         FROM codigos_provisionamiento_ble cp
         JOIN estaciones_ble e
           ON e.id = cp.estacion_id
         LEFT JOIN departamentos_academicos dep
           ON dep.id = e.departamento_id
         WHERE cp.id = $1
         FOR UPDATE OF cp, e`,
        [requestId]
      );

      const request = requestResult.rows[0];
      if (!request) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El código de provisionamiento no existe.',
        });
      }

      if (
        request.estado !== 'VIGENTE' ||
        new Date(request.expira_en).getTime() <= Date.now()
      ) {
        await client.query(
          `UPDATE codigos_provisionamiento_ble
           SET estado = CASE
             WHEN estado = 'VIGENTE' THEN 'EXPIRADO'
             ELSE estado
           END
           WHERE id = $1`,
          [requestId]
        );
        await client.query('COMMIT');
        return res.status(410).json({
          error: 'El código venció o ya fue utilizado.',
        });
      }

      if (hashText(token) !== request.token_hash) {
        await writeBleEvent(client, req, {
          stationId: Number(request.estacion_id),
          type: 'PROVISIONAMIENTO_BLE_TOKEN_INVALIDO',
          result: 'BLOQUEADO',
          detail: { requestId, installationId },
        });
        await client.query('COMMIT');
        return res.status(403).json({
          error: 'El token de provisionamiento no es válido.',
        });
      }

      if (request.estacion_estado === 'REVOCADA') {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'La estación fue revocada.',
        });
      }

      const secret = decryptStationSecret(request).toString('base64');

      await client.query(
        `UPDATE codigos_provisionamiento_ble
         SET
           estado = 'UTILIZADO',
           utilizado_en = CURRENT_TIMESTAMP,
           utilizado_por = $1
         WHERE id = $2`,
        [req.user.usuario_id, requestId]
      );

      await client.query(
        `UPDATE estaciones_ble
         SET
           estado = 'ACTIVA',
           motivo_estado = NULL,
           provisionada_en = CURRENT_TIMESTAMP,
           provisionada_por = $1,
           actualizada_en = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [req.user.usuario_id, request.estacion_id]
      );

      await writeAudit(
        client,
        req,
        'PROVISIONAR_ESTACION_BLE',
        'estaciones_ble',
        Number(request.estacion_id),
        { requestId, installationId }
      );

      await writeBleEvent(client, req, {
        stationId: Number(request.estacion_id),
        type: 'ESTACION_BLE_PROVISIONADA',
        detail: { requestId, installationId },
      });

      await client.query('COMMIT');

      return res.json({
        mensaje: 'La estación Bluetooth quedó provisionada.',
        estacion: {
          id: Number(request.estacion_id),
          codigo: request.codigo,
          nombre: request.nombre,
          tipo: request.tipo,
          aula: request.aula ?? null,
          departamento_id: request.departamento_id
            ? Number(request.departamento_id)
            : null,
          departamento: request.departamento ?? null,
          rssi_minimo: Number(request.rssi_minimo),
          muestras_minimas: Number(request.muestras_minimas),
          intervalo_rotacion_seg: Number(
            request.intervalo_rotacion_seg
          ),
          secreto: secret,
          estado: 'ACTIVA',
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al provisionar estación BLE:', error);
      return res.status(500).json({
        error: 'No se pudo provisionar la estación Bluetooth.',
      });
    } finally {
      client.release();
    }
  }
);

async function updateStationState(req, res, targetState) {
  const stationId = toPositiveInteger(req.params.id);
  const reason = cleanText(req.body.motivo, 255);

  if (!stationId || !STATION_STATES.has(targetState)) {
    return res.status(400).json({ error: 'Operación no válida.' });
  }

  if (
    ['SUSPENDIDA', 'REVOCADA'].includes(targetState) &&
    reason.length < 5
  ) {
    return res.status(400).json({
      error: 'Indique un motivo de al menos cinco caracteres.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const station = await getStation(client, stationId, {
      forUpdate: true,
    });

    if (!station) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        error: 'La estación Bluetooth no existe.',
      });
    }

    if (station.estado === 'REVOCADA') {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Una estación revocada no puede cambiar de estado.',
      });
    }

    if (targetState === 'ACTIVA' && !station.provisionada_en) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'La estación debe provisionarse antes de activarse.',
      });
    }

    await client.query(
      `UPDATE estaciones_ble
       SET
         estado = $1,
         motivo_estado = $2,
         actualizada_en = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [targetState, reason || null, stationId]
    );

    if (targetState === 'REVOCADA') {
      await client.query(
        `UPDATE codigos_provisionamiento_ble
         SET
           estado = 'CANCELADO',
           cancelado_en = CURRENT_TIMESTAMP
         WHERE estacion_id = $1
           AND estado = 'VIGENTE'`,
        [stationId]
      );
    }

    await writeAudit(
      client,
      req,
      `CAMBIAR_ESTADO_ESTACION_BLE_${targetState}`,
      'estaciones_ble',
      stationId,
      { previousState: station.estado, targetState, reason }
    );

    await writeBleEvent(client, req, {
      stationId,
      type: `ESTACION_BLE_${targetState}`,
      detail: { previousState: station.estado, reason },
    });

    await client.query('COMMIT');

    return res.json({
      mensaje: `La estación quedó en estado ${targetState}.`,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al cambiar estado de estación BLE:', error);
    return res.status(500).json({
      error: 'No se pudo actualizar la estación Bluetooth.',
    });
  } finally {
    client.release();
  }
}

router.patch(
  '/:id/suspender',
  autenticar,
  soloRol('Administrador'),
  (req, res) => updateStationState(req, res, 'SUSPENDIDA')
);

router.patch(
  '/:id/reactivar',
  autenticar,
  soloRol('Administrador'),
  (req, res) => updateStationState(req, res, 'ACTIVA')
);

router.delete(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  (req, res) => updateStationState(req, res, 'REVOCADA')
);

module.exports = router;
