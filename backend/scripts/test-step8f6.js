'use strict';


const fs = require('fs');
const path = require('path');


const backendDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendDir, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });
const pool = require(path.join(backendDir, 'src', 'db', 'pool'));


async function main() {
  const columns = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'alertas'
  `);


  const names = new Set(columns.rows.map((row) => row.column_name));
  for (const required of [
    'prioridad',
    'estado',
    'origen',
    'clave_evento',
    'detalle',
    'atendida_por',
    'atendida_en',
    'comentario',
  ]) {
    if (!names.has(required)) {
      throw new Error(`Falta la columna alertas.${required}.`);
    }
  }


  const routePath = path.join(backendDir, 'src', 'routes', 'alertas.routes.js');
  const indexPath = path.join(backendDir, 'src', 'routes', 'index.js');
  const pagePath = path.join(projectRoot, 'frontend', 'app', 'admin', 'alertas', 'page.tsx');
  const bellPath = path.join(projectRoot, 'frontend', 'components', 'layout', 'AlertNotificationBell.tsx');
  const headerPath = path.join(projectRoot, 'frontend', 'components', 'layout', 'Header.tsx');
  const navigationPath = path.join(projectRoot, 'frontend', 'config', 'navigation.ts');


  for (const filePath of [routePath, indexPath, pagePath, bellPath, headerPath, navigationPath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Falta ${filePath}.`);
  }


  const route = fs.readFileSync(routePath, 'utf8');
  const index = fs.readFileSync(indexPath, 'utf8');
  const page = fs.readFileSync(pagePath, 'utf8');
  const bell = fs.readFileSync(bellPath, 'utf8');
  const header = fs.readFileSync(headerPath, 'utf8');
  const navigation = fs.readFileSync(navigationPath, 'utf8');


  for (const expected of ["'/contador'", "'/resumen'", "'/generar'", "'/:id/estado'", 'generateOperationalAlerts']) {
    if (!route.includes(expected)) throw new Error(`La API no contiene ${expected}.`);
  }


  if (!index.includes("router.use('/alertas', alertasRoutes)")) {
    throw new Error('La ruta /api/alertas no quedó montada.');
  }


  for (const expected of ['Centro de alertas operativas', 'Actualizar alertas', '/api/alertas/resumen']) {
    if (!page.includes(expected)) throw new Error(`La página no contiene ${expected}.`);
  }


  if (!bell.includes('/api/alertas/contador')) throw new Error('El contador no consulta la API.');
  if (!header.includes('AlertNotificationBell')) throw new Error('El encabezado no muestra la campana.');
  if (!navigation.includes('/admin/alertas')) throw new Error('Alertas no está en la navegación.');


  const summary = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE estado = 'NUEVA')::int AS nuevas
    FROM alertas
  `);


  console.log('PASO 8F.6: pruebas estructurales superadas.', summary.rows[0]);
}


main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });