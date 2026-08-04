require('dotenv').config();
const pool = require('../src/db/pool');

(async () => {
  try {
    const result = await pool.query(`
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
        'La estructura móvil del Paso 8B está incompleta.'
      );
    }

    console.log('Verificación Paso 8B correcta:', row);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
