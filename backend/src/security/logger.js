'use strict';

const fs = require('fs');
const path = require('path');

const logsDirectory = path.resolve(__dirname, '../../logs');

function ensureLogsDirectory() {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

function dateLabel(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function sanitizeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: String(error.name || 'Error').slice(0, 120),
    message: String(error.message || error).slice(0, 1200),
    code: error.code ? String(error.code).slice(0, 120) : undefined,
    stack:
      process.env.NODE_ENV === 'production'
        ? undefined
        : String(error.stack || '').slice(0, 6000),
  };
}

function appendJsonLine(channel, payload) {
  ensureLogsDirectory();

  const destination = path.join(
    logsDirectory,
    `${channel}-${dateLabel()}.jsonl`
  );

  const record = {
    timestamp: new Date().toISOString(),
    ...payload,
  };

  fs.appendFile(
    destination,
    `${JSON.stringify(record)}\n`,
    { encoding: 'utf8' },
    (error) => {
      if (error) {
        console.error('No se pudo escribir el registro estructurado.', error);
      }
    }
  );
}

function logAccess(payload) {
  appendJsonLine('access', payload);
}

function logSecurity(event, payload = {}) {
  appendJsonLine('security', {
    event,
    ...payload,
  });
}

function logError(error, payload = {}) {
  appendJsonLine('error', {
    ...payload,
    error: sanitizeError(error),
  });
}

function removeExpiredLogs(retentionDays) {
  ensureLogsDirectory();

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const removed = [];

  for (const name of fs.readdirSync(logsDirectory)) {
    if (!name.endsWith('.jsonl')) {
      continue;
    }

    const filePath = path.join(logsDirectory, name);
    const stats = fs.statSync(filePath);

    if (stats.mtimeMs < cutoff) {
      fs.rmSync(filePath, { force: true });
      removed.push(name);
    }
  }

  return removed;
}

module.exports = {
  logsDirectory,
  logAccess,
  logSecurity,
  logError,
  removeExpiredLogs,
  sanitizeError,
};
