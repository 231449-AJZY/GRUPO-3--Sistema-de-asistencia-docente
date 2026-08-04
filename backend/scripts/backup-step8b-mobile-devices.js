require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

const destination = process.argv[2];

if (!destination) {
  console.error('Debe indicar la carpeta de respaldo.');
  process.exit(1);
}

async function tableExists(client, tableName) {
  const result = await client.query(
    'SELECT to_regclass($1) AS table_name',
    [`public.${tableName}`]
  );
  return Boolean(result.rows[0]?.table_name);
}

async function backup() {
  const client = await pool.connect();

  try {
    fs.mkdirSync(destination, { recursive: true });

    const tables = [
      'solicitudes_vinculacion_dispositivo',
      'dispositivos_moviles',
      'eventos_seguridad_movil',
    ];

    const data = {
      createdAt: new Date().toISOString(),
      database: process.env.DB_NAME ?? 'unsaac_asistencia',
      tables: {},
    };

    for (const table of tables) {
      if (await tableExists(client, table)) {
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
      'DATOS-MOVILES-ANTES-PASO-8B.json'
    );

    fs.writeFileSync(
      output,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    console.log(`Respaldo de datos creado: ${output}`);
  } catch (error) {
    console.error(
      'No se pudo crear el respaldo de datos:',
      error.message
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void backup();
