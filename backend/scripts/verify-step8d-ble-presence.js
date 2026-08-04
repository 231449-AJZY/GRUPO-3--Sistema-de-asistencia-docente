require('dotenv').config();
const pool = require('../src/db/pool');

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        to_regclass('public.configuracion_ble') AS configuracion,
        to_regclass('public.estaciones_ble') AS estaciones,
        to_regclass('public.codigos_provisionamiento_ble') AS provisionamientos,
        to_regclass('public.detecciones_ble_movil') AS detecciones,
        to_regclass('public.eventos_seguridad_ble') AS eventos,
        to_regclass('public.v_estaciones_ble_resumen') AS vista_estaciones,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'desafios_marcacion_movil'
            AND column_name = 'estacion_ble_id'
        ) AS columna_estacion,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'desafios_marcacion_movil'
            AND column_name = 'presencia_ble_validada'
        ) AS columna_presencia,
        EXISTS (
          SELECT 1
          FROM configuracion_ble
          WHERE id = 1
        ) AS configuracion_inicial
    `);

    const row = result.rows[0] ?? {};
    if (
      !row.configuracion ||
      !row.estaciones ||
      !row.provisionamientos ||
      !row.detecciones ||
      !row.eventos ||
      !row.vista_estaciones ||
      !row.columna_estacion ||
      !row.columna_presencia ||
      !row.configuracion_inicial
    ) {
      throw new Error(
        'La estructura BLE del Paso 8D está incompleta.'
      );
    }

    console.log('Verificación Paso 8D correcta:', row);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
