'use strict';


const fs = require('fs');
const path = require('path');


const backendDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendDir, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });
const pool = require(path.join(backendDir, 'src', 'db', 'pool'));


function requireText(filePath, values) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Falta el archivo ${filePath}.`);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  for (const value of values) {
    if (!content.includes(value)) {
      throw new Error(`${filePath} no contiene ${value}.`);
    }
  }
}


async function main() {
  const db = await pool.query(`
    SELECT
      to_regclass('public.notificaciones_docente') AS tabla,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notificaciones_docente'
          AND column_name = 'visible_desde'
      ) AS tiene_visible_desde
  `);


  if (!db.rows[0]?.tabla || !db.rows[0]?.tiene_visible_desde) {
    throw new Error('La estructura de notificaciones docentes está incompleta.');
  }


  const mobile = path.join(projectRoot, 'mobile', 'unsaac_asistencia_movil');


  requireText(
    path.join(backendDir, 'src', 'routes', 'notificaciones-movil.routes.js'),
    ['/sincronizar', '/leer-todas', 'CLASE_PROXIMA', 'REGISTRO_OFFLINE_PENDIENTE']
  );
  requireText(
    path.join(backendDir, 'src', 'routes', 'index.js'),
    ["router.use('/notificaciones-movil', notificacionesMovilRoutes)"]
  );
  requireText(
    path.join(mobile, 'pubspec.yaml'),
    ['version: 0.9.5+22']
  );
  requireText(
    path.join(mobile, 'lib', 'screens', 'dashboard_screen.dart'),
    ['TeacherNotificationButton']
  );
  requireText(
    path.join(mobile, 'lib', 'screens', 'notifications_screen.dart'),
    ['Notificaciones', 'Próximas clases', 'No leídas']
  );
  requireText(
    path.join(mobile, 'lib', 'controllers', 'teacher_notification_controller.dart'),
    ['synchronize', 'permissionGranted']
  );
  requireText(
    path.join(
      mobile,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml'
    ),
    ['POST_NOTIFICATIONS', 'NotificationPublisher']
  );
  requireText(
    path.join(
      mobile,
      'android',
      'app',
      'src',
      'main',
      'kotlin',
      'pe',
      'edu',
      'unsaac',
      'unsaac_asistencia_movil',
      'MainActivity.kt'
    ),
    ['notificationBridge.configure', 'notificationBridge.onRequestPermissionsResult']
  );


  console.log('PASO 8F.7: pruebas estructurales superadas.');
}


main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });