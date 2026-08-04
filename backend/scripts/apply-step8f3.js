'use strict';

const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const pool = require('../src/db/pool');

async function main() {
  const migrationPath = path.join(
    __dirname,
    '..',
    'migrations',
    'step8f3-qr-attendance.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  await pool.query(sql);

  const verification = await pool.query(
    `SELECT
       to_regclass('public.sesiones_qr_asistencia') AS sesiones,
       to_regclass('public.usos_qr_asistencia') AS usos,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'registros_asistencia_curso'
           AND column_name = 'metodo_verificacion'
       ) AS metodo_curso,
       EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'registros_ingreso_institucional'
           AND column_name = 'metodo_verificacion'
       ) AS metodo_ingreso`
  );

  const row = verification.rows[0];
  if (!row.sesiones || !row.usos || !row.metodo_curso || !row.metodo_ingreso) {
    throw new Error('La migración QR no quedó verificada completamente.');
  }

  console.log('Migración Step 8F.3 aplicada y verificada.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
