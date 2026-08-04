'use strict';

const crypto = require('crypto');

const { config } = require('./config');
const {
  logAccess,
  logSecurity,
  logError,
} = require('./logger');
const { normalizeIp } = require('./rate-limit');

function requestContext(req, res, next) {
  const incoming = String(req.headers['x-request-id'] || '').trim();
  const requestId = /^[A-Za-z0-9._:-]{8,120}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();

  req.id = requestId;
  req.startedAtHighResolution = process.hrtime.bigint();
  res.setHeader('X-Request-Id', requestId);

  next();
}

function securityHeaders(req, res, next) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  );
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  const forwardedProtocol = String(
    req.headers['x-forwarded-proto'] || ''
  ).toLowerCase();

  if (req.secure || forwardedProtocol === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  next();
}

function accessLogger(req, res, next) {
  res.on('finish', () => {
    const started = req.startedAtHighResolution || process.hrtime.bigint();
    const elapsed = process.hrtime.bigint() - started;
    const durationMs = Number(elapsed) / 1_000_000;

    logAccess({
      requestId: req.id,
      method: req.method,
      path: String(req.originalUrl || req.url || '').split('?')[0],
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      ip: normalizeIp(req),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      origin: String(req.headers.origin || '').slice(0, 300) || null,
      userId: req.user?.id ?? null,
      role: req.user?.rol ?? null,
    });
  });

  next();
}

function createCorsOptions() {
  return {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalized = String(origin).trim().replace(/\/+$/, '');

      if (config.corsOrigins.has(normalized)) {
        return callback(null, true);
      }

      const error = new Error('Origen no autorizado por CORS.');
      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';

      logSecurity('cors_origin_denied', {
        origin: normalized.slice(0, 300),
      });

      return callback(error);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Request-Id',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'RateLimit-Limit',
      'RateLimit-Remaining',
      'RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Recurso no encontrado.',
    codigo: 'RESOURCE_NOT_FOUND',
    request_id: req.id,
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status)
    ? error.status
    : error.type === 'entity.too.large'
      ? 413
      : error instanceof SyntaxError && error.status === 400
        ? 400
        : 500;

  const knownClientError = status >= 400 && status < 500;

  logError(error, {
    requestId: req.id,
    method: req.method,
    path: String(req.originalUrl || req.url || '').split('?')[0],
    status,
    ip: normalizeIp(req),
  });

  return res.status(status).json({
    error: knownClientError
      ? String(error.message || 'Solicitud inválida.')
      : 'Error interno del servidor.',
    codigo:
      error.code ||
      (status === 413
        ? 'PAYLOAD_TOO_LARGE'
        : status === 400
          ? 'INVALID_REQUEST'
          : 'INTERNAL_SERVER_ERROR'),
    request_id: req.id,
  });
}

module.exports = {
  requestContext,
  securityHeaders,
  accessLogger,
  createCorsOptions,
  notFoundHandler,
  errorHandler,
};
