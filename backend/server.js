'use strict';

require('dotenv').config();

const http = require('http');

const app = require('./src/app');
const pool = require('./src/db/pool');
const { config } = require('./src/security/config');
const {
  logSecurity,
  logError,
} = require('./src/security/logger');
const {
  startSecurityMaintenance,
  stopSecurityMaintenance,
} = require('./src/security/maintenance');

const server = http.createServer(app);

server.requestTimeout = config.requestTimeoutMs;
server.headersTimeout = config.headersTimeoutMs;
server.keepAliveTimeout = config.keepAliveTimeoutMs;
server.maxRequestsPerSocket = 1000;

let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logSecurity('backend_shutdown_started', {
    signal,
  });

  stopSecurityMaintenance();

  const forceExit = setTimeout(() => {
    logError(new Error('Cierre forzado por tiempo agotado.'), {
      signal,
    });
    process.exit(1);
  }, 10000);

  forceExit.unref();

  server.close(async (serverError) => {
    try {
      if (serverError) {
        throw serverError;
      }

      await pool.end();

      logSecurity('backend_shutdown_completed', {
        signal,
      });

      process.exit(exitCode);
    } catch (error) {
      logError(error, {
        operation: 'shutdown',
        signal,
      });
      process.exit(1);
    }
  });
}

server.listen(config.port, config.host, () => {
  startSecurityMaintenance();

  console.log(`Servidor corriendo en http://localhost:${config.port}`);
  console.log(
    `Seguridad 8F.2A activa · entorno ${config.environment} · host ${config.host}`
  );

  logSecurity('backend_started', {
    host: config.host,
    port: config.port,
    environment: config.environment,
  });
});

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));

process.on('unhandledRejection', (reason) => {
  const error =
    reason instanceof Error
      ? reason
      : new Error(String(reason || 'Rechazo no controlado.'));

  logError(error, {
    operation: 'unhandledRejection',
  });
});

process.on('uncaughtException', (error) => {
  logError(error, {
    operation: 'uncaughtException',
  });

  shutdown('uncaughtException', 1);
});
