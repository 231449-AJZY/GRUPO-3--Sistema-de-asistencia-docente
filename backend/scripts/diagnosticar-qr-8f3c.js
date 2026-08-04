require("dotenv").config();
const pool = require("../src/db/pool");

async function main() {
  const horarios = await pool.query(`
    SELECT
      hc.id,
      u.codigo AS docente,
      c.nombre AS curso,
      hc.dia_semana,
      hc.hora_inicio,
      hc.hora_fin,
      hc.aula,
      hc.activo,
      s.codigo AS semestre,
      s.activo AS semestre_activo
    FROM horarios_curso hc
    JOIN docentes d ON d.id = hc.docente_id
    JOIN usuarios u ON u.id = d.usuario_id
    JOIN cursos c ON c.id = hc.curso_id
    JOIN semestres s ON s.id = hc.semestre_id
    ORDER BY hc.id DESC
    LIMIT 10
  `);

  const usosQr = await pool.query(`
    SELECT
      uqa.id,
      u.codigo AS docente,
      uqa.tipo_objetivo,
      uqa.resultado,
      uqa.registro_ingreso_id,
      uqa.registro_asistencia_id,
      uqa.utilizado_en
    FROM usos_qr_asistencia uqa
    JOIN docentes d ON d.id = uqa.docente_id
    JOIN usuarios u ON u.id = d.usuario_id
    ORDER BY uqa.utilizado_en DESC
    LIMIT 10
  `);

  const ingresos = await pool.query(`
    SELECT
      rii.id,
      u.codigo AS docente,
      rii.fecha,
      rii.hora_registro,
      rii.estado,
      rii.dispositivo_id,
      rii.metodo_verificacion
    FROM registros_ingreso_institucional rii
    JOIN docentes d ON d.id = rii.docente_id
    JOIN usuarios u ON u.id = d.usuario_id
    ORDER BY rii.creado_en DESC
    LIMIT 10
  `);

  const cursos = await pool.query(`
    SELECT
      rac.id,
      u.codigo AS docente,
      c.nombre AS curso,
      rac.fecha,
      rac.hora_registro,
      rac.estado,
      rac.dispositivo_id,
      rac.metodo_verificacion
    FROM registros_asistencia_curso rac
    JOIN docentes d ON d.id = rac.docente_id
    JOIN usuarios u ON u.id = d.usuario_id
    JOIN horarios_curso hc ON hc.id = rac.horario_curso_id
    JOIN cursos c ON c.id = hc.curso_id
    ORDER BY rac.creado_en DESC
    LIMIT 10
  `);

  const vista = await pool.query(`
    SELECT
      id,
      codigo_docente,
      tipo_objetivo,
      resultado,
      metodo_verificacion,
      creado_en
    FROM v_marcaciones_moviles_unificadas
    ORDER BY creado_en DESC
    LIMIT 10
  `);

  console.log("\n===== HORARIOS =====");
  console.table(horarios.rows);

  console.log("\n===== USOS DEL QR =====");
  console.table(usosQr.rows);

  console.log("\n===== INGRESOS =====");
  console.table(ingresos.rows);

  console.log("\n===== ASISTENCIAS DE CURSO =====");
  console.table(cursos.rows);

  console.log("\n===== HISTORIAL UNIFICADO =====");
  console.table(vista.rows);
}

main()
  .catch((error) => {
    console.error("\nERROR DEL DIAGNÓSTICO:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

