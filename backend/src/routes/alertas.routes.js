'use strict';


const router = require('express').Router();


const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');


const VALID_STATES = new Set(['NUEVA', 'REVISADA', 'RESUELTA', 'DESCARTADA']);
const VALID_PRIORITIES = new Set(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']);


function cleanText(value, maxLength = 500) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}


function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}


function validDate(value) {
  const text = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}


function actorId(req) {
  return positiveInteger(req.user?.usuario_id ?? req.user?.id);
}


async function writeAudit(client, req, action, alertId, detail) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES ($1, $2, 'alertas', $3, $4::jsonb, NULLIF($5, '')::inet)`,
    [
      actorId(req),
      action,
      alertId,
      JSON.stringify(detail ?? {}),
      req.ip || '',
    ]
  );
}


async function generateOperationalAlerts(client) {
  const inserted = {
    tardanzas: 0,
    rechazadas: 0,
    dispositivos: 0,
    intentosBiometricos: 0,
    offline: 0,
    sinMarcacion: 0,
  };


  let result = await client.query(`
    INSERT INTO alertas (
      docente_id, tipo, mensaje, fecha_alerta, leida,
      prioridad, estado, origen, referencia_tipo,
      clave_evento, detalle, actualizada_en
    )
    SELECT
      v.docente_id,
      'TARDANZA',
      CONCAT(
        'Tardanza registrada por ', v.nombres, ' ', v.apellidos,
        ' el ', TO_CHAR(v.fecha, 'DD/MM/YYYY'),
        ' a las ', TO_CHAR(v.hora, 'HH24:MI'),
        CASE WHEN v.curso IS NOT NULL THEN CONCAT(' en ', v.curso) ELSE '' END,
        '.'
      ),
      COALESCE(v.creado_en, CURRENT_TIMESTAMP),
      FALSE,
      'MEDIA',
      'NUEVA',
      'ASISTENCIA',
      'v_historial_asistencia_unificado',
      'TARDANZA:' || v.registro_uid,
      jsonb_build_object(
        'registroUid', v.registro_uid,
        'fecha', v.fecha,
        'hora', v.hora,
        'curso', v.curso,
        'metodo', v.metodo_verificacion
      ),
      CURRENT_TIMESTAMP
    FROM v_historial_asistencia_unificado v
    WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
      AND UPPER(COALESCE(v.resultado, '')) = 'REGISTRADA'
      AND v.fecha >= CURRENT_DATE - INTERVAL '30 days'
    ON CONFLICT (clave_evento) DO NOTHING
  `);
  inserted.tardanzas = result.rowCount;


  result = await client.query(`
    INSERT INTO alertas (
      docente_id, tipo, mensaje, fecha_alerta, leida,
      prioridad, estado, origen, referencia_tipo,
      clave_evento, detalle, actualizada_en
    )
    SELECT
      v.docente_id,
      'MARCACION_RECHAZADA',
      CONCAT(
        'Marcación rechazada de ', v.nombres, ' ', v.apellidos,
        ' el ', TO_CHAR(v.fecha, 'DD/MM/YYYY'),
        ' a las ', TO_CHAR(v.hora, 'HH24:MI'),
        ' mediante ', REPLACE(v.metodo_verificacion, '_', ' '), '.'
      ),
      COALESCE(v.creado_en, CURRENT_TIMESTAMP),
      FALSE,
      'ALTA',
      'NUEVA',
      'SEGURIDAD',
      'v_historial_asistencia_unificado',
      'RECHAZADA:' || v.registro_uid,
      jsonb_build_object(
        'registroUid', v.registro_uid,
        'fecha', v.fecha,
        'hora', v.hora,
        'metodo', v.metodo_verificacion,
        'detalle', v.detalle
      ),
      CURRENT_TIMESTAMP
    FROM v_historial_asistencia_unificado v
    WHERE UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
      AND v.fecha >= CURRENT_DATE - INTERVAL '30 days'
    ON CONFLICT (clave_evento) DO NOTHING
  `);
  inserted.rechazadas = result.rowCount;


  result = await client.query(`
    INSERT INTO alertas (
      docente_id, tipo, mensaje, fecha_alerta, leida,
      prioridad, estado, origen, referencia_tipo, referencia_id,
      clave_evento, detalle, actualizada_en
    )
    SELECT
      dm.docente_id,
      'DISPOSITIVO_NO_AUTORIZADO',
      CONCAT(
        'El dispositivo ', dm.fabricante, ' ', dm.modelo,
        ' se encuentra ', LOWER(dm.estado),
        COALESCE(CONCAT(': ', NULLIF(dm.motivo_estado, '')), '.'),
        CASE WHEN dm.motivo_estado IS NULL OR dm.motivo_estado = '' THEN '.' ELSE '' END
      ),
      CURRENT_TIMESTAMP,
      FALSE,
      'CRITICA',
      'NUEVA',
      'DISPOSITIVO',
      'dispositivos_moviles',
      dm.id,
      'DISPOSITIVO:' || dm.id::text || ':' || dm.estado,
      jsonb_build_object(
        'dispositivoId', dm.id,
        'fabricante', dm.fabricante,
        'modelo', dm.modelo,
        'estado', dm.estado,
        'motivo', dm.motivo_estado
      ),
      CURRENT_TIMESTAMP
    FROM dispositivos_moviles dm
    WHERE dm.estado IN ('SUSPENDIDO', 'REVOCADO')
    ON CONFLICT (clave_evento) DO NOTHING
  `);
  inserted.dispositivos = result.rowCount;


  result = await client.query(`
    INSERT INTO alertas (
      docente_id, tipo, mensaje, fecha_alerta, leida,
      prioridad, estado, origen, referencia_tipo,
      clave_evento, detalle, actualizada_en
    )
    SELECT
      dmm.docente_id,
      'INTENTOS_BIOMETRICOS_FALLIDOS',
      CONCAT(
        'Se detectaron ', dmm.intentos,
        ' intentos fallidos de marcación biométrica. Motivo: ',
        COALESCE(NULLIF(dmm.motivo_rechazo, ''), 'sin detalle'), '.'
      ),
      dmm.creado_en,
      FALSE,
      'CRITICA',
      'NUEVA',
      'SEGURIDAD',
      'desafios_marcacion_movil',
      'BIOMETRIA_FALLIDA:' || dmm.id::text,
      jsonb_build_object(
        'desafioId', dmm.id,
        'dispositivoId', dmm.dispositivo_id,
        'intentos', dmm.intentos,
        'motivo', dmm.motivo_rechazo
      ),
      CURRENT_TIMESTAMP
    FROM desafios_marcacion_movil dmm
    WHERE dmm.estado = 'RECHAZADO'
      AND dmm.intentos >= 3
      AND dmm.creado_en >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    ON CONFLICT (clave_evento) DO NOTHING
  `);
  inserted.intentosBiometricos = result.rowCount;


  result = await client.query(`
    INSERT INTO alertas (
      docente_id, tipo, mensaje, fecha_alerta, leida,
      prioridad, estado, origen, referencia_tipo, referencia_id,
      clave_evento, detalle, actualizada_en
    )
    SELECT
      mo.docente_id,
      'REGISTRO_OFFLINE_PENDIENTE',
      CONCAT(
        'La marcación offline ', mo.local_id::text,
        ' requiere atención. Resultado: ', mo.resultado,
        COALESCE(CONCAT('. Motivo: ', NULLIF(mo.motivo_resultado, '')), '.'),
        CASE WHEN mo.motivo_resultado IS NULL OR mo.motivo_resultado = '' THEN '.' ELSE '' END
      ),
      mo.recibido_en,
      FALSE,
      CASE WHEN mo.resultado = 'REQUIERE_REVISION' THEN 'ALTA' ELSE 'MEDIA' END,
      'NUEVA',
      'OFFLINE',
      'marcaciones_offline',
      mo.id,
      'OFFLINE:' || mo.id::text || ':' || mo.resultado,
      jsonb_build_object(
        'marcacionOfflineId', mo.id,
        'localId', mo.local_id,
        'resultado', mo.resultado,
        'motivo', mo.motivo_resultado,
        'fechaEstimada', mo.fecha_hora_estimada
      ),
      CURRENT_TIMESTAMP
    FROM marcaciones_offline mo
    WHERE mo.resultado IN ('PENDIENTE', 'REQUIERE_REVISION')
      AND mo.recibido_en <= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
    ON CONFLICT (clave_evento) DO NOTHING
  `);
  inserted.offline = result.rowCount;


  result = await client.query(`
    INSERT INTO alertas (
      docente_id, tipo, mensaje, fecha_alerta, leida,
      prioridad, estado, origen, referencia_tipo, referencia_id,
      clave_evento, detalle, actualizada_en
    )
    SELECT
      hc.docente_id,
      'DOCENTE_SIN_MARCACION',
      CONCAT(
        'La clase de ', c.nombre,
        ' terminó a las ', TO_CHAR(hc.hora_fin, 'HH24:MI'),
        ' y no tiene una marcación registrada. Aula ', hc.aula, '.'
      ),
      CURRENT_TIMESTAMP,
      FALSE,
      'ALTA',
      'NUEVA',
      'HORARIO',
      'horarios_curso',
      hc.id,
      'SIN_MARCACION:' || hc.id::text || ':' || CURRENT_DATE::text,
      jsonb_build_object(
        'horarioCursoId', hc.id,
        'fecha', CURRENT_DATE,
        'curso', c.nombre,
        'aula', hc.aula,
        'horaInicio', hc.hora_inicio,
        'horaFin', hc.hora_fin
      ),
      CURRENT_TIMESTAMP
    FROM horarios_curso hc
    JOIN cursos c ON c.id = hc.curso_id
    JOIN semestres s ON s.id = hc.semestre_id
    JOIN docentes d ON d.id = hc.docente_id
    JOIN usuarios u ON u.id = d.usuario_id
    WHERE hc.activo = TRUE
      AND s.activo = TRUE
      AND u.activo = TRUE
      AND CURRENT_DATE BETWEEN s.fecha_inicio AND s.fecha_fin
      AND hc.dia_semana = EXTRACT(ISODOW FROM CURRENT_DATE)::int
      AND CURRENT_TIME > (hc.hora_fin + INTERVAL '15 minutes')::time
      AND NOT EXISTS (
        SELECT 1
        FROM registros_asistencia_curso rac
        WHERE rac.horario_curso_id = hc.id
          AND rac.fecha = CURRENT_DATE
      )
    ON CONFLICT (clave_evento) DO NOTHING
  `);
  inserted.sinMarcacion = result.rowCount;


  return inserted;
}


function mapAlert(row) {
  return {
    id: Number(row.id),
    teacherId: Number(row.docente_id),
    teacherCode: row.codigo_docente,
    teacher: row.docente,
    email: row.email,
    department: row.departamento,
    type: row.tipo,
    message: row.mensaje,
    priority: row.prioridad,
    status: row.estado,
    source: row.origen,
    referenceType: row.referencia_tipo,
    referenceId: row.referencia_id === null ? null : Number(row.referencia_id),
    detail: row.detalle ?? {},
    createdAt: row.fecha_alerta,
    updatedAt: row.actualizada_en,
    handledAt: row.atendida_en,
    handledBy: row.atendida_por_nombre,
    comment: row.comentario,
  };
}


router.get(
  '/catalogos',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    try {
      const [teachers, types] = await Promise.all([
        pool.query(
          `SELECT d.id, u.codigo, CONCAT_WS(' ', u.nombres, u.apellidos) AS nombre
           FROM docentes d
           JOIN usuarios u ON u.id = d.usuario_id
           WHERE u.activo = TRUE
           ORDER BY u.apellidos, u.nombres`
        ),
        pool.query(`SELECT DISTINCT tipo FROM alertas ORDER BY tipo`),
      ]);


      return res.json({
        teachers: teachers.rows,
        types: types.rows.map((row) => row.tipo),
      });
    } catch (error) {
      console.error('Error al cargar catálogos de alertas:', error);
      return res.status(500).json({ error: 'No se pudieron cargar los catálogos.' });
    }
  }
);


router.get(
  '/contador',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    const client = await pool.connect();


    try {
      await client.query('BEGIN');
      await generateOperationalAlerts(client);
      const result = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'NUEVA')::int AS nuevas,
          COUNT(*) FILTER (
            WHERE estado = 'NUEVA' AND prioridad IN ('ALTA', 'CRITICA')
          )::int AS urgentes
        FROM alertas
      `);
      await client.query('COMMIT');
      return res.json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al contar alertas:', error);
      return res.status(500).json({ error: 'No se pudo consultar el contador.' });
    } finally {
      client.release();
    }
  }
);


router.get(
  '/resumen',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    const client = await pool.connect();


    try {
      await client.query('BEGIN');
      const generated = await generateOperationalAlerts(client);
      const result = await client.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE estado = 'NUEVA')::int AS nuevas,
          COUNT(*) FILTER (WHERE estado = 'REVISADA')::int AS revisadas,
          COUNT(*) FILTER (WHERE estado = 'RESUELTA')::int AS resueltas,
          COUNT(*) FILTER (WHERE estado = 'DESCARTADA')::int AS descartadas,
          COUNT(*) FILTER (WHERE prioridad = 'CRITICA' AND estado IN ('NUEVA', 'REVISADA'))::int AS criticas,
          COUNT(*) FILTER (WHERE prioridad = 'ALTA' AND estado IN ('NUEVA', 'REVISADA'))::int AS altas,
          COUNT(*) FILTER (WHERE origen = 'OFFLINE' AND estado IN ('NUEVA', 'REVISADA'))::int AS offline_pendientes
        FROM alertas
      `);
      await client.query('COMMIT');
      return res.json({ ...result.rows[0], generated });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al resumir alertas:', error);
      return res.status(500).json({ error: 'No se pudo consultar el resumen.' });
    } finally {
      client.release();
    }
  }
);


router.post(
  '/generar',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const client = await pool.connect();


    try {
      await client.query('BEGIN');
      const generated = await generateOperationalAlerts(client);
      await writeAudit(client, req, 'GENERAR_ALERTAS_OPERATIVAS', null, generated);
      await client.query('COMMIT');
      return res.json({ message: 'Alertas operativas actualizadas.', generated });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al generar alertas:', error);
      return res.status(500).json({ error: 'No se pudieron generar las alertas.' });
    } finally {
      client.release();
    }
  }
);


router.get(
  '/',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const client = await pool.connect();


    try {
      await client.query('BEGIN');
      await generateOperationalAlerts(client);


      const conditions = [];
      const values = [];
      const state = cleanText(req.query.estado, 20).toUpperCase();
      const priority = cleanText(req.query.prioridad, 20).toUpperCase();
      const type = cleanText(req.query.tipo, 80).toUpperCase();
      const teacherId = positiveInteger(req.query.docente_id);
      const dateFrom = validDate(req.query.desde);
      const dateTo = validDate(req.query.hasta);
      const q = cleanText(req.query.q, 120);
      const limit = Math.min(positiveInteger(req.query.limit) ?? 100, 500);
      const offset = Math.max(Number(req.query.offset) || 0, 0);


      if (state) {
        values.push(state);
        conditions.push(`a.estado = $${values.length}`);
      }
      if (priority) {
        values.push(priority);
        conditions.push(`a.prioridad = $${values.length}`);
      }
      if (type) {
        values.push(type);
        conditions.push(`a.tipo = $${values.length}`);
      }
      if (teacherId) {
        values.push(teacherId);
        conditions.push(`a.docente_id = $${values.length}`);
      }
      if (dateFrom) {
        values.push(dateFrom);
        conditions.push(`a.fecha_alerta::date >= $${values.length}::date`);
      }
      if (dateTo) {
        values.push(dateTo);
        conditions.push(`a.fecha_alerta::date <= $${values.length}::date`);
      }
      if (q) {
        values.push(`%${q}%`);
        conditions.push(`(
          a.mensaje ILIKE $${values.length}
          OR u.codigo ILIKE $${values.length}
          OR CONCAT_WS(' ', u.nombres, u.apellidos) ILIKE $${values.length}
        )`);
      }


      const where = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';


      const countValues = [...values];
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM alertas a
         JOIN docentes d ON d.id = a.docente_id
         JOIN usuarios u ON u.id = d.usuario_id
         ${where}`,
        countValues
      );


      values.push(limit, offset);


      const result = await client.query(
        `SELECT
           a.*,
           u.codigo AS codigo_docente,
           CONCAT_WS(' ', u.nombres, u.apellidos) AS docente,
           u.email,
           dep.nombre AS departamento,
           CONCAT_WS(' ', actor.nombres, actor.apellidos) AS atendida_por_nombre
         FROM alertas a
         JOIN docentes d ON d.id = a.docente_id
         JOIN usuarios u ON u.id = d.usuario_id
         LEFT JOIN departamentos_academicos dep ON dep.id = d.departamento_id
         LEFT JOIN usuarios actor ON actor.id = a.atendida_por
         ${where}
         ORDER BY
           CASE a.prioridad
             WHEN 'CRITICA' THEN 1
             WHEN 'ALTA' THEN 2
             WHEN 'MEDIA' THEN 3
             ELSE 4
           END,
           a.fecha_alerta DESC
         LIMIT $${values.length - 1}
         OFFSET $${values.length}`,
        values
      );


      await client.query('COMMIT');
      return res.json({
        total: Number(countResult.rows[0]?.total ?? 0),
        alerts: result.rows.map(mapAlert),
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al consultar alertas:', error);
      return res.status(500).json({ error: 'No se pudieron consultar las alertas.' });
    } finally {
      client.release();
    }
  }
);


router.patch(
  '/:id/estado',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const alertId = positiveInteger(req.params.id);
    const state = cleanText(req.body?.estado, 20).toUpperCase();
    const comment = cleanText(req.body?.comentario, 500);


    if (!alertId) {
      return res.status(400).json({ error: 'El identificador de alerta no es válido.' });
    }


    if (!VALID_STATES.has(state)) {
      return res.status(400).json({ error: 'El estado solicitado no es válido.' });
    }


    const client = await pool.connect();


    try {
      await client.query('BEGIN');
      const previous = await client.query(
        `SELECT id, estado, prioridad, tipo FROM alertas WHERE id = $1 FOR UPDATE`,
        [alertId]
      );


      if (previous.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Alerta no encontrada.' });
      }


      const result = await client.query(
        `UPDATE alertas
         SET estado = $1,
             leida = ($1 <> 'NUEVA'),
             atendida_por = $2,
             atendida_en = CURRENT_TIMESTAMP,
             comentario = NULLIF($3, ''),
             actualizada_en = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [state, actorId(req), comment, alertId]
      );


      await writeAudit(client, req, 'CAMBIAR_ESTADO_ALERTA', alertId, {
        previousState: previous.rows[0].estado,
        newState: state,
        comment,
        priority: previous.rows[0].prioridad,
        type: previous.rows[0].tipo,
      });


      await client.query('COMMIT');
      return res.json({ message: 'Estado de alerta actualizado.', alert: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al actualizar alerta:', error);
      return res.status(500).json({ error: 'No se pudo actualizar la alerta.' });
    } finally {
      client.release();
    }
  }
);


module.exports = router;