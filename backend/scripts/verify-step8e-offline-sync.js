require('dotenv').config();
const pool = require('../src/db/pool');

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        to_regclass('public.configuracion_asistencia_offline') AS configuracion,
        to_regclass('public.credenciales_offline_dispositivo') AS credenciales,
        to_regclass('public.lotes_sincronizacion_movil') AS lotes,
        to_regclass('public.marcaciones_offline') AS marcaciones,
        to_regclass('public.intentos_sincronizacion_movil') AS intentos,
        to_regclass('public.conflictos_sincronizacion') AS conflictos,
        to_regclass('public.v_sincronizacion_movil_reciente') AS vista,
        EXISTS (
          SELECT 1
          FROM configuracion_asistencia_offline
          WHERE id = 1
        ) AS configuracion_inicial
    `);

    const row = result.rows[0] ?? {};
    if (
      !row.configuracion ||
      !row.credenciales ||
      !row.lotes ||
      !row.marcaciones ||
      !row.intentos ||
      !row.conflictos ||
      !row.vista ||
      !row.configuracion_inicial
    ) {
      throw new Error(
        'La estructura offline del Paso 8E está incompleta.'
      );
    }

    console.log('Verificación Paso 8E correcta:', row);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
