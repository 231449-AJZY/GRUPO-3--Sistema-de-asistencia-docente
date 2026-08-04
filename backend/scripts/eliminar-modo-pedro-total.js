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

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS existe`,
    [`public.${tableName}`]
  );

  return result.rows[0]?.existe === true;
}

async function queryRowsIfExists(client, tableName, sql, params = []) {
  if (!(await tableExists(client, tableName))) {
    return [];
  }

  const result = await client.query(sql, params);
  return result.rows;
}

async function deleteIfExists(client, tableName, sql, params = []) {
  if (!(await tableExists(client, tableName))) {
    return 0;
  }

  const result = await client.query(sql, params);
  return result.rowCount;
}

async function main() {
  const client = await pool.connect();
  let transactionOpen = false;

  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('eliminar-tst-min-pedro'))`
    );

    const teacherResult = await client.query(
      `SELECT
         d.id AS docente_id,
         u.id AS usuario_id,
         u.codigo,
         u.nombres,
         u.apellidos,
         u.email
       FROM usuarios u
       JOIN docentes d
         ON d.usuario_id = u.id
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

    const semesterResult = await client.query(
      `SELECT *
       FROM semestres
       WHERE codigo = $1
       FOR UPDATE`,
      [TEST_SEMESTER_CODE]
    );

    const courseResult = await client.query(
      `SELECT *
       FROM cursos
       WHERE codigo = $1
       FOR UPDATE`,
      [TEST_COURSE_CODE]
    );

    const semester = semesterResult.rows[0] || null;
    const course = courseResult.rows[0] || null;

    const scheduleRows =
      semester && course
        ? (
            await client.query(
              `SELECT hc.*
               FROM horarios_curso hc
               WHERE hc.docente_id = $1
                 AND hc.semestre_id = $2
                 AND hc.curso_id = $3
               ORDER BY hc.id`,
              [teacher.docente_id, semester.id, course.id]
            )
          ).rows
        : [];

    const scheduleIds = scheduleRows.map((row) => Number(row.id));

    const linkedAttendance =
      scheduleIds.length > 0
        ? await queryRowsIfExists(
            client,
            "registros_asistencia_curso",
            `SELECT *
             FROM registros_asistencia_curso
             WHERE horario_curso_id = ANY($1::int[])
             ORDER BY id`,
            [scheduleIds]
          )
        : [];

    const linkedChallenges =
      scheduleIds.length > 0
        ? await queryRowsIfExists(
            client,
            "desafios_marcacion_movil",
            `SELECT *
             FROM desafios_marcacion_movil
             WHERE horario_curso_id = ANY($1::int[])
             ORDER BY creado_en, id`,
            [scheduleIds]
          )
        : [];

    const challengeIds = linkedChallenges.map((row) => row.id);

    const linkedSignatures =
      challengeIds.length > 0 || linkedAttendance.length > 0
        ? await queryRowsIfExists(
            client,
            "firmas_marcacion_movil",
            `SELECT *
             FROM firmas_marcacion_movil
             WHERE desafio_id = ANY($1::uuid[])
                OR registro_asistencia_id = ANY($2::bigint[])
             ORDER BY id`,
            [
              challengeIds,
              linkedAttendance.map((row) => row.id),
            ]
          )
        : [];

    const linkedBleDetections =
      challengeIds.length > 0
        ? await queryRowsIfExists(
            client,
            "detecciones_ble_movil",
            `SELECT *
             FROM detecciones_ble_movil
             WHERE desafio_id = ANY($1::uuid[])
             ORDER BY id`,
            [challengeIds]
          )
        : [];

    const linkedQrUses =
      scheduleIds.length > 0 || linkedAttendance.length > 0
        ? await queryRowsIfExists(
            client,
            "usos_qr_asistencia",
            `SELECT *
             FROM usos_qr_asistencia
             WHERE horario_curso_id = ANY($1::int[])
                OR registro_asistencia_id = ANY($2::bigint[])
             ORDER BY id`,
            [
              scheduleIds,
              linkedAttendance.map((row) => row.id),
            ]
          )
        : [];

    const linkedOffline =
      scheduleIds.length > 0 || linkedAttendance.length > 0
        ? await queryRowsIfExists(
            client,
            "marcaciones_offline",
            `SELECT *
             FROM marcaciones_offline
             WHERE horario_curso_id = ANY($1::int[])
                OR registro_asistencia_id = ANY($2::bigint[])
             ORDER BY id`,
            [
              scheduleIds,
              linkedAttendance.map((row) => row.id),
            ]
          )
        : [];

    const offlineIds = linkedOffline.map((row) => row.id);

    const linkedConflicts =
      offlineIds.length > 0
        ? await queryRowsIfExists(
            client,
            "conflictos_sincronizacion",
            `SELECT *
             FROM conflictos_sincronizacion
             WHERE marcacion_offline_id = ANY($1::bigint[])
             ORDER BY id`,
            [offlineIds]
          )
        : [];

    const normalSchedulesBefore = (
      await client.query(
        `SELECT
           hc.id,
           hc.activo,
           hc.aula,
           hc.dia_semana,
           hc.hora_inicio,
           hc.hora_fin,
           c.codigo AS curso_codigo,
           c.nombre AS curso,
           s.codigo AS semestre,
           s.activo AS semestre_activo
         FROM horarios_curso hc
         JOIN cursos c
           ON c.id = hc.curso_id
         JOIN semestres s
           ON s.id = hc.semestre_id
         WHERE hc.docente_id = $1
           AND s.codigo <> $2
           AND c.codigo <> $3
         ORDER BY
           s.fecha_inicio DESC,
           hc.dia_semana,
           hc.hora_inicio,
           hc.id`,
        [teacher.docente_id, TEST_SEMESTER_CODE, TEST_COURSE_CODE]
      )
    ).rows;

    const backup = {
      generatedAt: new Date().toISOString(),
      operation: "ELIMINAR_MODO_PEDRO_TOTAL",
      teacher,
      testSemester: semester,
      testCourse: course,
      testSchedules: scheduleRows,
      linkedAttendance,
      linkedChallenges,
      linkedSignatures,
      linkedBleDetections,
      linkedQrUses,
      linkedOffline,
      linkedConflicts,
      normalSchedulesBefore,
    };

    const backupDir =
      process.env.GABO_BACKUP_DIR ||
      path.join(backendDir, "backups", "eliminar-tst-min-pedro");

    fs.mkdirSync(backupDir, { recursive: true });

    const backupPath = path.join(
      backupDir,
      `respaldo-${safeName(new Date().toISOString())}.json`
    );

    fs.writeFileSync(
      backupPath,
      JSON.stringify(backup, null, 2),
      "utf8"
    );

    const deleted = {
      firmas_marcacion_movil: 0,
      detecciones_ble_movil: 0,
      usos_qr_asistencia: 0,
      conflictos_sincronizacion: 0,
      marcaciones_offline: 0,
      registros_asistencia_curso: 0,
      desafios_marcacion_movil: 0,
      horarios_curso: 0,
      semestres: 0,
      cursos: 0,
    };

    if (scheduleIds.length > 0) {
      deleted.firmas_marcacion_movil = await deleteIfExists(
        client,
        "firmas_marcacion_movil",
        `DELETE FROM firmas_marcacion_movil
         WHERE desafio_id IN (
           SELECT id
           FROM desafios_marcacion_movil
           WHERE horario_curso_id = ANY($1::int[])
         )
            OR registro_asistencia_id IN (
              SELECT id
              FROM registros_asistencia_curso
              WHERE horario_curso_id = ANY($1::int[])
            )`,
        [scheduleIds]
      );

      deleted.detecciones_ble_movil = await deleteIfExists(
        client,
        "detecciones_ble_movil",
        `DELETE FROM detecciones_ble_movil
         WHERE desafio_id IN (
           SELECT id
           FROM desafios_marcacion_movil
           WHERE horario_curso_id = ANY($1::int[])
         )`,
        [scheduleIds]
      );

      deleted.usos_qr_asistencia = await deleteIfExists(
        client,
        "usos_qr_asistencia",
        `DELETE FROM usos_qr_asistencia
         WHERE horario_curso_id = ANY($1::int[])
            OR registro_asistencia_id IN (
              SELECT id
              FROM registros_asistencia_curso
              WHERE horario_curso_id = ANY($1::int[])
            )`,
        [scheduleIds]
      );

      deleted.conflictos_sincronizacion = await deleteIfExists(
        client,
        "conflictos_sincronizacion",
        `DELETE FROM conflictos_sincronizacion
         WHERE marcacion_offline_id IN (
           SELECT id
           FROM marcaciones_offline
           WHERE horario_curso_id = ANY($1::int[])
              OR registro_asistencia_id IN (
                SELECT id
                FROM registros_asistencia_curso
                WHERE horario_curso_id = ANY($1::int[])
              )
         )`,
        [scheduleIds]
      );

      deleted.marcaciones_offline = await deleteIfExists(
        client,
        "marcaciones_offline",
        `DELETE FROM marcaciones_offline
         WHERE horario_curso_id = ANY($1::int[])
            OR registro_asistencia_id IN (
              SELECT id
              FROM registros_asistencia_curso
              WHERE horario_curso_id = ANY($1::int[])
            )`,
        [scheduleIds]
      );

      deleted.registros_asistencia_curso = await deleteIfExists(
        client,
        "registros_asistencia_curso",
        `DELETE FROM registros_asistencia_curso
         WHERE horario_curso_id = ANY($1::int[])`,
        [scheduleIds]
      );

      deleted.desafios_marcacion_movil = await deleteIfExists(
        client,
        "desafios_marcacion_movil",
        `DELETE FROM desafios_marcacion_movil
         WHERE horario_curso_id = ANY($1::int[])`,
        [scheduleIds]
      );

      const removedSchedules = await client.query(
        `DELETE FROM horarios_curso
         WHERE id = ANY($1::int[])`,
        [scheduleIds]
      );

      deleted.horarios_curso = removedSchedules.rowCount;
    }

    if (semester) {
      const remainingForSemester = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM horarios_curso
         WHERE semestre_id = $1`,
        [semester.id]
      );

      if (Number(remainingForSemester.rows[0]?.total || 0) !== 0) {
        throw new Error(
          "El semestre TST-MIN-PEDRO contiene horarios ajenos al curso de prueba. La transacción fue revertida para protegerlos."
        );
      }

      const removedSemester = await client.query(
        `DELETE FROM semestres
         WHERE id = $1
           AND codigo = $2`,
        [semester.id, TEST_SEMESTER_CODE]
      );

      deleted.semestres = removedSemester.rowCount;
    }

    if (course) {
      const remainingForCourse = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM horarios_curso
         WHERE curso_id = $1`,
        [course.id]
      );

      if (Number(remainingForCourse.rows[0]?.total || 0) !== 0) {
        throw new Error(
          "El curso PRB-MIN-PEDRO tiene horarios fuera del semestre de prueba. La transacción fue revertida para protegerlos."
        );
      }

      const removedCourse = await client.query(
        `DELETE FROM cursos
         WHERE id = $1
           AND codigo = $2`,
        [course.id, TEST_COURSE_CODE]
      );

      deleted.cursos = removedCourse.rowCount;
    }

    const invalidDays = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM horarios_curso
       WHERE dia_semana NOT BETWEEN 1 AND 5`
    );

    if (Number(invalidDays.rows[0]?.total || 0) === 0) {
      await client.query(
        `ALTER TABLE horarios_curso
         DROP CONSTRAINT IF EXISTS chk_dia_semana`
      );

      await client.query(
        `ALTER TABLE horarios_curso
         ADD CONSTRAINT chk_dia_semana
         CHECK (dia_semana BETWEEN 1 AND 5)`
      );
    }

    const activeRealSemester = await client.query(
      `SELECT id, codigo
       FROM semestres
       WHERE codigo <> $1
       ORDER BY
         CASE
           WHEN activo = TRUE
            AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
             THEN 0
           WHEN CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
             THEN 1
           WHEN activo = TRUE
             THEN 2
           ELSE 3
         END,
         fecha_inicio DESC,
         id DESC
       LIMIT 1
       FOR UPDATE`,
      [TEST_SEMESTER_CODE]
    );

    let selectedSemester = null;

    if (activeRealSemester.rows.length === 1) {
      selectedSemester = activeRealSemester.rows[0];

      await client.query(
        `UPDATE semestres
         SET activo = (id = $1)
         WHERE codigo <> $2`,
        [selectedSemester.id, TEST_SEMESTER_CODE]
      );
    }

    const verification = await client.query(
      `SELECT
         (SELECT COUNT(*)::int
          FROM semestres
          WHERE codigo = $1) AS semestres_prueba,
         (SELECT COUNT(*)::int
          FROM cursos
          WHERE codigo = $2) AS cursos_prueba,
         (SELECT COUNT(*)::int
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          WHERE s.codigo = $1) AS horarios_prueba,
         (SELECT COUNT(*)::int
          FROM horarios_curso hc
          JOIN cursos c ON c.id = hc.curso_id
          WHERE c.codigo = $2) AS horarios_curso_prueba,
         (SELECT COUNT(*)::int
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          JOIN cursos c ON c.id = hc.curso_id
          WHERE hc.docente_id = $3
            AND s.codigo <> $1
            AND c.codigo <> $2
            AND hc.activo = TRUE) AS horarios_normales_activos`,
      [
        TEST_SEMESTER_CODE,
        TEST_COURSE_CODE,
        teacher.docente_id,
      ]
    );

    const checked = verification.rows[0];

    if (
      Number(checked.semestres_prueba) !== 0 ||
      Number(checked.cursos_prueba) !== 0 ||
      Number(checked.horarios_prueba) !== 0 ||
      Number(checked.horarios_curso_prueba) !== 0
    ) {
      throw new Error(
        `La verificación final detectó restos del modo Pedro: ${JSON.stringify(checked)}`
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
         'ELIMINAR_MODO_PEDRO_TOTAL',
         'semestres',
         $2,
         $3::jsonb
       )`,
      [
        teacher.usuario_id,
        teacher.docente_id,
        JSON.stringify({
          semestre_eliminado: TEST_SEMESTER_CODE,
          curso_eliminado: TEST_COURSE_CODE,
          eliminados: deleted,
          horarios_normales_activos:
            Number(checked.horarios_normales_activos),
          semestre_real_activo: selectedSemester,
          respaldo: backupPath,
        }),
      ]
    ).catch(() => undefined);

    await client.query("COMMIT");
    transactionOpen = false;

    console.log("");
    console.log("MODO PEDRO ELIMINADO COMPLETAMENTE");
    console.log("==================================");
    console.log(
      `Docente: ${teacher.codigo} - ${teacher.nombres} ${teacher.apellidos}`
    );
    console.log(`Semestre eliminado: ${TEST_SEMESTER_CODE}`);
    console.log(`Curso eliminado: ${TEST_COURSE_CODE}`);
    console.log(`Horarios de prueba eliminados: ${deleted.horarios_curso}`);
    console.log(
      `Horarios normales activos de Pedro: ${checked.horarios_normales_activos}`
    );

    if (Number(checked.horarios_normales_activos) === 6) {
      console.log("Estado normal confirmado: Pedro conserva 6 horarios activos.");
    } else {
      console.warn(
        `Aviso: se esperaban 6 horarios normales activos, pero se encontraron ${checked.horarios_normales_activos}. No se inventaron ni eliminaron horarios académicos reales.`
      );
    }

    console.log(
      `Semestre académico real activo: ${selectedSemester?.codigo || "no determinado"}`
    );
    console.log(`Respaldo: ${backupPath}`);
    console.log("");
    console.log("TST-MIN-PEDRO ya no debe aparecer ni como Histórico.");
  } catch (error) {
    if (transactionOpen) {
      await client.query("ROLLBACK").catch(() => undefined);
    }

    console.error("");
    console.error("NO SE ELIMINÓ EL MODO PEDRO");
    console.error("===========================");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();