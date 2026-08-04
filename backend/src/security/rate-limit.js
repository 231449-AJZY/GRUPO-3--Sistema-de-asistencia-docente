'use strict';

const { logSecurity } = require('./logger');

function normalizeIp(req) {
  return String(req.ip || req.socket?.remoteAddress || 'desconocida');
}

function defaultKeyGenerator(req) {
  return normalizeIp(req);
}

function createRateLimiter({
  name,
  windowMs,
  max,
  keyGenerator = defaultKeyGenerator,
  skip = () => false,
}) {
  const buckets = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();

    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));

  cleanup.unref();

  return function rateLimiter(req, res, next) {
    if (skip(req)) {
      return next();
    }

    const now = Date.now();
    const key = String(keyGenerator(req) || 'desconocida');
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    const resetSeconds = Math.max(
      1,
      Math.ceil((bucket.resetAt - now) / 1000)
    );

    res.setHeader('RateLimit-Policy', `${max};w=${Math.ceil(windowMs / 1000)}`);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(resetSeconds));

      logSecurity('rate_limit_exceeded', {
        limiter: name,
        requestId: req.id,
        ip: normalizeIp(req),
        method: req.method,
        path: String(req.originalUrl || req.url || '').split('?')[0],
        resetSeconds,
      });

      return res.status(429).json({
        error:
          'Demasiadas solicitudes. Espere unos minutos antes de intentarlo nuevamente.',
        codigo: 'RATE_LIMIT_EXCEEDED',
        reintentar_en_segundos: resetSeconds,
        request_id: req.id,
      });
    }

    return next();
  };
}

function loginKeyGenerator(req) {
  const username = String(req.body?.username || '')
    .trim()
    .toLowerCase()
    .slice(0, 180);

  return `${normalizeIp(req)}:${username || 'sin-usuario'}`;
}

module.exports = {
  createRateLimiter,
  loginKeyGenerator,
  normalizeIp,
};
