const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/usuarios — listar todos los usuarios
router.get('/', autenticar, soloRol('Administrador'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.codigo,
              u.nombres || ' ' || u.apellidos AS nombre,
              u.email AS correo,
              r.nombre AS rol,
              CASE WHEN u.activo THEN 'Activo' ELSE 'Inactivo' END AS estado,
              TO_CHAR(u.creado_en, 'DD/MM/YYYY') AS fecha_registro
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       ORDER BY u.creado_en DESC`
    );
    res.json({ usuarios: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/usuarios/:id/estado — activar o desactivar usuario
router.put('/:id/estado', autenticar, soloRol('Administrador'), async (req, res) => {
  const { activo } = req.body;
  if (activo === undefined)
    return res.status(400).json({ error: 'activo es requerido' });

  // No puede desactivarse a sí mismo
  if (parseInt(req.params.id) === req.user.id)
    return res.status(403).json({ error: 'No puedes desactivar tu propia cuenta' });

  try {
    await pool.query(
      `UPDATE usuarios SET activo = $1 WHERE id = $2`,
      [activo, req.params.id]
    );
    res.json({ mensaje: `Usuario ${activo ? 'activado' : 'desactivado'} correctamente` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/usuarios/:id/rol — cambiar rol de usuario
router.put('/:id/rol', autenticar, soloRol('Administrador'), async (req, res) => {
  const { rol_id } = req.body;
  if (!rol_id)
    return res.status(400).json({ error: 'rol_id es requerido' });

  if (parseInt(req.params.id) === req.user.id)
    return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });

  try {
    await pool.query(
      `UPDATE usuarios SET rol_id = $1 WHERE id = $2`,
      [rol_id, req.params.id]
    );
    res.json({ mensaje: 'Rol actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
