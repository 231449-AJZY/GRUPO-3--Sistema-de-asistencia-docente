const router = require('express').Router();

const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

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

function cleanCode(value, maxLength = 20) {
  return cleanText(value, maxLength).toUpperCase();
}

function parseBoolean(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function validDate(value) {
  const normalized = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

async function writeAudit(client, req, action, table, recordId, detail) {
  await client.query(
    `INSERT INTO audit_log (
       usuario_id,
       accion,
       tabla,
       registro_id,
       detalle,
       ip_origen
     )
     VALUES ($1, $2, $3, $4, $5::jsonb, NULLIF($6, '')::inet)`,
    [
      req.user.usuario_id,
      action,
      table,
      recordId,
      JSON.stringify(detail ?? {}),
      req.ip || '',
    ]
  );
}

function sendError(res, error, context = 'la gestión académica') {
  if (error?.code === '23505') {
    const constraint = String(error.constraint ?? '').toLowerCase();

    if (constraint.includes('codigo')) {
      return res.status(409).json({
        error: 'El código ingresado ya se encuentra registrado.',
        fields: { codigo: 'Utilice un código institucional diferente.' },
      });
    }

    if (constraint.includes('nombre')) {
      return res.status(409).json({
        error: 'El nombre ingresado ya se encuentra registrado.',
        fields: { nombre: 'Utilice una denominación diferente.' },
      });
    }

    return res.status(409).json({
      error: 'Uno de los datos ingresados ya se encuentra registrado.',
    });
  }

  if (error?.code === '23503') {
    return res.status(409).json({
      error: 'El registro tiene información institucional relacionada y no puede eliminarse.',
    });
  }

  if (error?.status) {
    return res.status(error.status).json({
      error: error.message,
      fields: error.fields,
      puedeDesactivar: error.puedeDesactivar,
    });
  }

  console.error(`Error en ${context}:`, error);
  return res.status(500).json({
    error: `No se pudo completar la operación de ${context}.`,
  });
}

const DEPARTMENT_SELECT = `
  SELECT
    dep.id,
    dep.codigo,
    dep.nombre,
    dep.activo,
    dep.creado_en,
    COUNT(DISTINCT d.id)::int AS docentes,
    COUNT(DISTINCT c.id)::int AS cursos,
    COUNT(DISTINCT c.id) FILTER (WHERE c.activo = TRUE)::int AS cursos_activos
  FROM departamentos_academicos dep
  LEFT JOIN docentes d ON d.departamento_id = dep.id
  LEFT JOIN cursos c ON c.departamento_id = dep.id
`;

const COURSE_SELECT = `
  SELECT
    c.id,
    c.codigo,
    c.nombre,
    c.departamento_id,
    dep.nombre AS departamento,
    c.creditos,
    c.activo,
    c.creado_en,
    COUNT(DISTINCT hc.id)::int AS horarios,
    COUNT(DISTINCT hc.id) FILTER (WHERE hc.activo = TRUE)::int AS horarios_activos
  FROM cursos c
  JOIN departamentos_academicos dep ON dep.id = c.departamento_id
  LEFT JOIN horarios_curso hc ON hc.curso_id = c.id
`;

const SEMESTER_SELECT = `
  SELECT
    s.id,
    s.codigo,
    s.fecha_inicio,
    s.fecha_fin,
    s.activo,
    s.creado_en,
    COUNT(DISTINCT hc.id)::int AS horarios,
    COUNT(DISTINCT hc.id) FILTER (WHERE hc.activo = TRUE)::int AS horarios_activos
  FROM semestres s
  LEFT JOIN horarios_curso hc ON hc.semestre_id = s.id
`;

async function getDepartmentById(client, id, { forUpdate = false } = {}) {
  const result = await client.query(
    `${DEPARTMENT_SELECT}
     WHERE dep.id = $1
     GROUP BY dep.id
     ${forUpdate ? 'FOR UPDATE OF dep' : ''}`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function getCourseById(client, id, { forUpdate = false } = {}) {
  const result = await client.query(
    `${COURSE_SELECT}
     WHERE c.id = $1
     GROUP BY c.id, dep.nombre
     ${forUpdate ? 'FOR UPDATE OF c' : ''}`,
    [id]
  );
  return result.rows[0] ?? null;
}

async function getSemesterById(client, id, { forUpdate = false } = {}) {
  const result = await client.query(
    `${SEMESTER_SELECT}
     WHERE s.id = $1
     GROUP BY s.id
     ${forUpdate ? 'FOR UPDATE OF s' : ''}`,
    [id]
  );
  return result.rows[0] ?? null;
}

function validateDepartment(body) {
  const codigo = cleanCode(body.codigo, 20);
  const nombre = cleanText(body.nombre, 150);
  const errors = {};

  if (!codigo) {
    errors.codigo = 'El código del departamento es obligatorio.';
  } else if (!/^[A-Z0-9-]{2,20}$/.test(codigo)) {
    errors.codigo = 'Use letras, números o guiones, sin espacios.';
  }

  if (!nombre) {
    errors.nombre = 'El nombre del departamento es obligatorio.';
  }

  return {
    errors,
    clean: {
      codigo,
      nombre,
      activo: parseBoolean(body.activo, true),
    },
  };
}

function validateCourse(body) {
  const codigo = cleanCode(body.codigo, 20);
  const nombre = cleanText(body.nombre, 150);
  const departamentoId = positiveInteger(body.departamento_id ?? body.departamentoId);
  const creditos = Number(body.creditos);
  const errors = {};

  if (!codigo) {
    errors.codigo = 'El código del curso es obligatorio.';
  } else if (!/^[A-Z0-9-]{2,20}$/.test(codigo)) {
    errors.codigo = 'Use letras, números o guiones, sin espacios.';
  }

  if (!nombre) errors.nombre = 'El nombre del curso es obligatorio.';
  if (!departamentoId) errors.departamentoId = 'Seleccione un departamento válido.';
  if (!Number.isInteger(creditos) || creditos < 1 || creditos > 10) {
    errors.creditos = 'Los créditos deben ser un número entre 1 y 10.';
  }

  return {
    errors,
    clean: {
      codigo,
      nombre,
      departamentoId,
      creditos,
      activo: parseBoolean(body.activo, true),
    },
  };
}

function validateSemester(body) {
  const codigo = cleanCode(body.codigo, 15);
  const fechaInicio = validDate(body.fecha_inicio ?? body.fechaInicio);
  const fechaFin = validDate(body.fecha_fin ?? body.fechaFin);
  const errors = {};

  if (!codigo) {
    errors.codigo = 'El código del semestre es obligatorio.';
  } else if (!/^[A-Z0-9-]{4,15}$/.test(codigo)) {
    errors.codigo = 'Use letras, números o guiones, sin espacios.';
  }

  if (!fechaInicio) errors.fechaInicio = 'Ingrese una fecha de inicio válida.';
  if (!fechaFin) errors.fechaFin = 'Ingrese una fecha de finalización válida.';
  if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
    errors.fechaFin = 'La fecha final debe ser posterior a la fecha de inicio.';
  }

  return {
    errors,
    clean: {
      codigo,
      fechaInicio,
      fechaFin,
      activo: parseBoolean(body.activo, false),
    },
  };
}

async function requireActiveDepartment(client, departmentId) {
  const department = await client.query(
    `SELECT id, codigo, nombre, activo
     FROM departamentos_academicos
     WHERE id = $1`,
    [departmentId]
  );

  if (!department.rows[0]) {
    const error = new Error('El departamento académico seleccionado no existe.');
    error.status = 404;
    throw error;
  }

  if (!department.rows[0].activo) {
    const error = new Error('El departamento académico seleccionado está inactivo.');
    error.status = 409;
    throw error;
  }

  return department.rows[0];
}

router.get(
  '/catalogos',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    try {
      const [departments, courses, semesters] = await Promise.all([
        pool.query(`${DEPARTMENT_SELECT} GROUP BY dep.id ORDER BY dep.nombre`),
        pool.query(`${COURSE_SELECT} GROUP BY c.id, dep.nombre ORDER BY c.nombre`),
        pool.query(`${SEMESTER_SELECT} GROUP BY s.id ORDER BY s.fecha_inicio DESC, s.codigo DESC`),
      ]);

      return res.json({
        departamentos: departments.rows,
        cursos: courses.rows,
        semestres: semesters.rows,
      });
    } catch (error) {
      return sendError(res, error);
    }
  }
);

// Departamentos académicos
router.post('/departamentos', autenticar, soloRol('Administrador'), async (req, res) => {
  const { errors, clean } = validateDepartment(req.body);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Revise los datos ingresados.', fields: errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO departamentos_academicos (codigo, nombre, activo)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [clean.codigo, clean.nombre, clean.activo]
    );
    const id = result.rows[0].id;
    await writeAudit(client, req, 'CREAR_DEPARTAMENTO', 'departamentos_academicos', id, clean);
    const departamento = await getDepartmentById(client, id);
    await client.query('COMMIT');
    return res.status(201).json({ mensaje: 'Departamento registrado correctamente.', departamento });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'departamentos académicos');
  } finally {
    client.release();
  }
});

router.put('/departamentos/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const { errors, clean } = validateDepartment(req.body);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Revise los datos ingresados.', fields: errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getDepartmentById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Departamento no encontrado.' });
    }

    if (!clean.activo) {
      const dependents = await client.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM docentes d
             JOIN usuarios u ON u.id = d.usuario_id
             WHERE d.departamento_id = $1 AND u.activo = TRUE
           ) AS docentes_activos,
           EXISTS (
             SELECT 1 FROM cursos c
             WHERE c.departamento_id = $1 AND c.activo = TRUE
           ) AS cursos_activos`,
        [id]
      );

      if (dependents.rows[0].docentes_activos || dependents.rows[0].cursos_activos) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'No puede desactivar el departamento mientras tenga docentes o cursos activos.',
        });
      }
    }

    await client.query(
      `UPDATE departamentos_academicos
       SET codigo = $1, nombre = $2, activo = $3
       WHERE id = $4`,
      [clean.codigo, clean.nombre, clean.activo, id]
    );
    await writeAudit(client, req, 'ACTUALIZAR_DEPARTAMENTO', 'departamentos_academicos', id, clean);
    const departamento = await getDepartmentById(client, id);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Departamento actualizado correctamente.', departamento });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'departamentos académicos');
  } finally {
    client.release();
  }
});

router.patch('/departamentos/:id/estado', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id || typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'La solicitud de estado no es válida.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getDepartmentById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Departamento no encontrado.' });
    }

    if (!req.body.activo) {
      const dependents = await client.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM docentes d
             JOIN usuarios u ON u.id = d.usuario_id
             WHERE d.departamento_id = $1 AND u.activo = TRUE
           ) AS docentes_activos,
           EXISTS (
             SELECT 1 FROM cursos c
             WHERE c.departamento_id = $1 AND c.activo = TRUE
           ) AS cursos_activos`,
        [id]
      );

      if (dependents.rows[0].docentes_activos || dependents.rows[0].cursos_activos) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Antes de desactivar el departamento, desactive sus docentes y cursos activos.',
        });
      }
    }

    await client.query(
      `UPDATE departamentos_academicos SET activo = $1 WHERE id = $2`,
      [req.body.activo, id]
    );
    await writeAudit(
      client,
      req,
      req.body.activo ? 'ACTIVAR_DEPARTAMENTO' : 'DESACTIVAR_DEPARTAMENTO',
      'departamentos_academicos',
      id,
      { activo: req.body.activo }
    );
    const departamento = await getDepartmentById(client, id);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Estado actualizado correctamente.', departamento });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'departamentos académicos');
  } finally {
    client.release();
  }
});

router.delete('/departamentos/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getDepartmentById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Departamento no encontrado.' });
    }

    const usage = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM docentes WHERE departamento_id = $1) AS docentes,
         (SELECT COUNT(*)::int FROM cursos WHERE departamento_id = $1) AS cursos`,
      [id]
    );

    if (usage.rows[0].docentes > 0 || usage.rows[0].cursos > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El departamento tiene docentes o cursos vinculados. Desactívelo para conservar la información institucional.',
        puedeDesactivar: true,
      });
    }

    await writeAudit(client, req, 'ELIMINAR_DEPARTAMENTO', 'departamentos_academicos', id, current);
    await client.query('DELETE FROM departamentos_academicos WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Departamento eliminado correctamente.', departamentoId: id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'departamentos académicos');
  } finally {
    client.release();
  }
});

// Cursos
router.post('/cursos', autenticar, soloRol('Administrador'), async (req, res) => {
  const { errors, clean } = validateCourse(req.body);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Revise los datos ingresados.', fields: errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await requireActiveDepartment(client, clean.departamentoId);
    const result = await client.query(
      `INSERT INTO cursos (codigo, nombre, departamento_id, creditos, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [clean.codigo, clean.nombre, clean.departamentoId, clean.creditos, clean.activo]
    );
    const id = result.rows[0].id;
    await writeAudit(client, req, 'CREAR_CURSO', 'cursos', id, clean);
    const curso = await getCourseById(client, id);
    await client.query('COMMIT');
    return res.status(201).json({ mensaje: 'Curso registrado correctamente.', curso });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'cursos académicos');
  } finally {
    client.release();
  }
});

router.put('/cursos/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const { errors, clean } = validateCourse(req.body);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Revise los datos ingresados.', fields: errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getCourseById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    await requireActiveDepartment(client, clean.departamentoId);

    if (!clean.activo && Number(current.horarios_activos) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El curso tiene horarios activos. Desactive primero sus horarios académicos.',
      });
    }

    await client.query(
      `UPDATE cursos
       SET codigo = $1,
           nombre = $2,
           departamento_id = $3,
           creditos = $4,
           activo = $5
       WHERE id = $6`,
      [clean.codigo, clean.nombre, clean.departamentoId, clean.creditos, clean.activo, id]
    );
    await writeAudit(client, req, 'ACTUALIZAR_CURSO', 'cursos', id, clean);
    const curso = await getCourseById(client, id);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Curso actualizado correctamente.', curso });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'cursos académicos');
  } finally {
    client.release();
  }
});

router.patch('/cursos/:id/estado', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id || typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'La solicitud de estado no es válida.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getCourseById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    if (req.body.activo) {
      await requireActiveDepartment(client, Number(current.departamento_id));
    } else if (Number(current.horarios_activos) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El curso tiene horarios activos. Desactívelos antes de continuar.',
      });
    }

    await client.query('UPDATE cursos SET activo = $1 WHERE id = $2', [req.body.activo, id]);
    await writeAudit(
      client,
      req,
      req.body.activo ? 'ACTIVAR_CURSO' : 'DESACTIVAR_CURSO',
      'cursos',
      id,
      { activo: req.body.activo }
    );
    const curso = await getCourseById(client, id);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Estado actualizado correctamente.', curso });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'cursos académicos');
  } finally {
    client.release();
  }
});

router.delete('/cursos/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getCourseById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    if (Number(current.horarios) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El curso tiene horarios asociados. Desactívelo para conservar su historial académico.',
        puedeDesactivar: true,
      });
    }

    await writeAudit(client, req, 'ELIMINAR_CURSO', 'cursos', id, current);
    await client.query('DELETE FROM cursos WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Curso eliminado correctamente.', cursoId: id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'cursos académicos');
  } finally {
    client.release();
  }
});

// Semestres
router.post('/semestres', autenticar, soloRol('Administrador'), async (req, res) => {
  const { errors, clean } = validateSemester(req.body);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Revise los datos ingresados.', fields: errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('semestre-activo'))`);

    const activeCount = await client.query("SELECT COUNT(*)::int AS total FROM semestres WHERE activo = TRUE");
    const activate = clean.activo || Number(activeCount.rows[0]?.total ?? 0) === 0;

    if (activate) {
      await client.query('UPDATE semestres SET activo = FALSE WHERE activo = TRUE');
    }

    const result = await client.query(
      `INSERT INTO semestres (codigo, fecha_inicio, fecha_fin, activo)
       VALUES ($1, $2::date, $3::date, $4)
       RETURNING id`,
      [clean.codigo, clean.fechaInicio, clean.fechaFin, activate]
    );
    const id = result.rows[0].id;
    await writeAudit(client, req, 'CREAR_SEMESTRE', 'semestres', id, { ...clean, activo: activate });
    const semestre = await getSemesterById(client, id);
    await client.query('COMMIT');
    return res.status(201).json({ mensaje: 'Semestre registrado correctamente.', semestre });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'semestres académicos');
  } finally {
    client.release();
  }
});

router.put('/semestres/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const { errors, clean } = validateSemester(req.body);
  if (hasErrors(errors)) {
    return res.status(400).json({ error: 'Revise los datos ingresados.', fields: errors });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getSemesterById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Semestre no encontrado.' });
    }

    await client.query(`SELECT pg_advisory_xact_lock(hashtext('semestre-activo'))`);
    const activate = clean.activo || current.activo;
    if (activate) {
      await client.query('UPDATE semestres SET activo = FALSE WHERE id <> $1 AND activo = TRUE', [id]);
    }

    await client.query(
      `UPDATE semestres
       SET codigo = $1,
           fecha_inicio = $2::date,
           fecha_fin = $3::date,
           activo = $4
       WHERE id = $5`,
      [clean.codigo, clean.fechaInicio, clean.fechaFin, activate, id]
    );
    await writeAudit(client, req, 'ACTUALIZAR_SEMESTRE', 'semestres', id, {
      ...clean,
      activo: activate,
    });
    const semestre = await getSemesterById(client, id);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Semestre actualizado correctamente.', semestre });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'semestres académicos');
  } finally {
    client.release();
  }
});

router.patch('/semestres/:id/activar', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('semestre-activo'))`);
    const current = await getSemesterById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Semestre no encontrado.' });
    }

    await client.query('UPDATE semestres SET activo = FALSE WHERE activo = TRUE AND id <> $1', [id]);
    await client.query('UPDATE semestres SET activo = TRUE WHERE id = $1', [id]);
    await writeAudit(client, req, 'ACTIVAR_SEMESTRE', 'semestres', id, {
      codigo: current.codigo,
    });
    const semestre = await getSemesterById(client, id);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Periodo académico activado correctamente.', semestre });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'semestres académicos');
  } finally {
    client.release();
  }
});

router.delete('/semestres/:id', autenticar, soloRol('Administrador'), async (req, res) => {
  const id = positiveInteger(req.params.id);
  if (!id) return res.status(400).json({ error: 'El identificador no es válido.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await getSemesterById(client, id, { forUpdate: true });
    if (!current) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Semestre no encontrado.' });
    }

    if (current.activo) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El periodo académico activo no puede eliminarse. Active otro periodo primero.',
      });
    }

    if (Number(current.horarios) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'El semestre tiene horarios vinculados y debe conservarse como historial institucional.',
      });
    }

    await writeAudit(client, req, 'ELIMINAR_SEMESTRE', 'semestres', id, current);
    await client.query('DELETE FROM semestres WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ mensaje: 'Semestre eliminado correctamente.', semestreId: id });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendError(res, error, 'semestres académicos');
  } finally {
    client.release();
  }
});

module.exports = router;
