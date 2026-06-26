
const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { Pool } = require('pg');

const app  = express();
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── Middleware: verificar JWT ─────────────────────────────────
function autenticar(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Token requerido' });
    try {
        const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}

// ── Middleware: verificar rol ─────────────────────────────────
function soloRol(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol))
            return res.status(403).json({ error: 'Sin permiso para este recurso' });
        next();
    };
}

// ── POST /api/auth/login ──────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  try {
    // Busca por email O por código institucional
    const result = await pool.query(
      `SELECT u.id, u.nombres, u.apellidos, u.email, u.codigo,
              u.contrasena_hash, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE (u.email = $1 OR u.codigo = $1)`,
      [username]
    );

    if (result.rows.length === 0)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const user = result.rows[0];

    if (!user.activo)
      return res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });

    const passwordOk = await bcrypt.compare(password, user.contrasena_hash);
    if (!passwordOk)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id, rol: user.rol, nombres: user.nombres },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id:       user.id,
        nombres:  user.nombres,
        apellidos: user.apellidos,
        email:    user.email,
        codigo:   user.codigo,
        rol:      user.rol,
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────
// Tarea 2: devuelve la info completa del usuario autenticado
app.get('/api/auth/me', autenticar, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT u.id, u.codigo, u.nombres, u.apellidos,
                    u.email, u.activo, r.nombre AS rol,
                    d.categoria, d.condicion,
                    dep.nombre AS departamento
             FROM usuarios u
             JOIN roles r ON r.id = u.rol_id
             LEFT JOIN docentes d   ON d.usuario_id = u.id
             LEFT JOIN departamentos_academicos dep ON dep.id = d.departamento_id
             WHERE u.id = $1`,
            [req.user.id]
        );
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Usuario no encontrado' });

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ── GET /api/auth/funcionalidades ────────────────────────────
// Tarea 1: devuelve las funcionalidades disponibles según el rol
app.get('/api/auth/funcionalidades', autenticar, (req, res) => {
    const funcionalidades = {
        Administrador: [
            { id: 'gestion_docentes',    label: 'Gestión de docentes',      icono: 'fa-users',        ruta: '/admin/docentes' },
            { id: 'enrolamiento',        label: 'Enrolamiento biométrico',  icono: 'fa-fingerprint',  ruta: '/admin/enrolamiento' },
            { id: 'horarios',            label: 'Horarios académicos',      icono: 'fa-calendar',     ruta: '/admin/horarios' },
            { id: 'configuracion',       label: 'Configuración del sistema',icono: 'fa-sliders',      ruta: '/admin/configuracion' },
            { id: 'reportes',            label: 'Reportes de asistencia',   icono: 'fa-chart-bar',    ruta: '/admin/reportes' },
            { id: 'usuarios',            label: 'Gestión de usuarios',      icono: 'fa-user-shield',  ruta: '/admin/usuarios' },
            { id: 'audit_log',           label: 'Registro de auditoría',    icono: 'fa-file-shield',  ruta: '/admin/auditoria' },
        ],
        Docente: [
            { id: 'mi_asistencia',       label: 'Mi asistencia',            icono: 'fa-clipboard-check', ruta: '/docente/asistencia' },
            { id: 'mis_horarios',        label: 'Mis horarios',             icono: 'fa-calendar-days',   ruta: '/docente/horarios' },
            { id: 'calendario',          label: 'Calendario académico',     icono: 'fa-calendar',        ruta: '/docente/calendario' },
        ],
        Supervisor: [
            { id: 'asistencia_tiempo_real', label: 'Asistencia en tiempo real', icono: 'fa-circle-dot',   ruta: '/supervisor/tiempo-real' },
            { id: 'reportes',               label: 'Reportes y exportación',    icono: 'fa-chart-bar',    ruta: '/supervisor/reportes' },
            { id: 'alertas',                label: 'Alertas e incumplimientos', icono: 'fa-bell',         ruta: '/supervisor/alertas' },
            { id: 'historial',              label: 'Historial de semestres',    icono: 'fa-clock-rotate-left', ruta: '/supervisor/historial' },
        ],
    };

    const menu = funcionalidades[req.user.rol];
    if (!menu)
        return res.status(403).json({ error: 'Rol no reconocido' });

    res.json({
        rol: req.user.rol,
        funcionalidades: menu
    });
});

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(process.env.PORT, () => {
  console.log(`API corriendo en puerto ${process.env.PORT}`);
});