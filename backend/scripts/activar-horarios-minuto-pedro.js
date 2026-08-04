"use strict";

const fs = require("fs");
const path = require("path");

const backendDir = path.resolve(__dirname, "..");
require(path.join(backendDir, "node_modules", "dotenv")).config({
  path: path.join(backendDir, ".env"),
});

const pool = require(path.join(backendDir, "src", "db", "pool.js"));

const EMAIL = "pedro@unsaac.edu.pe";
const TEST_SEMESTER_CODE = "TST-MIN-PEDRO";
const TEST_COURSE_CODE = "PRB-MIN-PEDRO";
const TEST_ROOM = "PRUEBA-MINUTO-QR-BLE";
const EXPECTED_SCHEDULES = 7 * 1440;

function safeFileName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function main() {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

    const teacherResult = await client.query(
      `SELECT
         d.id AS docente_id,
         d.departamento_id,
         u.id AS usuario_id,
         u.codigo,
         u.nombres,
         u.apellidos,
         u.email,
         u.activo
       FROM usuarios u
       JOIN docentes d ON d.usuario_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
       FOR UPDATE OF u, d`,
      [EMAIL]
    );

    if (teacherResult.rows.length !== 1) {
      throw new Error(
        `Se esperaba exactamente un docente con correo ${EMAIL}; encontrados: ${teacherResult.rows.length}.`
      );
    }

    const teacher = teacherResult.rows[0];

    if (!teacher.activo) {
      throw new Error("La cuenta de Pedro está inactiva.");
    }

    const clockResult = await client.query(
      `SELECT
         COALESCE(
           (SELECT zona_horaria
            FROM configuracion_institucional
            WHERE id = 1),
           'America/Lima'
         ) AS zona_horaria,
         (
           CURRENT_TIMESTAMP AT TIME ZONE COALESCE(
             (SELECT zona_horaria
              FROM configuracion_institucional
              WHERE id = 1),
             'America/Lima'
           )
         )::date AS fecha_local`
    );

    const clock = clockResult.rows[0];

    const previousSchedules = await client.query(
      `SELECT
         hc.*,
         c.codigo AS curso_codigo,
         c.nombre AS curso,
         s.codigo AS semestre
       FROM horarios_curso hc
       JOIN cursos c ON c.id = hc.curso_id
       JOIN semestres s ON s.id = hc.semestre_id
       WHERE hc.docente_id = $1
       ORDER BY hc.dia_semana, hc.hora_inicio, hc.id`,
      [teacher.docente_id]
    );

    const constraints = await client.query(
      `SELECT
         conname,
         pg_get_constraintdef(oid, true) AS definicion
       FROM pg_constraint
       WHERE conrelid = 'horarios_curso'::regclass
       ORDER BY conname`
    );

    const semestersBefore = await client.query(
      `SELECT *
       FROM semestres
       WHERE activo = TRUE
          OR codigo = $1
       ORDER BY id`,
      [TEST_SEMESTER_CODE]
    );

    const testCourseBefore = await client.query(
      `SELECT *
       FROM cursos
       WHERE codigo = $1`,
      [TEST_COURSE_CODE]
    );

    const backup = {
      generatedAt: new Date().toISOString(),
      operation: "ACTIVAR_HORARIOS_MINUTO_PEDRO",
      teacher,
      institutionClock: clock,
      previousSchedules: previousSchedules.rows,
      semestersBefore: semestersBefore.rows,
      testCourseBefore: testCourseBefore.rows,
      constraintsBefore: constraints.rows,
      requestedTest: {
        days: [1, 2, 3, 4, 5, 6, 7],
        schedulesPerDay: 1440,
        durationSeconds: 60,
        expectedSchedules: EXPECTED_SCHEDULES,
        courseCode: TEST_COURSE_CODE,
        semesterCode: TEST_SEMESTER_CODE,
        room: TEST_ROOM,
      },
    };

    const backupDir =
      process.env.GABO_BACKUP_DIR ||
      path.join(backendDir, "backups", "pedro-horarios-minuto");

    fs.mkdirSync(backupDir, { recursive: true });

    const backupPath = path.join(
      backupDir,
      `respaldo-${safeFileName(new Date().toISOString())}.json`
    );

    fs.writeFileSync(
      backupPath,
      JSON.stringify(backup, null, 2),
      "utf8"
    );

    // La tabla original solo admite 1=Lunes ... 5=Viernes.
    // Para el modo de prueba se amplía a ISO 1...7.
    const dayConstraint = await client.query(
      `SELECT pg_get_constraintdef(oid, true) AS definicion
       FROM pg_constraint
       WHERE conrelid = 'horarios_curso'::regclass
         AND conname = 'chk_dia_semana'`
    );

    const currentDayDefinition =
      dayConstraint.rows[0]?.definicion || "";

    if (!/between\s+1\s+and\s+7/i.test(currentDayDefinition)) {
      await client.query(
        `ALTER TABLE horarios_curso
         DROP CONSTRAINT IF EXISTS chk_dia_semana`
      );

      await client.query(
        `ALTER TABLE horarios_curso
         ADD CONSTRAINT chk_dia_semana
         CHECK (dia_semana BETWEEN 1 AND 7)`
      );
    }

    const semesterResult = await client.query(
      `INSERT INTO semestres (
         codigo,
         fecha_inicio,
         fecha_fin,
         activo
       )
       VALUES (
         $1,
         $2::date - INTERVAL '1 day',
         $2::date + INTERVAL '365 days',
         TRUE
       )
       ON CONFLICT (codigo)
       DO UPDATE SET
         fecha_inicio = LEAST(semestres.fecha_inicio, EXCLUDED.fecha_inicio),
         fecha_fin = GREATEST(semestres.fecha_fin, EXCLUDED.fecha_fin),
         activo = TRUE
       RETURNING *`,
      [TEST_SEMESTER_CODE, clock.fecha_local]
    );

    const semester = semesterResult.rows[0];

    const courseResult = await client.query(
      `INSERT INTO cursos (
         codigo,
         nombre,
         departamento_id,
         creditos,
         activo
       )
       VALUES (
         $1,
         'Prueba continua QR y BLE - Pedro',
         $2,
         1,
         TRUE
       )
       ON CONFLICT (codigo)
       DO UPDATE SET
         nombre = EXCLUDED.nombre,
         departamento_id = EXCLUDED.departamento_id,
         activo = TRUE
       RETURNING *`,
      [TEST_COURSE_CODE, teacher.departamento_id]
    );

    const course = courseResult.rows[0];

    const existingTest = await client.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT dia_semana)::int AS dias,
         COUNT(*) FILTER (WHERE activo = TRUE)::int AS activos,
         MIN(hora_inicio) AS primera_hora,
         MAX(hora_inicio) AS ultima_hora
       FROM horarios_curso
       WHERE docente_id = $1
         AND curso_id = $2
         AND semestre_id = $3`,
      [teacher.docente_id, course.id, semester.id]
    );

    const existing = existingTest.rows[0];
    let created = 0;
    let reused = false;

    if (
      Number(existing.total) === EXPECTED_SCHEDULES &&
      Number(existing.dias) === 7
    ) {
      const reactivated = await client.query(
        `UPDATE horarios_curso
         SET activo = TRUE
         WHERE docente_id = $1
           AND curso_id = $2
           AND semestre_id = $3`,
        [teacher.docente_id, course.id, semester.id]
      );

      reused = true;
      created = 0;

      console.log(
        `Se reutilizaron ${reactivated.rowCount} horarios de prueba existentes.`
      );
    } else {
      if (Number(existing.total) > 0) {
        // Solo permite regenerar una instalación incompleta cuando no
        // existe historial de asistencia vinculado.
        const linked = await client.query(
          `SELECT COUNT(*)::int AS total
           FROM registros_asistencia_curso rac
           JOIN horarios_curso hc
             ON hc.id = rac.horario_curso_id
           WHERE hc.docente_id = $1
             AND hc.curso_id = $2
             AND hc.semestre_id = $3`,
          [teacher.docente_id, course.id, semester.id]
        );

        if (Number(linked.rows[0]?.total || 0) > 0) {
          throw new Error(
            "Ya existen horarios de prueba incompletos con asistencias vinculadas. No se eliminaron para proteger el historial."
          );
        }

        await client.query(
          `DELETE FROM horarios_curso
           WHERE docente_id = $1
             AND curso_id = $2
             AND semestre_id = $3`,
          [teacher.docente_id, course.id, semester.id]
        );
      }

      // El trigger académico limita a cinco filas por semestre.
      // Se desactiva únicamente durante esta carga masiva y se reactiva
      // antes de confirmar la transacción.
      await client.query(
        `ALTER TABLE horarios_curso
         DISABLE TRIGGER trg_max_cursos`
      );

      try {
        const inserted = await client.query(
          `INSERT INTO horarios_curso (
             docente_id,
             curso_id,
             semestre_id,
             aula,
             dia_semana,
             hora_inicio,
             hora_fin,
             activo
           )
           SELECT
             $1,
             $2,
             $3,
             $4,
             dia.numero,
             (
               TIME '00:00:00'
               + minuto.numero * INTERVAL '1 minute'
             )::time,
             CASE
               WHEN minuto.numero = 1439
                 THEN TIME '24:00:00'
               ELSE (
                 TIME '00:00:00'
                 + (minuto.numero + 1) * INTERVAL '1 minute'
               )::time
             END,
             TRUE
           FROM generate_series(1, 7) AS dia(numero)
           CROSS JOIN generate_series(0, 1439) AS minuto(numero)
           RETURNING id`,
          [
            teacher.docente_id,
            course.id,
            semester.id,
            TEST_ROOM,
          ]
        );

        created = inserted.rowCount;
      } finally {
        await client.query(
          `ALTER TABLE horarios_curso
           ENABLE TRIGGER trg_max_cursos`
        );
      }
    }

    const verification = await client.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(DISTINCT dia_semana)::int AS dias,
         COUNT(*) FILTER (WHERE activo = TRUE)::int AS activos,
         MIN(hora_inicio) AS primera_hora,
         MAX(hora_inicio) AS ultima_hora,
         MIN(
           EXTRACT(EPOCH FROM (hora_fin - hora_inicio))
         ) AS duracion_minima_segundos,
         MAX(
           EXTRACT(EPOCH FROM (hora_fin - hora_inicio))
         ) AS duracion_maxima_segundos
       FROM horarios_curso
       WHERE docente_id = $1
         AND curso_id = $2
         AND semestre_id = $3`,
      [teacher.docente_id, course.id, semester.id]
    );

    const verified = verification.rows[0];

    if (
      Number(verified.total) !== EXPECTED_SCHEDULES ||
      Number(verified.dias) !== 7 ||
      Number(verified.activos) !== EXPECTED_SCHEDULES
    ) {
      throw new Error(
        `Verificación inválida: ${JSON.stringify(verified)}`
      );
    }

    await client.query(
      `INSERT INTO audit_log (
         usuario_id,
         accion,
         tabla,
         registro_id,
         detalle
       )
       VALUES (
         $1,
         'ACTIVAR_HORARIOS_MINUTO_PEDRO',
         'horarios_curso',
         $2,
         $3::jsonb
       )`,
      [
        teacher.usuario_id,
        teacher.docente_id,
        JSON.stringify({
          semestre: semester.codigo,
          curso: course.codigo,
          total_horarios: Number(verified.total),
          dias: Number(verified.dias),
          creados_ahora: created,
          reutilizados: reused,
          respaldo: backupPath,
          finalidad: "Pruebas QR dinámico y BLE cada minuto",
        }),
      ]
    ).catch(() => undefined);

    await client.query("COMMIT");
    transactionOpen = false;

    console.log("");
    console.log("HORARIOS DE PRUEBA ACTIVADOS");
    console.log("============================");
    console.log(
      `Docente: ${teacher.codigo} - ${teacher.nombres} ${teacher.apellidos}`
    );
    console.log(`Correo: ${teacher.email}`);
    console.log(`Semestre de prueba: ${semester.codigo}`);
    console.log(`Curso: ${course.codigo} - ${course.nombre}`);
    console.log(`Aula: ${TEST_ROOM}`);
    console.log(`Total de horarios: ${verified.total}`);
    console.log(`Días cubiertos: ${verified.dias}`);
    console.log(`Primera hora: ${verified.primera_hora}`);
    console.log(`Última hora: ${verified.ultima_hora}`);
    console.log(`Creados en esta ejecución: ${created}`);
    console.log(`Respaldo: ${backupPath}`);
    console.log("");
    console.log(
      "Puede marcar una asistencia y repetir la prueba cuando cambie el minuto."
    );
    console.log(
      "Para BLE, la estación emisora debe permanecer activa y cercana."
    );
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => undefined);
    }

    console.error("");
    console.error("NO SE ACTIVARON LOS HORARIOS");
    console.error("============================");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();