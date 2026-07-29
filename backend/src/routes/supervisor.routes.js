const router = require('express').Router();
const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// Aplicamos el filtro de rol: Solo permite acceso a Supervisor y Administrador
router.use(autenticar, soloRol('Supervisor', 'Administrador'));

// 1. GET /api/supervisor/monitoreo-hoy
// Muestra la asistencia del día actual con filtros opcionales por departamento o estado
router.get('/monitoreo-hoy', async (req, res) => {
  const { departamento_id, estado } = req.query;

  try {
    let query = `
      SELECT 
        r.id,
        u.codigo,
        u.nombres,
        u.apellidos,
        dep.nombre AS departamento,
        r.hora_registro,
        r.estado,
        r.dispositivo_id
      FROM registros_ingreso_institucional r
      JOIN docentes d ON d.id = r.docente_id
      JOIN usuarios u ON u.id = d.usuario_id
      JOIN departamentos_academicos dep ON dep.id = d.departamento_id
      WHERE r.fecha = CURRENT_DATE
    `;

    const values = [];
    let paramIndex = 1;

    if (departamento_id) {
      query += ` AND d.departamento_id = $${paramIndex}`;
      values.push(departamento_id);
      paramIndex++;
    }

    if (estado) {
      query += ` AND r.estado = $${paramIndex}`;
      values.push(estado);
      paramIndex++;
    }

    query += ` ORDER BY r.hora_registro DESC`;

    const result = await pool.query(query, values);

    res.status(200).json({
      fecha: new Date().toISOString().split('T')[0],
      total_asistencias: result.rowCount,
      registros: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al consultar el monitoreo del día' });
  }
});

// 2. GET /api/supervisor/reporte-rango
// Genera el historial consolidado de asistencia por rango de fechas
router.get('/reporte-rango', async (req, res) => {
  const { fecha_inicio, fecha_fin, docente_id } = req.query;

  if (!fecha_inicio || !fecha_fin) {
    return res.status(400).json({ error: 'Las fechas inicio y fin son obligatorias (YYYY-MM-DD)' });
  }

  try {
    let query = `
      SELECT 
        r.fecha,
        u.codigo,
        CONCAT(u.nombres, ' ', u.apellidos) AS docente,
        r.hora_registro,
        r.estado,
        'Ingreso Institucional' AS tipo_registro
      FROM registros_ingreso_institucional r
      JOIN docentes d ON d.id = r.docente_id
      JOIN usuarios u ON u.id = d.usuario_id
      WHERE r.fecha BETWEEN $1 AND $2
    `;

    const values = [fecha_inicio, fecha_fin];

    if (docente_id) {
      query += ` AND r.docente_id = $3`;
      values.push(docente_id);
    }

    query += ` ORDER BY r.fecha DESC, r.hora_registro ASC`;

    const result = await pool.query(query, values);

    res.status(200).json({
      rango: { fecha_inicio, fecha_fin },
      total: result.rowCount,
      reporte: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al generar el reporte' });
  }
});

// 3. GET /api/supervisor/incidencias-hoy
// Muestra únicamente docentes con TARDANZA hoy
router.get('/incidencias-hoy', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.codigo,
        CONCAT(u.nombres, ' ', u.apellidos) AS docente,
        dep.nombre AS departamento,
        r.hora_registro,
        r.estado
      FROM registros_ingreso_institucional r
      JOIN docentes d ON d.id = r.docente_id
      JOIN usuarios u ON u.id = d.usuario_id
      JOIN departamentos_academicos dep ON dep.id = d.departamento_id
      WHERE r.fecha = CURRENT_DATE AND r.estado = 'TARDANZA'
      ORDER BY r.hora_registro DESC
    `;

    const result = await pool.query(query);

    res.status(200).json({
      fecha: new Date().toISOString().split('T')[0],
      total_incidencias: result.rowCount,
      incidencias: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener incidencias' });
  }
});

// GET /api/supervisor/historial-general
// Consolidado de asistencias institucionales en formato JSON
router.get('/historial-general', async (req, res) => {
  try {
    const query = `
      SELECT r.id, u.codigo, u.nombres, u.apellidos, r.fecha, r.hora_registro, r.estado
      FROM registros_ingreso_institucional r
      JOIN docentes d ON d.id = r.docente_id
      JOIN usuarios u ON u.id = d.usuario_id
      ORDER BY r.fecha DESC, r.hora_registro DESC
    `;
    
    const result = await pool.query(query);
    
    res.status(200).json({
      total_registros: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al consultar el historial de asistencias' });
  }
});

// Diccionario de funcionalidades fijas por rol
const funcionalidadesPorRol = {
  'Administrador': [
    { modulo: 'Usuarios', ruta: '/admin/usuarios', permisos: ['leer', 'crear', 'editar', 'eliminar'] },
    { modulo: 'Configuracion', ruta: '/admin/configuracion', permisos: ['editar'] },
    { modulo: 'Reportes', ruta: '/admin/reportes', permisos: ['leer'] }
  ],
  'Supervisor': [
    { modulo: 'Asistencia Hoy', ruta: '/supervisor/hoy', permisos: ['leer'] },
    { modulo: 'Reportes', ruta: '/supervisor/reportes', permisos: ['leer'] }
  ],
  'Docente': [
    { modulo: 'Mi Perfil', ruta: '/docente/perfil', permisos: ['leer'] },
    { modulo: 'Marcar Ingreso', ruta: '/docente/asistencia/ingreso', permisos: ['crear'] },
    { modulo: 'Marcar Curso', ruta: '/docente/asistencia/curso', permisos: ['crear'] },
    { modulo: 'Mi Historial', ruta: '/docente/historial', permisos: ['leer'] }
  ]
};

// GET /api/supervisor/funcionalidades
router.get('/funcionalidades', (req, res) => {
  try {
    const rolUsuario = req.user ? req.user.rol : 'Supervisor';
    const funcionalidades = funcionalidadesPorRol[rolUsuario] || [];

    res.status(200).json({
      rol: rolUsuario,
      funcionalidades: funcionalidades
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las funcionalidades.' });
  }
});

module.exports = router;