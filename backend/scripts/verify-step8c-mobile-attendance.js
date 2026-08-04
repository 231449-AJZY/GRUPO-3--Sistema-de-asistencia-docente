require('dotenv').config();
const pool = require('../src/db/pool');

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        to_regclass('public.desafios_marcacion_movil') AS desafios,
        to_regclass('public.firmas_marcacion_movil') AS firmas,
        to_regclass('public.v_marcaciones_moviles_recientes') AS vista,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'dispositivos_moviles'
            AND column_name = 'clave_publica_asistencia'
        ) AS columna_clave,
        EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND indexname = 'uq_dispositivo_huella_clave_asistencia'
        ) AS indice_clave
    `);

    const row = result.rows[0] ?? {};

    if (
      !row.desafios ||
      !row.firmas ||
      !row.vista ||
      !row.columna_clave ||
      !row.indice_clave
    ) {
      throw new Error(
        'La estructura de asistencia móvil del Paso 8C está incompleta.'
      );
    }

    console.log('Verificación Paso 8C correcta:', row);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
