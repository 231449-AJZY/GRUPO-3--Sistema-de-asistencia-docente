'use strict';


const fs = require('fs');
const path = require('path');


const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });
const pool = require(path.join(backendDir, 'src', 'db', 'pool'));


async function main() {
  const sql = fs.readFileSync(
    path.join(backendDir, 'migrations', 'step8f6-alert-center.sql'),
    'utf8'
  );


  await pool.query(sql);


  const result = await pool.query(`
    SELECT
      to_regclass('public.alertas') AS tabla,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado = 'NUEVA')::int AS nuevas
    FROM alertas
  `);


  console.log('Paso 8F.6 aplicado:', result.rows[0]);
}


main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });