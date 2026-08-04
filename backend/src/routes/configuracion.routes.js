const router = require('express').Router();

const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

const VALID_TIMEZONES = new Set(['America/Lima', 'UTC']);
const VALID_LANGUAGES = new Set(['Español', 'English']);
const DAY_CODES = new Map([
  ['Lunes', 'LUN'],
  ['Martes', 'MAR'],
  ['Miércoles', 'MIE'],
  ['Jueves', 'JUE'],
  ['Viernes', 'VIE'],
]);
const CODE_DAYS = new Map(Array.from(DAY_CODES, ([day, code]) => [code, day]));

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanText(value, 150).toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanTime(value) {
  const normalized = cleanText(value, 8);
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function boundedInteger(value, minimum, maximum) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function parseWorkingDays(value) {
  if (value === 'LUN-VIE') {
    return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  }

  return String(value ?? '')
    .split(',')
    .map((item) => CODE_DAYS.get(item.trim()))
    .filter(Boolean);
}

function serializeWorkingDays(days) {
  return days.map((day) => DAY_CODES.get(day)).filter(Boolean).join(',');
}

function validatePayload(body) {
  const general = body.general ?? {};
  const attendance = body.attendance ?? {};
  const errors = {};

  const systemName = cleanText(general.systemName, 150);
  const institutionName = cleanText(general.institutionName, 200);
  const institutionCode = cleanText(general.institutionCode, 20).toUpperCase();
  const supportEmail = cleanEmail(general.supportEmail);
  const timezone = cleanText(general.timezone, 80);
  const language = cleanText(general.language, 30);
  const activeAcademicPeriod = cleanText(general.activeAcademicPeriod, 15).toUpperCase();

  const institutionalEntryTime = cleanTime(attendance.institutionalEntryTime);
  const graceMinutes = boundedInteger(attendance.graceMinutes, 0, 120);
  const earlyCheckinMinutes = boundedInteger(attendance.earlyCheckinMinutes, 0, 180);
  const lateLimitMinutes = boundedInteger(attendance.lateLimitMinutes, 1, 240);
  const workingDays = Array.isArray(attendance.workingDays)
    ? attendance.workingDays.filter((day) => DAY_CODES.has(day))
    : [];

  if (!systemName) errors.systemName = 'El nombre del sistema es obligatorio.';
  if (!institutionName) errors.institutionName = 'El nombre institucional es obligatorio.';
  if (!institutionCode) errors.institutionCode = 'El código institucional es obligatorio.';
  if (!supportEmail || !validEmail(supportEmail)) {
    errors.supportEmail = 'Ingrese un correo de soporte válido.';
  }
  if (!VALID_TIMEZONES.has(timezone)) errors.timezone = 'Seleccione una zona horaria válida.';
  if (!VALID_LANGUAGES.has(language)) errors.language = 'Seleccione un idioma válido.';
  if (!institutionalEntryTime) errors.institutionalEntryTime = 'Ingrese una hora válida.';
  if (graceMinutes === null) errors.graceMinutes = 'La tolerancia debe estar entre 0 y 120 minutos.';
  if (earlyCheckinMinutes === null) {
    errors.earlyCheckinMinutes = 'La marcación anticipada debe estar entre 0 y 180 minutos.';
  }
  if (lateLimitMinutes === null) {
    errors.lateLimitMinutes = 'El límite de tardanza debe estar entre 1 y 240 minutos.';
  }
  if (workingDays.length === 0) errors.workingDays = 'Seleccione al menos un día laboral.';

  return {
    errors,
    clean: {
      general: {
        systemName,
        institutionName,
        institutionCode,
        supportEmail,
        timezone,
        language,
        activeAcademicPeriod,
      },
      attendance: {
        institutionalEntryTime,
        graceMinutes,
        earlyCheckinMinutes,
        lateLimitMinutes,
        requireCheckout: Boolean(attendance.requireCheckout),
        allowManualValidation: Boolean(attendance.allowManualValidation),
        workingDays,
      },
    },
  };
}

async function writeAudit(client, req, action, detail) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES ($1, $2, 'configuracion_institucional', 1, $3::jsonb, NULLIF($4, '')::inet)`,
    [req.user.usuario_id, action, JSON.stringify(detail ?? {}), req.ip || '']
  );
}

async function loadConfiguration(client) {
  const [institution, attendance, activeSemester, semesters] = await Promise.all([
    client.query(
      `SELECT
         nombre_sistema,
         nombre_institucion,
         codigo_institucional,
         correo_soporte,
         zona_horaria,
         idioma,
         requiere_salida,
         permitir_validacion_manual,
         limite_tardanza_minutos,
         actualizado_en
       FROM configuracion_institucional
       WHERE id = 1`
    ),
    client.query(
      `SELECT
         hora_ingreso_limite,
         tolerancia_antes_minutos,
         tolerancia_despues_minutos,
         dias_laborables,
         actualizado_en
       FROM configuracion_asistencia
       ORDER BY id DESC
       LIMIT 1`
    ),
    client.query(
      `SELECT id, codigo
       FROM semestres
       WHERE activo = TRUE
       ORDER BY fecha_inicio DESC
       LIMIT 1`
    ),
    client.query(
      `SELECT id, codigo, fecha_inicio, fecha_fin, activo
       FROM semestres
       ORDER BY fecha_inicio DESC, codigo DESC`
    ),
  ]);

  const generalRow = institution.rows[0];
  const attendanceRow = attendance.rows[0];
  const activeRow = activeSemester.rows[0];

  return {
    configuration: {
      general: {
        systemName: generalRow.nombre_sistema,
        institutionName: generalRow.nombre_institucion,
        institutionCode: generalRow.codigo_institucional,
        supportEmail: generalRow.correo_soporte,
        timezone: generalRow.zona_horaria,
        language: generalRow.idioma,
        activeAcademicPeriod: activeRow?.codigo ?? '',
      },
      attendance: {
        institutionalEntryTime: String(attendanceRow.hora_ingreso_limite).slice(0, 5),
        graceMinutes: Number(attendanceRow.tolerancia_despues_minutos),
        earlyCheckinMinutes: Number(attendanceRow.tolerancia_antes_minutos),
        lateLimitMinutes: Number(generalRow.limite_tardanza_minutos),
        requireCheckout: Boolean(generalRow.requiere_salida),
        allowManualValidation: Boolean(generalRow.permitir_validacion_manual),
        workingDays: parseWorkingDays(attendanceRow.dias_laborables),
      },
    },
    semestres: semesters.rows,
    updatedAt:
      generalRow.actualizado_en > attendanceRow.actualizado_en
        ? generalRow.actualizado_en
        : attendanceRow.actualizado_en,
  };
}

router.get('/', autenticar, soloRol('Administrador'), async (_req, res) => {
  try {
    return res.json(await loadConfiguration(pool));
  } catch (error) {
    console.error('Error al cargar configuración:', error);
    return res.status(500).json({ error: 'No se pudo cargar la configuración institucional.' });
  }
});

router.put('/', autenticar, soloRol('Administrador'), async (req, res) => {
  const { errors, clean } = validatePayload(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Revise los parámetros ingresados.',
      fields: errors,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('configuracion-institucional'))`);

    const semesterCount = await client.query('SELECT COUNT(*)::int AS total FROM semestres');
    const totalSemesters = Number(semesterCount.rows[0]?.total ?? 0);

    if (totalSemesters > 0) {
      if (!clean.general.activeAcademicPeriod) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Seleccione el periodo académico activo.',
          fields: { activeAcademicPeriod: 'Seleccione un semestre registrado.' },
        });
      }

      const semester = await client.query(
        `SELECT id, codigo
         FROM semestres
         WHERE codigo = $1
         FOR UPDATE`,
        [clean.general.activeAcademicPeriod]
      );

      if (!semester.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'El periodo académico seleccionado no existe.',
          fields: { activeAcademicPeriod: 'Seleccione un semestre registrado.' },
        });
      }

      await client.query(`SELECT pg_advisory_xact_lock(hashtext('semestre-activo'))`);
      await client.query('UPDATE semestres SET activo = FALSE WHERE activo = TRUE AND id <> $1', [semester.rows[0].id]);
      await client.query('UPDATE semestres SET activo = TRUE WHERE id = $1', [semester.rows[0].id]);
    }

    await client.query(
      `INSERT INTO configuracion_institucional (
         id,
         nombre_sistema,
         nombre_institucion,
         codigo_institucional,
         correo_soporte,
         zona_horaria,
         idioma,
         requiere_salida,
         permitir_validacion_manual,
         limite_tardanza_minutos,
         actualizado_en,
         actualizado_por
       )
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10)
       ON CONFLICT (id) DO UPDATE SET
         nombre_sistema = EXCLUDED.nombre_sistema,
         nombre_institucion = EXCLUDED.nombre_institucion,
         codigo_institucional = EXCLUDED.codigo_institucional,
         correo_soporte = EXCLUDED.correo_soporte,
         zona_horaria = EXCLUDED.zona_horaria,
         idioma = EXCLUDED.idioma,
         requiere_salida = EXCLUDED.requiere_salida,
         permitir_validacion_manual = EXCLUDED.permitir_validacion_manual,
         limite_tardanza_minutos = EXCLUDED.limite_tardanza_minutos,
         actualizado_en = CURRENT_TIMESTAMP,
         actualizado_por = EXCLUDED.actualizado_por`,
      [
        clean.general.systemName,
        clean.general.institutionName,
        clean.general.institutionCode,
        clean.general.supportEmail,
        clean.general.timezone,
        clean.general.language,
        clean.attendance.requireCheckout,
        clean.attendance.allowManualValidation,
        clean.attendance.lateLimitMinutes,
        req.user.usuario_id,
      ]
    );

    const attendanceRow = await client.query(
      `SELECT id
       FROM configuracion_asistencia
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`
    );

    if (attendanceRow.rows[0]) {
      await client.query(
        `UPDATE configuracion_asistencia
         SET hora_ingreso_limite = $1::time,
             tolerancia_antes_minutos = $2,
             tolerancia_despues_minutos = $3,
             dias_laborables = $4,
             actualizado_en = CURRENT_TIMESTAMP,
             actualizado_por = $5
         WHERE id = $6`,
        [
          clean.attendance.institutionalEntryTime,
          clean.attendance.earlyCheckinMinutes,
          clean.attendance.graceMinutes,
          serializeWorkingDays(clean.attendance.workingDays),
          req.user.usuario_id,
          attendanceRow.rows[0].id,
        ]
      );
    } else {
      await client.query(
        `INSERT INTO configuracion_asistencia (
           hora_ingreso_limite,
           tolerancia_antes_minutos,
           tolerancia_despues_minutos,
           dias_laborables,
           actualizado_por
         )
         VALUES ($1::time, $2, $3, $4, $5)`,
        [
          clean.attendance.institutionalEntryTime,
          clean.attendance.earlyCheckinMinutes,
          clean.attendance.graceMinutes,
          serializeWorkingDays(clean.attendance.workingDays),
          req.user.usuario_id,
        ]
      );
    }

    await writeAudit(client, req, 'ACTUALIZAR_CONFIGURACION', clean);
    const result = await loadConfiguration(client);
    await client.query('COMMIT');

    return res.json({
      mensaje: 'Configuración institucional actualizada correctamente.',
      ...result,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error al actualizar configuración:', error);
    return res.status(500).json({ error: 'No se pudo guardar la configuración institucional.' });
  } finally {
    client.release();
  }
});

module.exports = router;
