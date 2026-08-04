'use strict';

const express = require('express');
const cors = require('cors');

const routes = require('./routes/index');
const pool = require('./db/pool');
const { config, validateEnvironment } = require('./security/config');
const {
  requestContext,
  securityHeaders,
  accessLogger,
  createCorsOptions,
  notFoundHandler,
  errorHandler,
} = require('./security/http-security');
const {
  createRateLimiter,
  loginKeyGenerator,
} = require('./security/rate-limit');

const validation = validateEnvironment();

for (const warning of validation.warnings) {
  console.warn(`[SEGURIDAD] ${warning}`);
}

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

app.use(requestContext);
app.use(securityHeaders);
app.use(accessLogger);
app.use(cors(createCorsOptions()));

app.use(
  express.json({
    limit: config.jsonBodyLimit,
    strict: true,
    type: ['application/json', 'application/*+json'],
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: '64kb',
    parameterLimit: 100,
  })
);

const loginLimiter = createRateLimiter({
  name: 'login',
  windowMs: config.authRateLimit.windowMs,
  max: config.authRateLimit.max,
  keyGenerator: loginKeyGenerator,
});

const mobileLimiter = createRateLimiter({
  name: 'mobile',
  windowMs: config.mobileRateLimit.windowMs,
  max: config.mobileRateLimit.max,
});

const bindingLimiter = createRateLimiter({
  name: 'binding',
  windowMs: config.bindingRateLimit.windowMs,
  max: config.bindingRateLimit.max,
});

const generalLimiter = createRateLimiter({
  name: 'general',
  windowMs: config.generalRateLimit.windowMs,
  max: config.generalRateLimit.max,
});

app.get('/api/health/live', (req, res) => {
  res.json({
    status: 'ok',
    check: 'live',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    request_id: req.id,
  });
});

app.get('/api/health/ready', async (req, res, next) => {
  let timeout;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        const error = new Error(
          'La base de datos tardó demasiado en responder.'
        );
        error.status = 503;
        error.code = 'DATABASE_TIMEOUT';
        reject(error);
      }, config.healthDbTimeoutMs);
    });

    await Promise.race([
      pool.query('SELECT 1 AS ready'),
      timeoutPromise,
    ]);

    res.json({
      status: 'ok',
      check: 'ready',
      database: 'ok',
      timestamp: new Date().toISOString(),
      request_id: req.id,
    });
  } catch (error) {
    if (!error.status) {
      error.status = 503;
      error.code = 'DATABASE_NOT_READY';
    }

    next(error);
  } finally {
    clearTimeout(timeout);
  }
});

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1 AS ready');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'ok',
      environment: config.environment,
      uptime_seconds: Math.floor(process.uptime()),
      request_id: req.id,
    });
  } catch (error) {
    error.status = 503;
    error.code = 'DATABASE_NOT_READY';
    next(error);
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/dispositivos/vinculaciones', bindingLimiter);
app.use('/api/dispositivos/sincronizacion', bindingLimiter);
app.use('/api/asistencia-movil', mobileLimiter);
app.use('/api/asistencia-offline', mobileLimiter);

app.use('/api', generalLimiter, routes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
