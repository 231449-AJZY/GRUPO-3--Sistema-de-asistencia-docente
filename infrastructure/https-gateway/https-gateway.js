'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

function requiredEnvironment(name) {
  const value = String(process.env[name] || '').trim();

  if (!value) {
    throw new Error(`Falta la variable ${name}.`);
  }

  return value;
}

function integerEnvironment(name, fallback, minimum, maximum) {
  const raw = String(process.env[name] || '').trim();
  const value = raw ? Number.parseInt(raw, 10) : fallback;

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} debe ser un entero entre ${minimum} y ${maximum}.`
    );
  }

  return value;
}

const configuration = Object.freeze({
  pfxPath: requiredEnvironment('UNSAAC_HTTPS_PFX_PATH'),
  pfxPassword: requiredEnvironment('UNSAAC_HTTPS_PFX_PASSWORD'),
  host: String(process.env.UNSAAC_HTTPS_HOST || '::').trim(),
  port: integerEnvironment('UNSAAC_HTTPS_PORT', 3443, 1, 65535),
  backendHost: String(
    process.env.UNSAAC_BACKEND_HOST || '127.0.0.1'
  ).trim(),
  backendPort: integerEnvironment(
    'UNSAAC_BACKEND_PORT',
    3000,
    1,
    65535
  ),
  frontendHost: String(
    process.env.UNSAAC_FRONTEND_HOST || '127.0.0.1'
  ).trim(),
  frontendPort: integerEnvironment(
    'UNSAAC_FRONTEND_PORT',
    3001,
    1,
    65535
  ),
});

if (!fs.existsSync(configuration.pfxPath)) {
  throw new Error(
    `No se encontró el certificado PFX: ${configuration.pfxPath}`
  );
}

const pfx = fs.readFileSync(configuration.pfxPath);

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'http2-settings',
]);

function firstHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || '').split(',')[0].trim();
}

function inferForwardedPort(proto, host) {
  try {
    const parsed = new URL(proto + '://' + host);

    if (parsed.port) {
      return parsed.port;
    }
  } catch {}

  return proto === 'https' ? '443' : '80';
}

function copyRequestHeaders(request) {
  const headers = {};

  for (const [name, value] of Object.entries(request.headers)) {
    if (!hopByHopHeaders.has(name.toLowerCase())) {
      headers[name] = value;
    }
  }

  const proto =
    firstHeaderValue(request.headers['x-forwarded-proto']) ||
    'https';

  const host =
    firstHeaderValue(request.headers['x-forwarded-host']) ||
    String(request.headers.host || '');

  const previousFor = String(
    request.headers['x-forwarded-for'] || ''
  ).trim();

  const remoteAddress = String(
    request.socket.remoteAddress || ''
  ).trim();

  headers.host =
    configuration.backendHost + ':' + configuration.backendPort;

  headers['x-forwarded-proto'] = proto;
  headers['x-forwarded-host'] = host;
  headers['x-forwarded-port'] = inferForwardedPort(proto, host);
  headers['x-forwarded-for'] =
    previousFor && remoteAddress
      ? previousFor + ', ' + remoteAddress
      : previousFor || remoteAddress;

  return headers;
}

function copyResponseHeaders(
  upstreamResponse,
  response
) {
  const blockedHeaders = new Set(hopByHopHeaders);

  const connectionTokens = String(
    upstreamResponse.headers.connection || ''
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  for (const token of connectionTokens) {
    blockedHeaders.add(token);
  }

  for (const [name, value] of Object.entries(
    upstreamResponse.headers
  )) {
    if (
      value !== undefined &&
      !blockedHeaders.has(name.toLowerCase())
    ) {
      response.setHeader(name, value);
    }
  }

  response.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader(
    'X-UNSAAC-HTTPS-Gateway',
    '8F.2B.1-CLOUDFLARE-V3'
  );
}

function chooseTarget(pathname) {
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return {
      name: 'backend',
      host: configuration.backendHost,
      port: configuration.backendPort,
    };
  }

  return {
    name: 'frontend',
    host: configuration.frontendHost,
    port: configuration.frontendPort,
  };
}

function writeGatewayError(response, error, target) {
  if (response.headersSent) {
    response.destroy(error);
    return;
  }

  response.statusCode = 502;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-UNSAAC-HTTPS-Gateway', '8F.2B.1');

  response.end(
    JSON.stringify({
      status: 'error',
      code: 'HTTPS_GATEWAY_UPSTREAM_UNAVAILABLE',
      target: target.name,
      message:
        'El servicio interno todavía no está disponible. ' +
        'Compruebe backend y frontend.',
      request_id: crypto.randomUUID(),
    })
  );
}

function proxyHttpRequest(request, response) {
  const url = new URL(
    request.url || '/',
    `https://${request.headers.host || 'localhost'}`
  );

  if (url.pathname === '/__gateway/health') {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-UNSAAC-HTTPS-Gateway', '8F.2B.1');
    response.end(
      JSON.stringify({
        status: 'ok',
        gateway: 'UNSAAC HTTPS',
        version: '8F.2B.1',
        backend: `${configuration.backendHost}:${configuration.backendPort}`,
        frontend:
          `${configuration.frontendHost}:${configuration.frontendPort}`,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  const target = chooseTarget(url.pathname);
  const headers = copyRequestHeaders(request);
  headers.host = `${target.host}:${target.port}`;

  const upstreamRequest = http.request(
    {
      host: target.host,
      port: target.port,
      method: request.method,
      path: request.url,
      headers,
      timeout: 30000,
    },
    (upstreamResponse) => {
      response.statusCode = upstreamResponse.statusCode || 502;
      copyResponseHeaders(upstreamResponse, response);
      upstreamResponse.pipe(response);
    }
  );

  upstreamRequest.on('timeout', () => {
    upstreamRequest.destroy(
      new Error(`Tiempo agotado al conectar con ${target.name}.`)
    );
  });

  upstreamRequest.on('error', (error) => {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'gateway_proxy_error',
        target: target.name,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
    );

    writeGatewayError(response, error, target);
  });

  request.on('aborted', () => {
    upstreamRequest.destroy();
  });

  request.pipe(upstreamRequest);
}

function serializeUpgradeRequest(request, target) {
  const lines = [
    `${request.method} ${request.url} HTTP/${request.httpVersion}`,
  ];

  for (const [name, rawValue] of Object.entries(request.headers)) {
    const lowerName = name.toLowerCase();

    if (
      lowerName === 'host' ||
      lowerName === 'x-forwarded-proto' ||
      lowerName === 'x-forwarded-host' ||
      lowerName === 'x-forwarded-port'
    ) {
      continue;
    }

    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    for (const value of values) {
      if (value !== undefined) {
        lines.push(`${name}: ${value}`);
      }
    }
  }

  lines.push(`host: ${target.host}:${target.port}`);
  lines.push('x-forwarded-proto: https');
  lines.push(`x-forwarded-host: ${String(request.headers.host || '')}`);
  lines.push(`x-forwarded-port: ${configuration.port}`);
  lines.push('');
  lines.push('');

  return lines.join('\r\n');
}

function proxyWebSocket(request, clientSocket, head) {
  const url = new URL(
    request.url || '/',
    `https://${request.headers.host || 'localhost'}`
  );
  const target = chooseTarget(url.pathname);
  const upstreamSocket = net.connect(target.port, target.host);

  upstreamSocket.setTimeout(30000);

  upstreamSocket.on('connect', () => {
    upstreamSocket.write(serializeUpgradeRequest(request, target));

    if (head && head.length > 0) {
      upstreamSocket.write(head);
    }

    upstreamSocket.pipe(clientSocket);
    clientSocket.pipe(upstreamSocket);
  });

  upstreamSocket.on('timeout', () => {
    upstreamSocket.destroy(
      new Error(`Tiempo agotado al conectar WebSocket con ${target.name}.`)
    );
  });

  upstreamSocket.on('error', (error) => {
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'gateway_websocket_error',
        target: target.name,
        message: error.message,
        timestamp: new Date().toISOString(),
      })
    );

    if (!clientSocket.destroyed) {
      clientSocket.end(
        'HTTP/1.1 502 Bad Gateway\r\n' +
          'Connection: close\r\n' +
          'Content-Type: text/plain; charset=utf-8\r\n' +
          '\r\n' +
          'Servicio interno no disponible.'
      );
    }
  });

  clientSocket.on('error', () => {
    upstreamSocket.destroy();
  });
}

const tlsOptions = {
  pfx,
  passphrase: configuration.pfxPassword,
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  honorCipherOrder: true,
  requestCert: false,
  rejectUnauthorized: false,
  secureOptions:
    crypto.constants.SSL_OP_NO_COMPRESSION |
    crypto.constants.SSL_OP_NO_RENEGOTIATION,
};

if (process.argv.includes('--validate')) {
  const context = tls.createSecureContext(tlsOptions);

  if (!context) {
    throw new Error('No se pudo crear el contexto TLS.');
  }

  console.log(
    JSON.stringify({
      status: 'ok',
      validation: 'tls_context',
      pfx: configuration.pfxPath,
      port: configuration.port,
      min_tls: tlsOptions.minVersion,
      max_tls: tlsOptions.maxVersion,
    })
  );

  process.exit(0);
}

const server = https.createServer(tlsOptions, proxyHttpRequest);

server.requestTimeout = 30000;
server.headersTimeout = 35000;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 1000;

server.on('upgrade', proxyWebSocket);

server.on('tlsClientError', (error, socket) => {
  console.warn(
    JSON.stringify({
      level: 'warning',
      event: 'gateway_tls_client_error',
      message: error.message,
      remote_address: socket.remoteAddress || null,
      timestamp: new Date().toISOString(),
    })
  );
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Cerrando gateway HTTPS por ${signal}...`);

  const forceExit = setTimeout(() => {
    process.exit(1);
  }, 10000);
  forceExit.unref();

  server.close(() => {
    process.exit(0);
  });
}

server.listen(configuration.port, configuration.host, () => {
  console.log(
    `UNSAAC HTTPS activo en https://localhost:${configuration.port}`
  );
  console.log(
    `Red local: https://192.168.100.16:${configuration.port}`
  );
  console.log(
    `Backend interno: http://${configuration.backendHost}:` +
      `${configuration.backendPort}`
  );
  console.log(
    `Frontend interno: http://${configuration.frontendHost}:` +
      `${configuration.frontendPort}`
  );
  console.log('HTTP 3000 y 3001 permanecen disponibles como respaldo.');
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
