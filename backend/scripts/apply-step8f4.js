'use strict';

const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });
const pool = require(path.join(backendDir, 'src', 'db', 'pool'));

async function main() {
  const migrationPath = path.join(
    backendDir,
    'migrations',
    'step8f4-real-admin-history.sql'
  );

  const migration = fs.readFileSync(migrationPath, 'utf8');
  await pool.query(migration);

  const verification = await pool.query(`
    SELECT
      to_regclass('public.v_historial_asistencia_unificado') AS vista,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (
        WHERE metodo_verificacion = 'QR_DINAMICO'
      )::int AS qr,
      COUNT(*) FILTER (
        WHERE metodo_verificacion = 'BIOMETRIA_MOVIL'
      )::int AS biometria
    FROM v_historial_asistencia_unificado
  `);

  if (!verification.rows[0]?.vista) {
    throw new Error('La vista unificada de historial no quedó disponible.');
  }

  console.log('Paso 8F.4 aplicado y verificado:', verification.rows[0]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
