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
    'step8b-mobile-devices.sql'
  );

  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);

    const result = await client.query(`
      SELECT
        to_regclass('public.solicitudes_vinculacion_dispositivo') AS solicitudes,
        to_regclass('public.dispositivos_moviles') AS dispositivos,
        to_regclass('public.eventos_seguridad_movil') AS eventos,
        (
          SELECT COUNT(*)::int
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'uq_dispositivo_activo_por_docente'
        ) AS indice_unico
    `);

    const row = result.rows[0] ?? {};
    if (
      !row.solicitudes ||
      !row.dispositivos ||
      !row.eventos ||
      Number(row.indice_unico) !== 1
    ) {
      throw new Error(
        'No se crearon todas las tablas del Paso 8B.'
      );
    }

    await client.query('COMMIT');
    console.log('Migración del Paso 8B completada.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(
      'No se pudo completar la migración del Paso 8B:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate();
