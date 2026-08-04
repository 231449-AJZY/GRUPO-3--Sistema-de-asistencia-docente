'use strict';

const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });

const pool = require(path.join(backendDir, 'src', 'db', 'pool'));

const TARGET = {
  email: 'pedro@unsaac.edu.pe',
  dni: '32465453',
  nombres: 'Pedro',
  apellidos: 'Quispe Mamani',
};

const COURSES = [
  {
    codigo: 'ARQ-PED-101',
    nombre: 'Taller de Diseño Arquitectónico I',
    creditos: 4,
  },
  {
    codigo: 'ARQ-PED-202',
    nombre: 'Representación Arquitectónica',
    creditos: 3,
  },
  {
    codigo: 'ARQ-PED-303',
    nombre: 'Urbanismo y Territorio',
    creditos: 3,
  },
  {
    codigo: 'ARQ-PED-404',
    nombre: 'Tecnología de la Construcción',
    creditos: 3,
  },
  {
    codigo: 'ARQ-PED-505',
    nombre: 'Historia de la Arquitectura Peruana',
    creditos: 3,
  },
];

const DAY_NAMES = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
};

function normalizeTime(value) {
  return String(value ?? '').slice(0, 5);
}

function addMinutes(time, minutes) {
  const [hour, minute] = normalizeTime(time).split(':').map(Number);
  const total = ((hour * 60 + minute + minutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(
    total % 60
  ).padStart(2, '0')}`;
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS existe`,
    [`public.${tableName}`]
  );
  return Boolean(result.rows[0]?.existe);
}

async function getTeacher(client) {
  const result = await client.query(
    `SELECT
       d.id AS docente_id,
       d.departamento_id,
       d.dni,
       d.categoria,
       u.id AS usuario_id,
       u.codigo,
       u.nombres,
       u.apellidos,
       u.email,
       u.activo,
       da.nombre AS departamento,
       da.codigo AS departamento_codigo
     FROM usuarios u
     JOIN docentes d
       ON d.usuario_id = u.id
     JOIN departamentos_academicos da
       ON da.id = d.departamento_id
     WHERE LOWER(u.email) = LOWER($1)
        OR d.dni = $2
        OR (
          LOWER(u.nombres) = LOWER($3)
          AND LOWER(u.apellidos) = LOWER($4)
        )
     ORDER BY
       CASE WHEN LOWER(u.email) = LOWER($1) THEN 0 ELSE 1 END,
       u.id
     LIMIT 1`,
    [
      TARGET.email,
      TARGET.dni,
      TARGET.nombres,
      TARGET.apellidos,
    ]
  );

  return result.rows[0] ?? null;
}

async function getCurrentSemester(client) {
  const result = await client.query(
    `SELECT id, codigo, fecha_inicio, fecha_fin, activo
     FROM semestres
     WHERE activo = TRUE
       AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
     ORDER BY fecha_inicio DESC, id DESC
     LIMIT 1`
  );

  return result.rows[0] ?? null;
}

async function getInstitutionClock(client) {
  const result = await client.query(
    `WITH settings AS (
       SELECT COALESCE(
         (SELECT zona_horaria
          FROM configuracion_institucional
          WHERE id = 1),
         'America/Lima'
       ) AS zona_horaria
     )
     SELECT
       zona_horaria,
       (CURRENT_TIMESTAMP AT TIME ZONE zona_horaria)::date AS fecha_local,
       TO_CHAR(
         date_trunc(
           'minute',
           CURRENT_TIMESTAMP AT TIME ZONE zona_horaria
         ),
         'HH24:MI'
       ) AS hora_actual,
       EXTRACT(
         ISODOW FROM CURRENT_TIMESTAMP AT TIME ZONE zona_horaria
       )::int AS dia_semana
     FROM settings`
  );

  return result.rows[0];
}

async function ensureCourse(client, course, departmentId) {
  const result = await client.query(
    `INSERT INTO cursos (
       codigo,
       nombre,
       departamento_id,
       creditos,
       activo
     )
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (codigo)
     DO UPDATE SET
       nombre = EXCLUDED.nombre,
       departamento_id = EXCLUDED.departamento_id,
       creditos = EXCLUDED.creditos,
       activo = TRUE
     RETURNING id, codigo, nombre`,
    [
      course.codigo,
      course.nombre,
      departmentId,
      course.creditos,
    ]
  );

  return result.rows[0];
}

async function backupData(client, backupDir, teacher, semester) {
  fs.mkdirSync(backupDir, { recursive: true });

  const schedules = await client.query(
    `SELECT
       hc.id,
       hc.docente_id,
       hc.curso_id,
       hc.semestre_id,
       hc.aula,
       hc.dia_semana,
       hc.hora_inicio,
       hc.hora_fin,
       hc.activo,
       c.codigo AS curso_codigo,
       c.nombre AS curso
     FROM horarios_curso hc
     JOIN cursos c
       ON c.id = hc.curso_id
     WHERE hc.docente_id = $1
       AND hc.semestre_id = $2
     ORDER BY hc.dia_semana, hc.hora_inicio, hc.id`,
    [teacher.docente_id, semester.id]
  );

  const config = await client.query(
    `SELECT *
     FROM configuracion_asistencia
     ORDER BY id`
  );

  const payload = {
    creado_en: new Date().toISOString(),
    docente: teacher,
    semestre: semester,
    horarios_anteriores: schedules.rows,
    configuracion_asistencia: config.rows,
  };

  const filePath = path.join(
    backupDir,
    'HORARIOS-PEDRO-ANTES.json'
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(payload, null, 2),
    'utf8'
  );

  return filePath;
}

function buildSchedulePlan(clock, courseRows) {
  const currentDay =
    Number(clock.dia_semana) >= 1 && Number(clock.dia_semana) <= 5
      ? Number(clock.dia_semana)
      : 1;

  let testStart = addMinutes(clock.hora_actual, 5);

  const fixed = [
    {
      course: courseRows[1],
      day: 1,
      start: '08:00',
      end: '09:30',
      room: 'ARQ-A101',
      test: false,
    },
    {
      course: courseRows[2],
      day: 2,
      start: '10:00',
      end: '11:30',
      room: 'ARQ-A202',
      test: false,
    },
    {
      course: courseRows[3],
      day: 4,
      start: '14:00',
      end: '15:30',
      room: 'ARQ-T304',
      test: false,
    },
    {
      course: courseRows[4],
      day: 5,
      start: '16:00',
      end: '17:30',
      room: 'ARQ-A405',
      test: false,
    },
  ];

  while (
    fixed.some(
      (item) =>
        item.day === currentDay &&
        normalizeTime(item.start) === normalizeTime(testStart)
    )
  ) {
    testStart = addMinutes(testStart, 7);
  }

  return [
    {
      course: courseRows[0],
      day: currentDay,
      start: testStart,
      end: addMinutes(testStart, 90),
      room: 'ARQ-PRUEBA-MOVIL',
      test: true,
    },
    ...fixed,
  ];
}

async function upsertSchedule(
  client,
  teacherId,
  semesterId,
  item
) {
  const result = await client.query(
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
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
     ON CONFLICT (
       docente_id,
       semestre_id,
       dia_semana,
       hora_inicio
     )
     DO UPDATE SET
       curso_id = EXCLUDED.curso_id,
       aula = EXCLUDED.aula,
       hora_fin = EXCLUDED.hora_fin,
       activo = TRUE
     RETURNING
       id,
       docente_id,
       curso_id,
       semestre_id,
       aula,
       dia_semana,
       hora_inicio,
       hora_fin,
       activo`,
    [
      teacherId,
      item.course.id,
      semesterId,
      item.room,
      item.day,
      item.start,
      item.end,
    ]
  );

  return result.rows[0];
}

async function main() {
  const requiredTables = [
    'usuarios',
    'docentes',
    'departamentos_academicos',
    'semestres',
    'cursos',
    'horarios_curso',
    'configuracion_asistencia',
  ];

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    for (const tableName of requiredTables) {
      if (!(await tableExists(client, tableName))) {
        throw new Error(
          `No existe la tabla ${tableName}.`
        );
      }
    }

    const teacher = await getTeacher(client);

    if (!teacher) {
      throw new Error(
        `No se encontró al docente Pedro Quispe Mamani con correo ${TARGET.email} o DNI ${TARGET.dni}.`
      );
    }

    if (!teacher.activo) {
      throw new Error(
        'La cuenta de Pedro está inactiva. Actívela antes de asignar horarios.'
      );
    }

    const semester = await getCurrentSemester(client);

    if (!semester) {
      throw new Error(
        'No existe un semestre activo que incluya la fecha de hoy.'
      );
    }

    const clock = await getInstitutionClock(client);
    const backupDir =
      process.env.GABO_BACKUP_DIR ||
      path.join(
        backendDir,
        'backups',
        `pedro-horarios-${Date.now()}`
      );

    const backupPath = await backupData(
      client,
      backupDir,
      teacher,
      semester
    );

    console.log(`Respaldo de horarios: ${backupPath}`);

    await client.query('BEGIN');
    transactionOpen = true;

    const courseRows = [];

    for (const course of COURSES) {
      courseRows.push(
        await ensureCourse(
          client,
          course,
          Number(teacher.departamento_id)
        )
      );
    }

    // El límite de negocio es de cinco horarios activos por semestre.
    // Se conservan los registros anteriores, pero se desactivan para no
    // borrar historial ni romper referencias de asistencias previas.
    await client.query(
      `UPDATE horarios_curso
       SET activo = FALSE
       WHERE docente_id = $1
         AND semestre_id = $2
         AND activo = TRUE`,
      [teacher.docente_id, semester.id]
    );

    const plan = buildSchedulePlan(clock, courseRows);
    const created = [];

    for (const item of plan) {
      const row = await upsertSchedule(
        client,
        Number(teacher.docente_id),
        Number(semester.id),
        item
      );

      created.push({
        id: Number(row.id),
        curso: item.course.nombre,
        codigo_curso: item.course.codigo,
        dia_semana: item.day,
        dia: DAY_NAMES[item.day] ?? `Día ${item.day}`,
        hora_inicio: normalizeTime(row.hora_inicio),
        hora_fin: normalizeTime(row.hora_fin),
        aula: row.aula,
        horario_prueba_inmediata: item.test,
      });
    }

    const activeCount = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM horarios_curso
       WHERE docente_id = $1
         AND semestre_id = $2
         AND activo = TRUE`,
      [teacher.docente_id, semester.id]
    );

    if (Number(activeCount.rows[0]?.total) !== 5) {
      throw new Error(
        `Se esperaban 5 horarios activos, pero PostgreSQL reportó ${activeCount.rows[0]?.total}.`
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
         'ASIGNAR_HORARIOS_PRUEBA_PEDRO',
         'horarios_curso',
         $2,
         $3::jsonb
       )`,
      [
        teacher.usuario_id,
        teacher.docente_id,
        JSON.stringify({
          semestre: semester.codigo,
          horarios_activos: created,
          finalidad: 'Prueba de marcación móvil y BLE',
        }),
      ]
    ).catch(() => undefined);

    await client.query('COMMIT');
    transactionOpen = false;

    const downloadsDir = path.join(
      process.env.USERPROFILE || process.env.HOME || backendDir,
      'Downloads'
    );
    fs.mkdirSync(downloadsDir, { recursive: true });

    const reportPath = path.join(
      downloadsDir,
      'HORARIOS-PEDRO-QUISPE-MAMANI.txt'
    );

    const testSchedule = created.find(
      (item) => item.horario_prueba_inmediata
    );

    const lines = [
      'HORARIOS ACTIVOS — PEDRO QUISPE MAMANI',
      '=======================================',
      '',
      `Correo: ${teacher.email}`,
      `Código: ${teacher.codigo}`,
      `DNI: ${teacher.dni}`,
      `Carrera: ${teacher.departamento}`,
      `Semestre: ${semester.codigo}`,
      `Fecha institucional: ${clock.fecha_local}`,
      `Hora institucional al crear: ${clock.hora_actual}`,
      '',
      ...created.map(
        (item, index) =>
          `${index + 1}. ${item.dia} ${item.hora_inicio}-${item.hora_fin} | ${item.codigo_curso} | ${item.curso} | ${item.aula}${item.horario_prueba_inmediata ? ' | PRUEBA INMEDIATA' : ''}`
      ),
      '',
      'PRUEBA INMEDIATA',
      '----------------',
      `La clase de prueba comienza a las ${testSchedule.hora_inicio}.`,
      'La ventana actual permite marcar desde 15 minutos antes hasta 10 minutos después de la hora de inicio.',
      'Puede intentar la marcación inmediatamente después de ejecutar este sembrado.',
      'El ingreso institucional ya registrado hoy no bloquea la asistencia de curso.',
      'Para una clase, el Paso 8D exige además una estación BLE activa y válida.',
      '',
    ];

    fs.writeFileSync(reportPath, lines.join('\r\n'), 'utf8');

    console.log('');
    console.log('HORARIOS DE PEDRO CREADOS CORRECTAMENTE');
    console.log('=======================================');
    console.log(`Docente: ${teacher.nombres} ${teacher.apellidos}`);
    console.log(`Carrera: ${teacher.departamento}`);
    console.log(`Semestre: ${semester.codigo}`);
    console.log('');
    for (const item of created) {
      console.log(
        `${item.dia} ${item.hora_inicio}-${item.hora_fin} | ${item.codigo_curso} | ${item.curso}${item.horario_prueba_inmediata ? ' | PRUEBA AHORA' : ''}`
      );
    }
    console.log('');
    console.log(
      `Horario de prueba: ${testSchedule.dia} ${testSchedule.hora_inicio}-${testSchedule.hora_fin}`
    );
    console.log(
      'Puede volver a marcar ahora; el ingreso institucional existente no necesita eliminarse.'
    );
    console.log(`Reporte: ${reportPath}`);
  } catch (error) {
    if (transactionOpen) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    console.error('');
    console.error('NO SE PUDIERON ASIGNAR LOS HORARIOS');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
