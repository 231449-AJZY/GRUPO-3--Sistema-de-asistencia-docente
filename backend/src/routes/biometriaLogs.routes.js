const router = require('express').Router();
const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// 1. POST /api/biometria/logs
// Registrar un evento de intento biométrico (Usado por el sistema o por el módulo biométrico)
router.post('/logs', autenticar, async (req, res) => {
  const { docente_id, tipo_biometria, resultado, motivo_fallo, dispositivo_id } = req.body;
  const ip_origen = req.ip || req.connection.remoteAddress;

  if (!tipo_biometria || !resultado) {
    return res.status(400).json({ error: 'Los campos tipo_biometria y resultado son obligatorios.' });
  }

  try {
    const query = `
      INSERT INTO logs_biometria (docente_id, tipo_biometria, resultado, motivo_fallo, dispositivo_id, ip_origen)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const values = [docente_id || null, tipo_biometria, resultado, motivo_fallo || null, dispositivo_id || 'TERMINAL_01', ip_origen];
    
    const result = await pool.query(query, values);

    res.status(201).json({
      mensaje: 'Evento biométrico auditado con éxito',
      log: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el log de auditoría biométrica.' });
  }
});

// 2. GET /api/biometria/logs
// Consultar el historial de auditoría biométrica (Exclusivo para Supervisor y Administrador)
router.get('/logs', autenticar, soloRol('Supervisor', 'Administrador'), async (req, res) => {
  const { resultado, limite } = req.query;

  try {
    let query = `
      SELECT 
        l.id,
        l.tipo_biometria,
        l.resultado,
        l.motivo_fallo,
        l.dispositivo_id,
        l.ip_origen,
        l.fecha_registro,
        u.codigo AS codigo_docente,
        CONCAT(u.nombres, ' ', u.apellidos) AS nombre_docente
      FROM logs_biometria l
      LEFT JOIN docentes d ON d.id = l.docente_id
      LEFT JOIN usuarios u ON u.id = d.usuario_id
    `;

    const values = [];
    if (resultado) {
      query += ` WHERE l.resultado = $1`;
      values.push(resultado);
    }

    query += ` ORDER BY l.fecha_registro DESC LIMIT $${values.length + 1}`;
    values.push(limite || 50);

    const result = await pool.query(query, values);

    res.status(200).json({
      total: result.rowCount,
      logs: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar los logs de biometría.' });
  }
});

module.exports = router;