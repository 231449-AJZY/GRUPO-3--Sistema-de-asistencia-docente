const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

router.post('/ingreso', autenticar, async (req, res) => {
  const { docente_id, dispositivo_id } = req.body;
  if (!docente_id)
    return res.status(400).json({ error: 'docente_id es requerido' });
  try {
    const config = await pool.query('SELECT hora_ingreso_limite FROM configuracion_asistencia LIMIT 1');
    const horaLimite = config.rows[0]?.hora_ingreso_limite || '09:00:00';
    const yaRegistro = await pool.query(
      'SELECT id FROM registros_ingreso_institucional WHERE docente_id = $1 AND fecha = CURRENT_DATE',
      [docente_id]
    );
    if (yaRegistro.rows.length > 0)
      return res.status(409).json({ error: 'El docente ya registró su ingreso hoy' });
    const ahora = await pool.query('SELECT CURRENT_TIME AS hora');
    const estado = ahora.rows[0].hora <= horaLimite ? 'PUNTUAL' : 'TARDANZA';
    const result = await pool.query(
      'INSERT INTO registros_ingreso_institucional (docente_id, fecha, hora_registro, dispositivo_id, estado) VALUES ($1, CURRENT_DATE, CURRENT_TIME, $2, $3) RETURNING *',
      [docente_id, dispositivo_id || null, estado]
    );
    res.status(201).json({ mensaje: `Ingreso registrado como ${estado}`, registro: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/curso', autenticar, async (req, res) => {
  const { horario_curso_id, docente_id, dispositivo_id } = req.body;
  if (!horario_curso_id || !docente_id)
    return res.status(400).json({ error: 'horario_curso_id y docente_id son requeridos' });
  try {
    const horario = await pool.query('SELECT hora_inicio FROM horarios_curso WHERE id = $1 AND activo = TRUE', [horario_curso_id]);
    if (horario.rows.length === 0)
      return res.status(404).json({ error: 'Horario no encontrado' });
    const config = await pool.query('SELECT tolerancia_antes_minutos, tolerancia_despues_minutos FROM configuracion_asistencia LIMIT 1');
    const antesMin   = config.rows[0]?.tolerancia_antes_minutos   || 15;
    const despuesMin = config.rows[0]?.tolerancia_despues_minutos || 10;
    const yaRegistro = await pool.query(
      'SELECT id FROM registros_asistencia_curso WHERE horario_curso_id = $1 AND fecha = CURRENT_DATE',
      [horario_curso_id]
    );
    if (yaRegistro.rows.length > 0)
      return res.status(409).json({ error: 'Ya se registró asistencia para esta sesión hoy' });
    const ventana = await pool.query(
      'SELECT ($1::time - INTERVAL \'1 minute\' * $2) AS desde, ($1::time + INTERVAL \'1 minute\' * $3) AS hasta, CURRENT_TIME AS ahora',
      [horario.rows[0].hora_inicio, antesMin, despuesMin]
    );
    const { desde, hasta, ahora } = ventana.rows[0];
    if (ahora < desde || ahora > hasta)
      return res.status(400).json({ error: `Fuera del margen permitido. Puede registrar desde ${desde} hasta ${hasta}` });
    const estado = ahora > horario.rows[0].hora_inicio ? 'TARDANZA' : 'PRESENTE';
    const result = await pool.query(
      'INSERT INTO registros_asistencia_curso (horario_curso_id, docente_id, fecha, hora_registro, dispositivo_id, estado) VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3, $4) RETURNING *',
      [horario_curso_id, docente_id, dispositivo_id || null, estado]
    );
    res.status(201).json({ mensaje: `Asistencia registrada como ${estado}`, registro: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/hoy', autenticar, soloRol('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.nombres, u.apellidos, u.codigo, dep.nombre AS departamento, r.hora_registro, r.estado
       FROM registros_ingreso_institucional r
       JOIN docentes d ON d.id = r.docente_id
       JOIN usuarios u ON u.id = d.usuario_id
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       WHERE r.fecha = CURRENT_DATE
       ORDER BY r.hora_registro`
    );
    res.json({ fecha: new Date().toISOString().split('T')[0], registros: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/asistencia/docente/:id
// Acepta ID de usuario o ID de docente
router.get('/docente/:id', autenticar, async (req, res) => {
  try {
    // Buscar docente por usuario_id O por id directo
    const docenteResult = await pool.query(
      `SELECT id FROM docentes WHERE usuario_id = $1 OR id = $1`,
      [req.params.id]
    );

    if (docenteResult.rows.length === 0)
      return res.status(404).json({ error: 'Docente no encontrado' });

    const docenteId = docenteResult.rows[0].id;

    const ingresos = await pool.query(
      `SELECT fecha, hora_registro, estado
       FROM registros_ingreso_institucional
       WHERE docente_id = $1
       ORDER BY fecha DESC
       LIMIT 30`,
      [docenteId]
    );

    const cursos = await pool.query(
      `SELECT rac.fecha, rac.hora_registro, rac.estado,
              c.nombre AS curso, hc.aula
       FROM registros_asistencia_curso rac
       JOIN horarios_curso hc ON hc.id = rac.horario_curso_id
       JOIN cursos c ON c.id = hc.curso_id
       WHERE rac.docente_id = $1
       ORDER BY rac.fecha DESC
       LIMIT 30`,
      [docenteId]
    );

    res.json({ ingresos: ingresos.rows, cursos: cursos.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// GET /api/docentes/:id/horarios
// Horarios del docente por usuario_id o docente_id
router.get('/:id/horarios', autenticar, async (req, res) => {
  try {
    // Buscar docente por usuario_id O por id directo
    const docenteResult = await pool.query(
      `SELECT id FROM docentes WHERE usuario_id = $1 OR id = $1`,
      [req.params.id]
    );

    if (docenteResult.rows.length === 0)
      return res.status(404).json({ error: 'Docente no encontrado' });

    const docenteId = docenteResult.rows[0].id;

    const result = await pool.query(
      `SELECT
        hc.id        AS horario_id,
        c.nombre     AS curso,
        c.creditos,
        dep.nombre   AS departamento,
        s.codigo     AS semestre,
        hc.aula,
        hc.dia_semana,
        hc.hora_inicio,
        hc.hora_fin
       FROM horarios_curso hc
       JOIN cursos c     ON c.id   = hc.curso_id
       JOIN semestres s  ON s.id   = hc.semestre_id
       JOIN departamentos_academicos dep ON dep.id = c.departamento_id
       WHERE hc.docente_id = $1
         AND hc.activo = true
         AND s.activo = true
       ORDER BY hc.dia_semana, hc.hora_inicio`,
      [docenteId]
    );

    res.json({ horarios: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


module.exports = router;
