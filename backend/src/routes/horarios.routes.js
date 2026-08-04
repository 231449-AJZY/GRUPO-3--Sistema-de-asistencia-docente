const router = require('express').Router();

const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

const HORARIO_SELECT = `
  SELECT
    hc.id,
    hc.docente_id,
    hc.curso_id,
    hc.semestre_id,
    hc.aula,
    hc.dia_semana,
    TO_CHAR(hc.hora_inicio, 'HH24:MI') AS hora_inicio,
    TO_CHAR(hc.hora_fin, 'HH24:MI') AS hora_fin,
    hc.activo,
    hc.creado_en,
    u.codigo AS docente_codigo,
    CONCAT_WS(' ', u.nombres, u.apellidos) AS docente,
    dep.nombre AS departamento,
    c.codigo AS curso_codigo,
    c.nombre AS curso,
    c.creditos,
    s.codigo AS semestre,
    s.fecha_inicio,
    s.fecha_fin,
    s.activo AS semestre_activo,
    COUNT(rac.id)::int AS registros_asistencia
  FROM horarios_curso hc
  JOIN docentes d ON d.id = hc.docente_id
  JOIN usuarios u ON u.id = d.usuario_id
  JOIN departamentos_academicos dep ON dep.id = d.departamento_id
  JOIN cursos c ON c.id = hc.curso_id
  JOIN semestres s ON s.id = hc.semestre_id
  LEFT JOIN registros_asistencia_curso rac ON rac.horario_curso_id = hc.id
`;

function positiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanTime(value) {
  const normalized = cleanText(value, 8);
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);

  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
}

function parseBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function getValidation(body) {
  const docenteId = positiveInteger(body.docente_id ?? body.docenteId);
  const cursoId = positiveInteger(body.curso_id ?? body.cursoId);
  const semestreId = positiveInteger(body.semestre_id ?? body.semestreId);
  const aula = cleanText(body.aula, 50).toUpperCase();
  const diaSemana = positiveInteger(body.dia_semana ?? body.diaSemana);
  const horaInicio = cleanTime(body.hora_inicio ?? body.horaInicio);
  const horaFin = cleanTime(body.hora_fin ?? body.horaFin);
  const activo = parseBoolean(body.activo, true);
  const errors = {};

  if (!docenteId) errors.docenteId = 'Seleccione un docente válido.';
  if (!cursoId) errors.cursoId = 'Seleccione un curso válido.';
  if (!semestreId) errors.semestreId = 'Seleccione un semestre válido.';
  if (!aula) errors.aula = 'El aula es obligatoria.';
  if (!diaSemana || diaSemana < 1 || diaSemana > 5) {
    errors.diaSemana = 'Seleccione un día entre lunes y viernes.';
  }
  if (!horaInicio) errors.horaInicio = 'La hora de inicio no es válida.';
  if (!horaFin) errors.horaFin = 'La hora final no es válida.';
  if (horaInicio && horaFin && horaFin <= horaInicio) {
    errors.horaFin = 'La hora final debe ser posterior a la hora de inicio.';
  }

  return {
    errors,
    clean: {
      docenteId,
      cursoId,
      semestreId,
      aula,
      diaSemana,
      horaInicio,
      horaFin,
      activo,
    },
  };
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

async function writeAudit(client, req, action, recordId, detail) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES ($1, $2, 'horarios_curso', $3, $4::jsonb, NULLIF($5, '')::inet)`,
    [
      req.user.usuario_id,
      action,
      recordId,
      JSON.stringify(detail ?? {}),
      req.ip || '',
    ]
  );
}

async function getHorarioById(client, horarioId) {
  const result = await client.query(
    `${HORARIO_SELECT}
     WHERE hc.id = $1
     GROUP BY
       hc.id,
       u.codigo,
       u.nombres,
       u.apellidos,
       dep.nombre,
       c.codigo,
       c.nombre,
       c.creditos,
       s.codigo,
       s.fecha_inicio,
       s.fecha_fin,
       s.activo`,
    [horarioId]
  );

  return result.rows[0] ?? null;
}

async function validateCatalogs(client, values) {
  const [teacher, course, semester] = await Promise.all([
    client.query(
      `SELECT d.id, u.activo
       FROM docentes d
       JOIN usuarios u ON u.id = d.usuario_id
       WHERE d.id = $1`,
      [values.docenteId]
    ),
    client.query(
      `SELECT id, activo
       FROM cursos
       WHERE id = $1`,
      [values.cursoId]
    ),
    client.query(
      `SELECT id, fecha_inicio, fecha_fin
       FROM semestres
       WHERE id = $1`,
      [values.semestreId]
    ),
  ]);

  if (!teacher.rows[0]) {
    const error = new Error('El docente seleccionado no existe.');
    error.status = 404;
    throw error;
  }

  if (!teacher.rows[0].activo) {
    const error = new Error('No puede asignar horarios a un docente inactivo.');
    error.status = 409;
    throw error;
  }

  if (!course.rows[0]) {
    const error = new Error('El curso seleccionado no existe.');
    error.status = 404;
    throw error;
  }

  if (!course.rows[0].activo) {
    const error = new Error('El curso seleccionado está inactivo.');
    error.status = 409;
    throw error;
  }

  if (!semester.rows[0]) {
    const error = new Error('El semestre seleccionado no existe.');
    error.status = 404;
    throw error;
  }
}

async function validateScheduleRules(client, values, excludeId = null) {
  const params = [
    values.semestreId,
    values.diaSemana,
    values.docenteId,
    values.aula,
    values.horaInicio,
    values.horaFin,
    excludeId,
  ];

  if (values.activo) {
    const conflicts = await client.query(
      `SELECT
         BOOL_OR(hc.docente_id = $3) AS docente_ocupado,
         BOOL_OR(LOWER(hc.aula) = LOWER($4)) AS aula_ocupada
       FROM horarios_curso hc
       WHERE hc.semestre_id = $1
         AND hc.dia_semana = $2
         AND hc.activo = TRUE
         AND ($7::int IS NULL OR hc.id <> $7)
         AND (hc.docente_id = $3 OR LOWER(hc.aula) = LOWER($4))
         AND hc.hora_inicio < $6::time
         AND hc.hora_fin > $5::time`,
      params
    );

    if (conflicts.rows[0]?.docente_ocupado) {
      const error = new Error('El docente tiene otra clase que se cruza con este horario.');
      error.status = 409;
      throw error;
    }

    if (conflicts.rows[0]?.aula_ocupada) {
      const error = new Error('El aula ya se encuentra ocupada durante ese intervalo.');
      error.status = 409;
      throw error;
    }

    const load = await client.query(
      `SELECT COUNT(DISTINCT curso_id)::int AS total
       FROM horarios_curso
       WHERE docente_id = $1
         AND semestre_id = $2
         AND activo = TRUE
         AND ($3::int IS NULL OR id <> $3)`,
      [values.docenteId, values.semestreId, excludeId]
    );

    const courseAlreadyAssigned = await client.query(
      `SELECT 1
       FROM horarios_curso
       WHERE docente_id = $1
         AND semestre_id = $2
         AND curso_id = $3
         AND activo = TRUE
         AND ($4::int IS NULL OR id <> $4)
       LIMIT 1`,
      [values.docenteId, values.semestreId, values.cursoId, excludeId]
    );

    if (
      Number(load.rows[0]?.total ?? 0) >= 5 &&
      courseAlreadyAssigned.rows.length === 0
    ) {
      const error = new Error('El docente ya tiene el máximo de 5 cursos activos en el semestre.');
      error.status = 409;
      throw error;
    }
  }
}

function sendError(res, error) {
  if (error?.code === '23505') {
    return res.status(409).json({
      error: 'Ya existe un horario con la misma combinación de docente, semestre, día y hora de inicio.',
    });
  }

  if (error?.code === '23503') {
    return res.status(400).json({
      error: 'La información académica relacionada no existe o ya no está disponible.',
    });
  }

  if (error?.code === 'P0001') {
    return res.status(409).json({ error: error.message });
  }

  if (error?.status) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error('Error en horarios académicos:', error);
  return res.status(500).json({ error: 'No se pudo completar la operación de horarios.' });
}

router.get(
  '/catalogos',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    try {
      const [teachers, courses, semesters] = await Promise.all([
        pool.query(
          `SELECT
             d.id,
             u.codigo,
             CONCAT_WS(' ', u.nombres, u.apellidos) AS nombre,
             dep.nombre AS departamento,
             u.activo
           FROM docentes d
           JOIN usuarios u ON u.id = d.usuario_id
           JOIN departamentos_academicos dep ON dep.id = d.departamento_id
           ORDER BY u.apellidos, u.nombres`
        ),
        pool.query(
          `SELECT
             c.id,
             c.codigo,
             c.nombre,
             c.departamento_id,
             dep.nombre AS departamento,
             c.creditos,
             c.activo
           FROM cursos c
           JOIN departamentos_academicos dep ON dep.id = c.departamento_id
           ORDER BY c.nombre`
        ),
        pool.query(
          `SELECT id, codigo, fecha_inicio, fecha_fin, activo, creado_en
           FROM semestres
           ORDER BY fecha_inicio DESC, codigo DESC`
        ),
      ]);

      return res.json({
        docentes: teachers.rows,
        cursos: courses.rows,
        semestres: semesters.rows,
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.get('/me', autenticar, soloRol('Docente'), async (req, res) => {
  try {
    if (!req.user.docente_id) {
      return res.status(409).json({
        error: 'La cuenta no tiene un perfil docente asociado.',
      });
    }

    const result = await pool.query(
      `${HORARIO_SELECT}
       WHERE hc.docente_id = $1
       GROUP BY
         hc.id,
         u.codigo,
         u.nombres,
         u.apellidos,
         dep.nombre,
         c.codigo,
         c.nombre,
         c.creditos,
         s.codigo,
         s.fecha_inicio,
         s.fecha_fin,
         s.activo
       ORDER BY
         s.activo DESC,
         s.fecha_inicio DESC,
         hc.dia_semana,
         hc.hora_inicio`,
      [req.user.docente_id]
    );

    return res.json({ horarios: result.rows });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get(
  '/',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const semestreId = positiveInteger(req.query.semestre_id);
    const values = [];
    const conditions = [];

    if (semestreId) {
      values.push(semestreId);
      conditions.push(`hc.semestre_id = $${values.length}`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    try {
      const result = await pool.query(
        `${HORARIO_SELECT}
         ${where}
         GROUP BY
           hc.id,
           u.codigo,
           u.nombres,
           u.apellidos,
           dep.nombre,
           c.codigo,
           c.nombre,
           c.creditos,
           s.codigo,
           s.fecha_inicio,
           s.fecha_fin,
           s.activo
         ORDER BY
           s.fecha_inicio DESC,
           hc.dia_semana,
           hc.hora_inicio,
           c.nombre`,
        values
      );

      return res.json({ horarios: result.rows });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.get(
  '/:id',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const horarioId = positiveInteger(req.params.id);

    if (!horarioId) {
      return res.status(400).json({ error: 'El identificador del horario no es válido.' });
    }

    try {
      const horario = await getHorarioById(pool, horarioId);

      if (!horario) {
        return res.status(404).json({ error: 'Horario no encontrado.' });
      }

      return res.json({ horario });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

router.post('/', autenticar, soloRol('Administrador'), async (req, res) => {
  const { errors, clean } = getValidation(req.body);

  if (hasErrors(errors)) {
    return res.status(400).json({
      error: 'Revise la información ingresada.',
      fields: errors,
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await validateCatalogs(client, clean);
    await validateScheduleRules(client, clean);

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
       VALUES ($1, $2, $3, $4, $5, $6::time, $7::time, $8)
       RETURNING id`,
      [
        clean.docenteId,
        clean.cursoId,
        clean.semestreId,
        clean.aula,
        clean.diaSemana,
        clean.horaInicio,
        clean.horaFin,
        clean.activo,
      ]
    );

    const horarioId = result.rows[0].id;
    await writeAudit(client, req, 'CREAR_HORARIO', horarioId, clean);
    const horario = await getHorarioById(client, horarioId);
    await client.query('COMMIT');

    return res.status(201).json({
      mensaje: 'Horario registrado correctamente.',
      horario,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error);
  } finally {
    client.release();
  }
});

router.put('/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const horarioId = positiveInteger(req.params.id);

  if (!horarioId) {
    return res.status(400).json({ error: 'El identificador del horario no es válido.' });
  }

  const { errors, clean } = getValidation(req.body);

  if (hasErrors(errors)) {
    return res.status(400).json({
      error: 'Revise la información ingresada.',
      fields: errors,
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT
         hc.*,
         EXISTS (
           SELECT 1
           FROM registros_asistencia_curso rac
           WHERE rac.horario_curso_id = hc.id
         ) AS tiene_asistencia
       FROM horarios_curso hc
       WHERE hc.id = $1
       FOR UPDATE`,
      [horarioId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    const current = currentResult.rows[0];
    const structuralChanged =
      Number(current.docente_id) !== clean.docenteId ||
      Number(current.curso_id) !== clean.cursoId ||
      Number(current.semestre_id) !== clean.semestreId ||
      cleanText(current.aula, 50).toUpperCase() !== clean.aula ||
      Number(current.dia_semana) !== clean.diaSemana ||
      String(current.hora_inicio).slice(0, 5) !== clean.horaInicio ||
      String(current.hora_fin).slice(0, 5) !== clean.horaFin;

    if (current.tiene_asistencia && structuralChanged) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Este horario ya tiene asistencias registradas. Desactívelo y cree uno nuevo para conservar el historial institucional.',
      });
    }

    await validateCatalogs(client, clean);
    await validateScheduleRules(client, clean, horarioId);

    await client.query(
      `UPDATE horarios_curso
       SET docente_id = $1,
           curso_id = $2,
           semestre_id = $3,
           aula = $4,
           dia_semana = $5,
           hora_inicio = $6::time,
           hora_fin = $7::time,
           activo = $8
       WHERE id = $9`,
      [
        clean.docenteId,
        clean.cursoId,
        clean.semestreId,
        clean.aula,
        clean.diaSemana,
        clean.horaInicio,
        clean.horaFin,
        clean.activo,
        horarioId,
      ]
    );

    await writeAudit(client, req, 'ACTUALIZAR_HORARIO', horarioId, clean);
    const horario = await getHorarioById(client, horarioId);
    await client.query('COMMIT');

    return res.json({
      mensaje: 'Horario actualizado correctamente.',
      horario,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error);
  } finally {
    client.release();
  }
});

async function updateStatus(req, res) {
  const horarioId = positiveInteger(req.params.id);

  if (!horarioId || typeof req.body.activo !== 'boolean') {
    return res.status(400).json({
      error: 'El identificador y el estado del horario son obligatorios.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT * FROM horarios_curso WHERE id = $1 FOR UPDATE`,
      [horarioId]
    );

    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    const row = current.rows[0];

    if (req.body.activo) {
      const clean = {
        docenteId: Number(row.docente_id),
        cursoId: Number(row.curso_id),
        semestreId: Number(row.semestre_id),
        aula: cleanText(row.aula, 50).toUpperCase(),
        diaSemana: Number(row.dia_semana),
        horaInicio: String(row.hora_inicio).slice(0, 5),
        horaFin: String(row.hora_fin).slice(0, 5),
        activo: true,
      };

      await validateCatalogs(client, clean);
      await validateScheduleRules(client, clean, horarioId);
    }

    await client.query(
      `UPDATE horarios_curso SET activo = $1 WHERE id = $2`,
      [req.body.activo, horarioId]
    );

    await writeAudit(client, req, 'CAMBIAR_ESTADO_HORARIO', horarioId, {
      activo: req.body.activo,
    });

    const horario = await getHorarioById(client, horarioId);
    await client.query('COMMIT');

    return res.json({
      mensaje: `Horario ${req.body.activo ? 'activado' : 'desactivado'} correctamente.`,
      horario,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error);
  } finally {
    client.release();
  }
}

router.patch('/:id/estado', autenticar, soloRol('Administrador'), updateStatus);
router.put('/:id/estado', autenticar, soloRol('Administrador'), updateStatus);

router.delete('/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const horarioId = positiveInteger(req.params.id);

  if (!horarioId) {
    return res.status(400).json({ error: 'El identificador del horario no es válido.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const current = await client.query(
      `SELECT id, docente_id, curso_id, semestre_id, aula
       FROM horarios_curso
       WHERE id = $1
       FOR UPDATE`,
      [horarioId]
    );

    if (current.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Horario no encontrado.' });
    }

    const attendance = await client.query(
      `SELECT COUNT(*)::int AS asistencias
       FROM registros_asistencia_curso
       WHERE horario_curso_id = $1`,
      [horarioId]
    );

    if (Number(attendance.rows[0].asistencias) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Este horario posee asistencias registradas y no puede eliminarse. Desactívelo para conservar el historial institucional.',
        puedeDesactivar: true,
      });
    }

    await writeAudit(client, req, 'ELIMINAR_HORARIO', horarioId, current.rows[0]);
    await client.query('DELETE FROM horarios_curso WHERE id = $1', [horarioId]);
    await client.query('COMMIT');

    return res.json({
      mensaje: 'Horario eliminado definitivamente.',
      horarioId,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error);
  } finally {
    client.release();
  }
});

module.exports = router;
