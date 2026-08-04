'use strict';

const crypto = require('crypto');

function parseInteger(name, fallback, minimum, maximum) {
  const raw = process.env[name];
  const value = raw === undefined || raw === ''
    ? fallback
    : Number.parseInt(raw, 10);

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} debe ser un entero entre ${minimum} y ${maximum}.`
    );
  }

  return value;
}

function parseBoolean(name, fallback = false) {
  const raw = process.env[name];

  if (raw === undefined || raw === '') {
    return fallback;
  }

  if (raw === 'true' || raw === '1') {
    return true;
  }

  if (raw === 'false' || raw === '0') {
    return false;
  }

  throw new Error(`${name} debe ser true o false.`);
}

function parseBodyLimit(value) {
  const normalized = String(value || '1mb').trim().toLowerCase();

  if (!/^\d+(kb|mb)$/.test(normalized)) {
    throw new Error('JSON_BODY_LIMIT debe usar el formato 512kb o 1mb.');
  }

  return normalized;
}

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

function parseCorsOrigins() {
  const configured = String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const defaults = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://192.168.100.16:3001',
  ];

  return new Set(configured.length > 0 ? configured : defaults);
}

function createFingerprint(value) {
  return crypto
    .createHash('sha256')
    .update(String(value || ''), 'utf8')
    .digest('hex')
    .slice(0, 12);
}

const environment = String(process.env.NODE_ENV || 'development')
  .trim()
  .toLowerCase();

const config = Object.freeze({
  environment,
  isProduction: environment === 'production',
  host: String(process.env.HOST || '::').trim(),
  port: parseInteger('PORT', 3000, 1, 65535),
  trustProxy: parseInteger('TRUST_PROXY', 0, 0, 10),
  jsonBodyLimit: parseBodyLimit(process.env.JSON_BODY_LIMIT),
  corsOrigins: parseCorsOrigins(),
  requestTimeoutMs: parseInteger(
    'REQUEST_TIMEOUT_MS',
    30000,
    5000,
    120000
  ),
  headersTimeoutMs: parseInteger(
    'HEADERS_TIMEOUT_MS',
    35000,
    6000,
    125000
  ),
  keepAliveTimeoutMs: parseInteger(
    'KEEP_ALIVE_TIMEOUT_MS',
    5000,
    1000,
    30000
  ),
  generalRateLimit: Object.freeze({
    windowMs: parseInteger(
      'RATE_LIMIT_WINDOW_MS',
      60000,
      1000,
      3600000
    ),
    max: parseInteger('RATE_LIMIT_MAX', 600, 10, 100000),
  }),
  authRateLimit: Object.freeze({
    windowMs: parseInteger(
      'AUTH_RATE_LIMIT_WINDOW_MS',
      900000,
      60000,
      86400000
    ),
    max: parseInteger('AUTH_RATE_LIMIT_MAX', 10, 2, 1000),
  }),
  mobileRateLimit: Object.freeze({
    windowMs: parseInteger(
      'MOBILE_RATE_LIMIT_WINDOW_MS',
      60000,
      1000,
      3600000
    ),
    max: parseInteger('MOBILE_RATE_LIMIT_MAX', 180, 10, 100000),
  }),
  bindingRateLimit: Object.freeze({
    windowMs: parseInteger(
      'BINDING_RATE_LIMIT_WINDOW_MS',
      600000,
      60000,
      86400000
    ),
    max: parseInteger('BINDING_RATE_LIMIT_MAX', 30, 2, 10000),
  }),
  healthDbTimeoutMs: parseInteger(
    'HEALTH_DB_TIMEOUT_MS',
    3000,
    500,
    15000
  ),
  cleanupIntervalMs: parseInteger(
    'SECURITY_CLEANUP_INTERVAL_MS',
    3600000,
    60000,
    86400000
  ),
  logRetentionDays: parseInteger(
    'SECURITY_LOG_RETENTION_DAYS',
    30,
    1,
    3650
  ),
  allowLegacyInternalToken: parseBoolean(
    'ALLOW_LEGACY_INTERNAL_TOKEN',
    environment !== 'production'
  ),
});

function validateEnvironment() {
  const problems = [];
  const warnings = [];

  const jwtSecret = String(process.env.JWT_SECRET || '');
  const dbPassword = String(process.env.DB_PASSWORD || '');
  const internalToken = String(process.env.INTERNAL_SERVER_TOKEN || '');
  const bleMasterKey = String(process.env.BLE_MASTER_KEY || '');

  if (!jwtSecret) {
    problems.push('JWT_SECRET no está configurado.');
  } else if (jwtSecret.length < 32) {
    const message = 'JWT_SECRET debería tener al menos 32 caracteres.';
    if (config.isProduction) {
      problems.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (!dbPassword) {
    problems.push('DB_PASSWORD no está configurado.');
  }

  if (!internalToken) {
    problems.push('INTERNAL_SERVER_TOKEN no está configurado.');
  } else if (internalToken.length < 32) {
    const message =
      'INTERNAL_SERVER_TOKEN debería tener al menos 32 caracteres.';
    if (config.isProduction) {
      problems.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (!bleMasterKey) {
    warnings.push(
      'BLE_MASTER_KEY no está configurado; las funciones BLE pueden fallar.'
    );
  }

  if (config.isProduction && config.allowLegacyInternalToken) {
    problems.push(
      'ALLOW_LEGACY_INTERNAL_TOKEN no puede estar activo en producción.'
    );
  }

  if (config.isProduction && config.corsOrigins.has('*')) {
    problems.push('CORS_ORIGINS no puede contener * en producción.');
  }

  if (problems.length > 0) {
    const error = new Error(
      `Configuración insegura del backend: ${problems.join(' ')}`
    );
    error.code = 'UNSAFE_ENVIRONMENT';
    throw error;
  }

  return {
    warnings,
    fingerprints: {
      jwtSecret: createFingerprint(jwtSecret),
      internalToken: createFingerprint(internalToken),
      bleMasterKey: createFingerprint(bleMasterKey),
    },
  };
}

module.exports = {
  config,
  validateEnvironment,
  normalizeOrigin,
};
