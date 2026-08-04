'use strict';

const fs = require('fs');
const path = require('path');

const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');
const envResult = require('dotenv').config({ path: envPath });

if (envResult.error) {
  throw new Error(
    `No se pudo cargar la configuración privada del backend: ${envPath}`
  );
}

const pool = require('../src/db/pool');

async function main() {
  const migrationPath = path.join(
    backendRoot,
    'migrations',
    'step8j4-biometric-admin-closure.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  await pool.query(sql);

  const verification = await pool.query(
    `SELECT
       to_regclass('public.sincronizaciones_biometricas') AS tabla,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'sincronizaciones_biometricas'
           AND column_name = 'codigo_resultado'
       ) AS columna_resultado`
  );

  if (
    !verification.rows[0]?.tabla ||
    verification.rows[0]?.columna_resultado !== true
  ) {
    throw new Error(
      'La migración 8J.4 no dejó completa la estructura de sincronización biométrica.'
    );
  }

  console.log('Migración PostgreSQL 8J.4 aplicada y verificada correctamente.');
}

main()
  .catch((error) => {
    console.error('No se pudo aplicar la migración 8J.4:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
