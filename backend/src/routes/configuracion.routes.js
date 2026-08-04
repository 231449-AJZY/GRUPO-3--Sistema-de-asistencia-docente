const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// GET /api/configuracion
router.get('/', autenticar, soloRol('Administrador'), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM configuracion_asistencia LIMIT 1`);
    res.json({ configuracion: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/configuracion
router.put('/', autenticar, soloRol('Administrador'), async (req, res) => {
  const { hora_ingreso_limite, tolerancia_antes_minutos, tolerancia_despues_minutos, dias_laborables } = req.body;
  try {
    await pool.query(
      `UPDATE configuracion_asistencia SET
        hora_ingreso_limite        = $1,
        tolerancia_antes_minutos   = $2,
        tolerancia_despues_minutos = $3,
        dias_laborables            = $4,
        actualizado_en             = CURRENT_TIMESTAMP,
        actualizado_por            = $5
       WHERE id = 1`,
      [hora_ingreso_limite, tolerancia_antes_minutos, tolerancia_despues_minutos, dias_laborables, req.user.id]
    );
    res.json({ mensaje: 'Configuración actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
