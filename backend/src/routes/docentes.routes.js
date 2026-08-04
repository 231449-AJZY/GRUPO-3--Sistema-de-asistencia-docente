const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/docentes
router.get('/', autenticar, soloRol('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, u.codigo, u.nombres, u.apellidos, u.email,
              u.activo, d.categoria, d.condicion,
              dep.nombre AS departamento
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       ORDER BY u.apellidos, u.nombres`
    );
    res.json({ docentes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/docentes/stats
router.get('/stats', autenticar, soloRol('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const totales = await pool.query(
      `SELECT
        COUNT(*)                                    AS total,
        COUNT(*) FILTER (WHERE u.activo = true)     AS activos,
        COUNT(*) FILTER (WHERE u.activo = false)    AS inactivos
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id`
    );
    const porDepartamento = await pool.query(
      `SELECT dep.nombre AS departamento, COUNT(*) AS total
       FROM docentes d
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE u.activo = true
       GROUP BY dep.nombre
       ORDER BY total DESC`
    );
    const asistenciaHoy = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE estado = 'PUNTUAL')  AS puntuales,
        COUNT(*) FILTER (WHERE estado = 'TARDANZA') AS tardanzas,
        COUNT(*)                                     AS total_registros
       FROM registros_ingreso_institucional
       WHERE fecha = CURRENT_DATE`
    );
    res.json({
      docentes:        totales.rows[0],
      porDepartamento: porDepartamento.rows,
      asistenciaHoy:   asistenciaHoy.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/docentes/departamentos
router.get('/departamentos', autenticar, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre FROM departamentos_academicos WHERE activo = true ORDER BY nombre`
    );
    res.json({ departamentos: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/docentes/:id/horarios
router.get('/:id/horarios', autenticar, async (req, res) => {
  try {
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
       JOIN cursos c    ON c.id  = hc.curso_id
       JOIN semestres s ON s.id  = hc.semestre_id
       JOIN departamentos_academicos dep ON dep.id = c.departamento_id
       WHERE hc.docente_id = $1
         AND hc.activo = true
         AND s.activo  = true
       ORDER BY hc.dia_semana, hc.hora_inicio`,
      [docenteId]
    );
    res.json({ horarios: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/docentes/:id
router.get('/:id', autenticar, soloRol('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, u.codigo, u.nombres, u.apellidos, u.email,
              u.activo, d.categoria, d.condicion, d.telefono,
              dep.nombre AS departamento
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       WHERE d.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Docente no encontrado' });
    res.json({ docente: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/docentes
router.post('/', autenticar, soloRol('Administrador'), async (req, res) => {
  const { nombres, apellidos, dni, correo, telefono, departamento, categoria, condicion, estado } = req.body;
  if (!nombres || !apellidos || !correo)
    return res.status(400).json({ error: 'Nombres, apellidos y correo son requeridos' });
  try {
    const existe = await pool.query(`SELECT id FROM usuarios WHERE email = $1`, [correo]);
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });

    const dept = await pool.query(
      `SELECT id FROM departamentos_academicos WHERE nombre = $1`, [departamento]
    );
    if (dept.rows.length === 0)
      return res.status(404).json({ error: `Departamento "${departamento}" no encontrado` });

    const bcrypt = require('bcrypt');
    const totalUsuarios = await pool.query(`SELECT COUNT(*) AS total FROM usuarios`);
    const codigo = `DOC-${String(parseInt(totalUsuarios.rows[0].total) + 1).padStart(3, '0')}`;
    const passwordTemporal = `Unsaac${new Date().getFullYear()}#`;
    const hash = await bcrypt.hash(passwordTemporal, 12);

    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios (codigo, nombres, apellidos, email, contrasena_hash, rol_id, activo)
       VALUES ($1, $2, $3, $4, $5, 2, $6)
       RETURNING id, codigo`,
      [codigo, nombres, apellidos, correo, hash, estado === 'Activo']
    );
    const usuarioId = nuevoUsuario.rows[0].id;

    await pool.query(
      `INSERT INTO docentes (usuario_id, departamento_id, dni, categoria, condicion, telefono)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuarioId, dept.rows[0].id, dni || null, categoria || null, condicion || null, telefono || null]
    );

    res.status(201).json({ mensaje: 'Docente registrado exitosamente', codigo, passwordTemporal,
      usuario: { id: usuarioId, codigo, nombres, apellidos, correo } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/docentes/:id
router.put('/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const { nombres, apellidos, dni, telefono, categoria, condicion, departamento } = req.body;
  try {
    await pool.query(
      `UPDATE usuarios SET nombres = $1, apellidos = $2 WHERE id = (
         SELECT usuario_id FROM docentes WHERE id = $3)`,
      [nombres, apellidos, req.params.id]
    );
    let deptId = null;
    if (departamento) {
      const dept = await pool.query(
        `SELECT id FROM departamentos_academicos WHERE nombre = $1`, [departamento]
      );
      if (dept.rows.length > 0) deptId = dept.rows[0].id;
    }
    const updateFields = [];
    const values = [];
    let idx = 1;
    if (dni)       { updateFields.push(`dni = $${idx++}`);            values.push(dni); }
    if (telefono)  { updateFields.push(`telefono = $${idx++}`);       values.push(telefono); }
    if (categoria) { updateFields.push(`categoria = $${idx++}`);      values.push(categoria); }
    if (condicion) { updateFields.push(`condicion = $${idx++}`);      values.push(condicion); }
    if (deptId)    { updateFields.push(`departamento_id = $${idx++}`);values.push(deptId); }
    if (updateFields.length > 0) {
      values.push(req.params.id);
      await pool.query(`UPDATE docentes SET ${updateFields.join(', ')} WHERE id = $${idx}`, values);
    }
    res.json({ mensaje: 'Docente actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/docentes/:id/estado
router.put('/:id/estado', autenticar, soloRol('Administrador'), async (req, res) => {
  const { activo } = req.body;
  if (activo === undefined)
    return res.status(400).json({ error: 'activo es requerido (true/false)' });
  try {
    await pool.query(
      `UPDATE usuarios SET activo = $1 WHERE id = (
         SELECT usuario_id FROM docentes WHERE id = $2)`,
      [activo, req.params.id]
    );
    res.json({ mensaje: `Docente ${activo ? 'activado' : 'desactivado'} correctamente` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
