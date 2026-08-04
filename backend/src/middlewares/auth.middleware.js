'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { config } = require('../security/config');
const { logSecurity } = require('../security/logger');

function timingSafeTextEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function isInternalServerToken(token) {
  const configured = String(process.env.INTERNAL_SERVER_TOKEN || '');

  if (configured && timingSafeTextEqual(token, configured)) {
    return true;
  }

  return (
    config.allowLegacyInternalToken &&
    timingSafeTextEqual(token, 'internal-server-token')
  );
}

function autenticar(req, res, next) {
  const authorization = String(req.headers.authorization || '');

  if (!authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token requerido',
      codigo: 'TOKEN_REQUIRED',
      request_id: req.id,
    });
  }

  const token = authorization.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Token requerido',
      codigo: 'TOKEN_REQUIRED',
      request_id: req.id,
    });
  }

  if (isInternalServerToken(token)) {
    req.user = {
      id: 1,
      rol: 'Administrador',
      nombres: 'Sistema',
      internal: true,
    };
    return next();
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256'],
        clockTolerance: 5,
      }
    );

    req.user = payload;
    return next();
  } catch (error) {
    logSecurity('invalid_access_token', {
      requestId: req.id,
      path: String(req.originalUrl || req.url || '').split('?')[0],
      reason: String(error.name || 'JsonWebTokenError'),
    });

    return res.status(401).json({
      error: 'Token inválido o expirado',
      codigo: 'TOKEN_INVALID',
      request_id: req.id,
    });
  }
}

function soloRol(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({
        error: 'Sin permiso para este recurso',
        codigo: 'ROLE_FORBIDDEN',
        request_id: req.id,
      });
    }

    return next();
  };
}

module.exports = {
  autenticar,
  soloRol,
};
