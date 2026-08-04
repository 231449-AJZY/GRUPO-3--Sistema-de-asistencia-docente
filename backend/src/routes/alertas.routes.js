const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/alertas
router.get('/', autenticar, soloRol('Supervisor', 'Administrador'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.tipo, a.mensaje, a.fecha_alerta, a.leida, a.docente_id
       FROM alertas a
       ORDER BY a.fecha_alerta DESC
       LIMIT 50`
    );
    res.json({ alertas: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/alertas
router.post('/', autenticar, soloRol('Supervisor', 'Administrador'), async (req, res) => {
  const { docente_id, tipo, mensaje } = req.body;
  if (!docente_id || !tipo || !mensaje)
    return res.status(400).json({ error: 'docente_id, tipo y mensaje son requeridos' });
  try {
    const result = await pool.query(
      `INSERT INTO alertas (docente_id, tipo, mensaje, generado_por)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [docente_id, tipo, mensaje, req.user.id]
    );
    res.status(201).json({ alerta: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
