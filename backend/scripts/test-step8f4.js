'use strict';

const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });
const pool = require(path.join(backendDir, 'src', 'db', 'pool'));

async function main() {
  const relation = await pool.query(
    `SELECT to_regclass('public.v_historial_asistencia_unificado') AS vista`
  );

  if (!relation.rows[0]?.vista) {
    throw new Error('Falta v_historial_asistencia_unificado.');
  }

  const columns = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'v_historial_asistencia_unificado'
  `);

  const names = new Set(columns.rows.map((row) => row.column_name));
  for (const required of [
    'registro_uid',
    'docente_id',
    'fecha',
    'hora',
    'resultado',
    'metodo_verificacion',
  ]) {
    if (!names.has(required)) {
      throw new Error(`La vista no contiene la columna ${required}.`);
    }
  }

  const historyPage = fs.readFileSync(
    path.join(
      backendDir,
      '..',
      'frontend',
      'app',
      'admin',
      'biometria',
      'historial',
      'page.tsx'
    ),
    'utf8'
  );

  if (historyPage.includes('mockBiometricHistory')) {
    throw new Error('El Historial todavía depende de datos simulados.');
  }

  const dashboardRoute = fs.readFileSync(
    path.join(backendDir, 'src', 'routes', 'dashboard.routes.js'),
    'utf8'
  );

  if (!dashboardRoute.includes('v_historial_asistencia_unificado')) {
    throw new Error('El Dashboard no consulta el historial unificado.');
  }

  console.log('PASO 8F.4: pruebas estructurales superadas.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
