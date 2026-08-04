'use strict';

const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');

const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

const QR_TTL_SECONDS = 60;

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '')
  );
}

function isInstallationId(value) {
  return /^[A-Za-z0-9._:-]{16,120}$/.test(String(value ?? ''));
}

function hashText(value) {
  return crypto
    .createHash('sha256')
    .update(String(value), 'utf8')
    .digest('hex');
}

function clientIp(req) {
  return cleanText(req.ip || req.socket?.remoteAddress || '', 100);
}

async function writeAudit(client, req, action, table, recordId, detail = {}) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, NULLIF($6, '')::inet)`,
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
       $1, $2, $3, $4, $5, $6, $7::jsonb, NULLIF($8, '')::inet
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
       clock.hora_local
     FROM horarios_curso hc
     JOIN cursos c ON c.id = hc.curso_id
     JOIN semestres s ON s.id = hc.semestre_id
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
       EXTRACT(EPOCH FROM (clock.hora_local - hc.hora_inicio))
     )
     LIMIT 1`,
    [teacherId]
  );

  return result.rows[0] ?? null;
}

router.post(
  '/emitir',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE sesiones_qr_asistencia
         SET estado = 'EXPIRADO'
         WHERE estado = 'VIGENTE'
           AND expira_en <= CURRENT_TIMESTAMP`
      );

      await client.query(
        `UPDATE sesiones_qr_asistencia
         SET estado = 'REEMPLAZADO', reemplazado_en = CURRENT_TIMESTAMP
         WHERE creado_por_usuario_id = $1
           AND estado = 'VIGENTE'`,
        [req.user.usuario_id]
      );

      const id = crypto.randomUUID();
      const token = crypto.randomBytes(32).toString('base64url');
      const issuedAt = new Date();
      const expiresAt = new Date(
        issuedAt.getTime() + QR_TTL_SECONDS * 1000
      );
      const payload = JSON.stringify({
        type: 'UNSAAC_ATTENDANCE_QR',
        version: 1,
        id,
        token,
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      await client.query(
        `INSERT INTO sesiones_qr_asistencia (
           id,
           token_hash,
           creado_por_usuario_id,
           estado,
           expira_en,
           ip_emision
         )
         VALUES ($1, $2, $3, 'VIGENTE', $4, NULLIF($5, '')::inet)`,
        [
          id,
          hashText(token),
          req.user.usuario_id,
          expiresAt,
          clientIp(req),
        ]
      );

      const imageDataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 640,
        color: {
          dark: '#061B34',
          light: '#FFFFFFFF',
        },
      });

      await writeAudit(
        client,
        req,
        'EMITIR_QR_ASISTENCIA',
        'sesiones_qr_asistencia',
        null,
        { id, expiresAt: expiresAt.toISOString(), ttlSeconds: QR_TTL_SECONDS }
      );

      await client.query('COMMIT');

      return res.status(201).json({
        qr: {
          id,
          contenido: payload,
          imagen: imageDataUrl,
          emitido_en: issuedAt.toISOString(),
          expira_en: expiresAt.toISOString(),
          vigencia_segundos: QR_TTL_SECONDS,
          modo: 'QR_DINAMICO_SIN_BIOMETRIA',
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al emitir QR de asistencia:', error);
      return res.status(500).json({
        error: 'No se pudo generar el QR dinámico de asistencia.',
      });
    } finally {
      client.release();
    }
  }
);

router.post(
  '/marcar',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error: 'La cuenta no tiene un perfil docente asociado.',
      });
    }

    const rawPayload = String(
      req.body.contenido ?? req.body.qrPayload ?? ''
    ).trim();
    const installationId = cleanText(
      req.body.uuid_instalacion ?? req.body.installationId,
      120
    );

    if (!rawPayload || rawPayload.length > 4096 || !isInstallationId(installationId)) {
      return res.status(400).json({
        error: 'El QR o la identidad del celular no son válidos.',
      });
    }

    let qr;
    try {
      qr = JSON.parse(rawPayload);
    } catch (_error) {
      return res.status(400).json({
        error: 'El código escaneado no pertenece al sistema UNSAAC.',
      });
    }

    const sessionId = cleanText(qr.id, 50);
    const token = cleanText(qr.token, 200);
    const payloadExpiresAt = new Date(String(qr.expiresAt ?? ''));

    if (
      qr.type !== 'UNSAAC_ATTENDANCE_QR' ||
      Number(qr.version) !== 1 ||
      !isUuid(sessionId) ||
      token.length < 30 ||
      Number.isNaN(payloadExpiresAt.getTime())
    ) {
      return res.status(400).json({
        error: 'El QR está incompleto o fue alterado.',
      });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const sessionResult = await client.query(
        `SELECT *
         FROM sesiones_qr_asistencia
         WHERE id = $1
         FOR UPDATE`,
        [sessionId]
      );
      const session = sessionResult.rows[0];

      if (!session || session.token_hash !== hashText(token)) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El QR ya no existe o su firma temporal no coincide.',
        });
      }

      if (
        session.estado !== 'VIGENTE' ||
        new Date(session.expira_en).getTime() <= Date.now()
      ) {
        if (session.estado === 'VIGENTE') {
          await client.query(
            `UPDATE sesiones_qr_asistencia
             SET estado = 'EXPIRADO'
             WHERE id = $1`,
            [sessionId]
          );
          await client.query('COMMIT');
        } else {
          await client.query('ROLLBACK');
        }
        return res.status(410).json({
          error: 'El QR venció. Solicite uno nuevo en la estación.',
        });
      }

      const deviceResult = await client.query(
        `SELECT
           dm.id,
           dm.usuario_id,
           dm.docente_id,
           dm.estado,
           u.codigo,
           u.nombres,
           u.apellidos,
           u.activo
         FROM dispositivos_moviles dm
         JOIN usuarios u ON u.id = dm.usuario_id
         WHERE dm.uuid_instalacion = $1
           AND dm.usuario_id = $2
           AND dm.docente_id = $3
         FOR UPDATE OF dm`,
        [installationId, req.user.usuario_id, req.user.docente_id]
      );
      const device = deviceResult.rows[0];

      if (!device || device.estado !== 'AUTORIZADO' || !device.activo) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: 'Este celular no está autorizado para marcar mediante QR.',
        });
      }

      const priorUse = await client.query(
        `SELECT id
         FROM usos_qr_asistencia
         WHERE sesion_qr_id = $1
           AND docente_id = $2
         LIMIT 1`,
        [sessionId, req.user.docente_id]
      );
      if (priorUse.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Este docente ya utilizó el QR actual.',
          code: 'QR_YA_UTILIZADO',
        });
      }

      const clock = await getInstitutionClock(client);
      const schedule = await findEligibleSchedule(
        client,
        Number(req.user.docente_id)
      );
      const targetType = schedule ? 'CURSO' : 'INGRESO_INSTITUCIONAL';
      const readerId = `QR:${device.id}`;

      const configResult = await client.query(
        `SELECT COALESCE(
           hora_ingreso_limite,
           '09:00:00'::time
         ) AS hora_ingreso_limite
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

      const entryInsert = await client.query(
        `INSERT INTO registros_ingreso_institucional (
           docente_id,
           fecha,
           hora_registro,
           dispositivo_id,
           estado,
           observacion,
           metodo_verificacion
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'QR_DINAMICO')
         ON CONFLICT (docente_id, fecha)
         DO NOTHING
         RETURNING id, fecha, hora_registro, estado`,
        [
          req.user.docente_id,
          clock.fecha_local,
          clock.hora_local,
          readerId,
          entryState,
          'Marcación mediante QR dinámico de corta vigencia',
        ]
      );

      let entryRecord = entryInsert.rows[0] ?? null;
      const entryCreated = Boolean(entryRecord);
      if (!entryRecord) {
        const existingEntry = await client.query(
          `SELECT id, fecha, hora_registro, estado
           FROM registros_ingreso_institucional
           WHERE docente_id = $1
             AND fecha = $2`,
          [req.user.docente_id, clock.fecha_local]
        );
        entryRecord = existingEntry.rows[0] ?? null;
      }

      let courseRecord = null;
      let courseCreated = false;
      let courseInfo = null;
      let finalState = entryRecord?.estado ?? entryState;

      if (schedule) {
        const courseState =
          String(clock.hora_local) > String(schedule.hora_inicio)
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
             observacion,
             metodo_verificacion
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'QR_DINAMICO')
           ON CONFLICT (horario_curso_id, fecha)
           DO NOTHING
           RETURNING id, fecha, hora_registro, estado`,
          [
            schedule.horario_curso_id,
            req.user.docente_id,
            clock.fecha_local,
            clock.hora_local,
            readerId,
            courseState,
            'Marcación mediante QR dinámico de corta vigencia',
          ]
        );
        courseRecord = courseInsert.rows[0] ?? null;
        courseCreated = Boolean(courseRecord);
        if (!courseRecord) {
          const existingCourse = await client.query(
            `SELECT id, fecha, hora_registro, estado
             FROM registros_asistencia_curso
             WHERE horario_curso_id = $1
               AND fecha = $2`,
            [schedule.horario_curso_id, clock.fecha_local]
          );
          courseRecord = existingCourse.rows[0] ?? null;
        }
        courseInfo = {
          horario_curso_id: Number(schedule.horario_curso_id),
          codigo: schedule.codigo_curso,
          nombre: schedule.curso,
          aula: schedule.aula,
          hora_inicio: String(schedule.hora_inicio),
          hora_fin: String(schedule.hora_fin),
          semestre: schedule.semestre,
        };
        finalState = courseRecord?.estado ?? courseState;
      }

      const duplicate = schedule ? !courseCreated : !entryCreated;
      const resultCode = duplicate ? 'DUPLICADA' : 'REGISTRADA';

      const usageResult = await client.query(
        `INSERT INTO usos_qr_asistencia (
           sesion_qr_id,
           dispositivo_id,
           usuario_id,
           docente_id,
           horario_curso_id,
           registro_ingreso_id,
           registro_asistencia_id,
           tipo_objetivo,
           resultado,
           ip_uso,
           detalle
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9,
           NULLIF($10, '')::inet,
           $11::jsonb
         )
         RETURNING id, utilizado_en`,
        [
          sessionId,
          device.id,
          req.user.usuario_id,
          req.user.docente_id,
          schedule ? schedule.horario_curso_id : null,
          entryRecord?.id ?? null,
          courseRecord?.id ?? null,
          targetType,
          resultCode,
          clientIp(req),
          JSON.stringify({
            method: 'QR_DINAMICO',
            entryCreated,
            courseCreated,
            state: finalState,
          }),
        ]
      );

      await client.query(
        `UPDATE dispositivos_moviles
         SET ultimo_acceso = CURRENT_TIMESTAMP,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [device.id]
      );

      await writeAudit(
        client,
        req,
        duplicate ? 'MARCACION_QR_DUPLICADA' : 'REGISTRAR_ASISTENCIA_QR',
        targetType === 'CURSO'
          ? 'registros_asistencia_curso'
          : 'registros_ingreso_institucional',
        targetType === 'CURSO'
          ? courseRecord?.id ?? null
          : entryRecord?.id ?? null,
        {
          sessionId,
          deviceId: Number(device.id),
          method: 'QR_DINAMICO',
          target: targetType,
          state: finalState,
        }
      );

      await writeMobileEvent(client, req, {
        deviceId: Number(device.id),
        usuarioId: Number(req.user.usuario_id),
        docenteId: Number(req.user.docente_id),
        type: duplicate
          ? 'MARCACION_QR_DUPLICADA'
          : 'ASISTENCIA_QR_REGISTRADA',
        result: duplicate ? 'ADVERTENCIA' : 'EXITO',
        detail: {
          sessionId,
          usageId: Number(usageResult.rows[0].id),
          target: targetType,
          state: finalState,
        },
      });

      await client.query('COMMIT');

      return res.status(duplicate ? 409 : 201).json({
        registrada: !duplicate,
        duplicada: duplicate,
        firma_verificada: false,
        metodo_verificacion: 'QR_DINAMICO',
        objetivo: targetType,
        estado: finalState,
        fecha: String(clock.fecha_local),
        hora_servidor: String(clock.hora_local),
        docente: {
          codigo: device.codigo,
          nombres: device.nombres,
          apellidos: device.apellidos,
        },
        curso: courseInfo,
        ingreso_institucional: entryRecord
          ? {
              id: Number(entryRecord.id),
              estado: entryRecord.estado,
              nuevo: entryCreated,
            }
          : null,
        asistencia_curso: courseRecord
          ? {
              id: Number(courseRecord.id),
              estado: courseRecord.estado,
              nueva: courseCreated,
            }
          : null,
        mensaje: duplicate
          ? 'La asistencia ya estaba registrada para este objetivo.'
          : targetType === 'CURSO'
            ? `Asistencia por QR registrada como ${finalState}.`
            : `Ingreso por QR registrado como ${finalState}.`,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error.code === '23505') {
        return res.status(409).json({
          error: 'El QR ya fue procesado para este docente.',
        });
      }
      console.error('Error al registrar asistencia QR:', error);
      return res.status(500).json({
        error: 'No se pudo registrar la asistencia mediante QR.',
      });
    } finally {
      client.release();
    }
  }
);

module.exports = router;
