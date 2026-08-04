require('dotenv').config();
const pool = require('../src/db/pool');
(async () => {
  try {
    const result = await pool.query(`SELECT to_regclass('public.configuracion_institucional') AS tabla, (SELECT COUNT(*)::int FROM configuracion_institucional) AS configuraciones, (SELECT COUNT(*)::int FROM departamentos_academicos) AS departamentos, (SELECT COUNT(*)::int FROM cursos) AS cursos, (SELECT COUNT(*)::int FROM semestres) AS semestres`);
    if (!result.rows[0]?.tabla || Number(result.rows[0].configuraciones) < 1) throw new Error('La configuración institucional no quedó disponible.');
    console.log('Verificación Paso 7 correcta:', result.rows[0]);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await pool.end(); }
})();
