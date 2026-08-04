'use strict';

const router = require('express').Router();

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');

const MAX_ROWS = 5000;
const REPORT_ROLES = ['Administrador', 'Supervisor'];

function cleanText(value, maxLength = 120) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function validDate(value) {
  const text = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function clampInteger(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function mapRecord(row) {
  return {
    id: row.registro_uid,
    teacherId: Number(row.docente_id),
    teacherCode: row.codigo_docente,
    teacher: row.docente,
    email: row.email,
    department: row.departamento,
    type: row.tipo_objetivo,
    courseCode: row.codigo_curso,
    course: row.curso,
    classroom: row.aula,
    date: row.fecha,
    time: row.hora,
    status: row.estado,
    result: row.resultado,
    method: row.metodo_verificacion,
    source: row.fuente,
    deviceId: row.dispositivo_id === null
      ? null
      : Number(row.dispositivo_id),
    signatureVerified: Boolean(row.firma_verificada),
    bleRequired: Boolean(row.presencia_ble_requerida),
    bleValidated: Boolean(row.presencia_ble_validada),
    createdAt: row.creado_en,
  };
}

function summarize(records) {
  const summary = {
    total: records.length,
    registered: 0,
    duplicated: 0,
    rejected: 0,
    courses: 0,
    institutionalEntries: 0,
    qr: 0,
    mobileBiometric: 0,
    ble: 0,
    offline: 0,
    biometricReader: 0,
    manual: 0,
    punctual: 0,
    late: 0,
    present: 0,
    absent: 0,
  };

  for (const record of records) {
    if (record.result === 'REGISTRADA') summary.registered += 1;
    if (record.result === 'DUPLICADA') summary.duplicated += 1;
    if (record.result === 'RECHAZADA') summary.rejected += 1;

    if (record.type === 'CURSO') summary.courses += 1;
    if (record.type === 'INGRESO_INSTITUCIONAL') {
      summary.institutionalEntries += 1;
    }

    if (record.method === 'QR_DINAMICO') summary.qr += 1;
    if (record.method === 'BIOMETRIA_MOVIL') {
      summary.mobileBiometric += 1;
    }
    if (record.method === 'OFFLINE_SINCRONIZADO') summary.offline += 1;
    if (record.method === 'LECTOR_BIOMETRICO') {
      summary.biometricReader += 1;
    }
    if (record.method === 'MANUAL') summary.manual += 1;
    if (record.bleValidated) summary.ble += 1;

    if (record.status === 'PUNTUAL') summary.punctual += 1;
    if (record.status === 'TARDANZA') summary.late += 1;
    if (record.status === 'PRESENTE') summary.present += 1;
    if (['INASISTENCIA', 'AUSENTE', 'FALTA'].includes(record.status)) {
      summary.absent += 1;
    }
  }

  return summary;
}


function addCondition(values, conditions, expression, value) {
  values.push(value);
  conditions.push(expression.replace('?', `$${values.length}`));
}

function shiftIsoDate(value, days) {
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function previousPeriod(period) {
  const start = new Date(`${period.dateFrom}T00:00:00Z`);
  const end = new Date(`${period.dateTo}T00:00:00Z`);
  const days = Math.max(
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
    1
  );
  const dateTo = shiftIsoDate(period.dateFrom, -1);
  return {
    dateFrom: shiftIsoDate(dateTo, -(days - 1)),
    dateTo,
  };
}

function buildAttendanceWhere(query, period) {
  const conditions = [];
  const values = [];
  const teacherId = toPositiveInteger(query.docente_id);
  const courseCode = cleanText(query.curso_codigo, 40);
  const department = cleanText(query.departamento, 120);
  const status = cleanText(query.estado, 30).toUpperCase();
  const method = cleanText(query.metodo, 50).toUpperCase();
  const result = cleanText(query.resultado, 30).toUpperCase();
  const type = cleanText(query.tipo, 40).toUpperCase();

  if (teacherId) {
    addCondition(values, conditions, 'v.docente_id = ?', teacherId);
  }
  if (courseCode && courseCode !== 'TODOS') {
    addCondition(values, conditions, 'v.codigo_curso = ?', courseCode);
  }
  if (department && department.toUpperCase() !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.departamento, '')) = UPPER(?)",
      department
    );
  }
  if (status && status !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.estado, '')) = ?",
      status
    );
  }
  if (method && method !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.metodo_verificacion, '')) = ?",
      method
    );
  }
  if (result && result !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.resultado, '')) = ?",
      result
    );
  }
  if (type && type !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.tipo_objetivo, '')) = ?",
      type
    );
  }

  addCondition(values, conditions, 'v.fecha >= ?::date', period.dateFrom);
  addCondition(values, conditions, 'v.fecha <= ?::date', period.dateTo);

  return {
    values,
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    selected: {
      teacherId,
      courseCode: courseCode || null,
      department: department || null,
      status: status || null,
      method: method || null,
      result: result || null,
      type: type || null,
    },
  };
}

function percentDelta(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue === 0 ? 0 : 100;
  return Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10;
}

function attendanceSummary(row) {
  const punctual = Number(row.puntuales || 0);
  const present = Number(row.presentes || 0);
  const late = Number(row.tardanzas || 0);
  const absent = Number(row.inasistencias || 0);
  const attendanceCount = punctual + present + late;
  const evaluatedCount = attendanceCount + absent;
  const punctualBase = punctual + late;

  return {
    totalRecords: Number(row.total_registros || 0),
    registered: Number(row.registrados || 0),
    rejected: Number(row.rechazados || 0),
    duplicated: Number(row.duplicados || 0),
    punctual,
    present,
    late,
    absent,
    attendanceCount,
    complianceRate: evaluatedCount > 0
      ? Math.round((attendanceCount / evaluatedCount) * 1000) / 10
      : 0,
    punctualityRate: punctualBase > 0
      ? Math.round((punctual / punctualBase) * 1000) / 10
      : 0,
    teachers: Number(row.docentes || 0),
    courses: Number(row.cursos || 0),
    averageDelayMinutes: Number(row.promedio_tardanza_minutos || 0),
  };
}

function normalizePeriod(query) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentDay = String(today.getDate()).padStart(2, '0');
  const defaultFrom = `${currentYear}-${currentMonth}-01`;
  const defaultTo = `${currentYear}-${currentMonth}-${currentDay}`;

  const dateFrom = validDate(query.fecha_desde) || defaultFrom;
  const dateTo = validDate(query.fecha_hasta) || defaultTo;

  if (dateFrom > dateTo) {
    return {
      dateFrom: dateTo,
      dateTo: dateFrom,
    };
  }

  return { dateFrom, dateTo };
}

router.get(
  '/resumen',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const { dateFrom, dateTo } = normalizePeriod(req.query);
      const recentLimit = clampInteger(req.query.limite_recientes, 8, 4, 20);

      const [summaryResult, trendResult, departmentResult, recentResult, catalogResult] =
        await Promise.all([
          pool.query(
            `SELECT
               COUNT(*)::int AS total_registros,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(resultado, '')) = 'REGISTRADA'
               )::int AS registrados,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(resultado, '')) = 'RECHAZADA'
               )::int AS rechazados,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(resultado, '')) = 'DUPLICADA'
               )::int AS duplicados,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'PUNTUAL'
               )::int AS puntuales,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'TARDANZA'
               )::int AS tardanzas,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'PRESENTE'
               )::int AS presentes,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) IN (
                   'INASISTENCIA', 'AUSENTE', 'FALTA'
                 )
               )::int AS inasistencias,
               COUNT(DISTINCT docente_id)::int AS docentes_con_registro,
               COUNT(DISTINCT NULLIF(codigo_curso, ''))::int AS cursos_con_registro,
               COUNT(*) FILTER (
                 WHERE tipo_objetivo = 'CURSO'
               )::int AS registros_curso,
               COUNT(*) FILTER (
                 WHERE tipo_objetivo = 'INGRESO_INSTITUCIONAL'
               )::int AS ingresos_institucionales
             FROM v_historial_asistencia_unificado
             WHERE fecha BETWEEN $1::date AND $2::date`,
            [dateFrom, dateTo]
          ),
          pool.query(
            `SELECT
               TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'PUNTUAL'
               )::int AS puntuales,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'TARDANZA'
               )::int AS tardanzas,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) IN (
                   'INASISTENCIA', 'AUSENTE', 'FALTA'
                 )
               )::int AS inasistencias
             FROM v_historial_asistencia_unificado
             WHERE fecha BETWEEN $1::date AND $2::date
             GROUP BY fecha
             ORDER BY fecha ASC`,
            [dateFrom, dateTo]
          ),
          pool.query(
            `SELECT
               COALESCE(NULLIF(BTRIM(departamento), ''), 'Sin departamento') AS departamento,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'PUNTUAL'
               )::int AS puntuales,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) = 'TARDANZA'
               )::int AS tardanzas,
               COUNT(*) FILTER (
                 WHERE UPPER(COALESCE(estado, '')) IN (
                   'INASISTENCIA', 'AUSENTE', 'FALTA'
                 )
               )::int AS inasistencias
             FROM v_historial_asistencia_unificado
             WHERE fecha BETWEEN $1::date AND $2::date
             GROUP BY COALESCE(NULLIF(BTRIM(departamento), ''), 'Sin departamento')
             ORDER BY total DESC, departamento ASC
             LIMIT 8`,
            [dateFrom, dateTo]
          ),
          pool.query(
            `SELECT
               registro_uid,
               docente_id,
               codigo_docente,
               CONCAT_WS(' ', nombres, apellidos) AS docente,
               email,
               departamento,
               tipo_objetivo,
               codigo_curso,
               curso,
               aula,
               TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
               TO_CHAR(hora, 'HH24:MI:SS') AS hora,
               estado,
               resultado,
               metodo_verificacion,
               fuente,
               dispositivo_id,
               firma_verificada,
               presencia_ble_requerida,
               presencia_ble_validada,
               creado_en
             FROM v_historial_asistencia_unificado
             WHERE fecha BETWEEN $1::date AND $2::date
             ORDER BY fecha DESC, hora DESC, creado_en DESC
             LIMIT $3`,
            [dateFrom, dateTo, recentLimit]
          ),
          pool.query(
            `SELECT
               (SELECT COUNT(*)::int
                FROM docentes d
                JOIN usuarios u ON u.id = d.usuario_id
                WHERE u.activo = TRUE) AS docentes_activos,
               (SELECT COUNT(*)::int
                FROM cursos
                WHERE activo = TRUE) AS cursos_activos,
               (SELECT COUNT(*)::int
                FROM departamentos_academicos
                WHERE activo = TRUE) AS departamentos_activos,
               (SELECT COUNT(*)::int
                FROM semestres) AS semestres_registrados`
          ),
        ]);

      const row = summaryResult.rows[0] || {};
      const catalog = catalogResult.rows[0] || {};
      const attendanceCount =
        Number(row.puntuales || 0) +
        Number(row.tardanzas || 0) +
        Number(row.presentes || 0);
      const evaluatedCount = attendanceCount + Number(row.inasistencias || 0);
      const complianceRate = evaluatedCount > 0
        ? Math.round((attendanceCount / evaluatedCount) * 1000) / 10
        : 0;
      const punctualityBase =
        Number(row.puntuales || 0) + Number(row.tardanzas || 0);
      const punctualityRate = punctualityBase > 0
        ? Math.round((Number(row.puntuales || 0) / punctualityBase) * 1000) / 10
        : 0;

      return res.json({
        generatedAt: new Date().toISOString(),
        period: {
          from: dateFrom,
          to: dateTo,
        },
        summary: {
          totalRecords: Number(row.total_registros || 0),
          registered: Number(row.registrados || 0),
          rejected: Number(row.rechazados || 0),
          duplicated: Number(row.duplicados || 0),
          punctual: Number(row.puntuales || 0),
          late: Number(row.tardanzas || 0),
          present: Number(row.presentes || 0),
          absent: Number(row.inasistencias || 0),
          attendanceCount,
          complianceRate,
          punctualityRate,
          teachersWithRecords: Number(row.docentes_con_registro || 0),
          coursesWithRecords: Number(row.cursos_con_registro || 0),
          courseRecords: Number(row.registros_curso || 0),
          institutionalEntries: Number(row.ingresos_institucionales || 0),
          activeTeachers: Number(catalog.docentes_activos || 0),
          activeCourses: Number(catalog.cursos_activos || 0),
          activeDepartments: Number(catalog.departamentos_activos || 0),
          semesters: Number(catalog.semestres_registrados || 0),
        },
        trend: trendResult.rows.map((item) => ({
          date: item.fecha,
          total: Number(item.total || 0),
          punctual: Number(item.puntuales || 0),
          late: Number(item.tardanzas || 0),
          absent: Number(item.inasistencias || 0),
        })),
        departments: departmentResult.rows.map((item) => {
          const total = Number(item.total || 0);
          const punctual = Number(item.puntuales || 0);
          const late = Number(item.tardanzas || 0);
          const absent = Number(item.inasistencias || 0);
          const evaluated = punctual + late + absent;
          return {
            department: item.departamento,
            total,
            punctual,
            late,
            absent,
            complianceRate: evaluated > 0
              ? Math.round(((punctual + late) / evaluated) * 1000) / 10
              : 0,
          };
        }),
        recent: recentResult.rows.map(mapRecord),
      });
    } catch (error) {
      console.error('Error al generar resumen premium de reportes:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        requestId: req.id,
      });
      return res.status(500).json({
        error: 'No se pudo generar el resumen del módulo de reportes.',
        codigo: 'REPORT_SUMMARY_ERROR',
        request_id: req.id,
      });
    }
  }
);

router.get(
  '/catalogos',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (_req, res) => {
    try {
      const [teachers, courses, methods, departments, semesters] = await Promise.all([
        pool.query(
          `SELECT
             d.id,
             u.codigo,
             CONCAT_WS(' ', u.nombres, u.apellidos) AS nombre,
             u.email,
             dep.codigo AS departamento_codigo,
             dep.nombre AS departamento
           FROM docentes d
           JOIN usuarios u ON u.id = d.usuario_id
           LEFT JOIN departamentos_academicos dep
             ON dep.id = d.departamento_id
           WHERE u.activo = TRUE
           ORDER BY u.apellidos, u.nombres`
        ),
        pool.query(
          `SELECT codigo, nombre
           FROM cursos
           WHERE activo = TRUE
           ORDER BY nombre`
        ),
        pool.query(
          `SELECT DISTINCT metodo_verificacion AS metodo
           FROM v_historial_asistencia_unificado
           WHERE metodo_verificacion IS NOT NULL
           ORDER BY metodo_verificacion`
        ),
        pool.query(
          `SELECT id, codigo, nombre
           FROM departamentos_academicos
           WHERE activo = TRUE
           ORDER BY nombre`
        ),
        pool.query(
          `SELECT id, codigo, fecha_inicio, fecha_fin
           FROM semestres
           ORDER BY fecha_inicio DESC`
        ),
      ]);

      return res.json({
        teachers: teachers.rows,
        courses: courses.rows,
        methods: methods.rows.map((row) => row.metodo),
        departments: departments.rows,
        semesters: semesters.rows,
      });
    } catch (error) {
      console.error('Error al cargar catálogos de reportes:', error);
      return res.status(500).json({
        error: 'No se pudieron cargar los catálogos de reportes.',
      });
    }
  }
);


router.get(
  '/asistencia/analitica',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const period = normalizePeriod(req.query);
      const comparisonPeriod = previousPeriod(period);
      const page = clampInteger(req.query.pagina, 1, 1, 100000);
      const pageSize = clampInteger(req.query.limite, 12, 5, 50);
      const offset = (page - 1) * pageSize;
      const current = buildAttendanceWhere(req.query, period);
      const previous = buildAttendanceWhere(req.query, comparisonPeriod);

      const summarySql = (whereClause) => `
        SELECT
          COUNT(*)::int AS total_registros,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'REGISTRADA'
          )::int AS registrados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
          )::int AS rechazados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'DUPLICADA'
          )::int AS duplicados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'PUNTUAL'
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'PRESENTE'
          )::int AS presentes,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias,
          COUNT(DISTINCT v.docente_id)::int AS docentes,
          COUNT(DISTINCT NULLIF(v.codigo_curso, ''))::int AS cursos,
          COALESCE(
            ROUND(AVG(
              CASE
                WHEN UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
                  AND hc.hora_inicio IS NOT NULL
                  AND v.hora IS NOT NULL
                THEN GREATEST(
                  EXTRACT(EPOCH FROM (v.hora - hc.hora_inicio)) / 60,
                  0
                )
                ELSE NULL
              END
            )::numeric, 1),
            0
          ) AS promedio_tardanza_minutos
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc
          ON hc.id = v.horario_curso_id
        ${whereClause}
      `;

      const recordValues = [...current.values, pageSize, offset];
      const limitPosition = current.values.length + 1;
      const offsetPosition = current.values.length + 2;

      const [
        summaryResult,
        previousSummaryResult,
        trendResult,
        weekdayResult,
        departmentResult,
        methodResult,
        recordResult,
      ] = await Promise.all([
        pool.query(summarySql(current.whereClause), current.values),
        pool.query(summarySql(previous.whereClause), previous.values),
        pool.query(
          `SELECT
             TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
             )::int AS puntuales,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
             )::int AS tardanzas,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) IN (
                 'INASISTENCIA', 'AUSENTE', 'FALTA'
               )
             )::int AS inasistencias
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY v.fecha
           ORDER BY v.fecha ASC`,
          current.values
        ),
        pool.query(
          `SELECT
             EXTRACT(ISODOW FROM v.fecha)::int AS dia_semana,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
             )::int AS puntuales,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
             )::int AS tardanzas,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) IN (
                 'INASISTENCIA', 'AUSENTE', 'FALTA'
               )
             )::int AS inasistencias
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY EXTRACT(ISODOW FROM v.fecha)
           ORDER BY dia_semana ASC`,
          current.values
        ),
        pool.query(
          `SELECT
             COALESCE(NULLIF(BTRIM(v.departamento), ''), 'Sin departamento') AS departamento,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
             )::int AS puntuales,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
             )::int AS tardanzas,
             COUNT(*) FILTER (
               WHERE UPPER(COALESCE(v.estado, '')) IN (
                 'INASISTENCIA', 'AUSENTE', 'FALTA'
               )
             )::int AS inasistencias
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY COALESCE(NULLIF(BTRIM(v.departamento), ''), 'Sin departamento')
           ORDER BY total DESC, departamento ASC
           LIMIT 10`,
          current.values
        ),
        pool.query(
          `SELECT
             COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO') AS metodo,
             COUNT(*)::int AS total
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO')
           ORDER BY total DESC, metodo ASC`,
          current.values
        ),
        pool.query(
          `SELECT
             v.registro_uid,
             v.docente_id,
             v.codigo_docente,
             CONCAT_WS(' ', v.nombres, v.apellidos) AS docente,
             v.email,
             v.departamento,
             v.tipo_objetivo,
             v.horario_curso_id,
             v.codigo_curso,
             v.curso,
             v.aula,
             TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
             TO_CHAR(hc.hora_inicio, 'HH24:MI') AS hora_programada,
             TO_CHAR(v.hora, 'HH24:MI') AS hora_registrada,
             CASE
               WHEN hc.hora_inicio IS NOT NULL AND v.hora IS NOT NULL
               THEN ROUND(
                 EXTRACT(EPOCH FROM (v.hora - hc.hora_inicio)) / 60
               )::int
               ELSE NULL
             END AS diferencia_minutos,
             v.estado,
             v.resultado,
             v.metodo_verificacion,
             v.fuente,
             v.dispositivo_id,
             v.firma_verificada,
             v.presencia_ble_requerida,
             v.presencia_ble_validada,
             v.detalle,
             v.creado_en
           FROM v_historial_asistencia_unificado v
           LEFT JOIN horarios_curso hc
             ON hc.id = v.horario_curso_id
           ${current.whereClause}
           ORDER BY v.fecha DESC, v.hora DESC, v.creado_en DESC
           LIMIT $${limitPosition}
           OFFSET $${offsetPosition}`,
          recordValues
        ),
      ]);

      const summary = attendanceSummary(summaryResult.rows[0] || {});
      const previousSummary = attendanceSummary(
        previousSummaryResult.rows[0] || {}
      );
      const totalPages = Math.max(
        Math.ceil(summary.totalRecords / pageSize),
        1
      );

      return res.json({
        generatedAt: new Date().toISOString(),
        period: {
          from: period.dateFrom,
          to: period.dateTo,
        },
        comparisonPeriod: {
          from: comparisonPeriod.dateFrom,
          to: comparisonPeriod.dateTo,
        },
        filters: current.selected,
        summary,
        comparison: {
          totalRecordsPercent: percentDelta(
            summary.totalRecords,
            previousSummary.totalRecords
          ),
          attendancePercent: percentDelta(
            summary.attendanceCount,
            previousSummary.attendanceCount
          ),
          latePercent: percentDelta(summary.late, previousSummary.late),
          compliancePoints: Math.round(
            (summary.complianceRate - previousSummary.complianceRate) * 10
          ) / 10,
          punctualityPoints: Math.round(
            (summary.punctualityRate - previousSummary.punctualityRate) * 10
          ) / 10,
        },
        trend: trendResult.rows.map((row) => ({
          date: row.fecha,
          total: Number(row.total || 0),
          punctual: Number(row.puntuales || 0),
          late: Number(row.tardanzas || 0),
          absent: Number(row.inasistencias || 0),
        })),
        weekdays: weekdayResult.rows.map((row) => ({
          weekday: Number(row.dia_semana),
          total: Number(row.total || 0),
          punctual: Number(row.puntuales || 0),
          late: Number(row.tardanzas || 0),
          absent: Number(row.inasistencias || 0),
        })),
        departments: departmentResult.rows.map((row) => {
          const punctual = Number(row.puntuales || 0);
          const late = Number(row.tardanzas || 0);
          const absent = Number(row.inasistencias || 0);
          const evaluated = punctual + late + absent;
          return {
            department: row.departamento,
            total: Number(row.total || 0),
            punctual,
            late,
            absent,
            complianceRate: evaluated > 0
              ? Math.round(((punctual + late) / evaluated) * 1000) / 10
              : 0,
          };
        }),
        methods: methodResult.rows.map((row) => ({
          method: row.metodo,
          total: Number(row.total || 0),
        })),
        records: recordResult.rows.map((row) => ({
          id: row.registro_uid,
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          email: row.email,
          department: row.departamento,
          type: row.tipo_objetivo,
          scheduleId: row.horario_curso_id === null
            ? null
            : Number(row.horario_curso_id),
          courseCode: row.codigo_curso,
          course: row.curso,
          classroom: row.aula,
          date: row.fecha,
          scheduledTime: row.hora_programada,
          registeredTime: row.hora_registrada,
          differenceMinutes: row.diferencia_minutos === null
            ? null
            : Number(row.diferencia_minutos),
          status: row.estado,
          result: row.resultado,
          method: row.metodo_verificacion,
          source: row.fuente,
          deviceId: row.dispositivo_id === null
            ? null
            : Number(row.dispositivo_id),
          signatureVerified: Boolean(row.firma_verificada),
          bleRequired: Boolean(row.presencia_ble_requerida),
          bleValidated: Boolean(row.presencia_ble_validada),
          detail: row.detalle || {},
          createdAt: row.creado_en,
        })),
        pagination: {
          page,
          pageSize,
          totalRecords: summary.totalRecords,
          totalPages,
          hasPrevious: page > 1,
          hasNext: page < totalPages,
        },
      });
    } catch (error) {
      console.error('Error al generar reporte analítico de asistencia:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        requestId: req.id,
      });
      return res.status(500).json({
        error: 'No se pudo generar el reporte analítico de asistencia.',
        codigo: 'ATTENDANCE_ANALYTICS_ERROR',
        request_id: req.id,
      });
    }
  }
);


function buildAbsenceWhere(query, period) {
  const conditions = [
    "UPPER(COALESCE(v.estado, '')) IN ('INASISTENCIA', 'AUSENTE', 'FALTA')",
  ];
  const values = [];
  const teacherId = toPositiveInteger(query.docente_id);
  const courseCode = cleanText(query.curso_codigo, 40);
  const department = cleanText(query.departamento, 120);
  const type = cleanText(query.tipo, 40).toUpperCase();

  if (teacherId) {
    addCondition(values, conditions, 'v.docente_id = ?', teacherId);
  }
  if (courseCode && courseCode !== 'TODOS') {
    addCondition(values, conditions, 'v.codigo_curso = ?', courseCode);
  }
  if (department && department.toUpperCase() !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.departamento, '')) = UPPER(?)",
      department
    );
  }
  if (type && type !== 'TODOS') {
    addCondition(
      values,
      conditions,
      "UPPER(COALESCE(v.tipo_objetivo, '')) = ?",
      type
    );
  }

  addCondition(values, conditions, 'v.fecha >= ?::date', period.dateFrom);
  addCondition(values, conditions, 'v.fecha <= ?::date', period.dateTo);

  return {
    values,
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    selected: {
      teacherId,
      courseCode: courseCode || null,
      department: department || null,
      type: type || null,
    },
  };
}

function absenceSummary(row) {
  return {
    totalAbsences: Number(row.total_inasistencias || 0),
    affectedTeachers: Number(row.docentes_afectados || 0),
    recurrentTeachers: Number(row.docentes_reincidentes || 0),
    affectedCourses: Number(row.cursos_afectados || 0),
    courseAbsences: Number(row.inasistencias_curso || 0),
    institutionalAbsences: Number(row.inasistencias_institucionales || 0),
  };
}

router.get(
  '/inasistencias/analitica',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const period = normalizePeriod(req.query);
      const comparisonPeriod = previousPeriod(period);
      const page = clampInteger(req.query.pagina, 1, 1, 100000);
      const pageSize = clampInteger(req.query.limite, 12, 5, 50);
      const offset = (page - 1) * pageSize;
      const current = buildAbsenceWhere(req.query, period);
      const previous = buildAbsenceWhere(req.query, comparisonPeriod);

      const summarySql = (whereClause) => `
        WITH filtered AS (
          SELECT v.*
          FROM v_historial_asistencia_unificado v
          ${whereClause}
        ),
        teacher_counts AS (
          SELECT docente_id, COUNT(*)::int AS total
          FROM filtered
          GROUP BY docente_id
        )
        SELECT
          (SELECT COUNT(*) FROM filtered)::int AS total_inasistencias,
          (SELECT COUNT(DISTINCT docente_id) FROM filtered)::int AS docentes_afectados,
          (SELECT COUNT(*) FROM teacher_counts WHERE total >= 2)::int AS docentes_reincidentes,
          (SELECT COUNT(DISTINCT NULLIF(codigo_curso, '')) FROM filtered)::int AS cursos_afectados,
          (SELECT COUNT(*) FROM filtered WHERE tipo_objetivo = 'CURSO')::int AS inasistencias_curso,
          (SELECT COUNT(*) FROM filtered WHERE tipo_objetivo = 'INGRESO_INSTITUCIONAL')::int AS inasistencias_institucionales
      `;

      const recordValues = [...current.values, pageSize, offset];
      const limitPosition = current.values.length + 1;
      const offsetPosition = current.values.length + 2;

      const [
        summaryResult,
        previousSummaryResult,
        trendResult,
        departmentResult,
        teacherResult,
        recordResult,
      ] = await Promise.all([
        pool.query(summarySql(current.whereClause), current.values),
        pool.query(summarySql(previous.whereClause), previous.values),
        pool.query(
          `SELECT
             TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE v.tipo_objetivo = 'CURSO')::int AS curso,
             COUNT(*) FILTER (WHERE v.tipo_objetivo = 'INGRESO_INSTITUCIONAL')::int AS institucional
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY v.fecha
           ORDER BY v.fecha ASC`,
          current.values
        ),
        pool.query(
          `SELECT
             COALESCE(NULLIF(BTRIM(v.departamento), ''), 'Sin departamento') AS departamento,
             COUNT(*)::int AS total,
             COUNT(DISTINCT v.docente_id)::int AS docentes,
             COUNT(*) FILTER (WHERE v.tipo_objetivo = 'CURSO')::int AS curso,
             COUNT(*) FILTER (WHERE v.tipo_objetivo = 'INGRESO_INSTITUCIONAL')::int AS institucional
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY COALESCE(NULLIF(BTRIM(v.departamento), ''), 'Sin departamento')
           ORDER BY total DESC, departamento ASC
           LIMIT 10`,
          current.values
        ),
        pool.query(
          `SELECT
             v.docente_id,
             v.codigo_docente,
             CONCAT_WS(' ', v.nombres, v.apellidos) AS docente,
             COALESCE(NULLIF(BTRIM(v.departamento), ''), 'Sin departamento') AS departamento,
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE v.tipo_objetivo = 'CURSO')::int AS curso,
             COUNT(*) FILTER (WHERE v.tipo_objetivo = 'INGRESO_INSTITUCIONAL')::int AS institucional,
             TO_CHAR(MAX(v.fecha), 'YYYY-MM-DD') AS ultima_fecha
           FROM v_historial_asistencia_unificado v
           ${current.whereClause}
           GROUP BY
             v.docente_id,
             v.codigo_docente,
             v.nombres,
             v.apellidos,
             COALESCE(NULLIF(BTRIM(v.departamento), ''), 'Sin departamento')
           ORDER BY total DESC, ultima_fecha DESC, docente ASC
           LIMIT 10`,
          current.values
        ),
        pool.query(
          `SELECT
             v.registro_uid,
             v.docente_id,
             v.codigo_docente,
             CONCAT_WS(' ', v.nombres, v.apellidos) AS docente,
             v.email,
             v.departamento,
             v.tipo_objetivo,
             v.horario_curso_id,
             v.codigo_curso,
             v.curso,
             v.aula,
             TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
             TO_CHAR(hc.hora_inicio, 'HH24:MI') AS hora_programada,
             TO_CHAR(v.hora, 'HH24:MI') AS hora_registrada,
             v.estado,
             v.resultado,
             v.metodo_verificacion,
             v.fuente,
             v.detalle,
             v.creado_en
           FROM v_historial_asistencia_unificado v
           LEFT JOIN horarios_curso hc
             ON hc.id = v.horario_curso_id
           ${current.whereClause}
           ORDER BY v.fecha DESC, v.hora DESC, v.creado_en DESC
           LIMIT $${limitPosition}
           OFFSET $${offsetPosition}`,
          recordValues
        ),
      ]);

      const summary = absenceSummary(summaryResult.rows[0] || {});
      const previousSummary = absenceSummary(previousSummaryResult.rows[0] || {});
      const totalPages = Math.max(Math.ceil(summary.totalAbsences / pageSize), 1);

      return res.json({
        generatedAt: new Date().toISOString(),
        period: { from: period.dateFrom, to: period.dateTo },
        comparisonPeriod: {
          from: comparisonPeriod.dateFrom,
          to: comparisonPeriod.dateTo,
        },
        filters: current.selected,
        dataScope: {
          justificationWorkflowAvailable: false,
          note: 'El modelo actual no contiene un flujo formal de justificaciones. El reporte usa únicamente estados explícitos de inasistencia devueltos por la base de datos.',
        },
        summary,
        comparison: {
          totalAbsencesPercent: percentDelta(
            summary.totalAbsences,
            previousSummary.totalAbsences
          ),
          affectedTeachersPercent: percentDelta(
            summary.affectedTeachers,
            previousSummary.affectedTeachers
          ),
          recurrentTeachersPercent: percentDelta(
            summary.recurrentTeachers,
            previousSummary.recurrentTeachers
          ),
          courseAbsencesPercent: percentDelta(
            summary.courseAbsences,
            previousSummary.courseAbsences
          ),
        },
        trend: trendResult.rows.map((row) => ({
          date: row.fecha,
          total: Number(row.total || 0),
          course: Number(row.curso || 0),
          institutional: Number(row.institucional || 0),
        })),
        departments: departmentResult.rows.map((row) => ({
          department: row.departamento,
          total: Number(row.total || 0),
          teachers: Number(row.docentes || 0),
          course: Number(row.curso || 0),
          institutional: Number(row.institucional || 0),
        })),
        teachers: teacherResult.rows.map((row) => ({
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          department: row.departamento,
          total: Number(row.total || 0),
          course: Number(row.curso || 0),
          institutional: Number(row.institucional || 0),
          lastDate: row.ultima_fecha,
        })),
        records: recordResult.rows.map((row) => ({
          id: row.registro_uid,
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          email: row.email,
          department: row.departamento,
          type: row.tipo_objetivo,
          scheduleId: row.horario_curso_id === null
            ? null
            : Number(row.horario_curso_id),
          courseCode: row.codigo_curso,
          course: row.curso,
          classroom: row.aula,
          date: row.fecha,
          scheduledTime: row.hora_programada,
          registeredTime: row.hora_registrada,
          status: row.estado,
          result: row.resultado,
          method: row.metodo_verificacion,
          source: row.fuente,
          detail: row.detalle || {},
          createdAt: row.creado_en,
        })),
        pagination: {
          page,
          pageSize,
          totalRecords: summary.totalAbsences,
          totalPages,
          hasPrevious: page > 1,
          hasNext: page < totalPages,
        },
      });
    } catch (error) {
      console.error('Error al generar reporte analítico de inasistencias:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        requestId: req.id,
      });
      return res.status(500).json({
        error: 'No se pudo generar el reporte analítico de inasistencias.',
        codigo: 'ABSENCE_ANALYTICS_ERROR',
        request_id: req.id,
      });
    }
  }
);


router.get(
  '/docente/analitica',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const teacherId = toPositiveInteger(req.query.docente_id);
      const semesterId = toPositiveInteger(req.query.semestre_id);

      if (!teacherId) {
        return res.status(400).json({
          error: 'Seleccione un docente válido para generar el reporte.',
          codigo: 'TEACHER_REPORT_TEACHER_REQUIRED',
        });
      }

      let period = normalizePeriod(req.query);
      let selectedSemester = null;

      if (semesterId) {
        const semesterResult = await pool.query(
          `SELECT
             id,
             codigo,
             TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             activo
           FROM semestres
           WHERE id = $1`,
          [semesterId]
        );

        selectedSemester = semesterResult.rows[0] || null;

        if (!selectedSemester) {
          return res.status(404).json({
            error: 'El semestre seleccionado no existe.',
            codigo: 'TEACHER_REPORT_SEMESTER_NOT_FOUND',
          });
        }

        period = {
          dateFrom: selectedSemester.fecha_inicio,
          dateTo: selectedSemester.fecha_fin,
        };
      }

      const comparisonPeriod = previousPeriod(period);
      const profileResult = await pool.query(
        `SELECT
           d.id,
           u.codigo,
           u.nombres,
           u.apellidos,
           CONCAT_WS(' ', u.nombres, u.apellidos) AS nombre,
           u.email,
           u.activo,
           dep.id AS departamento_id,
           dep.codigo AS departamento_codigo,
           dep.nombre AS departamento,
           d.dni,
           d.categoria,
           d.condicion,
           d.telefono,
           d.foto_url
         FROM docentes d
         JOIN usuarios u ON u.id = d.usuario_id
         LEFT JOIN departamentos_academicos dep
           ON dep.id = d.departamento_id
         WHERE d.id = $1`,
        [teacherId]
      );

      const teacher = profileResult.rows[0] || null;

      if (!teacher) {
        return res.status(404).json({
          error: 'El docente seleccionado no existe.',
          codigo: 'TEACHER_REPORT_NOT_FOUND',
        });
      }

      const summarySql = `
        SELECT
          COUNT(*)::int AS total_registros,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'REGISTRADA'
          )::int AS registrados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
          )::int AS rechazados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'DUPLICADA'
          )::int AS duplicados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias,
          COUNT(*) FILTER (
            WHERE v.tipo_objetivo = 'INGRESO_INSTITUCIONAL'
          )::int AS ingresos_institucionales,
          COUNT(DISTINCT NULLIF(v.codigo_curso, ''))::int AS cursos_con_actividad,
          COUNT(DISTINCT v.fecha)::int AS dias_con_actividad,
          COALESCE(
            ROUND(AVG(
              CASE
                WHEN UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
                  AND hc.hora_inicio IS NOT NULL
                  AND v.hora IS NOT NULL
                THEN GREATEST(
                  EXTRACT(EPOCH FROM (v.hora - hc.hora_inicio)) / 60,
                  0
                )
                ELSE NULL
              END
            )::numeric, 1),
            0
          ) AS promedio_tardanza_minutos
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc
          ON hc.id = v.horario_curso_id
        WHERE v.docente_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
      `;

      const scheduleSql = `
        SELECT
          COUNT(DISTINCT hc.curso_id)::int AS cursos_asignados,
          COUNT(DISTINCT hc.id)::int AS bloques_horarios,
          COALESCE(
            SUM((
              SELECT COUNT(*)::int
              FROM generate_series(
                GREATEST($2::date, s.fecha_inicio),
                LEAST($3::date, s.fecha_fin),
                INTERVAL '1 day'
              ) AS calendario(fecha)
              WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
            )),
            0
          )::int AS sesiones_programadas
        FROM horarios_curso hc
        JOIN semestres s ON s.id = hc.semestre_id
        WHERE hc.docente_id = $1
          AND hc.activo = TRUE
          AND s.fecha_inicio <= $3::date
          AND s.fecha_fin >= $2::date
          AND ($4::int IS NULL OR hc.semestre_id = $4)
      `;

      const courseSql = `
        WITH selected_schedules AS (
          SELECT
            hc.id,
            hc.curso_id,
            hc.semestre_id,
            hc.aula,
            hc.dia_semana,
            hc.hora_inicio,
            hc.hora_fin,
            s.codigo AS semestre,
            (
              SELECT COUNT(*)::int
              FROM generate_series(
                GREATEST($2::date, s.fecha_inicio),
                LEAST($3::date, s.fecha_fin),
                INTERVAL '1 day'
              ) AS calendario(fecha)
              WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
            ) AS sesiones_programadas
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          WHERE hc.docente_id = $1
            AND hc.activo = TRUE
            AND s.fecha_inicio <= $3::date
            AND s.fecha_fin >= $2::date
            AND ($4::int IS NULL OR hc.semestre_id = $4)
        ),
        schedule_groups AS (
          SELECT
            ss.curso_id,
            ss.semestre_id,
            ss.semestre,
            STRING_AGG(DISTINCT ss.aula, ', ' ORDER BY ss.aula) AS aulas,
            STRING_AGG(
              DISTINCT CONCAT(
                CASE ss.dia_semana
                  WHEN 1 THEN 'Lun'
                  WHEN 2 THEN 'Mar'
                  WHEN 3 THEN 'Mié'
                  WHEN 4 THEN 'Jue'
                  WHEN 5 THEN 'Vie'
                  ELSE 'Día'
                END,
                ' ',
                TO_CHAR(ss.hora_inicio, 'HH24:MI'),
                '–',
                TO_CHAR(ss.hora_fin, 'HH24:MI')
              ),
              ' · '
            ) AS horario,
            COUNT(*)::int AS bloques_horarios,
            COALESCE(SUM(ss.sesiones_programadas), 0)::int AS sesiones_programadas
          FROM selected_schedules ss
          GROUP BY ss.curso_id, ss.semestre_id, ss.semestre
        ),
        record_groups AS (
          SELECT
            ss.curso_id,
            ss.semestre_id,
            COUNT(DISTINCT CASE
              WHEN v.registro_uid IS NOT NULL
              THEN CONCAT(v.horario_curso_id, ':', v.fecha)
              ELSE NULL
            END)::int AS sesiones_con_registro,
            COUNT(v.registro_uid)::int AS total_registros,
            COUNT(v.registro_uid) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
            )::int AS puntuales,
            COUNT(v.registro_uid) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
            )::int AS tardanzas,
            COUNT(v.registro_uid) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN (
                'INASISTENCIA', 'AUSENTE', 'FALTA'
              )
            )::int AS inasistencias
          FROM selected_schedules ss
          LEFT JOIN v_historial_asistencia_unificado v
            ON v.horario_curso_id = ss.id
           AND v.docente_id = $1
           AND v.fecha BETWEEN $2::date AND $3::date
          GROUP BY ss.curso_id, ss.semestre_id
        )
        SELECT
          c.id,
          c.codigo,
          c.nombre,
          sg.semestre_id,
          sg.semestre,
          sg.aulas,
          sg.horario,
          sg.bloques_horarios,
          sg.sesiones_programadas,
          COALESCE(rg.sesiones_con_registro, 0)::int AS sesiones_con_registro,
          COALESCE(rg.total_registros, 0)::int AS total_registros,
          COALESCE(rg.puntuales, 0)::int AS puntuales,
          COALESCE(rg.tardanzas, 0)::int AS tardanzas,
          COALESCE(rg.inasistencias, 0)::int AS inasistencias,
          COALESCE(
            ROUND(
              (
                100.0 * (COALESCE(rg.puntuales, 0) + COALESCE(rg.tardanzas, 0))
                / NULLIF(
                  COALESCE(rg.puntuales, 0) +
                  COALESCE(rg.tardanzas, 0) +
                  COALESCE(rg.inasistencias, 0),
                  0
                )
              )::numeric,
              1
            ),
            0
          ) AS cumplimiento
        FROM schedule_groups sg
        JOIN cursos c ON c.id = sg.curso_id
        LEFT JOIN record_groups rg
          ON rg.curso_id = sg.curso_id
         AND rg.semestre_id = sg.semestre_id
        ORDER BY sg.semestre DESC, c.nombre ASC
      `;

      const trendSql = `
        SELECT
          TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias
        FROM v_historial_asistencia_unificado v
        WHERE v.docente_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
        GROUP BY v.fecha
        ORDER BY v.fecha ASC
      `;

      const recentSql = `
        SELECT
          v.registro_uid,
          v.docente_id,
          v.codigo_docente,
          CONCAT_WS(' ', v.nombres, v.apellidos) AS docente,
          v.email,
          v.departamento,
          v.tipo_objetivo,
          v.horario_curso_id,
          v.codigo_curso,
          v.curso,
          v.aula,
          TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
          TO_CHAR(hc.hora_inicio, 'HH24:MI') AS hora_programada,
          TO_CHAR(v.hora, 'HH24:MI') AS hora_registrada,
          v.estado,
          v.resultado,
          v.metodo_verificacion,
          v.fuente,
          v.detalle,
          v.creado_en
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE v.docente_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
        ORDER BY v.fecha DESC, v.hora DESC, v.creado_en DESC
        LIMIT 20
      `;

      const methodSql = `
        SELECT
          COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO') AS metodo,
          COUNT(*)::int AS total
        FROM v_historial_asistencia_unificado v
        WHERE v.docente_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
        GROUP BY COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO')
        ORDER BY total DESC, metodo ASC
      `;

      const currentValues = [teacherId, period.dateFrom, period.dateTo];
      const scheduleValues = [
        teacherId,
        period.dateFrom,
        period.dateTo,
        semesterId,
      ];
      const previousValues = [
        teacherId,
        comparisonPeriod.dateFrom,
        comparisonPeriod.dateTo,
      ];

      const [
        summaryResult,
        previousSummaryResult,
        scheduleResult,
        coursesResult,
        trendResult,
        recentResult,
        methodsResult,
      ] = await Promise.all([
        pool.query(summarySql, currentValues),
        pool.query(summarySql, previousValues),
        pool.query(scheduleSql, scheduleValues),
        pool.query(courseSql, scheduleValues),
        pool.query(trendSql, currentValues),
        pool.query(recentSql, currentValues),
        pool.query(methodSql, currentValues),
      ]);

      const currentRow = summaryResult.rows[0] || {};
      const previousRow = previousSummaryResult.rows[0] || {};
      const scheduleRow = scheduleResult.rows[0] || {};

      function buildTeacherSummary(row) {
        const punctual = Number(row.puntuales || 0);
        const late = Number(row.tardanzas || 0);
        const absent = Number(row.inasistencias || 0);
        const attendanceCount = punctual + late;
        const evaluated = attendanceCount + absent;

        return {
          totalRecords: Number(row.total_registros || 0),
          registered: Number(row.registrados || 0),
          rejected: Number(row.rechazados || 0),
          duplicated: Number(row.duplicados || 0),
          punctual,
          late,
          absent,
          attendanceCount,
          complianceRate: evaluated > 0
            ? Math.round((attendanceCount / evaluated) * 1000) / 10
            : 0,
          punctualityRate: attendanceCount > 0
            ? Math.round((punctual / attendanceCount) * 1000) / 10
            : 0,
          institutionalEntries: Number(row.ingresos_institucionales || 0),
          coursesWithActivity: Number(row.cursos_con_actividad || 0),
          activeDays: Number(row.dias_con_actividad || 0),
          averageDelayMinutes: Number(row.promedio_tardanza_minutos || 0),
        };
      }

      const summary = {
        ...buildTeacherSummary(currentRow),
        assignedCourses: Number(scheduleRow.cursos_asignados || 0),
        scheduleSlots: Number(scheduleRow.bloques_horarios || 0),
        plannedSessions: Number(scheduleRow.sesiones_programadas || 0),
      };
      const previousSummary = buildTeacherSummary(previousRow);

      const courses = coursesResult.rows.map((row) => ({
        id: Number(row.id),
        code: row.codigo,
        name: row.nombre,
        semesterId: Number(row.semestre_id),
        semester: row.semestre,
        classrooms: row.aulas,
        schedule: row.horario,
        scheduleSlots: Number(row.bloques_horarios || 0),
        plannedSessions: Number(row.sesiones_programadas || 0),
        recordedSessions: Number(row.sesiones_con_registro || 0),
        totalRecords: Number(row.total_registros || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
        complianceRate: Number(row.cumplimiento || 0),
      }));

      const evaluatedCourses = courses.filter(
        (item) => item.punctual + item.late + item.absent > 0
      );
      const bestCourse = [...evaluatedCourses].sort(
        (a, b) => b.complianceRate - a.complianceRate
      )[0] || null;
      const attentionCourse = [...evaluatedCourses].sort(
        (a, b) => a.complianceRate - b.complianceRate
      )[0] || null;
      const topMethod = methodsResult.rows[0] || null;
      const trendRows = trendResult.rows.map((row) => ({
        date: row.fecha,
        total: Number(row.total || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
      }));

      return res.json({
        generatedAt: new Date().toISOString(),
        period: {
          from: period.dateFrom,
          to: period.dateTo,
        },
        comparisonPeriod: {
          from: comparisonPeriod.dateFrom,
          to: comparisonPeriod.dateTo,
        },
        selectedSemester: selectedSemester
          ? {
              id: Number(selectedSemester.id),
              code: selectedSemester.codigo,
              from: selectedSemester.fecha_inicio,
              to: selectedSemester.fecha_fin,
              active: Boolean(selectedSemester.activo),
            }
          : null,
        teacher: {
          id: Number(teacher.id),
          code: teacher.codigo,
          firstNames: teacher.nombres,
          lastNames: teacher.apellidos,
          name: teacher.nombre,
          email: teacher.email,
          active: Boolean(teacher.activo),
          departmentId: teacher.departamento_id === null
            ? null
            : Number(teacher.departamento_id),
          departmentCode: teacher.departamento_codigo,
          department: teacher.departamento,
          dni: teacher.dni,
          category: teacher.categoria,
          condition: teacher.condicion,
          phone: teacher.telefono,
          photoUrl: teacher.foto_url,
        },
        summary,
        comparison: {
          attendancePercent: percentDelta(
            summary.attendanceCount,
            previousSummary.attendanceCount
          ),
          latePercent: percentDelta(summary.late, previousSummary.late),
          absencePercent: percentDelta(summary.absent, previousSummary.absent),
          compliancePoints: Math.round(
            (summary.complianceRate - previousSummary.complianceRate) * 10
          ) / 10,
          punctualityPoints: Math.round(
            (summary.punctualityRate - previousSummary.punctualityRate) * 10
          ) / 10,
        },
        insights: {
          bestCourse,
          attentionCourse,
          topMethod: topMethod
            ? {
                method: topMethod.metodo,
                total: Number(topMethod.total || 0),
              }
            : null,
          scopeNote:
            'Los cursos y sesiones programadas proceden de horarios activos que intersectan el periodo seleccionado. Los indicadores de asistencia proceden del historial unificado.',
        },
        trend: trendRows,
        courses,
        methods: methodsResult.rows.map((row) => ({
          method: row.metodo,
          total: Number(row.total || 0),
        })),
        recent: recentResult.rows.map((row) => ({
          id: row.registro_uid,
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          email: row.email,
          department: row.departamento,
          type: row.tipo_objetivo,
          scheduleId: row.horario_curso_id === null
            ? null
            : Number(row.horario_curso_id),
          courseCode: row.codigo_curso,
          course: row.curso,
          classroom: row.aula,
          date: row.fecha,
          scheduledTime: row.hora_programada,
          registeredTime: row.hora_registrada,
          status: row.estado,
          result: row.resultado,
          method: row.metodo_verificacion,
          source: row.fuente,
          detail: row.detalle,
          createdAt: row.creado_en,
        })),
      });
    } catch (error) {
      console.error('Error al generar reporte premium por docente:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        requestId: req.id,
      });
      return res.status(500).json({
        error: 'No se pudo generar el reporte por docente.',
        codigo: 'TEACHER_REPORT_ERROR',
        request_id: req.id,
      });
    }
  }
);



router.get(
  '/curso/analitica',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const courseCode = cleanText(req.query.curso_codigo, 40);
      const semesterId = toPositiveInteger(req.query.semestre_id);

      if (!courseCode) {
        return res.status(400).json({
          error: 'Seleccione un curso válido para generar el reporte.',
          codigo: 'COURSE_REPORT_COURSE_REQUIRED',
        });
      }

      let period = normalizePeriod(req.query);
      let selectedSemester = null;

      if (semesterId) {
        const semesterResult = await pool.query(
          `SELECT
             id,
             codigo,
             TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             activo
           FROM semestres
           WHERE id = $1`,
          [semesterId]
        );

        selectedSemester = semesterResult.rows[0] || null;

        if (!selectedSemester) {
          return res.status(404).json({
            error: 'El semestre seleccionado no existe.',
            codigo: 'COURSE_REPORT_SEMESTER_NOT_FOUND',
          });
        }

        period = {
          dateFrom: selectedSemester.fecha_inicio,
          dateTo: selectedSemester.fecha_fin,
        };
      }

      const comparisonPeriod = previousPeriod(period);
      const courseResult = await pool.query(
        `SELECT
           c.id,
           c.codigo,
           c.nombre,
           c.creditos,
           c.activo,
           dep.id AS departamento_id,
           dep.codigo AS departamento_codigo,
           dep.nombre AS departamento
         FROM cursos c
         LEFT JOIN departamentos_academicos dep
           ON dep.id = c.departamento_id
         WHERE UPPER(c.codigo) = UPPER($1)`,
        [courseCode]
      );

      const course = courseResult.rows[0] || null;

      if (!course) {
        return res.status(404).json({
          error: 'El curso seleccionado no existe.',
          codigo: 'COURSE_REPORT_NOT_FOUND',
        });
      }

      const summarySql = `
        SELECT
          COUNT(*)::int AS total_registros,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'REGISTRADA'
          )::int AS registrados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
          )::int AS rechazados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'DUPLICADA'
          )::int AS duplicados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias,
          COUNT(DISTINCT v.docente_id)::int AS docentes_con_actividad,
          COUNT(DISTINCT v.fecha)::int AS dias_con_actividad,
          COUNT(DISTINCT CASE
            WHEN v.registro_uid IS NOT NULL
            THEN CONCAT(v.horario_curso_id, ':', v.fecha)
            ELSE NULL
          END)::int AS sesiones_con_registro,
          COALESCE(
            ROUND(AVG(
              CASE
                WHEN UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
                  AND hc.hora_inicio IS NOT NULL
                  AND v.hora IS NOT NULL
                THEN GREATEST(
                  EXTRACT(EPOCH FROM (v.hora - hc.hora_inicio)) / 60,
                  0
                )
                ELSE NULL
              END
            )::numeric, 1),
            0
          ) AS promedio_tardanza_minutos
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc
          ON hc.id = v.horario_curso_id
        WHERE UPPER(COALESCE(v.codigo_curso, '')) = UPPER($1)
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4)
      `;

      const scheduleSql = `
        SELECT
          COUNT(DISTINCT hc.docente_id)::int AS docentes_asignados,
          COUNT(DISTINCT hc.id)::int AS bloques_horarios,
          COUNT(DISTINCT NULLIF(BTRIM(hc.aula), ''))::int AS aulas,
          COALESCE(
            STRING_AGG(DISTINCT NULLIF(BTRIM(hc.aula), ''), ', '),
            ''
          ) AS lista_aulas,
          COALESCE(
            SUM((
              SELECT COUNT(*)::int
              FROM generate_series(
                GREATEST($2::date, s.fecha_inicio),
                LEAST($3::date, s.fecha_fin),
                INTERVAL '1 day'
              ) AS calendario(fecha)
              WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
            )),
            0
          )::int AS sesiones_programadas
        FROM horarios_curso hc
        JOIN semestres s ON s.id = hc.semestre_id
        WHERE hc.curso_id = $1
          AND hc.activo = TRUE
          AND s.fecha_inicio <= $3::date
          AND s.fecha_fin >= $2::date
          AND ($4::int IS NULL OR hc.semestre_id = $4)
      `;

      const teacherSql = `
        WITH selected_schedules AS (
          SELECT
            hc.id,
            hc.docente_id,
            hc.semestre_id,
            hc.aula,
            hc.dia_semana,
            hc.hora_inicio,
            hc.hora_fin,
            s.codigo AS semestre,
            (
              SELECT COUNT(*)::int
              FROM generate_series(
                GREATEST($2::date, s.fecha_inicio),
                LEAST($3::date, s.fecha_fin),
                INTERVAL '1 day'
              ) AS calendario(fecha)
              WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
            ) AS sesiones_programadas
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          WHERE hc.curso_id = $1
            AND hc.activo = TRUE
            AND s.fecha_inicio <= $3::date
            AND s.fecha_fin >= $2::date
            AND ($4::int IS NULL OR hc.semestre_id = $4)
        ),
        schedule_groups AS (
          SELECT
            ss.docente_id,
            COUNT(DISTINCT ss.id)::int AS bloques_horarios,
            COALESCE(SUM(ss.sesiones_programadas), 0)::int AS sesiones_programadas,
            STRING_AGG(DISTINCT ss.semestre, ', ' ORDER BY ss.semestre) AS semestres,
            STRING_AGG(DISTINCT ss.aula, ', ' ORDER BY ss.aula) AS aulas,
            STRING_AGG(
              DISTINCT CONCAT(
                CASE ss.dia_semana
                  WHEN 1 THEN 'Lun'
                  WHEN 2 THEN 'Mar'
                  WHEN 3 THEN 'Mié'
                  WHEN 4 THEN 'Jue'
                  WHEN 5 THEN 'Vie'
                  WHEN 6 THEN 'Sáb'
                  WHEN 7 THEN 'Dom'
                  ELSE 'Día'
                END,
                ' ',
                TO_CHAR(ss.hora_inicio, 'HH24:MI'),
                '–',
                TO_CHAR(ss.hora_fin, 'HH24:MI')
              ),
              ' · '
            ) AS horario
          FROM selected_schedules ss
          GROUP BY ss.docente_id
        ),
        record_groups AS (
          SELECT
            ss.docente_id,
            COUNT(DISTINCT CASE
              WHEN v.registro_uid IS NOT NULL
              THEN CONCAT(v.horario_curso_id, ':', v.fecha)
              ELSE NULL
            END)::int AS sesiones_con_registro,
            COUNT(v.registro_uid)::int AS total_registros,
            COUNT(v.registro_uid) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
            )::int AS puntuales,
            COUNT(v.registro_uid) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
            )::int AS tardanzas,
            COUNT(v.registro_uid) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN (
                'INASISTENCIA', 'AUSENTE', 'FALTA'
              )
            )::int AS inasistencias
          FROM selected_schedules ss
          LEFT JOIN v_historial_asistencia_unificado v
            ON v.horario_curso_id = ss.id
           AND v.fecha BETWEEN $2::date AND $3::date
          GROUP BY ss.docente_id
        )
        SELECT
          d.id,
          u.codigo,
          CONCAT_WS(' ', u.nombres, u.apellidos) AS docente,
          u.email,
          u.activo,
          dep.codigo AS departamento_codigo,
          dep.nombre AS departamento,
          sg.semestres,
          sg.aulas,
          sg.horario,
          sg.bloques_horarios,
          sg.sesiones_programadas,
          COALESCE(rg.sesiones_con_registro, 0)::int AS sesiones_con_registro,
          COALESCE(rg.total_registros, 0)::int AS total_registros,
          COALESCE(rg.puntuales, 0)::int AS puntuales,
          COALESCE(rg.tardanzas, 0)::int AS tardanzas,
          COALESCE(rg.inasistencias, 0)::int AS inasistencias,
          COALESCE(
            ROUND(
              100.0 * (COALESCE(rg.puntuales, 0) + COALESCE(rg.tardanzas, 0))
              / NULLIF(
                COALESCE(rg.puntuales, 0) +
                COALESCE(rg.tardanzas, 0) +
                COALESCE(rg.inasistencias, 0),
                0
              ),
              1
            ),
            0
          ) AS cumplimiento,
          COALESCE(
            ROUND(
              100.0 * COALESCE(rg.sesiones_con_registro, 0)
              / NULLIF(sg.sesiones_programadas, 0),
              1
            ),
            0
          ) AS cobertura
        FROM schedule_groups sg
        JOIN docentes d ON d.id = sg.docente_id
        JOIN usuarios u ON u.id = d.usuario_id
        LEFT JOIN departamentos_academicos dep
          ON dep.id = d.departamento_id
        LEFT JOIN record_groups rg
          ON rg.docente_id = sg.docente_id
        ORDER BY cumplimiento DESC, docente ASC
      `;

      const trendSql = `
        SELECT
          TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE UPPER(COALESCE(v.codigo_curso, '')) = UPPER($1)
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4)
        GROUP BY v.fecha
        ORDER BY v.fecha ASC
      `;

      const schedulePreviewSql = `
        WITH preview AS (
          SELECT
            hc.id,
            hc.docente_id,
            hc.semestre_id,
            hc.aula,
            hc.dia_semana,
            hc.hora_inicio,
            hc.hora_fin,
            s.codigo AS semestre,
            (
              SELECT COUNT(*)::int
              FROM generate_series(
                GREATEST($2::date, s.fecha_inicio),
                LEAST($3::date, s.fecha_fin),
                INTERVAL '1 day'
              ) AS calendario(fecha)
              WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
            ) AS sesiones_programadas
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          WHERE hc.curso_id = $1
            AND hc.activo = TRUE
            AND s.fecha_inicio <= $3::date
            AND s.fecha_fin >= $2::date
            AND ($4::int IS NULL OR hc.semestre_id = $4)
          ORDER BY hc.dia_semana, hc.hora_inicio, hc.id
          LIMIT 240
        )
        SELECT
          p.id,
          p.dia_semana,
          CASE p.dia_semana
            WHEN 1 THEN 'Lunes'
            WHEN 2 THEN 'Martes'
            WHEN 3 THEN 'Miércoles'
            WHEN 4 THEN 'Jueves'
            WHEN 5 THEN 'Viernes'
            WHEN 6 THEN 'Sábado'
            WHEN 7 THEN 'Domingo'
            ELSE 'Día'
          END AS dia,
          TO_CHAR(p.hora_inicio, 'HH24:MI') AS hora_inicio,
          TO_CHAR(p.hora_fin, 'HH24:MI') AS hora_fin,
          p.aula,
          p.semestre_id,
          p.semestre,
          p.sesiones_programadas,
          d.id AS docente_id,
          u.codigo AS codigo_docente,
          CONCAT_WS(' ', u.nombres, u.apellidos) AS docente,
          COUNT(DISTINCT CASE
            WHEN v.registro_uid IS NOT NULL
            THEN CONCAT(v.horario_curso_id, ':', v.fecha)
            ELSE NULL
          END)::int AS sesiones_con_registro
        FROM preview p
        JOIN docentes d ON d.id = p.docente_id
        JOIN usuarios u ON u.id = d.usuario_id
        LEFT JOIN v_historial_asistencia_unificado v
          ON v.horario_curso_id = p.id
         AND v.fecha BETWEEN $2::date AND $3::date
        GROUP BY
          p.id, p.dia_semana, p.hora_inicio, p.hora_fin, p.aula,
          p.semestre_id, p.semestre, p.sesiones_programadas,
          d.id, u.codigo, u.nombres, u.apellidos
        ORDER BY p.dia_semana, p.hora_inicio, p.id
      `;

      const recentSql = `
        SELECT
          v.registro_uid,
          v.docente_id,
          v.codigo_docente,
          CONCAT_WS(' ', v.nombres, v.apellidos) AS docente,
          v.email,
          v.departamento,
          v.tipo_objetivo,
          v.horario_curso_id,
          v.codigo_curso,
          v.curso,
          v.aula,
          TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
          TO_CHAR(hc.hora_inicio, 'HH24:MI') AS hora_programada,
          TO_CHAR(v.hora, 'HH24:MI') AS hora_registrada,
          v.estado,
          v.resultado,
          v.metodo_verificacion,
          v.fuente,
          v.detalle,
          v.creado_en
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE UPPER(COALESCE(v.codigo_curso, '')) = UPPER($1)
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4)
        ORDER BY v.fecha DESC, v.hora DESC, v.creado_en DESC
        LIMIT 30
      `;

      const methodSql = `
        SELECT
          COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO') AS metodo,
          COUNT(*)::int AS total
        FROM v_historial_asistencia_unificado v
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE UPPER(COALESCE(v.codigo_curso, '')) = UPPER($1)
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4)
        GROUP BY COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO')
        ORDER BY total DESC, metodo ASC
      `;

      const currentValues = [course.codigo, period.dateFrom, period.dateTo, semesterId];
      const previousValues = [
        course.codigo,
        comparisonPeriod.dateFrom,
        comparisonPeriod.dateTo,
        semesterId,
      ];
      const scheduleValues = [course.id, period.dateFrom, period.dateTo, semesterId];
      const previousScheduleValues = [
        course.id,
        comparisonPeriod.dateFrom,
        comparisonPeriod.dateTo,
        semesterId,
      ];

      const [
        summaryResult,
        previousSummaryResult,
        scheduleResult,
        previousScheduleResult,
        teachersResult,
        trendResult,
        schedulePreviewResult,
        recentResult,
        methodsResult,
      ] = await Promise.all([
        pool.query(summarySql, currentValues),
        pool.query(summarySql, previousValues),
        pool.query(scheduleSql, scheduleValues),
        pool.query(scheduleSql, previousScheduleValues),
        pool.query(teacherSql, scheduleValues),
        pool.query(trendSql, currentValues),
        pool.query(schedulePreviewSql, scheduleValues),
        pool.query(recentSql, currentValues),
        pool.query(methodSql, currentValues),
      ]);

      function buildCourseSummary(row, scheduleRow) {
        const punctual = Number(row.puntuales || 0);
        const late = Number(row.tardanzas || 0);
        const absent = Number(row.inasistencias || 0);
        const attendanceCount = punctual + late;
        const evaluated = attendanceCount + absent;
        const plannedSessions = Number(scheduleRow.sesiones_programadas || 0);
        const recordedSessions = Number(row.sesiones_con_registro || 0);

        return {
          totalRecords: Number(row.total_registros || 0),
          registered: Number(row.registrados || 0),
          rejected: Number(row.rechazados || 0),
          duplicated: Number(row.duplicados || 0),
          punctual,
          late,
          absent,
          attendanceCount,
          complianceRate: evaluated > 0
            ? Math.round((attendanceCount / evaluated) * 1000) / 10
            : 0,
          punctualityRate: attendanceCount > 0
            ? Math.round((punctual / attendanceCount) * 1000) / 10
            : 0,
          coverageRate: plannedSessions > 0
            ? Math.round((recordedSessions / plannedSessions) * 1000) / 10
            : 0,
          assignedTeachers: Number(scheduleRow.docentes_asignados || 0),
          teachersWithActivity: Number(row.docentes_con_actividad || 0),
          scheduleSlots: Number(scheduleRow.bloques_horarios || 0),
          plannedSessions,
          recordedSessions,
          activeDays: Number(row.dias_con_actividad || 0),
          classrooms: Number(scheduleRow.aulas || 0),
          classroomList: scheduleRow.lista_aulas || '',
          averageDelayMinutes: Number(row.promedio_tardanza_minutos || 0),
        };
      }

      const summary = buildCourseSummary(
        summaryResult.rows[0] || {},
        scheduleResult.rows[0] || {}
      );
      const previousSummary = buildCourseSummary(
        previousSummaryResult.rows[0] || {},
        previousScheduleResult.rows[0] || {}
      );

      const teachers = teachersResult.rows.map((row) => ({
        id: Number(row.id),
        code: row.codigo,
        name: row.docente,
        email: row.email,
        active: Boolean(row.activo),
        departmentCode: row.departamento_codigo,
        department: row.departamento,
        semesters: row.semestres,
        classrooms: row.aulas,
        schedule: row.horario,
        scheduleSlots: Number(row.bloques_horarios || 0),
        plannedSessions: Number(row.sesiones_programadas || 0),
        recordedSessions: Number(row.sesiones_con_registro || 0),
        totalRecords: Number(row.total_registros || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
        complianceRate: Number(row.cumplimiento || 0),
        coverageRate: Number(row.cobertura || 0),
      }));

      const evaluatedTeachers = teachers.filter(
        (item) => item.punctual + item.late + item.absent > 0
      );
      const bestTeacher = [...evaluatedTeachers].sort(
        (a, b) => b.complianceRate - a.complianceRate
      )[0] || null;
      const attentionTeacher = [...evaluatedTeachers].sort(
        (a, b) => a.complianceRate - b.complianceRate
      )[0] || null;
      const topMethod = methodsResult.rows[0] || null;
      const trend = trendResult.rows.map((row) => ({
        date: row.fecha,
        total: Number(row.total || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
      }));
      const busiestDay = [...trend].sort((a, b) => b.total - a.total)[0] || null;

      return res.json({
        generatedAt: new Date().toISOString(),
        period: { from: period.dateFrom, to: period.dateTo },
        comparisonPeriod: {
          from: comparisonPeriod.dateFrom,
          to: comparisonPeriod.dateTo,
        },
        selectedSemester: selectedSemester
          ? {
              id: Number(selectedSemester.id),
              code: selectedSemester.codigo,
              from: selectedSemester.fecha_inicio,
              to: selectedSemester.fecha_fin,
              active: Boolean(selectedSemester.activo),
            }
          : null,
        course: {
          id: Number(course.id),
          code: course.codigo,
          name: course.nombre,
          credits: Number(course.creditos || 0),
          active: Boolean(course.activo),
          departmentId: course.departamento_id === null
            ? null
            : Number(course.departamento_id),
          departmentCode: course.departamento_codigo,
          department: course.departamento,
        },
        summary,
        comparison: {
          attendancePercent: percentDelta(
            summary.attendanceCount,
            previousSummary.attendanceCount
          ),
          latePercent: percentDelta(summary.late, previousSummary.late),
          absencePercent: percentDelta(summary.absent, previousSummary.absent),
          compliancePoints: Math.round(
            (summary.complianceRate - previousSummary.complianceRate) * 10
          ) / 10,
          coveragePoints: Math.round(
            (summary.coverageRate - previousSummary.coverageRate) * 10
          ) / 10,
        },
        insights: {
          bestTeacher,
          attentionTeacher,
          topMethod: topMethod
            ? {
                method: topMethod.metodo,
                total: Number(topMethod.total || 0),
              }
            : null,
          busiestDay,
          scopeNote:
            'La programación procede de horarios activos que intersectan el periodo seleccionado. El desempeño y la trazabilidad proceden del historial unificado de asistencia.',
        },
        trend,
        teachers,
        schedules: schedulePreviewResult.rows.map((row) => ({
          id: Number(row.id),
          weekday: Number(row.dia_semana),
          day: row.dia,
          startTime: row.hora_inicio,
          endTime: row.hora_fin,
          classroom: row.aula,
          semesterId: Number(row.semestre_id),
          semester: row.semestre,
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          plannedSessions: Number(row.sesiones_programadas || 0),
          recordedSessions: Number(row.sesiones_con_registro || 0),
        })),
        schedulePreviewLimit: 240,
        methods: methodsResult.rows.map((row) => ({
          method: row.metodo,
          total: Number(row.total || 0),
        })),
        recent: recentResult.rows.map((row) => ({
          id: row.registro_uid,
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          email: row.email,
          department: row.departamento,
          type: row.tipo_objetivo,
          scheduleId: row.horario_curso_id === null
            ? null
            : Number(row.horario_curso_id),
          courseCode: row.codigo_curso,
          course: row.curso,
          classroom: row.aula,
          date: row.fecha,
          scheduledTime: row.hora_programada,
          registeredTime: row.hora_registrada,
          status: row.estado,
          result: row.resultado,
          method: row.metodo_verificacion,
          source: row.fuente,
          detail: row.detalle,
          createdAt: row.creado_en,
        })),
      });
    } catch (error) {
      console.error('Error al generar reporte premium por curso:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        requestId: req.id,
      });
      return res.status(500).json({
        error: 'No se pudo generar el reporte por curso.',
        codigo: 'COURSE_REPORT_ERROR',
        request_id: req.id,
      });
    }
  }
);


router.get(
  '/departamento/analitica',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const departmentId = toPositiveInteger(req.query.departamento_id);
      const semesterId = toPositiveInteger(req.query.semestre_id);

      if (!departmentId) {
        return res.status(400).json({
          error: 'Seleccione un departamento válido para generar el reporte.',
          codigo: 'DEPARTMENT_REPORT_DEPARTMENT_REQUIRED',
        });
      }

      let period = normalizePeriod(req.query);
      let selectedSemester = null;

      if (semesterId) {
        const semesterResult = await pool.query(
          `SELECT
             id,
             codigo,
             TO_CHAR(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
             TO_CHAR(fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
             activo
           FROM semestres
           WHERE id = $1`,
          [semesterId]
        );

        selectedSemester = semesterResult.rows[0] || null;

        if (!selectedSemester) {
          return res.status(404).json({
            error: 'El semestre seleccionado no existe.',
            codigo: 'DEPARTMENT_REPORT_SEMESTER_NOT_FOUND',
          });
        }

        period = {
          dateFrom: selectedSemester.fecha_inicio,
          dateTo: selectedSemester.fecha_fin,
        };
      }

      const comparisonPeriod = previousPeriod(period);

      const departmentResult = await pool.query(
        `SELECT id, codigo, nombre, activo
         FROM departamentos_academicos
         WHERE id = $1`,
        [departmentId]
      );

      const department = departmentResult.rows[0] || null;

      if (!department) {
        return res.status(404).json({
          error: 'El departamento seleccionado no existe.',
          codigo: 'DEPARTMENT_REPORT_NOT_FOUND',
        });
      }

      const summarySql = `
        SELECT
          COUNT(*)::int AS total_registros,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'REGISTRADA'
          )::int AS registrados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'RECHAZADA'
          )::int AS rechazados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.resultado, '')) = 'DUPLICADA'
          )::int AS duplicados,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias,
          COUNT(*) FILTER (
            WHERE v.tipo_objetivo = 'CURSO'
          )::int AS registros_curso,
          COUNT(*) FILTER (
            WHERE v.tipo_objetivo = 'INGRESO_INSTITUCIONAL'
          )::int AS ingresos_institucionales,
          COUNT(DISTINCT v.docente_id)::int AS docentes_con_actividad,
          COUNT(DISTINCT NULLIF(v.codigo_curso, ''))::int AS cursos_con_actividad,
          COUNT(DISTINCT v.fecha)::int AS dias_con_actividad,
          COUNT(DISTINCT CASE
            WHEN v.horario_curso_id IS NOT NULL
            THEN CONCAT(v.horario_curso_id, ':', v.fecha)
            ELSE NULL
          END)::int AS sesiones_con_registro,
          COALESCE(
            ROUND(AVG(
              CASE
                WHEN UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
                  AND hc.hora_inicio IS NOT NULL
                  AND v.hora IS NOT NULL
                THEN GREATEST(
                  EXTRACT(EPOCH FROM (v.hora - hc.hora_inicio)) / 60,
                  0
                )
                ELSE NULL
              END
            )::numeric, 1),
            0
          ) AS promedio_tardanza_minutos
        FROM v_historial_asistencia_unificado v
        JOIN docentes d ON d.id = v.docente_id
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE d.departamento_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
      `;

      const scheduleSql = `
        WITH selected_schedules AS (
          SELECT
            hc.id,
            hc.docente_id,
            hc.curso_id,
            hc.semestre_id,
            (
              SELECT COUNT(*)::int
              FROM generate_series(
                GREATEST($2::date, s.fecha_inicio),
                LEAST($3::date, s.fecha_fin),
                INTERVAL '1 day'
              ) AS calendario(fecha)
              WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
            ) AS sesiones_programadas
          FROM horarios_curso hc
          JOIN docentes d ON d.id = hc.docente_id
          JOIN semestres s ON s.id = hc.semestre_id
          WHERE d.departamento_id = $1
            AND hc.activo = TRUE
            AND s.fecha_inicio <= $3::date
            AND s.fecha_fin >= $2::date
            AND ($4::int IS NULL OR hc.semestre_id = $4)
        )
        SELECT
          COUNT(DISTINCT d.id) FILTER (
            WHERE u.activo = TRUE
          )::int AS docentes_activos,
          COUNT(DISTINCT c.id) FILTER (
            WHERE c.activo = TRUE
          )::int AS cursos_activos,
          COUNT(DISTINCT ss.id)::int AS bloques_horarios,
          COALESCE(SUM(ss.sesiones_programadas), 0)::int AS sesiones_programadas
        FROM docentes d
        JOIN usuarios u ON u.id = d.usuario_id
        LEFT JOIN selected_schedules ss ON ss.docente_id = d.id
        LEFT JOIN cursos c
          ON c.id = ss.curso_id
         AND c.departamento_id = $1
        WHERE d.departamento_id = $1
      `;

      const teacherSql = `
        WITH selected_teachers AS (
          SELECT
            d.id,
            u.codigo,
            CONCAT_WS(' ', u.nombres, u.apellidos) AS docente,
            u.email,
            u.activo,
            d.categoria,
            d.condicion
          FROM docentes d
          JOIN usuarios u ON u.id = d.usuario_id
          WHERE d.departamento_id = $1
        ),
        schedule_groups AS (
          SELECT
            hc.docente_id,
            COUNT(DISTINCT hc.curso_id)::int AS cursos_asignados,
            COUNT(DISTINCT hc.id)::int AS bloques_horarios,
            COALESCE(
              SUM((
                SELECT COUNT(*)::int
                FROM generate_series(
                  GREATEST($2::date, s.fecha_inicio),
                  LEAST($3::date, s.fecha_fin),
                  INTERVAL '1 day'
                ) AS calendario(fecha)
                WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
              )),
              0
            )::int AS sesiones_programadas
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          JOIN docentes d ON d.id = hc.docente_id
          WHERE d.departamento_id = $1
            AND hc.activo = TRUE
            AND s.fecha_inicio <= $3::date
            AND s.fecha_fin >= $2::date
            AND ($4::int IS NULL OR hc.semestre_id = $4)
          GROUP BY hc.docente_id
        ),
        record_groups AS (
          SELECT
            v.docente_id,
            COUNT(DISTINCT CASE
              WHEN v.horario_curso_id IS NOT NULL
              THEN CONCAT(v.horario_curso_id, ':', v.fecha)
              ELSE NULL
            END)::int AS sesiones_con_registro,
            COUNT(*)::int AS total_registros,
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
            )::int AS puntuales,
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
            )::int AS tardanzas,
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN (
                'INASISTENCIA', 'AUSENTE', 'FALTA'
              )
            )::int AS inasistencias
          FROM v_historial_asistencia_unificado v
          JOIN docentes d ON d.id = v.docente_id
          LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
          WHERE d.departamento_id = $1
            AND v.fecha BETWEEN $2::date AND $3::date
            AND ($4::int IS NULL OR hc.semestre_id = $4 OR v.horario_curso_id IS NULL)
          GROUP BY v.docente_id
        )
        SELECT
          st.id,
          st.codigo,
          st.docente,
          st.email,
          st.activo,
          st.categoria,
          st.condicion,
          COALESCE(sg.cursos_asignados, 0)::int AS cursos_asignados,
          COALESCE(sg.bloques_horarios, 0)::int AS bloques_horarios,
          COALESCE(sg.sesiones_programadas, 0)::int AS sesiones_programadas,
          COALESCE(rg.sesiones_con_registro, 0)::int AS sesiones_con_registro,
          COALESCE(rg.total_registros, 0)::int AS total_registros,
          COALESCE(rg.puntuales, 0)::int AS puntuales,
          COALESCE(rg.tardanzas, 0)::int AS tardanzas,
          COALESCE(rg.inasistencias, 0)::int AS inasistencias,
          COALESCE(
            ROUND(
              100.0 * (COALESCE(rg.puntuales, 0) + COALESCE(rg.tardanzas, 0))
              / NULLIF(
                COALESCE(rg.puntuales, 0) +
                COALESCE(rg.tardanzas, 0) +
                COALESCE(rg.inasistencias, 0),
                0
              ),
              1
            ),
            0
          ) AS cumplimiento,
          COALESCE(
            ROUND(
              100.0 * COALESCE(rg.puntuales, 0)
              / NULLIF(
                COALESCE(rg.puntuales, 0) + COALESCE(rg.tardanzas, 0),
                0
              ),
              1
            ),
            0
          ) AS puntualidad,
          COALESCE(
            ROUND(
              100.0 * COALESCE(rg.sesiones_con_registro, 0)
              / NULLIF(COALESCE(sg.sesiones_programadas, 0), 0),
              1
            ),
            0
          ) AS cobertura
        FROM selected_teachers st
        LEFT JOIN schedule_groups sg ON sg.docente_id = st.id
        LEFT JOIN record_groups rg ON rg.docente_id = st.id
        ORDER BY cumplimiento DESC, puntualidad DESC, st.docente ASC
      `;

      const courseSql = `
        WITH selected_courses AS (
          SELECT id, codigo, nombre, creditos, activo
          FROM cursos
          WHERE departamento_id = $1
        ),
        schedule_groups AS (
          SELECT
            hc.curso_id,
            COUNT(DISTINCT hc.docente_id)::int AS docentes_asignados,
            COUNT(DISTINCT hc.id)::int AS bloques_horarios,
            COALESCE(
              SUM((
                SELECT COUNT(*)::int
                FROM generate_series(
                  GREATEST($2::date, s.fecha_inicio),
                  LEAST($3::date, s.fecha_fin),
                  INTERVAL '1 day'
                ) AS calendario(fecha)
                WHERE EXTRACT(ISODOW FROM calendario.fecha)::int = hc.dia_semana
              )),
              0
            )::int AS sesiones_programadas
          FROM horarios_curso hc
          JOIN semestres s ON s.id = hc.semestre_id
          JOIN cursos c ON c.id = hc.curso_id
          WHERE c.departamento_id = $1
            AND hc.activo = TRUE
            AND s.fecha_inicio <= $3::date
            AND s.fecha_fin >= $2::date
            AND ($4::int IS NULL OR hc.semestre_id = $4)
          GROUP BY hc.curso_id
        ),
        record_groups AS (
          SELECT
            c.id AS curso_id,
            COUNT(DISTINCT CASE
              WHEN v.horario_curso_id IS NOT NULL
              THEN CONCAT(v.horario_curso_id, ':', v.fecha)
              ELSE NULL
            END)::int AS sesiones_con_registro,
            COUNT(*)::int AS total_registros,
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
            )::int AS puntuales,
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
            )::int AS tardanzas,
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(v.estado, '')) IN (
                'INASISTENCIA', 'AUSENTE', 'FALTA'
              )
            )::int AS inasistencias
          FROM cursos c
          LEFT JOIN v_historial_asistencia_unificado v
            ON UPPER(COALESCE(v.codigo_curso, '')) = UPPER(c.codigo)
           AND v.fecha BETWEEN $2::date AND $3::date
          LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
          WHERE c.departamento_id = $1
            AND ($4::int IS NULL OR hc.semestre_id = $4 OR v.horario_curso_id IS NULL)
          GROUP BY c.id
        )
        SELECT
          sc.id,
          sc.codigo,
          sc.nombre,
          sc.creditos,
          sc.activo,
          COALESCE(sg.docentes_asignados, 0)::int AS docentes_asignados,
          COALESCE(sg.bloques_horarios, 0)::int AS bloques_horarios,
          COALESCE(sg.sesiones_programadas, 0)::int AS sesiones_programadas,
          COALESCE(rg.sesiones_con_registro, 0)::int AS sesiones_con_registro,
          COALESCE(rg.total_registros, 0)::int AS total_registros,
          COALESCE(rg.puntuales, 0)::int AS puntuales,
          COALESCE(rg.tardanzas, 0)::int AS tardanzas,
          COALESCE(rg.inasistencias, 0)::int AS inasistencias,
          COALESCE(
            ROUND(
              100.0 * (COALESCE(rg.puntuales, 0) + COALESCE(rg.tardanzas, 0))
              / NULLIF(
                COALESCE(rg.puntuales, 0) +
                COALESCE(rg.tardanzas, 0) +
                COALESCE(rg.inasistencias, 0),
                0
              ),
              1
            ),
            0
          ) AS cumplimiento,
          COALESCE(
            ROUND(
              100.0 * COALESCE(rg.sesiones_con_registro, 0)
              / NULLIF(COALESCE(sg.sesiones_programadas, 0), 0),
              1
            ),
            0
          ) AS cobertura
        FROM selected_courses sc
        LEFT JOIN schedule_groups sg ON sg.curso_id = sc.id
        LEFT JOIN record_groups rg ON rg.curso_id = sc.id
        ORDER BY cumplimiento DESC, sc.nombre ASC
      `;

      const trendSql = `
        SELECT
          TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN ('PUNTUAL', 'PRESENTE')
          )::int AS puntuales,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) = 'TARDANZA'
          )::int AS tardanzas,
          COUNT(*) FILTER (
            WHERE UPPER(COALESCE(v.estado, '')) IN (
              'INASISTENCIA', 'AUSENTE', 'FALTA'
            )
          )::int AS inasistencias
        FROM v_historial_asistencia_unificado v
        JOIN docentes d ON d.id = v.docente_id
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE d.departamento_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4 OR v.horario_curso_id IS NULL)
        GROUP BY v.fecha
        ORDER BY v.fecha ASC
      `;

      const methodSql = `
        SELECT
          COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO') AS metodo,
          COUNT(*)::int AS total
        FROM v_historial_asistencia_unificado v
        JOIN docentes d ON d.id = v.docente_id
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE d.departamento_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4 OR v.horario_curso_id IS NULL)
        GROUP BY COALESCE(NULLIF(BTRIM(v.metodo_verificacion), ''), 'SIN_METODO')
        ORDER BY total DESC, metodo ASC
      `;

      const recentSql = `
        SELECT
          v.registro_uid,
          v.docente_id,
          v.codigo_docente,
          CONCAT_WS(' ', v.nombres, v.apellidos) AS docente,
          v.email,
          v.departamento,
          v.tipo_objetivo,
          v.horario_curso_id,
          v.codigo_curso,
          v.curso,
          v.aula,
          TO_CHAR(v.fecha, 'YYYY-MM-DD') AS fecha,
          TO_CHAR(hc.hora_inicio, 'HH24:MI') AS hora_programada,
          TO_CHAR(v.hora, 'HH24:MI') AS hora_registrada,
          v.estado,
          v.resultado,
          v.metodo_verificacion,
          v.fuente,
          v.detalle,
          v.creado_en
        FROM v_historial_asistencia_unificado v
        JOIN docentes d ON d.id = v.docente_id
        LEFT JOIN horarios_curso hc ON hc.id = v.horario_curso_id
        WHERE d.departamento_id = $1
          AND v.fecha BETWEEN $2::date AND $3::date
          AND ($4::int IS NULL OR hc.semestre_id = $4 OR v.horario_curso_id IS NULL)
        ORDER BY v.fecha DESC, v.hora DESC, v.creado_en DESC
        LIMIT 24
      `;

      const currentValues = [
        departmentId,
        period.dateFrom,
        period.dateTo,
        semesterId,
      ];
      const previousValues = [
        departmentId,
        comparisonPeriod.dateFrom,
        comparisonPeriod.dateTo,
      ];

      const [
        summaryResult,
        previousSummaryResult,
        scheduleResult,
        previousScheduleResult,
        teachersResult,
        coursesResult,
        trendResult,
        methodsResult,
        recentResult,
      ] = await Promise.all([
        pool.query(summarySql, currentValues.slice(0, 3)),
        pool.query(summarySql, previousValues),
        pool.query(scheduleSql, currentValues),
        pool.query(scheduleSql, [
          departmentId,
          comparisonPeriod.dateFrom,
          comparisonPeriod.dateTo,
          null,
        ]),
        pool.query(teacherSql, currentValues),
        pool.query(courseSql, currentValues),
        pool.query(trendSql, currentValues),
        pool.query(methodSql, currentValues),
        pool.query(recentSql, currentValues),
      ]);

      function mapDepartmentSummary(summaryRow, scheduleRow) {
        const punctual = Number(summaryRow.puntuales || 0);
        const late = Number(summaryRow.tardanzas || 0);
        const absent = Number(summaryRow.inasistencias || 0);
        const attendanceCount = punctual + late;
        const evaluated = attendanceCount + absent;
        const plannedSessions = Number(scheduleRow.sesiones_programadas || 0);
        const recordedSessions = Number(
          summaryRow.sesiones_con_registro || 0
        );

        return {
          totalRecords: Number(summaryRow.total_registros || 0),
          registered: Number(summaryRow.registrados || 0),
          rejected: Number(summaryRow.rechazados || 0),
          duplicated: Number(summaryRow.duplicados || 0),
          punctual,
          late,
          absent,
          attendanceCount,
          complianceRate: evaluated > 0
            ? Math.round((attendanceCount / evaluated) * 1000) / 10
            : 0,
          punctualityRate: punctual + late > 0
            ? Math.round((punctual / (punctual + late)) * 1000) / 10
            : 0,
          coverageRate: plannedSessions > 0
            ? Math.round((recordedSessions / plannedSessions) * 1000) / 10
            : 0,
          activeTeachers: Number(scheduleRow.docentes_activos || 0),
          teachersWithActivity: Number(summaryRow.docentes_con_actividad || 0),
          activeCourses: Number(scheduleRow.cursos_activos || 0),
          coursesWithActivity: Number(summaryRow.cursos_con_actividad || 0),
          scheduleSlots: Number(scheduleRow.bloques_horarios || 0),
          plannedSessions,
          recordedSessions,
          courseRecords: Number(summaryRow.registros_curso || 0),
          institutionalEntries: Number(summaryRow.ingresos_institucionales || 0),
          activeDays: Number(summaryRow.dias_con_actividad || 0),
          averageDelayMinutes: Number(summaryRow.promedio_tardanza_minutos || 0),
        };
      }

      const teachers = teachersResult.rows.map((row) => ({
        id: Number(row.id),
        code: row.codigo,
        name: row.docente,
        email: row.email,
        active: Boolean(row.activo),
        category: row.categoria,
        condition: row.condicion,
        assignedCourses: Number(row.cursos_asignados || 0),
        scheduleSlots: Number(row.bloques_horarios || 0),
        plannedSessions: Number(row.sesiones_programadas || 0),
        recordedSessions: Number(row.sesiones_con_registro || 0),
        totalRecords: Number(row.total_registros || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
        complianceRate: Number(row.cumplimiento || 0),
        punctualityRate: Number(row.puntualidad || 0),
        coverageRate: Number(row.cobertura || 0),
      }));

      const courses = coursesResult.rows.map((row) => ({
        id: Number(row.id),
        code: row.codigo,
        name: row.nombre,
        credits: Number(row.creditos || 0),
        active: Boolean(row.activo),
        assignedTeachers: Number(row.docentes_asignados || 0),
        scheduleSlots: Number(row.bloques_horarios || 0),
        plannedSessions: Number(row.sesiones_programadas || 0),
        recordedSessions: Number(row.sesiones_con_registro || 0),
        totalRecords: Number(row.total_registros || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
        complianceRate: Number(row.cumplimiento || 0),
        coverageRate: Number(row.cobertura || 0),
      }));

      const currentSummary = mapDepartmentSummary(
        summaryResult.rows[0] || {},
        scheduleResult.rows[0] || {}
      );

      const previousSummary = mapDepartmentSummary(
        previousSummaryResult.rows[0] || {},
        previousScheduleResult.rows[0] || {}
      );

      const evaluatedTeachers = teachers.filter(
        (item) => item.punctual + item.late + item.absent > 0
      );
      const evaluatedCourses = courses.filter(
        (item) => item.punctual + item.late + item.absent > 0
      );

      const bestTeacher = [...evaluatedTeachers].sort(
        (a, b) => b.complianceRate - a.complianceRate
      )[0] || null;
      const attentionTeacher = [...evaluatedTeachers].sort(
        (a, b) => a.complianceRate - b.complianceRate
      )[0] || null;
      const bestCourse = [...evaluatedCourses].sort(
        (a, b) => b.complianceRate - a.complianceRate
      )[0] || null;
      const attentionCourse = [...evaluatedCourses].sort(
        (a, b) => a.complianceRate - b.complianceRate
      )[0] || null;

      const trend = trendResult.rows.map((row) => ({
        date: row.fecha,
        total: Number(row.total || 0),
        punctual: Number(row.puntuales || 0),
        late: Number(row.tardanzas || 0),
        absent: Number(row.inasistencias || 0),
      }));

      const topMethodRow = methodsResult.rows[0] || null;
      const busiestDay = [...trend].sort(
        (a, b) => b.total - a.total
      )[0] || null;

      return res.json({
        generatedAt: new Date().toISOString(),
        period: { from: period.dateFrom, to: period.dateTo },
        comparisonPeriod: {
          from: comparisonPeriod.dateFrom,
          to: comparisonPeriod.dateTo,
        },
        selectedSemester: selectedSemester
          ? {
              id: Number(selectedSemester.id),
              code: selectedSemester.codigo,
              from: selectedSemester.fecha_inicio,
              to: selectedSemester.fecha_fin,
              active: Boolean(selectedSemester.activo),
            }
          : null,
        department: {
          id: Number(department.id),
          code: department.codigo,
          name: department.nombre,
          active: Boolean(department.activo),
        },
        summary: currentSummary,
        comparison: {
          attendancePercent: percentDelta(
            currentSummary.attendanceCount,
            previousSummary.attendanceCount
          ),
          latePercent: percentDelta(
            currentSummary.late,
            previousSummary.late
          ),
          absencePercent: percentDelta(
            currentSummary.absent,
            previousSummary.absent
          ),
          compliancePoints: Math.round(
            (currentSummary.complianceRate -
              previousSummary.complianceRate) * 10
          ) / 10,
          coveragePoints: Math.round(
            (currentSummary.coverageRate -
              previousSummary.coverageRate) * 10
          ) / 10,
        },
        insights: {
          bestTeacher,
          attentionTeacher,
          bestCourse,
          attentionCourse,
          topMethod: topMethodRow
            ? {
                method: topMethodRow.metodo,
                total: Number(topMethodRow.total || 0),
              }
            : null,
          busiestDay,
          scopeNote:
            'El reporte consolida docentes y cursos pertenecientes al departamento seleccionado. La programación procede de horarios activos y la trazabilidad del historial unificado de asistencia.',
        },
        trend,
        teachers,
        courses,
        methods: methodsResult.rows.map((row) => ({
          method: row.metodo,
          total: Number(row.total || 0),
        })),
        recent: recentResult.rows.map((row) => ({
          id: row.registro_uid,
          teacherId: Number(row.docente_id),
          teacherCode: row.codigo_docente,
          teacher: row.docente,
          email: row.email,
          department: row.departamento,
          type: row.tipo_objetivo,
          scheduleId: row.horario_curso_id === null
            ? null
            : Number(row.horario_curso_id),
          courseCode: row.codigo_curso,
          course: row.curso,
          classroom: row.aula,
          date: row.fecha,
          scheduledTime: row.hora_programada,
          registeredTime: row.hora_registrada,
          status: row.estado,
          result: row.resultado,
          method: row.metodo_verificacion,
          source: row.fuente,
          detail: row.detalle,
          createdAt: row.creado_en,
        })),
      });
    } catch (error) {
      console.error('Error al generar reporte premium por departamento:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        requestId: req.id,
      });

      return res.status(500).json({
        error: 'No se pudo generar el reporte por departamento.',
        codigo: 'DEPARTMENT_REPORT_ERROR',
        request_id: req.id,
      });
    }
  }
);

router.get(
  '/asistencia',
  autenticar,
  soloRol(...REPORT_ROLES),
  async (req, res) => {
    try {
      const conditions = [];
      const values = [];

      const teacherId = toPositiveInteger(req.query.docente_id);
      const courseCode = cleanText(req.query.curso_codigo, 40);
      const department = cleanText(req.query.departamento, 120);
      const dateFrom = validDate(req.query.fecha_desde);
      const dateTo = validDate(req.query.fecha_hasta);
      const status = cleanText(req.query.estado, 30).toUpperCase();
      const method = cleanText(req.query.metodo, 50).toUpperCase();
      const result = cleanText(req.query.resultado, 30).toUpperCase();
      const type = cleanText(req.query.tipo, 40).toUpperCase();

      if (teacherId) {
        values.push(teacherId);
        conditions.push(`docente_id = $${values.length}`);
      }

      if (courseCode) {
        values.push(courseCode);
        conditions.push(`codigo_curso = $${values.length}`);
      }

      if (department) {
        values.push(department);
        conditions.push(
          `UPPER(COALESCE(departamento, '')) = UPPER($${values.length})`
        );
      }

      if (dateFrom) {
        values.push(dateFrom);
        conditions.push(`fecha >= $${values.length}::date`);
      }

      if (dateTo) {
        values.push(dateTo);
        conditions.push(`fecha <= $${values.length}::date`);
      }

      if (status) {
        values.push(status);
        conditions.push(`UPPER(COALESCE(estado, '')) = $${values.length}`);
      }

      if (method) {
        values.push(method);
        conditions.push(
          `UPPER(COALESCE(metodo_verificacion, '')) = $${values.length}`
        );
      }

      if (result) {
        values.push(result);
        conditions.push(`UPPER(COALESCE(resultado, '')) = $${values.length}`);
      }

      if (type) {
        values.push(type);
        conditions.push(`UPPER(COALESCE(tipo_objetivo, '')) = $${values.length}`);
      }

      values.push(MAX_ROWS);

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const query = `
        SELECT
          registro_uid,
          docente_id,
          codigo_docente,
          CONCAT_WS(' ', nombres, apellidos) AS docente,
          email,
          departamento,
          tipo_objetivo,
          codigo_curso,
          curso,
          aula,
          TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha,
          TO_CHAR(hora, 'HH24:MI:SS') AS hora,
          estado,
          resultado,
          metodo_verificacion,
          fuente,
          dispositivo_id,
          firma_verificada,
          presencia_ble_requerida,
          presencia_ble_validada,
          creado_en
        FROM v_historial_asistencia_unificado
        ${whereClause}
        ORDER BY fecha DESC, hora DESC, creado_en DESC
        LIMIT $${values.length}
      `;

      const resultSet = await pool.query(query, values);
      const records = resultSet.rows.map(mapRecord);

      return res.json({
        generatedAt: new Date().toISOString(),
        maxRows: MAX_ROWS,
        truncated: records.length >= MAX_ROWS,
        summary: summarize(records),
        records,
      });
    } catch (error) {
      console.error('Error al generar reporte de asistencia:', error);
      return res.status(500).json({
        error: 'No se pudo generar el reporte de asistencia.',
      });
    }
  }
);

module.exports = router;
