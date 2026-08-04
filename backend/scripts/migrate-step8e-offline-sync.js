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
    'step8e-offline-sync.sql'
  );

  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);

    const result = await client.query(`
      SELECT
        to_regclass('public.configuracion_asistencia_offline') AS configuracion,
        to_regclass('public.credenciales_offline_dispositivo') AS credenciales,
        to_regclass('public.lotes_sincronizacion_movil') AS lotes,
        to_regclass('public.marcaciones_offline') AS marcaciones,
        to_regclass('public.intentos_sincronizacion_movil') AS intentos,
        to_regclass('public.conflictos_sincronizacion') AS conflictos,
        to_regclass('public.v_sincronizacion_movil_reciente') AS vista
    `);

    const row = result.rows[0] ?? {};
    if (
      !row.configuracion ||
      !row.credenciales ||
      !row.lotes ||
      !row.marcaciones ||
      !row.intentos ||
      !row.conflictos ||
      !row.vista
    ) {
      throw new Error('No se creó toda la estructura del Paso 8E.');
    }

    await client.query('COMMIT');
    console.log('Migración del Paso 8E completada.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(
      'No se pudo completar la migración del Paso 8E:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate();
