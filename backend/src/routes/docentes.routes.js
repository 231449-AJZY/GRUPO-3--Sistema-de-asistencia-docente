const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/docentes
// Lista todos los docentes con su info básica
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
// Totales para el dashboard del Administrador
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

// GET /api/docentes/:id
// Detalle de un docente específico
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
// Crear nuevo docente
router.post('/', autenticar, soloRol('Administrador'), async (req, res) => {
  const { nombres, apellidos, dni, correo, telefono, departamento, categoria, condicion, estado } = req.body;

  if (!nombres || !apellidos || !correo)
    return res.status(400).json({ error: 'Nombres, apellidos y correo son requeridos' });

  try {
    // Verificar si el correo ya existe
    const existe = await pool.query(
      `SELECT id FROM usuarios WHERE email = $1`, [correo]
    );
    if (existe.rows.length > 0)
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });

    // Buscar departamento
    const dept = await pool.query(
      `SELECT id FROM departamentos_academicos WHERE nombre = $1`, [departamento]
    );
    if (dept.rows.length === 0)
      return res.status(404).json({ error: `Departamento "${departamento}" no encontrado` });

    // Generar código y contraseña temporal
    const bcrypt = require('bcrypt');
    const totalUsuarios = await pool.query(`SELECT COUNT(*) AS total FROM usuarios`);
    const codigo = `DOC-${String(parseInt(totalUsuarios.rows[0].total) + 1).padStart(3, '0')}`;
    const passwordTemporal = `Unsaac${new Date().getFullYear()}#`;
    const hash = await bcrypt.hash(passwordTemporal, 12);

    // Insertar usuario
    const nuevoUsuario = await pool.query(
      `INSERT INTO usuarios (codigo, nombres, apellidos, email, contrasena_hash, rol_id, activo)
       VALUES ($1, $2, $3, $4, $5, 2, $6)
       RETURNING id, codigo`,
      [codigo, nombres, apellidos, correo, hash, estado === 'Activo']
    );

    const usuarioId = nuevoUsuario.rows[0].id;

    // Insertar perfil docente
    await pool.query(
      `INSERT INTO docentes (usuario_id, departamento_id, dni, categoria, condicion, telefono)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [usuarioId, dept.rows[0].id, dni || null, categoria || null, condicion || null, telefono || null]
    );

    res.status(201).json({
      mensaje: 'Docente registrado exitosamente',
      codigo,
      passwordTemporal,
      usuario: { id: usuarioId, codigo, nombres, apellidos, correo }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
