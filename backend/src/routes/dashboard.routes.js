const router = require('express').Router();
const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

function toInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function normalizeAlertType(value) {
  const type = String(value ?? '').toUpperCase();

  if (type.includes('TARDANZA')) {
    return 'tardanza';
  }

  if (type.includes('AUSENCIA') || type.includes('INASISTENCIA')) {
    return 'inasistencia';
  }

  if (type.includes('HORARIO')) {
    return 'horario';
  }

  return 'docente';
}

function alertTitle(type) {
  if (type === 'tardanza') {
    return 'Tardanza registrada';
  }

  if (type === 'inasistencia') {
    return 'Inasistencia detectada';
  }

  if (type === 'horario') {
    return 'Alerta de horario';
  }

  return 'Alerta de docente';
}

function normalizeAttendanceStatus(value) {
  const status = String(value ?? '').toUpperCase();

  if (status === 'PUNTUAL' || status === 'PRESENTE') {
    return 'Presente';
  }

  if (status === 'TARDANZA') {
    return 'Tardanza';
  }

  return 'Inasistencia';
}

// GET /api/dashboard/admin
router.get(
  '/admin',
  autenticar,
  soloRol('Administrador'),
  async (_req, res) => {
    try {
      // PASO_8I9A_FECHA_LIMA_ADMIN
      // Evita el cambio anticipado de día cuando Node/PostgreSQL usan UTC.
      const localDateSql = `(
        CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
          (SELECT zona_horaria
           FROM configuracion_institucional
           WHERE id = 1),
          'America/Lima'
        )
      )::date`;
      const [
        docentesResult,
        usuariosResult,
        asistenciaHoyResult,
        actividadHorasResult,
        tendenciaResult,
        alertasResult,
        asistenciasResult,
        verificationResult,
        dispositivosResult,
      ] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE u.activo = TRUE)::int AS activos
           FROM docentes d
           JOIN usuarios u ON u.id = d.usuario_id`
        ),
        pool.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE activo = TRUE)::int AS activos
           FROM usuarios`
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
                 AND UPPER(COALESCE(estado, '')) IN ('PUNTUAL', 'PRESENTE')
             )::int AS puntuales,
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
                 AND UPPER(COALESCE(estado, '')) = 'TARDANZA'
             )::int AS tardanzas,
             COUNT(DISTINCT docente_id) FILTER (
               WHERE resultado = 'REGISTRADA'
             )::int AS docentes_con_registro
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}`
        ),
        pool.query(
          `SELECT
             TO_CHAR(hora, 'HH24:00') AS hora,
             COUNT(*)::int AS value
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}
             AND resultado = 'REGISTRADA'
           GROUP BY TO_CHAR(hora, 'HH24:00')
           ORDER BY hora`
        ),
        pool.query(
          `WITH dias AS (
             SELECT generate_series(
               ${localDateSql} - INTERVAL '7 days',
               ${localDateSql},
               INTERVAL '1 day'
             )::date AS fecha
           )
           SELECT
             d.fecha,
             COUNT(DISTINCT h.docente_id)::int AS asistencias
           FROM dias d
           LEFT JOIN v_historial_asistencia_unificado h
             ON h.fecha = d.fecha
            AND h.resultado = 'REGISTRADA'
           GROUP BY d.fecha
           ORDER BY d.fecha`
        ),
        pool.query(
          `SELECT id, tipo, mensaje, fecha_alerta
           FROM alertas
           ORDER BY fecha_alerta DESC
           LIMIT 4`
        ),
        pool.query(
          `SELECT
             h.registro_uid AS id,
             CONCAT_WS(' ', h.nombres, h.apellidos) AS docente,
             h.fecha,
             TO_CHAR(h.hora, 'HH12:MI AM') AS hora,
             h.estado,
             h.resultado,
             CASE
               WHEN h.tipo_objetivo = 'CURSO'
                 THEN COALESCE(h.curso, 'Clase programada')
               ELSE 'Ingreso institucional'
             END AS registro,
             CASE
               WHEN h.tipo_objetivo = 'CURSO'
                 THEN COALESCE(h.aula, '—')
               ELSE '—'
             END AS aula,
             CASE h.metodo_verificacion
               WHEN 'QR_DINAMICO' THEN 'QR dinámico'
               WHEN 'BIOMETRIA_MOVIL' THEN
                 CASE
                   WHEN h.presencia_ble_validada = TRUE
                     THEN 'Biometría + BLE'
                   ELSE 'Biometría móvil'
                 END
               WHEN 'OFFLINE_SINCRONIZADO' THEN 'Offline sincronizado'
               WHEN 'LECTOR_BIOMETRICO' THEN 'Lector biométrico'
               ELSE 'Manual'
             END AS metodo
           FROM v_historial_asistencia_unificado h
           WHERE h.fecha = ${localDateSql}
           ORDER BY h.hora DESC, h.creado_en DESC
           LIMIT 8`
        ),
        pool.query(
          `SELECT
             COUNT(*)::int AS total_intentos,
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
               WHERE metodo_verificacion = 'QR_DINAMICO'
             )::int AS qr,
             COUNT(*) FILTER (
               WHERE metodo_verificacion = 'BIOMETRIA_MOVIL'
             )::int AS biometria,
             COUNT(*) FILTER (
               WHERE metodo_verificacion = 'OFFLINE_SINCRONIZADO'
             )::int AS offline,
             COUNT(*) FILTER (
               WHERE metodo_verificacion IN (
                 'MANUAL', 'LECTOR_BIOMETRICO'
               )
             )::int AS otros
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}`
        ),
        pool.query(
          `SELECT
             COUNT(DISTINCT dispositivo_id) FILTER (
               WHERE dispositivo_id IS NOT NULL
             )::int AS dispositivos_hoy,
             TO_CHAR(MAX(hora), 'HH12:MI AM') AS ultimo_registro
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}`
        ),
      ]);

      const totalDocentes = toInteger(docentesResult.rows[0]?.total);
      const docentesActivos = toInteger(docentesResult.rows[0]?.activos);
      const usuariosActivos = toInteger(usuariosResult.rows[0]?.activos);
      const puntualesHoy = toInteger(asistenciaHoyResult.rows[0]?.puntuales);
      const tardanzasHoy = toInteger(asistenciaHoyResult.rows[0]?.tardanzas);
      const asistenciasHoy = puntualesHoy + tardanzasHoy;
      const docentesConRegistro = toInteger(
        asistenciaHoyResult.rows[0]?.docentes_con_registro
      );
      const inasistenciasHoy = Math.max(
        docentesActivos - docentesConRegistro,
        0
      );

      const hourlyMap = new Map(
        actividadHorasResult.rows.map((row) => [
          row.hora,
          toInteger(row.value),
        ])
      );

      const hourlyActivity = [];

      for (let hour = 6; hour <= 18; hour += 1) {
        const label = `${String(hour).padStart(2, '0')}:00`;
        hourlyActivity.push({
          hour: label,
          value: hourlyMap.get(label) ?? 0,
        });
      }

      const attendanceTrend = tendenciaResult.rows.map((row) =>
        toInteger(row.asistencias)
      );
      const absenceTrend = attendanceTrend.map((value) =>
        Math.max(docentesActivos - value, 0)
      );
      const docentesTrend = Array(8).fill(totalDocentes);
      const usuariosTrend = Array(8).fill(usuariosActivos);

      const recentAlerts = alertasResult.rows.map((alert) => {
        const type = normalizeAlertType(alert.tipo);

        return {
          id: toInteger(alert.id),
          type,
          title: alertTitle(type),
          description: alert.mensaje,
          time: alert.fecha_alerta
            ? new Date(alert.fecha_alerta).toLocaleTimeString('es-PE', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })
            : '—',
        };
      });

      const recentAttendances = asistenciasResult.rows.map((attendance) => ({
        id: String(attendance.id),
        docente: attendance.docente || 'Docente sin nombre',
        registro: attendance.registro || 'Ingreso institucional',
        hora: attendance.hora || '—',
        estado: normalizeAttendanceStatus(attendance.estado),
        aula: attendance.aula || '—',
        metodo: attendance.metodo || 'Manual',
        resultado: attendance.resultado || 'REGISTRADA',
      }));

      const verificationRow = verificationResult.rows[0] ?? {};
      const verificationSummary = {
        totalAttempts: toInteger(verificationRow.total_intentos),
        registered: toInteger(verificationRow.registradas),
        duplicate: toInteger(verificationRow.duplicadas),
        rejected: toInteger(verificationRow.rechazadas),
        dynamicQr: toInteger(verificationRow.qr),
        mobileBiometric: toInteger(verificationRow.biometria),
        offline: toInteger(verificationRow.offline),
        other: toInteger(verificationRow.otros),
      };

      const activeDevices = toInteger(
        dispositivosResult.rows[0]?.dispositivos_hoy
      );
      const lastRecord =
        dispositivosResult.rows[0]?.ultimo_registro || '—';

      return res.json({
        summary: {
          docentesActivos,
          asistenciasHoy,
          tardanzasHoy,
          inasistenciasHoy,
        },
        metrics: [
          {
            title: 'Docentes registrados',
            value: totalDocentes,
            description: `${docentesActivos} activos en el sistema`,
            color: 'blue',
            icon: 'users',
            trend: docentesTrend,
          },
          {
            title: 'Usuarios activos',
            value: usuariosActivos,
            description: 'Cuentas con acceso habilitado',
            color: 'green',
            icon: 'user',
            trend: usuariosTrend,
          },
          {
            title: 'Asistencias del día',
            value: asistenciasHoy,
            description: `${puntualesHoy} puntuales y ${tardanzasHoy} tardanzas`,
            color: 'yellow',
            icon: 'calendar',
            trend: attendanceTrend,
          },
          {
            title: 'Inasistencias detectadas',
            value: inasistenciasHoy,
            description: 'Docentes activos sin registro hoy',
            color: 'red',
            icon: 'warning',
            trend: absenceTrend,
          },
        ],
        hourlyActivity,
        recentAlerts,
        recentAttendances,
        verificationSummary,
        biometricStatus: {
          connectedDevices: String(activeDevices),
          syncStatus: verificationSummary.totalAttempts > 0 ? 'Actualizado' : 'Sin registros hoy',
          lastRecord,
          serverStatus: 'En línea',
        },
      });
    } catch (error) {
      console.error('Error al cargar dashboard administrativo:', error);
      return res.status(500).json({
        error: 'No se pudo obtener la información del dashboard.',
      });
    }
  }
);

// GET /api/dashboard/supervisor
router.get(
  '/supervisor',
  autenticar,
  soloRol('Supervisor', 'Administrador'),
  async (_req, res) => {
    try {
      const localDateSql = `(
        CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
          (SELECT zona_horaria
           FROM configuracion_institucional
           WHERE id = 1),
          'America/Lima'
        )
      )::date`;

      const [
        totalDocentesResult,
        summaryResult,
        alertasResult,
        registrosResult,
        actividadResult,
        metodosResult,
      ] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM docentes d
           JOIN usuarios u ON u.id = d.usuario_id
           WHERE u.activo = TRUE`
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
             )::int AS total_registros,
             COUNT(DISTINCT docente_id) FILTER (
               WHERE resultado = 'REGISTRADA'
             )::int AS docentes_presentes,
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
                 AND UPPER(COALESCE(estado, '')) IN ('PUNTUAL', 'PRESENTE')
             )::int AS puntuales,
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
                 AND UPPER(COALESCE(estado, '')) = 'TARDANZA'
             )::int AS tardanzas,
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
                 AND tipo_objetivo = 'CURSO'
             )::int AS registros_curso,
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
                 AND tipo_objetivo = 'INGRESO_INSTITUCIONAL'
             )::int AS ingresos_institucionales,
             COUNT(*) FILTER (
               WHERE resultado = 'DUPLICADA'
             )::int AS duplicadas,
             COUNT(*) FILTER (
               WHERE resultado = 'RECHAZADA'
             )::int AS rechazadas
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}`
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total
           FROM alertas
           WHERE leida = FALSE`
        ),
        pool.query(
          `SELECT
             h.registro_uid AS id,
             CONCAT_WS(' ', h.nombres, h.apellidos) AS docente,
             h.codigo_docente AS codigo,
             COALESCE(NULLIF(BTRIM(h.departamento), ''), 'Sin departamento') AS departamento,
             h.tipo_objetivo,
             CASE
               WHEN h.tipo_objetivo = 'CURSO'
                 THEN COALESCE(NULLIF(BTRIM(h.curso), ''), 'Clase programada')
               ELSE 'Ingreso institucional'
             END AS registro,
             h.codigo_curso AS curso_codigo,
             CASE
               WHEN h.tipo_objetivo = 'CURSO'
                 THEN COALESCE(NULLIF(BTRIM(h.aula), ''), '—')
               ELSE '—'
             END AS aula,
             TO_CHAR(h.hora, 'HH24:MI:SS') AS hora_registro,
             COALESCE(h.estado, 'SIN_ESTADO') AS estado,
             COALESCE(h.resultado, 'REGISTRADA') AS resultado,
             CASE h.metodo_verificacion
               WHEN 'QR_DINAMICO' THEN 'QR_DINAMICO'
               WHEN 'BIOMETRIA_MOVIL' THEN
                 CASE
                   WHEN h.presencia_ble_validada = TRUE
                     THEN 'BIOMETRIA_MOVIL_BLE'
                   ELSE 'BIOMETRIA_MOVIL'
                 END
               WHEN 'OFFLINE_SINCRONIZADO' THEN 'OFFLINE_SINCRONIZADO'
               WHEN 'LECTOR_BIOMETRICO' THEN 'LECTOR_BIOMETRICO'
               ELSE COALESCE(h.metodo_verificacion, 'MANUAL')
             END AS metodo,
             h.fuente,
             h.fecha
           FROM v_historial_asistencia_unificado h
           WHERE h.fecha = ${localDateSql}
           ORDER BY h.hora DESC, h.creado_en DESC
           LIMIT 40`
        ),
        pool.query(
          `SELECT
             TO_CHAR(hora, 'HH24:00') AS hora,
             COUNT(*) FILTER (
               WHERE resultado = 'REGISTRADA'
             )::int AS total
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}
           GROUP BY TO_CHAR(hora, 'HH24:00')
           ORDER BY hora`
        ),
        pool.query(
          `SELECT
             CASE metodo_verificacion
               WHEN 'QR_DINAMICO' THEN 'QR_DINAMICO'
               WHEN 'BIOMETRIA_MOVIL' THEN
                 CASE
                   WHEN presencia_ble_validada = TRUE
                     THEN 'BIOMETRIA_MOVIL_BLE'
                   ELSE 'BIOMETRIA_MOVIL'
                 END
               WHEN 'OFFLINE_SINCRONIZADO' THEN 'OFFLINE_SINCRONIZADO'
               WHEN 'LECTOR_BIOMETRICO' THEN 'LECTOR_BIOMETRICO'
               ELSE COALESCE(metodo_verificacion, 'MANUAL')
             END AS metodo,
             COUNT(*)::int AS total
           FROM v_historial_asistencia_unificado
           WHERE fecha = ${localDateSql}
           GROUP BY 1
           ORDER BY total DESC, metodo`
        ),
      ]);

      const totalDocentes = toInteger(totalDocentesResult.rows[0]?.total);
      const summary = summaryResult.rows[0] ?? {};
      const docentesPresentes = toInteger(summary.docentes_presentes);
      const actividadMap = new Map(
        actividadResult.rows.map((row) => [row.hora, toInteger(row.total)])
      );
      const actividadHoraria = [];

      for (let hour = 6; hour <= 23; hour += 1) {
        const label = `${String(hour).padStart(2, '0')}:00`;
        actividadHoraria.push({
          hora: label,
          total: actividadMap.get(label) ?? 0,
        });
      }

      return res.json({
        generatedAt: new Date().toISOString(),
        fecha: String(
          registrosResult.rows[0]?.fecha ?? ''
        ) || null,
        stats: {
          docentesMonitoreados: totalDocentes,
          docentesPresentes,
          alertasNuevas: toInteger(alertasResult.rows[0]?.total),
          inconsistencias: Math.max(totalDocentes - docentesPresentes, 0),
          registrosValidados: toInteger(summary.total_registros),
          puntuales: toInteger(summary.puntuales),
          tardanzas: toInteger(summary.tardanzas),
          registrosCurso: toInteger(summary.registros_curso),
          ingresosInstitucionales: toInteger(summary.ingresos_institucionales),
          duplicadas: toInteger(summary.duplicadas),
          rechazadas: toInteger(summary.rechazadas),
        },
        registrosHoy: registrosResult.rows,
        actividadHoraria,
        metodos: metodosResult.rows.map((row) => ({
          metodo: row.metodo,
          total: toInteger(row.total),
        })),
      });
    } catch (error) {
      console.error('Error al cargar dashboard unificado de supervisor:', error);
      return res.status(500).json({
        error: 'No se pudo obtener la actividad unificada del supervisor.',
      });
    }
  }
);

// GET /api/dashboard/docente
router.get(
  '/docente',
  autenticar,
  soloRol('Docente'),
  async (req, res) => {
    try {
      const docenteId = Number(req.user.docente_id);

      if (!Number.isInteger(docenteId) || docenteId <= 0) {
        return res.status(404).json({
          error: 'Perfil de docente no encontrado',
        });
      }

      const [stats, historial] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE estado = 'PUNTUAL')::int AS asistencias,
             COUNT(*) FILTER (WHERE estado = 'TARDANZA')::int AS tardanzas,
             COUNT(*) FILTER (WHERE estado = 'AUSENTE')::int AS inasistencias
           FROM registros_ingreso_institucional
           WHERE docente_id = $1
             AND DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)`,
          [docenteId]
        ),
        pool.query(
          `SELECT fecha, hora_registro, estado
           FROM registros_ingreso_institucional
           WHERE docente_id = $1
           ORDER BY fecha DESC, hora_registro DESC
           LIMIT 5`,
          [docenteId]
        ),
      ]);

      return res.json({
        stats: {
          asistencias: toInteger(stats.rows[0]?.asistencias),
          tardanzas: toInteger(stats.rows[0]?.tardanzas),
          inasistencias: toInteger(stats.rows[0]?.inasistencias),
        },
        historial: historial.rows,
      });
    } catch (error) {
      console.error('Error al cargar dashboard de docente:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

module.exports = router;
