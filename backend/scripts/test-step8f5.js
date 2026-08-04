'use strict';


const fs = require('fs');
const path = require('path');


const backendDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendDir, '..');


require('dotenv').config({
  path: path.join(backendDir, '.env'),
});


const pool = require(path.join(backendDir, 'src', 'db', 'pool'));


async function main() {
  const view = await pool.query(
    `SELECT
       to_regclass('public.v_historial_asistencia_unificado') AS vista,
       (SELECT COUNT(*)::int FROM v_historial_asistencia_unificado) AS total`
  );


  if (!view.rows[0]?.vista) {
    throw new Error('Falta v_historial_asistencia_unificado del Paso 8F.4.');
  }


  const routePath = path.join(
    backendDir,
    'src',
    'routes',
    'reportes.routes.js'
  );
  const indexPath = path.join(backendDir, 'src', 'routes', 'index.js');
  const pagePath = path.join(
    projectRoot,
    'frontend',
    'app',
    'admin',
    'biometria',
    'reportes',
    'page.tsx'
  );
  const navigationPath = path.join(
    projectRoot,
    'frontend',
    'components',
    'admin',
    'biometria',
    'BiometriaSubNavigation.tsx'
  );


  for (const filePath of [routePath, indexPath, pagePath, navigationPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Falta el archivo ${filePath}.`);
    }
  }


  const route = fs.readFileSync(routePath, 'utf8');
  const index = fs.readFileSync(indexPath, 'utf8');
  const page = fs.readFileSync(pagePath, 'utf8');
  const navigation = fs.readFileSync(navigationPath, 'utf8');


  for (const expected of ["'/catalogos'", "'/asistencia'", 'MAX_ROWS']) {
    if (!route.includes(expected)) {
      throw new Error(`La API de reportes no contiene ${expected}.`);
    }
  }


  if (!index.includes("router.use('/reportes', reportesRoutes)")) {
    throw new Error('La API /api/reportes no quedó montada.');
  }


  for (const expected of [
    'Exportar CSV',
    'Exportar Excel',
    'Exportar PDF',
    '/api/reportes/asistencia',
  ]) {
    if (!page.includes(expected)) {
      throw new Error(`La página de reportes no contiene ${expected}.`);
    }
  }


  if (!navigation.includes('/admin/biometria/reportes')) {
    throw new Error('Reportes no quedó visible en la navegación biométrica.');
  }


  console.log('PASO 8F.5: pruebas estructurales superadas.', {
    vista: view.rows[0].vista,
    registros_disponibles: view.rows[0].total,
  });
}


main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });