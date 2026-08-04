'use strict';

const pool = require('../db/pool');
const { config } = require('./config');
const {
  logSecurity,
  logError,
  removeExpiredLogs,
} = require('./logger');

let timer = null;
let running = false;

const maintenanceStatements = [
  {
    name: 'desafios_marcacion_movil',
    sql: `
      UPDATE desafios_marcacion_movil
      SET estado = 'EXPIRADO'
      WHERE estado = 'VIGENTE'
        AND expira_en <= CURRENT_TIMESTAMP
    `,
  },
  {
    name: 'solicitudes_vinculacion_dispositivo',
    sql: `
      UPDATE solicitudes_vinculacion_dispositivo
      SET estado = 'EXPIRADA'
      WHERE estado = 'VIGENTE'
        AND expira_en <= CURRENT_TIMESTAMP
    `,
  },
  {
    name: 'codigos_provisionamiento_ble',
    sql: `
      UPDATE codigos_provisionamiento_ble
      SET estado = 'EXPIRADO'
      WHERE estado = 'VIGENTE'
        AND expira_en <= CURRENT_TIMESTAMP
    `,
  },
  {
    name: 'credenciales_offline_dispositivo',
    sql: `
      UPDATE credenciales_offline_dispositivo
      SET
        estado = 'EXPIRADA',
        actualizada_en = CURRENT_TIMESTAMP
      WHERE estado = 'ACTIVA'
        AND expira_en <= CURRENT_TIMESTAMP
    `,
  },
];

function isOptionalDatabaseObjectError(error) {
  return [
    '42P01',
    '42703',
    '23514',
  ].includes(String(error?.code || ''));
}

async function runSecurityMaintenance() {
  if (running) {
    return;
  }

  running = true;

  try {
    const results = {};

    for (const statement of maintenanceStatements) {
      try {
        const result = await pool.query(statement.sql);
        results[statement.name] = result.rowCount;
      } catch (error) {
        if (isOptionalDatabaseObjectError(error)) {
          results[statement.name] = 'no_disponible';
          continue;
        }

        throw error;
      }
    }

    const removedLogs = removeExpiredLogs(config.logRetentionDays);

    logSecurity('security_maintenance_completed', {
      database: results,
      removedLogs,
    });
  } catch (error) {
    logError(error, {
      operation: 'security_maintenance',
    });
  } finally {
    running = false;
  }
}

function startSecurityMaintenance() {
  if (timer) {
    return;
  }

  runSecurityMaintenance();

  timer = setInterval(
    runSecurityMaintenance,
    config.cleanupIntervalMs
  );

  timer.unref();
}

function stopSecurityMaintenance() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  runSecurityMaintenance,
  startSecurityMaintenance,
  stopSecurityMaintenance,
};
