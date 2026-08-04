"use strict";

const path = require("path");

const backendDir = path.resolve(__dirname, "..");
require(path.join(backendDir, "node_modules", "dotenv")).config({
  path: path.join(backendDir, ".env"),
});

const pool = require(path.join(backendDir, "src", "db", "pool.js"));

const EMAIL = "pedro@unsaac.edu.pe";
const TEST_SEMESTER_CODE = "TST-MIN-PEDRO";
const TEST_COURSE_CODE = "PRB-MIN-PEDRO";

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const teacherResult = await client.query(
      `SELECT d.id AS docente_id, u.id AS usuario_id,
              u.codigo, u.nombres, u.apellidos, u.email
       FROM usuarios u
       JOIN docentes d ON d.usuario_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
       FOR UPDATE OF u, d`,
      [EMAIL]
    );

    if (teacherResult.rows.length !== 1) {
      throw new Error("No se encontró exactamente a Pedro.");
    }

    const teacher = teacherResult.rows[0];

    const disabled = await client.query(
      `UPDATE horarios_curso hc
       SET activo = FALSE
       FROM cursos c, semestres s
       WHERE hc.curso_id = c.id
         AND hc.semestre_id = s.id
         AND hc.docente_id = $1
         AND c.codigo = $2
         AND s.codigo = $3
         AND hc.activo = TRUE
       RETURNING hc.id`,
      [teacher.docente_id, TEST_COURSE_CODE, TEST_SEMESTER_CODE]
    );

    const semester = await client.query(
      `UPDATE semestres
       SET activo = FALSE
       WHERE codigo = $1
       RETURNING id, codigo`,
      [TEST_SEMESTER_CODE]
    );

    await client.query(
      `INSERT INTO audit_log (
         usuario_id, accion, tabla, registro_id, detalle
       )
       VALUES (
         $1,
         'DESACTIVAR_HORARIOS_MINUTO_PEDRO',
         'horarios_curso',
         $2,
         $3::jsonb
       )`,
      [
        teacher.usuario_id,
        teacher.docente_id,
        JSON.stringify({
          horarios_desactivados: disabled.rowCount,
          semestre_desactivado: semester.rowCount === 1,
          historial_eliminado: false,
        }),
      ]
    ).catch(() => undefined);

    await client.query("COMMIT");

    console.log("");
    console.log("MODO DE PRUEBA DESACTIVADO");
    console.log("==========================");
    console.log(`Docente: ${teacher.codigo} - ${teacher.nombres} ${teacher.apellidos}`);
    console.log(`Horarios desactivados: ${disabled.rowCount}`);
    console.log("No se eliminó el historial de asistencias, QR ni BLE.");
    console.log("Los horarios académicos reales no fueron modificados.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();