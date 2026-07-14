const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/dashboard/admin
router.get('/admin', autenticar, soloRol('Administrador'), async (req, res) => {
  try {

    // ── Métricas principales ──────────────────────────────────
    const docentes = await pool.query(
      `SELECT
        COUNT(*)                                  AS total,
        COUNT(*) FILTER (WHERE u.activo = true)   AS activos
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id`
    );

    const asistenciaHoy = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE estado = 'PUNTUAL')   AS puntuales,
        COUNT(*) FILTER (WHERE estado = 'TARDANZA')  AS tardanzas
       FROM registros_ingreso_institucional
       WHERE fecha = CURRENT_DATE`
    );

    const totalDocentes  = parseInt(docentes.rows[0].total);
    const activosHoy     = parseInt(asistenciaHoy.rows[0].puntuales) +
                           parseInt(asistenciaHoy.rows[0].tardanzas);
    const inasistencias  = totalDocentes - activosHoy;

    // ── Actividad por hora hoy ────────────────────────────────
    const actividadHoras = await pool.query(
      `SELECT
        TO_CHAR(hora_registro, 'HH24:00') AS hora,
        COUNT(*) AS value
       FROM registros_ingreso_institucional
       WHERE fecha = CURRENT_DATE
       GROUP BY hora
       ORDER BY hora`
    );

    // Generar todas las horas del día con valor 0 si no hay datos
    const horas = [];
    for (let h = 6; h <= 18; h++) {
      const label = `${String(h).padStart(2,'0')}:00`;
      const found = actividadHoras.rows.find(r => r.hora === label);
      horas.push({ hour: label, value: found ? parseInt(found.value) : 0 });
    }

    // ── Alertas recientes ─────────────────────────────────────
    const alertas = await pool.query(
      `SELECT a.id, a.tipo, a.mensaje, a.fecha_alerta
       FROM alertas a
       ORDER BY a.fecha_alerta DESC
       LIMIT 4`
    );

    const recentAlerts = alertas.rows.map(a => ({
      id:          a.id,
      type:        a.tipo.toLowerCase(),
      title:       a.tipo.replace('_', ' '),
      description: a.mensaje,
      time:        new Date(a.fecha_alerta).toTimeString().slice(0,5),
    }));

    // ── Asistencias recientes ─────────────────────────────────
    const asistencias = await pool.query(
      `SELECT
        r.id,
        u.nombres || ' ' || u.apellidos AS docente,
        TO_CHAR(r.hora_registro, 'HH24:MI:SS') AS hora,
        r.estado,
        r.dispositivo_id
       FROM registros_ingreso_institucional r
       JOIN docentes d ON d.id = r.docente_id
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE r.fecha = CURRENT_DATE
       ORDER BY r.hora_registro DESC
       LIMIT 5`
    );

    const recentAttendances = asistencias.rows.map(a => ({
      id:      a.id,
      docente: a.docente,
      hora:    a.hora,
      estado:  a.estado === 'PUNTUAL' ? 'Presente' : a.estado,
      aula:    '—',
      metodo:  a.dispositivo_id ? 'Biométrico' : 'Manual',
    }));

    // ── Respuesta final ───────────────────────────────────────
    res.json({
      metrics: [
        {
          title:       "Docentes registrados",
          value:       totalDocentes,
          description: `${docentes.rows[0].activos} activos en el sistema`,
          color:       "blue",
          icon:        "users",
          trend:       [],
        },
        {
          title:       "Usuarios activos",
          value:       parseInt(docentes.rows[0].activos),
          description: "Docentes con cuenta activa",
          color:       "green",
          icon:        "user",
          trend:       [],
        },
        {
          title:       "Asistencias del día",
          value:       activosHoy,
          description: `Registros del ${new Date().toLocaleDateString('es-PE')}`,
          color:       "yellow",
          icon:        "calendar",
          trend:       [],
        },
        {
          title:       "Inasistencias detectadas",
          value:       inasistencias < 0 ? 0 : inasistencias,
          description: "Docentes sin registro hoy",
          color:       "red",
          icon:        "warning",
          trend:       [],
        },
      ],
      hourlyActivity:    horas,
      recentAlerts:      recentAlerts,
      recentAttendances: recentAttendances,
      biometricStatus: {
        connectedDevices: "0/0",
        syncStatus:       "Pendiente integración",
        lastRecord:       asistencias.rows[0]?.hora || "—",
        serverStatus:     "En línea",
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/dashboard/supervisor
router.get('/supervisor', autenticar, soloRol('Supervisor', 'Administrador'), async (req, res) => {
  try {
    const totalDocentes = await pool.query(
      `SELECT COUNT(*) AS total FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id WHERE u.activo = true`
    );

    const asistenciaHoy = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE estado = 'PUNTUAL')   AS puntuales,
        COUNT(*) FILTER (WHERE estado = 'TARDANZA')  AS tardanzas,
        COUNT(*)                                      AS total
       FROM registros_ingreso_institucional
       WHERE fecha = CURRENT_DATE`
    );

    const alertas = await pool.query(
      `SELECT COUNT(*) AS total FROM alertas WHERE leida = false`
    );

    const registrosHoy = await pool.query(
      `SELECT
        u.nombres || ' ' || u.apellidos AS docente,
        r.hora_registro, r.estado
       FROM registros_ingreso_institucional r
       JOIN docentes d ON d.id = r.docente_id
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE r.fecha = CURRENT_DATE
       ORDER BY r.hora_registro DESC
       LIMIT 10`
    );

    const total    = parseInt(totalDocentes.rows[0].total);
    const asistio  = parseInt(asistenciaHoy.rows[0].total);

    res.json({
      stats: {
        docentesMonitoreados: total,
        alertasNuevas:        parseInt(alertas.rows[0].total),
        inconsistencias:      total - asistio < 0 ? 0 : total - asistio,
        registrosValidados:   asistio,
      },
      registrosHoy: registrosHoy.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/dashboard/docente
router.get('/docente', autenticar, soloRol('Docente'), async (req, res) => {
  try {
    // Buscar el perfil del docente desde el token
    const docente = await pool.query(
      `SELECT d.id FROM docentes d WHERE d.usuario_id = $1`,
      [req.user.id]
    );

    if (docente.rows.length === 0)
      return res.status(404).json({ error: 'Perfil de docente no encontrado' });

    const docenteId = docente.rows[0].id;

    // Estadísticas del mes actual
    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE estado = 'PUNTUAL')   AS asistencias,
        COUNT(*) FILTER (WHERE estado = 'TARDANZA')  AS tardanzas,
        COUNT(*) FILTER (WHERE estado = 'AUSENTE')   AS inasistencias
       FROM registros_ingreso_institucional
       WHERE docente_id = $1
         AND DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)`,
      [docenteId]
    );

    // Últimos 5 registros
    const historial = await pool.query(
      `SELECT fecha, hora_registro, estado
       FROM registros_ingreso_institucional
       WHERE docente_id = $1
       ORDER BY fecha DESC
       LIMIT 5`,
      [docenteId]
    );

    res.json({
      stats: {
        asistencias:   parseInt(stats.rows[0].asistencias),
        tardanzas:     parseInt(stats.rows[0].tardanzas),
        inasistencias: parseInt(stats.rows[0].inasistencias),
      },
      historial: historial.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

