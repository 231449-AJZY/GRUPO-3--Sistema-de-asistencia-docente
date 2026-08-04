'use strict';

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envResult = require('dotenv').config({ path: envPath });

if (envResult.error) {
  throw new Error(
    `No se pudo cargar la configuración privada del backend: ${envPath}`
  );
}

const pool = require('../src/db/pool');

async function main() {
  const sqlPath = path.join(
    __dirname,
    '..',
    'migrations',
    'step8j3-biometric-devices.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);

    const verification = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'dispositivos_biometricos'
         AND column_name = ANY($1::text[])`,
      [[
        'tipo_conexion',
        'ultima_latencia_ms',
        'ultimo_error_codigo',
        'diagnostico_detalle',
        'retirado_en',
        'retirado_por',
      ]]
    );

    if (verification.rowCount !== 6) {
      throw new Error(
        `La migración quedó incompleta: ${verification.rowCount}/6 columnas.`
      );
    }

    console.log('Migración 8J.3 aplicada y verificada correctamente.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('No se pudo aplicar la migración 8J.3:', error);
  process.exitCode = 1;
});
