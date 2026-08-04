require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();
  const sqlPath = path.join(
    __dirname,
    '..',
    'migrations',
    'step8c-mobile-attendance.sql'
  );

  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);

    const result = await client.query(`
      SELECT
        to_regclass('public.desafios_marcacion_movil') AS desafios,
        to_regclass('public.firmas_marcacion_movil') AS firmas,
        to_regclass('public.v_marcaciones_moviles_recientes') AS vista,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'dispositivos_moviles'
            AND column_name = 'clave_publica_asistencia'
        ) AS columna_clave
    `);

    const row = result.rows[0] ?? {};
    if (
      !row.desafios ||
      !row.firmas ||
      !row.vista ||
      !row.columna_clave
    ) {
      throw new Error(
        'No se creó toda la estructura del Paso 8C.'
      );
    }

    await client.query('COMMIT');
    console.log('Migración del Paso 8C completada.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(
      'No se pudo completar la migración del Paso 8C:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate();
