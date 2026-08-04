const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/roles — listar todos los roles con cantidad de usuarios
router.get('/', autenticar, soloRol('Administrador'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.nombre, r.descripcion,
              COUNT(u.id) AS total_usuarios
       FROM roles r
       LEFT JOIN usuarios u ON u.rol_id = r.id AND u.activo = true
       GROUP BY r.id, r.nombre, r.descripcion
       ORDER BY r.id`
    );
    res.json({ roles: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/roles/:id/usuarios — usuarios de un rol específico
router.get('/:id/usuarios', autenticar, soloRol('Administrador'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.codigo, u.nombres, u.apellidos, u.email, u.activo
       FROM usuarios u
       WHERE u.rol_id = $1
       ORDER BY u.apellidos, u.nombres`,
      [req.params.id]
    );
    res.json({ usuarios: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/roles/usuario/:id — cambiar rol de un usuario
router.put('/usuario/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const { rol_id } = req.body;
  if (!rol_id)
    return res.status(400).json({ error: 'rol_id es requerido' });

  // No permitir cambiar el propio rol
  if (parseInt(req.params.id) === req.user.id)
    return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });

  try {
    const result = await pool.query(
      `UPDATE usuarios SET rol_id = $1 WHERE id = $2
       RETURNING id, nombres, apellidos, email`,
      [rol_id, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ mensaje: 'Rol actualizado correctamente', usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
