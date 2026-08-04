const router  = require('express').Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const pool    = require('../db/pool');
const { autenticar } = require('../middlewares/auth.middleware');

const FUNCIONALIDADES = {
  Administrador: [
    { id: 'gestion_docentes', label: 'Gestión de docentes',       icono: 'fa-users',            ruta: '/admin/docentes' },
    { id: 'enrolamiento',     label: 'Enrolamiento biométrico',   icono: 'fa-fingerprint',      ruta: '/admin/enrolamiento' },
    { id: 'horarios',         label: 'Horarios académicos',       icono: 'fa-calendar',         ruta: '/admin/horarios' },
    { id: 'configuracion',    label: 'Configuración del sistema', icono: 'fa-sliders',          ruta: '/admin/configuracion' },
    { id: 'reportes',         label: 'Reportes de asistencia',    icono: 'fa-chart-bar',        ruta: '/admin/reportes' },
    { id: 'usuarios',         label: 'Gestión de usuarios',       icono: 'fa-user-shield',      ruta: '/admin/usuarios' },
    { id: 'audit_log',        label: 'Registro de auditoría',     icono: 'fa-file-shield',      ruta: '/admin/auditoria' },
  ],
  Docente: [
    { id: 'mi_asistencia', label: 'Mi asistencia',        icono: 'fa-clipboard-check',  ruta: '/docente/asistencia' },
    { id: 'mis_horarios',  label: 'Mis horarios',         icono: 'fa-calendar-days',    ruta: '/docente/horarios' },
    { id: 'calendario',    label: 'Calendario académico', icono: 'fa-calendar',         ruta: '/docente/calendario' },
  ],
  Supervisor: [
    { id: 'asistencia_tiempo_real', label: 'Asistencia en tiempo real',  icono: 'fa-circle-dot',        ruta: '/supervisor/tiempo-real' },
    { id: 'reportes',               label: 'Reportes y exportación',     icono: 'fa-chart-bar',         ruta: '/supervisor/reportes' },
    { id: 'alertas',                label: 'Alertas e incumplimientos',  icono: 'fa-bell',              ruta: '/supervisor/alertas' },
    { id: 'historial',              label: 'Historial de semestres',     icono: 'fa-clock-rotate-left', ruta: '/supervisor/historial' },
  ],
};

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildSessionUser(row) {
  const usuarioId = Number(row.id);
  const docenteId = toNullableNumber(row.docente_id);

  return {
    id: usuarioId,
    usuario_id: usuarioId,
    docente_id: docenteId,
    nombres: row.nombres,
    apellidos: row.apellidos,
    email: row.email,
    codigo: row.codigo,
    rol: row.rol,
  };
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.nombres, u.apellidos, u.email, u.codigo,
              u.contrasena_hash, u.activo, r.nombre AS rol,
              d.id AS docente_id
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN docentes d ON d.usuario_id = u.id
       WHERE (LOWER(u.email) = LOWER($1) OR u.codigo = $1)`,
      [String(username).trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });
    }

    const ok = await bcrypt.compare(password, user.contrasena_hash);

    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const sessionUser = buildSessionUser(user);

    const token = jwt.sign(
      {
        id: sessionUser.usuario_id,
        usuario_id: sessionUser.usuario_id,
        docente_id: sessionUser.docente_id,
        rol: sessionUser.rol,
        nombres: sessionUser.nombres,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, user: sessionUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/me
router.get('/me', autenticar, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.codigo, u.nombres, u.apellidos, u.email, u.activo,
              r.nombre AS rol, d.id AS docente_id, d.categoria, d.condicion,
              dep.nombre AS departamento
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       LEFT JOIN docentes d ON d.usuario_id = u.id
       LEFT JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       WHERE u.id = $1`,
      [req.user.usuario_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const row = result.rows[0];

    res.json({
      user: {
        ...buildSessionUser(row),
        activo: row.activo,
        categoria: row.categoria,
        condicion: row.condicion,
        departamento: row.departamento,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/auth/funcionalidades
router.get('/funcionalidades', autenticar, (req, res) => {
  const menu = FUNCIONALIDADES[req.user.rol];

  if (!menu) {
    return res.status(403).json({ error: 'Rol no reconocido' });
  }

  res.json({ rol: req.user.rol, funcionalidades: menu });
});

module.exports = router;
