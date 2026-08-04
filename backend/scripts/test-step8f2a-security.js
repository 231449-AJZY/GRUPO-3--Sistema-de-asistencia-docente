'use strict';

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const assert = require('assert');

const {
  createRateLimiter,
  loginKeyGenerator,
} = require('../src/security/rate-limit');
const {
  config,
  normalizeOrigin,
} = require('../src/security/config');

function createResponse() {
  return {
    statusCode: 200,
    headers: new Map(),
    body: null,
    setHeader(name, value) {
      this.headers.set(String(name).toLowerCase(), String(value));
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function testRateLimiter() {
  const limiter = createRateLimiter({
    name: 'test',
    windowMs: 60000,
    max: 2,
  });

  const request = {
    headers: {},
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/api/test',
    id: 'test-request-id',
  };

  let nextCalls = 0;

  for (let index = 0; index < 2; index += 1) {
    const response = createResponse();
    limiter(request, response, () => {
      nextCalls += 1;
    });
    assert.strictEqual(response.statusCode, 200);
  }

  const blocked = createResponse();
  limiter(request, blocked, () => {
    nextCalls += 1;
  });

  assert.strictEqual(nextCalls, 2);
  assert.strictEqual(blocked.statusCode, 429);
  assert.strictEqual(
    blocked.body.codigo,
    'RATE_LIMIT_EXCEEDED'
  );
}

function testLoginKey() {
  const key = loginKeyGenerator({
    headers: {},
    ip: '192.168.100.20',
    body: { username: ' Pedro@UNSAAC.edu.pe ' },
  });

  assert.strictEqual(
    key,
    '192.168.100.20:pedro@unsaac.edu.pe'
  );
}

function testConfiguration() {
  assert.strictEqual(
    normalizeOrigin('http://localhost:3001/'),
    'http://localhost:3001'
  );

  assert(config.corsOrigins.size >= 1);
  assert(config.generalRateLimit.max >= 10);
}

testRateLimiter();
testLoginKey();
testConfiguration();

console.log('PASO 8F.2A: pruebas de seguridad superadas.');
