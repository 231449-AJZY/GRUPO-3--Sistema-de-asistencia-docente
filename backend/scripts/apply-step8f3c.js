'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const pool = require('../src/db/pool');

async function apply() {
  const client = await pool.connect();
  try {
    const sqlPath = path.join(
      __dirname,
      '..',
      'migrations',
      'step8f3c-unified-mobile-history.sql'
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);

    const verification = await client.query(`
      SELECT
        to_regclass('public.v_marcaciones_moviles_unificadas') AS vista,
        (SELECT COUNT(*)::int FROM usos_qr_asistencia) AS usos_qr,
        (
          SELECT COUNT(*)::int
          FROM v_marcaciones_moviles_unificadas
          WHERE metodo_verificacion = 'QR_DINAMICO'
        ) AS registros_qr_visibles
    `);

    const row = verification.rows[0] ?? {};
    if (!row.vista) {
      throw new Error('No se creó la vista de historial móvil unificado.');
    }
    if (Number(row.usos_qr) !== Number(row.registros_qr_visibles)) {
      throw new Error(
        'La vista unificada no refleja todos los usos QR existentes.'
      );
    }

    console.log(
      `Historial unificado verificado: ${row.registros_qr_visibles} uso(s) QR visible(s).`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

apply().catch((error) => {
  console.error('No se pudo aplicar Step 8F.3C:', error.message);
  process.exitCode = 1;
});
