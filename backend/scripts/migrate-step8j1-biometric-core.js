'use strict';

const fs = require('fs');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const pool = require('../src/db/pool');

async function main() {
  const sqlPath = path.join(
    __dirname,
    '..',
    'migrations',
    'step8j1-biometric-core.sql'
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  await pool.query(sql);
  console.log('Migración biométrica 8J.1 aplicada correctamente.');
}

main()
  .catch((error) => {
    console.error('No se pudo aplicar la migración 8J.1.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
