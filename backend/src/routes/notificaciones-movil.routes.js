'use strict';


const router = require('express').Router();


const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');


function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}


function actorId(req) {
  return toPositiveInteger(req.user?.usuario_id ?? req.user?.id);
}


function teacherId(req) {
  return toPositiveInteger(req.user?.docente_id);
}


async function writeAudit(client, req, action, recordId, detail) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES ($1, $2, 'notificaciones_docente', $3, $4::jsonb, NULLIF($5, '')::inet)`,
    [
      actorId(req),
      action,
      recordId,
      JSON.stringify(detail ?? {}),
      req.ip || '',
    ]
  );
}


async function generateNotifications(client, docenteId) {
  const generated = {
    alertas: 0,
    historial: 0,
    dispositivos: 0,
    offline: 0,
    clases: 0,
  };


  let result = await client.query(
    `INSERT INTO notificaciones_docente (
       docente_id,
       tipo,
       titulo,
       mensaje,
       prioridad,
       clave_evento,
       referencia_tipo,
       referencia_id,
       detalle,
       visible_desde,
       actualizada_en
     )
     SELECT
       a.docente_id,
       CASE
         WHEN a.estado = 'RESUELTA' THEN 'ALERTA_RESUELTA'
         WHEN a.estado = 'REVISADA' THEN 'ALERTA_REVISADA'
         ELSE a.tipo
       END,
       CASE
         WHEN a.estado = 'RESUELTA' THEN 'Alerta resuelta'
         WHEN a.estado = 'REVISADA' THEN 'Alerta revisada'
         WHEN a.tipo = 'TARDANZA' THEN 'Tardanza registrada'
         WHEN a.tipo = 'MARCACION_RECHAZADA' THEN 'Marcación rechazada'
         WHEN a.tipo = 'DISPOSITIVO_NO_AUTORIZADO' THEN 'Dispositivo no autorizado'
         WHEN a.tipo = 'INTENTOS_BIOMETRICOS_FALLIDOS' THEN 'Verificación biométrica fallida'
         WHEN a.tipo = 'REGISTRO_OFFLINE_PENDIENTE' THEN 'Registro offline pendiente'
         WHEN a.tipo = 'CLASE_SIN_MARCACION' THEN 'Clase sin marcación'
         ELSE 'Aviso de asistencia'
       END,
       CASE
         WHEN a.estado IN ('RESUELTA', 'REVISADA')
           THEN CONCAT(a.mensaje, ' Estado administrativo: ', LOWER(a.estado), '.')
         ELSE a.mensaje
       END,
       COALESCE(a.prioridad, 'MEDIA'),
       'ALERTA:' || a.id::text || ':' || COALESCE(a.estado, 'NUEVA'),
       'alertas',
       a.id,
       jsonb_build_object(
         'alertaId', a.id,
         'tipo', a.tipo,
         'estado', a.estado,
         'comentario', a.comentario
       ),
       COALESCE(a.actualizada_en, a.fecha_alerta, CURRENT_TIMESTAMP)
         AT TIME ZONE 'America/Lima',
       CURRENT_TIMESTAMP
     FROM alertas a
     WHERE a.docente_id = $1
       AND a.tipo IN (
         'TARDANZA',
         'MARCACION_RECHAZADA',
         'DISPOSITIVO_NO_AUTORIZADO',
         'INTENTOS_BIOMETRICOS_FALLIDOS',
         'REGISTRO_OFFLINE_PENDIENTE',
         'CLASE_SIN_MARCACION'
       )
     ON CONFLICT (docente_id, clave_evento) DO NOTHING`,
    [docenteId]
  );
  generated.alertas = result.rowCount;


  result = await client.query(
    `INSERT INTO notificaciones_docente (
       docente_id,
       tipo,
       titulo,
       mensaje,
       prioridad,
       clave_evento,
       referencia_tipo,
       detalle,
       visible_desde,
       actualizada_en
     )
     SELECT
       v.docente_id,
       CASE
         WHEN UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
           THEN 'MARCACION_RECHAZADA'
         ELSE 'TARDANZA'
       END,
       CASE
         WHEN UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
           THEN 'Marcación rechazada'
         ELSE 'Tardanza registrada'
       END,
       CASE
         WHEN UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
           THEN CONCAT(
             'La marcación del ', TO_CHAR(v.fecha, 'DD/MM/YYYY'),
             ' a las ', TO_CHAR(v.hora, 'HH24:MI'),
             ' fue rechazada. Revise el historial móvil.'
           )
         ELSE CONCAT(
           'Se registró una tardanza el ', TO_CHAR(v.fecha, 'DD/MM/YYYY'),
           ' a las ', TO_CHAR(v.hora, 'HH24:MI'), '.'
         )
       END,
       CASE
         WHEN UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
           THEN 'ALTA'
         ELSE 'MEDIA'
       END,
       'HISTORIAL:' || v.registro_uid || ':' ||
         CASE
           WHEN UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
             THEN 'RECHAZADA'
           ELSE 'TARDANZA'
         END,
       'v_historial_asistencia_unificado',
       jsonb_build_object(
         'registroUid', v.registro_uid,
         'fecha', v.fecha,
         'hora', v.hora,
         'metodo', v.metodo_verificacion,
         'resultado', v.resultado,
         'estado', v.estado
       ),
       COALESCE(v.creado_en, CURRENT_TIMESTAMP),
       CURRENT_TIMESTAMP
     FROM v_historial_asistencia_unificado v
     WHERE v.docente_id = $1
       AND v.fecha >= CURRENT_DATE - 14
       AND (
         UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
         OR UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
       )
     ON CONFLICT (docente_id, clave_evento) DO NOTHING`,
    [docenteId]
  );
  generated.historial = result.rowCount;


  result = await client.query(
    `INSERT INTO notificaciones_docente (
       docente_id,
       tipo,
       titulo,
       mensaje,
       prioridad,
       clave_evento,
       referencia_tipo,
       referencia_id,
       detalle,
       visible_desde,
       actualizada_en
     )
     SELECT
       dm.docente_id,
       'DISPOSITIVO_NO_AUTORIZADO',
       CASE
         WHEN dm.estado = 'SUSPENDIDO' THEN 'Celular suspendido'
         ELSE 'Vinculación revocada'
       END,
       CONCAT(
         'El dispositivo ', dm.fabricante, ' ', dm.modelo,
         ' se encuentra ', LOWER(dm.estado),
         CASE
           WHEN NULLIF(dm.motivo_estado, '') IS NULL THEN '.'
           ELSE CONCAT(': ', dm.motivo_estado, '.')
         END
       ),
       'CRITICA',
       'DISPOSITIVO:' || dm.id::text || ':' || dm.estado,
       'dispositivos_moviles',
       dm.id,
       jsonb_build_object(
         'dispositivoId', dm.id,
         'fabricante', dm.fabricante,
         'modelo', dm.modelo,
         'estado', dm.estado,
         'motivo', dm.motivo_estado
       ),
       COALESCE(dm.actualizado_en, dm.creado_en, CURRENT_TIMESTAMP),
       CURRENT_TIMESTAMP
     FROM dispositivos_moviles dm
     WHERE dm.docente_id = $1
       AND dm.estado IN ('SUSPENDIDO', 'REVOCADO')
     ON CONFLICT (docente_id, clave_evento) DO NOTHING`,
    [docenteId]
  );
  generated.dispositivos = result.rowCount;


  result = await client.query(
    `INSERT INTO notificaciones_docente (
       docente_id,
       tipo,
       titulo,
       mensaje,
       prioridad,
       clave_evento,
       referencia_tipo,
       referencia_id,
       detalle,
       visible_desde,
       actualizada_en
     )
     SELECT
       mo.docente_id,
       'REGISTRO_OFFLINE_PENDIENTE',
       'Registro offline pendiente',
       CONCAT(
         'La marcación offline del ',
         TO_CHAR(mo.fecha_local_estimada, 'DD/MM/YYYY'),
         ' a las ', TO_CHAR(mo.hora_local_estimada, 'HH24:MI'),
         ' requiere sincronización o revisión.'
       ),
       CASE
         WHEN mo.resultado = 'REQUIERE_REVISION' THEN 'ALTA'
         ELSE 'MEDIA'
       END,
       'OFFLINE:' || mo.id::text || ':' || mo.resultado,
       'marcaciones_offline',
       mo.id,
       jsonb_build_object(
         'marcacionOfflineId', mo.id,
         'localId', mo.local_id,
         'resultado', mo.resultado,
         'motivo', mo.motivo_resultado
       ),
       mo.recibido_en,
       CURRENT_TIMESTAMP
     FROM marcaciones_offline mo
     WHERE mo.docente_id = $1
       AND mo.resultado IN ('PENDIENTE', 'REQUIERE_REVISION')
     ON CONFLICT (docente_id, clave_evento) DO NOTHING`,
    [docenteId]
  );
  generated.offline = result.rowCount;


  result = await client.query(
    `WITH dias AS (
       SELECT generate_series(
         CURRENT_DATE,
         CURRENT_DATE + 7,
         INTERVAL '1 day'
       )::date AS fecha
     )
     INSERT INTO notificaciones_docente (
       docente_id,
       tipo,
       titulo,
       mensaje,
       prioridad,
       clave_evento,
       referencia_tipo,
       referencia_id,
       detalle,
       visible_desde,
       expira_en,
       actualizada_en
     )
     SELECT
       hc.docente_id,
       'CLASE_PROXIMA',
       'Clase próxima',
       CONCAT(
         c.codigo, ' · ', c.nombre,
         ' inicia a las ', TO_CHAR(hc.hora_inicio, 'HH24:MI'),
         ' en ', hc.aula, '.'
       ),
       'MEDIA',
       'CLASE:' || hc.id::text || ':' || TO_CHAR(dias.fecha, 'YYYY-MM-DD'),
       'horarios_curso',
       hc.id,
       jsonb_build_object(
         'horarioId', hc.id,
         'cursoCodigo', c.codigo,
         'curso', c.nombre,
         'aula', hc.aula,
         'fecha', dias.fecha,
         'horaInicio', hc.hora_inicio
       ),
       ((dias.fecha + hc.hora_inicio) AT TIME ZONE 'America/Lima')
         - INTERVAL '30 minutes',
       ((dias.fecha + hc.hora_inicio) AT TIME ZONE 'America/Lima')
         + INTERVAL '20 minutes',
       CURRENT_TIMESTAMP
     FROM dias
     JOIN horarios_curso hc
       ON hc.docente_id = $1
      AND hc.activo = TRUE
      AND hc.dia_semana = EXTRACT(ISODOW FROM dias.fecha)::int
     JOIN cursos c ON c.id = hc.curso_id
     JOIN semestres s
       ON s.id = hc.semestre_id
      AND s.activo = TRUE
      AND dias.fecha BETWEEN s.fecha_inicio AND s.fecha_fin
     ON CONFLICT (docente_id, clave_evento) DO NOTHING`,
    [docenteId]
  );
  generated.clases = result.rowCount;


  return generated;
}


function mapNotification(row) {
  return {
    id: Number(row.id),
    type: row.tipo,
    title: row.titulo,
    message: row.mensaje,
    priority: row.prioridad,
    eventKey: row.clave_evento,
    referenceType: row.referencia_tipo,
    referenceId: row.referencia_id === null ? null : Number(row.referencia_id),
    detail: row.detalle ?? {},
    visibleAt: row.visible_desde,
    expiresAt: row.expira_en,
    readAt: row.leida_en,
    createdAt: row.creada_en,
    scheduled: Boolean(row.programada),
  };
}


async function buildResponse(client, docenteId, generated = null) {
  const [visible, scheduled, summary] = await Promise.all([
    client.query(
      `SELECT
         n.*,
         FALSE AS programada
       FROM notificaciones_docente n
       WHERE n.docente_id = $1
         AND n.visible_desde <= CURRENT_TIMESTAMP
       ORDER BY n.visible_desde DESC, n.id DESC
       LIMIT 180`,
      [docenteId]
    ),
    client.query(
      `SELECT
         n.*,
         TRUE AS programada
       FROM notificaciones_docente n
       WHERE n.docente_id = $1
         AND n.visible_desde > CURRENT_TIMESTAMP
         AND n.visible_desde <= CURRENT_TIMESTAMP + INTERVAL '8 days'
       ORDER BY n.visible_desde ASC, n.id ASC
       LIMIT 40`,
      [docenteId]
    ),
    client.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE visible_desde <= CURRENT_TIMESTAMP
         )::int AS total_visibles,
         COUNT(*) FILTER (
           WHERE visible_desde <= CURRENT_TIMESTAMP
             AND leida_en IS NULL
         )::int AS no_leidas,
         COUNT(*) FILTER (
           WHERE visible_desde > CURRENT_TIMESTAMP
         )::int AS programadas,
         COUNT(*) FILTER (
           WHERE visible_desde <= CURRENT_TIMESTAMP
             AND leida_en IS NULL
             AND prioridad IN ('ALTA', 'CRITICA')
         )::int AS urgentes
       FROM notificaciones_docente
       WHERE docente_id = $1`,
      [docenteId]
    ),
  ]);


  return {
    generatedAt: new Date().toISOString(),
    generated,
    summary: summary.rows[0] ?? {
      total_visibles: 0,
      no_leidas: 0,
      programadas: 0,
      urgentes: 0,
    },
    notifications: visible.rows.map(mapNotification),
    scheduled: scheduled.rows.map(mapNotification),
  };
}


async function synchronize(req, res) {
  const docenteId = teacherId(req);
  if (!docenteId) {
    return res.status(403).json({
      error: 'La sesión no tiene un docente asociado.',
    });
  }


  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const generated = await generateNotifications(client, docenteId);
    const response = await buildResponse(client, docenteId, generated);
    await client.query('COMMIT');
    return res.json(response);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al sincronizar notificaciones docentes:', error);
    return res.status(500).json({
      error: 'No se pudieron sincronizar las notificaciones docentes.',
    });
  } finally {
    client.release();
  }
}


router.get(
  '/',
  autenticar,
  soloRol('Docente'),
  synchronize
);


router.post(
  '/sincronizar',
  autenticar,
  soloRol('Docente'),
  synchronize
);


router.post(
  '/:id/leer',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    const docenteId = teacherId(req);
    const notificationId = toPositiveInteger(req.params.id);


    if (!docenteId || !notificationId) {
      return res.status(400).json({ error: 'Notificación inválida.' });
    }


    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE notificaciones_docente
         SET leida_en = COALESCE(leida_en, CURRENT_TIMESTAMP),
             actualizada_en = CURRENT_TIMESTAMP
         WHERE id = $1
           AND docente_id = $2
         RETURNING id, leida_en`,
        [notificationId, docenteId]
      );


      if (!result.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Notificación no encontrada.' });
      }


      await writeAudit(
        client,
        req,
        'LEER_NOTIFICACION_DOCENTE',
        notificationId,
        { docenteId }
      );
      await client.query('COMMIT');


      return res.json({
        message: 'Notificación marcada como leída.',
        id: notificationId,
        readAt: result.rows[0].leida_en,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al leer notificación docente:', error);
      return res.status(500).json({
        error: 'No se pudo actualizar la notificación.',
      });
    } finally {
      client.release();
    }
  }
);


router.post(
  '/leer-todas',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    const docenteId = teacherId(req);
    if (!docenteId) {
      return res.status(403).json({ error: 'Sesión docente inválida.' });
    }


    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `UPDATE notificaciones_docente
         SET leida_en = CURRENT_TIMESTAMP,
             actualizada_en = CURRENT_TIMESTAMP
         WHERE docente_id = $1
           AND visible_desde <= CURRENT_TIMESTAMP
           AND leida_en IS NULL`,
        [docenteId]
      );


      await writeAudit(
        client,
        req,
        'LEER_TODAS_NOTIFICACIONES_DOCENTE',
        null,
        { docenteId, total: result.rowCount }
      );
      await client.query('COMMIT');


      return res.json({
        message: 'Notificaciones marcadas como leídas.',
        total: result.rowCount,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('Error al leer todas las notificaciones:', error);
      return res.status(500).json({
        error: 'No se pudieron actualizar las notificaciones.',
      });
    } finally {
      client.release();
    }
  }
);


module.exports = router;