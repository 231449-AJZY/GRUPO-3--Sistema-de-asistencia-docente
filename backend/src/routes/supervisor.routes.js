const router = require('express').Router();
const pool = require('../db/pool');
// Importamos la autenticación y la autorización que ya existían en el proyecto base
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

// Aplicamos el filtro de rol: Solo permite acceso a Supervisor y Administrador
router.use(autenticar, soloRol('Supervisor', 'Administrador'));

// GET /api/supervisor/monitoreo
// Consulta la asistencia del día en tiempo real
router.get('/monitoreo', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, u.codigo, u.nombres, u.apellidos,
              dep.nombre AS departamento, r.hora_registro, r.estado
       FROM registros_ingreso_institucional r
       JOIN docentes d  ON d.id = r.docente_id
       JOIN usuarios u  ON u.id = d.usuario_id
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       WHERE r.fecha = CURRENT_DATE
       ORDER BY r.hora_registro DESC`
    );
    res.json({ 
      fecha: new Date().toISOString().split('T')[0], 
      registros: result.rows 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/supervisor/alertas
// Lista alertas e incumplimientos (tardanzas del día)
router.get('/alertas', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.codigo, u.nombres, u.apellidos, dep.nombre AS departamento, r.hora_registro, r.estado
       FROM registros_ingreso_institucional r
       JOIN docentes d  ON d.id = r.docente_id
       JOIN usuarios u  ON u.id = d.usuario_id
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       WHERE r.fecha = CURRENT_DATE AND r.estado = 'TARDANZA'
       ORDER BY r.hora_registro DESC`
    );
    res.json({ alertas: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al consultar alertas' });
  }
});

// GET /api/supervisor/historial-general
// Tarea 20: Permite consultar el consolidado de asistencias institucionales en formato JSON
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
    
    // Retorna la respuesta en el formato JSON requerido
    res.status(200).json({
      total_registros: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno al consultar el historial de asistencias' });
  }
});

// Diccionario de funcionalidades fijas por rol (Regla de negocio)
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
// Obtiene los módulos y permisos accesibles según el rol en formato JSON
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