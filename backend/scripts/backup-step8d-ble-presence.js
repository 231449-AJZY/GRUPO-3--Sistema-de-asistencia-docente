require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

const destination = process.argv[2];

if (!destination) {
  console.error('Debe indicar la carpeta de respaldo.');
  process.exit(1);
}

async function relationExists(client, relationName) {
  const result = await client.query(
    'SELECT to_regclass($1) AS relation_name',
    [`public.${relationName}`]
  );
  return Boolean(result.rows[0]?.relation_name);
}

async function backup() {
  const client = await pool.connect();

  try {
    fs.mkdirSync(destination, { recursive: true });

    const tables = [
      'configuracion_ble',
      'estaciones_ble',
      'codigos_provisionamiento_ble',
      'detecciones_ble_movil',
      'eventos_seguridad_ble',
      'desafios_marcacion_movil',
      'firmas_marcacion_movil',
      'dispositivos_moviles',
      'registros_ingreso_institucional',
      'registros_asistencia_curso',
      'audit_log',
    ];

    const data = {
      createdAt: new Date().toISOString(),
      database: process.env.DB_NAME ?? 'unsaac_asistencia',
      tables: {},
    };

    for (const table of tables) {
      if (await relationExists(client, table)) {
        const result = await client.query(
          `SELECT * FROM ${table} ORDER BY id`
        );
        data.tables[table] = result.rows;
      } else {
        data.tables[table] = null;
      }
    }

    const output = path.join(
      destination,
      'DATOS-ANTES-PASO-8D.json'
    );

    fs.writeFileSync(
      output,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    console.log(`Respaldo de datos creado: ${output}`);
  } catch (error) {
    console.error(
      'No se pudo crear el respaldo BLE:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void backup();
