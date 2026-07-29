// src/middlewares/autorizacion.middleware.js
const jwt = require('jsonwebtoken');

// 1. Middleware de Autenticación
function autenticar(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'secreto_para_pruebas_123');
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

// 2. Lógica de Autorización por Roles (soloRol)
function soloRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado. No tienes los permisos requeridos.' });
    }

    next();
  };
}

module.exports = { autenticar, soloRol };