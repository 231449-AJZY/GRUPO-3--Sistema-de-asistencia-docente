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
    'step8d-ble-presence.sql'
  );

  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);

    const result = await client.query(`
      SELECT
        to_regclass('public.configuracion_ble') AS configuracion,
        to_regclass('public.estaciones_ble') AS estaciones,
        to_regclass('public.codigos_provisionamiento_ble') AS provisionamientos,
        to_regclass('public.detecciones_ble_movil') AS detecciones,
        to_regclass('public.eventos_seguridad_ble') AS eventos,
        to_regclass('public.v_estaciones_ble_resumen') AS vista_estaciones,
        to_regclass('public.v_marcaciones_moviles_recientes') AS vista_marcaciones,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'desafios_marcacion_movil'
            AND column_name = 'presencia_ble_validada'
        ) AS columna_presencia
    `);

    const row = result.rows[0] ?? {};
    if (
      !row.configuracion ||
      !row.estaciones ||
      !row.provisionamientos ||
      !row.detecciones ||
      !row.eventos ||
      !row.vista_estaciones ||
      !row.vista_marcaciones ||
      !row.columna_presencia
    ) {
      throw new Error('No se creó toda la estructura del Paso 8D.');
    }

    await client.query('COMMIT');
    console.log('Migración del Paso 8D completada.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(
      'No se pudo completar la migración del Paso 8D:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate();
