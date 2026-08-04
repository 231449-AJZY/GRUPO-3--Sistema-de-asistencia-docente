const router = require('express').Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

const CATEGORIAS_VALIDAS = new Set([
  'Principal',
  'Asociado',
  'Auxiliar',
  'Contratado',
]);

const CONDICIONES_VALIDAS = new Set([
  'Nombrado',
  'Contratado',
]);

const DOCENTE_SELECT = `
  SELECT
    d.id,
    d.usuario_id,
    u.codigo,
    u.nombres,
    u.apellidos,
    u.email,
    u.activo,
    d.dni,
    d.telefono,
    d.categoria,
    d.condicion,
    d.creado_en AS fecha_registro,
    dep.id AS departamento_id,
    dep.nombre AS departamento,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM datos_biometricos db
        WHERE db.docente_id = d.id
          AND db.activo = TRUE
      ) THEN 'Registrado'
      ELSE 'Pendiente'
    END AS estado_biometrico
  FROM docentes d
  JOIN usuarios u ON u.id = d.usuario_id
  JOIN departamentos_academicos dep ON dep.id = d.departamento_id
`;

function cleanText(value, maxLength = 255) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanText(value, 150).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getRequestedActiveState(value, fallback = true) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = cleanText(value, 20).toLowerCase();

  if (normalized === 'activo') {
    return true;
  }

  if (normalized === 'inactivo' || normalized === 'en pausa') {
    return false;
  }

  return fallback;
}

function getValidationErrors(body, { partial = false } = {}) {
  const errors = {};

  const nombres = cleanText(body.nombres, 100);
  const apellidos = cleanText(body.apellidos, 100);
  const dni = cleanText(body.dni, 15);
  const correo = cleanEmail(body.correo ?? body.email);
  const telefono = cleanText(body.telefono, 20);
  const departamento = cleanText(body.departamento, 150);
  const departamentoId = parsePositiveInteger(body.departamento_id);
  const categoria = cleanText(body.categoria, 80);
  const condicion = cleanText(body.condicion, 50);

  if (!partial || body.nombres !== undefined) {
    if (!nombres) {
      errors.nombres = 'Los nombres son obligatorios.';
    }
  }

  if (!partial || body.apellidos !== undefined) {
    if (!apellidos) {
      errors.apellidos = 'Los apellidos son obligatorios.';
    }
  }

  if (!partial || body.dni !== undefined) {
    if (!/^\d{8}$/.test(dni)) {
      errors.dni = 'El DNI debe contener exactamente 8 dígitos.';
    }
  }

  if (!partial || body.correo !== undefined || body.email !== undefined) {
    if (!correo) {
      errors.correo = 'El correo institucional es obligatorio.';
    } else if (!isValidEmail(correo)) {
      errors.correo = 'El correo institucional no tiene un formato válido.';
    }
  }

  if (telefono && !/^\d{9}$/.test(telefono)) {
    errors.telefono = 'El teléfono debe contener 9 dígitos.';
  }

  if (!partial || body.departamento !== undefined || body.departamento_id !== undefined) {
    if (!departamento && !departamentoId) {
      errors.departamento = 'Seleccione un departamento académico válido.';
    }
  }

  if (categoria && !CATEGORIAS_VALIDAS.has(categoria)) {
    errors.categoria = 'La categoría docente no es válida.';
  }

  if (condicion && !CONDICIONES_VALIDAS.has(condicion)) {
    errors.condicion = 'La condición docente no es válida.';
  }

  return {
    errors,
    clean: {
      nombres,
      apellidos,
      dni,
      correo,
      telefono,
      departamento,
      departamentoId,
      categoria: categoria || 'Contratado',
      condicion:
        condicion ||
        (categoria === 'Contratado' ? 'Contratado' : 'Nombrado'),
    },
  };
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function randomCharacter(characters) {
  return characters[crypto.randomInt(0, characters.length)];
}

function generateTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '#$%&*+-_';
  const all = `${upper}${lower}${digits}${symbols}`;

  const required = [
    randomCharacter(upper),
    randomCharacter(lower),
    randomCharacter(digits),
    randomCharacter(symbols),
  ];

  while (required.length < 14) {
    required.push(randomCharacter(all));
  }

  for (let index = required.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [required[index], required[swapIndex]] = [required[swapIndex], required[index]];
  }

  return required.join('');
}

async function resolveDepartment(client, { departamentoId, departamento }) {
  const result = departamentoId
    ? await client.query(
        `SELECT id, nombre
         FROM departamentos_academicos
         WHERE id = $1 AND activo = TRUE`,
        [departamentoId]
      )
    : await client.query(
        `SELECT id, nombre
         FROM departamentos_academicos
         WHERE LOWER(nombre) = LOWER($1)
           AND activo = TRUE`,
        [departamento]
      );

  return result.rows[0] ?? null;
}

async function getDocenteById(client, docenteId) {
  const result = await client.query(
    `${DOCENTE_SELECT}
     WHERE d.id = $1`,
    [docenteId]
  );

  return result.rows[0] ?? null;
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
     VALUES ($1, $2, 'docentes', $3, $4::jsonb, NULLIF($5, '')::inet)`,
    [
      req.user.usuario_id,
      action,
      recordId,
      JSON.stringify(detail ?? {}),
      req.ip || '',
    ]
  );
}

function sendDatabaseError(res, error) {
  if (error.code === '23505') {
    const constraint = String(error.constraint ?? '').toLowerCase();

    if (constraint.includes('dni')) {
      return res.status(409).json({ error: 'Ya existe un docente registrado con ese DNI.' });
    }

    if (constraint.includes('email')) {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo.' });
    }

    if (constraint.includes('codigo')) {
      return res.status(409).json({ error: 'No se pudo generar un código docente único. Intente nuevamente.' });
    }

    return res.status(409).json({ error: 'Uno de los datos ingresados ya está registrado.' });
  }

  if (error.code === '23503') {
    return res.status(400).json({ error: 'La información relacionada no existe o ya no está disponible.' });
  }

  console.error('Error en el módulo de docentes:', error);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

// GET /api/docentes/catalogos
router.get(
  '/catalogos',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    try {
      const departamentos = await pool.query(
        `SELECT id, codigo, nombre
         FROM departamentos_academicos
         WHERE activo = TRUE
         ORDER BY nombre`
      );

      return res.json({
        departamentos: departamentos.rows,
        categorias: Array.from(CATEGORIAS_VALIDAS),
        condiciones: Array.from(CONDICIONES_VALIDAS),
      });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// GET /api/docentes/stats
router.get(
  '/stats',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (_req, res) => {
    try {
      const [totales, porDepartamento, asistenciaHoy] = await Promise.all([
        pool.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE u.activo = TRUE)::int AS activos,
             COUNT(*) FILTER (WHERE u.activo = FALSE)::int AS inactivos,
             COUNT(*) FILTER (
               WHERE EXISTS (
                 SELECT 1
                 FROM datos_biometricos db
                 WHERE db.docente_id = d.id
                   AND db.activo = TRUE
               )
             )::int AS biometricos
           FROM docentes d
           JOIN usuarios u ON u.id = d.usuario_id`
        ),
        pool.query(
          `SELECT dep.nombre AS departamento, COUNT(*)::int AS total
           FROM docentes d
           JOIN departamentos_academicos dep ON dep.id = d.departamento_id
           JOIN usuarios u ON u.id = d.usuario_id
           WHERE u.activo = TRUE
           GROUP BY dep.nombre
           ORDER BY total DESC, dep.nombre`
        ),
        pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE estado = 'PUNTUAL')::int AS puntuales,
             COUNT(*) FILTER (WHERE estado = 'TARDANZA')::int AS tardanzas,
             COUNT(*)::int AS total_registros
           FROM registros_ingreso_institucional
           WHERE fecha = CURRENT_DATE`
        ),
      ]);

      const docentes = totales.rows[0];

      return res.json({
        docentes: {
          ...docentes,
          pendientesBiometricos: docentes.total - docentes.biometricos,
        },
        porDepartamento: porDepartamento.rows,
        asistenciaHoy: asistenciaHoy.rows[0],
      });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// GET /api/docentes
router.get(
  '/',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const search = cleanText(req.query.search, 120);
    const departamento = cleanText(req.query.departamento, 150);
    const estado = cleanText(req.query.estado, 20).toLowerCase();

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      const index = values.length;
      conditions.push(`(
        u.nombres ILIKE $${index}
        OR u.apellidos ILIKE $${index}
        OR CONCAT(u.nombres, ' ', u.apellidos) ILIKE $${index}
        OR u.codigo ILIKE $${index}
        OR d.dni ILIKE $${index}
        OR u.email ILIKE $${index}
      )`);
    }

    if (departamento) {
      values.push(departamento);
      conditions.push(`LOWER(dep.nombre) = LOWER($${values.length})`);
    }

    if (estado === 'activo' || estado === 'inactivo') {
      values.push(estado === 'activo');
      conditions.push(`u.activo = $${values.length}`);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    try {
      const result = await pool.query(
        `${DOCENTE_SELECT}
         ${where}
         ORDER BY u.apellidos, u.nombres`,
        values
      );

      return res.json({ docentes: result.rows });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// GET /api/docentes/:id
router.get(
  '/:id',
  autenticar,
  soloRol('Administrador', 'Supervisor'),
  async (req, res) => {
    const docenteId = parsePositiveInteger(req.params.id);

    if (!docenteId) {
      return res.status(400).json({ error: 'El identificador del docente no es válido.' });
    }

    try {
      const docente = await getDocenteById(pool, docenteId);

      if (!docente) {
        return res.status(404).json({ error: 'Docente no encontrado.' });
      }

      return res.json({ docente });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// POST /api/docentes
router.post(
  '/',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const { errors, clean } = getValidationErrors(req.body);

    if (hasErrors(errors)) {
      return res.status(400).json({
        error: 'Revise los datos ingresados.',
        fields: errors,
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const department = await resolveDepartment(client, clean);

      if (!department) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'El departamento académico no existe o está inactivo.' });
      }

      const duplicate = await client.query(
        `SELECT
           EXISTS (SELECT 1 FROM usuarios WHERE LOWER(email) = LOWER($1)) AS email_exists,
           EXISTS (SELECT 1 FROM docentes WHERE dni = $2) AS dni_exists`,
        [clean.correo, clean.dni]
      );

      if (duplicate.rows[0].email_exists) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo.' });
      }

      if (duplicate.rows[0].dni_exists) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Ya existe un docente registrado con ese DNI.' });
      }

      const role = await client.query(
        `SELECT id FROM roles WHERE nombre = 'Docente'`
      );

      if (role.rows.length === 0) {
        throw new Error('No existe el rol Docente en la base de datos.');
      }

      // Evita códigos repetidos cuando dos administradores registran a la vez.
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext('usuarios.codigo.docente'))`
      );

      const nextCode = await client.query(
        `SELECT COALESCE(
           MAX(
             CASE
               WHEN codigo ~ '^DOC-[0-9]+$'
               THEN SUBSTRING(codigo FROM 5)::int
               ELSE 0
             END
           ),
           0
         ) + 1 AS siguiente
         FROM usuarios`
      );

      const codigo = `DOC-${String(nextCode.rows[0].siguiente).padStart(4, '0')}`;
      const passwordTemporal = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(passwordTemporal, 12);
      const activo = getRequestedActiveState(req.body.estado, true);

      const usuarioResult = await client.query(
        `INSERT INTO usuarios (
           codigo,
           nombres,
           apellidos,
           email,
           contrasena_hash,
           rol_id,
           activo,
           actualizado_en
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          codigo,
          clean.nombres,
          clean.apellidos,
          clean.correo,
          passwordHash,
          role.rows[0].id,
          activo,
        ]
      );

      const docenteResult = await client.query(
        `INSERT INTO docentes (
           usuario_id,
           departamento_id,
           dni,
           categoria,
           condicion,
           telefono,
           actualizado_en
         )
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          usuarioResult.rows[0].id,
          department.id,
          clean.dni,
          clean.categoria,
          clean.condicion,
          clean.telefono || null,
        ]
      );

      const docenteId = docenteResult.rows[0].id;

      await writeAudit(client, req, 'CREAR_DOCENTE', docenteId, {
        codigo,
        correo: clean.correo,
        departamento: department.nombre,
      });

      const docente = await getDocenteById(client, docenteId);

      await client.query('COMMIT');

      return res.status(201).json({
        mensaje: 'Docente registrado correctamente.',
        docente,
        passwordTemporal,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

// PUT /api/docentes/:id
router.put(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const docenteId = parsePositiveInteger(req.params.id);

    if (!docenteId) {
      return res.status(400).json({ error: 'El identificador del docente no es válido.' });
    }

    const { errors, clean } = getValidationErrors(req.body);

    if (hasErrors(errors)) {
      return res.status(400).json({
        error: 'Revise los datos ingresados.',
        fields: errors,
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT d.id, d.usuario_id, u.email
         FROM docentes d
         JOIN usuarios u ON u.id = d.usuario_id
         WHERE d.id = $1
         FOR UPDATE`,
        [docenteId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Docente no encontrado.' });
      }

      const department = await resolveDepartment(client, clean);

      if (!department) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'El departamento académico no existe o está inactivo.' });
      }

      const duplicate = await client.query(
        `SELECT
           EXISTS (
             SELECT 1 FROM usuarios
             WHERE LOWER(email) = LOWER($1)
               AND id <> $2
           ) AS email_exists,
           EXISTS (
             SELECT 1 FROM docentes
             WHERE dni = $3
               AND id <> $4
           ) AS dni_exists`,
        [
          clean.correo,
          existing.rows[0].usuario_id,
          clean.dni,
          docenteId,
        ]
      );

      if (duplicate.rows[0].email_exists) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Ya existe otro usuario registrado con ese correo.' });
      }

      if (duplicate.rows[0].dni_exists) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Ya existe otro docente registrado con ese DNI.' });
      }

      const activo = getRequestedActiveState(req.body.estado, true);

      await client.query(
        `UPDATE usuarios
         SET nombres = $1,
             apellidos = $2,
             email = $3,
             activo = $4,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          clean.nombres,
          clean.apellidos,
          clean.correo,
          activo,
          existing.rows[0].usuario_id,
        ]
      );

      await client.query(
        `UPDATE docentes
         SET departamento_id = $1,
             dni = $2,
             categoria = $3,
             condicion = $4,
             telefono = $5,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          department.id,
          clean.dni,
          clean.categoria,
          clean.condicion,
          clean.telefono || null,
          docenteId,
        ]
      );

      await writeAudit(client, req, 'ACTUALIZAR_DOCENTE', docenteId, {
        correo: clean.correo,
        departamento: department.nombre,
        activo,
      });

      const docente = await getDocenteById(client, docenteId);

      await client.query('COMMIT');

      return res.json({
        mensaje: 'Docente actualizado correctamente.',
        docente,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

async function updateStatus(req, res) {
  const docenteId = parsePositiveInteger(req.params.id);

  if (!docenteId) {
    return res.status(400).json({ error: 'El identificador del docente no es válido.' });
  }

  if (typeof req.body.activo !== 'boolean') {
    return res.status(400).json({ error: 'El campo activo debe ser true o false.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE usuarios
       SET activo = $1,
           actualizado_en = CURRENT_TIMESTAMP
       WHERE id = (
         SELECT usuario_id
         FROM docentes
         WHERE id = $2
       )
       RETURNING id`,
      [req.body.activo, docenteId]
    );

    if (updated.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Docente no encontrado.' });
    }

    await writeAudit(client, req, 'CAMBIAR_ESTADO_DOCENTE', docenteId, {
      activo: req.body.activo,
    });

    const docente = await getDocenteById(client, docenteId);

    await client.query('COMMIT');

    return res.json({
      mensaje: `Docente ${req.body.activo ? 'activado' : 'desactivado'} correctamente.`,
      docente,
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    return sendDatabaseError(res, error);
  } finally {
    client.release();
  }
}


async function getDeleteDependencies(client, docenteId, usuarioId) {
  const result = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM horarios_curso WHERE docente_id = $1) AS horarios,
       (SELECT COUNT(*)::int FROM registros_ingreso_institucional WHERE docente_id = $1) AS ingresos,
       (SELECT COUNT(*)::int FROM registros_asistencia_curso WHERE docente_id = $1) AS asistencias,
       (SELECT COUNT(*)::int FROM alertas WHERE docente_id = $1) AS alertas,
       (
         SELECT COUNT(*)::int
         FROM datos_biometricos
         WHERE enrolado_por = $2
           AND docente_id <> $1
       ) AS enrolamientos_realizados,
       (
         SELECT COUNT(*)::int
         FROM configuracion_asistencia
         WHERE actualizado_por = $2
       ) AS configuraciones_actualizadas,
       (
         SELECT COUNT(*)::int
         FROM alertas
         WHERE generado_por = $2
           AND docente_id <> $1
       ) AS alertas_generadas,
       (
         SELECT COUNT(*)::int
         FROM audit_log
         WHERE usuario_id = $2
       ) AS acciones_auditadas`,
    [docenteId, usuarioId]
  );

  const row = result.rows[0];

  return {
    horarios: Number(row.horarios ?? 0),
    ingresos: Number(row.ingresos ?? 0),
    asistencias: Number(row.asistencias ?? 0),
    alertas: Number(row.alertas ?? 0),
    enrolamientosRealizados: Number(row.enrolamientos_realizados ?? 0),
    configuracionesActualizadas: Number(row.configuraciones_actualizadas ?? 0),
    alertasGeneradas: Number(row.alertas_generadas ?? 0),
    accionesAuditadas: Number(row.acciones_auditadas ?? 0),
  };
}

function hasDeleteDependencies(details) {
  return Object.values(details).some((value) => Number(value) > 0);
}

// DELETE /api/docentes/:id
router.delete(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const docenteId = parsePositiveInteger(req.params.id);

    if (!docenteId) {
      return res.status(400).json({
        error: 'El identificador del docente no es válido.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT
           d.id,
           d.usuario_id,
           d.dni,
           u.codigo,
           u.nombres,
           u.apellidos,
           u.email,
           u.activo
         FROM docentes d
         JOIN usuarios u ON u.id = d.usuario_id
         WHERE d.id = $1
         FOR UPDATE`,
        [docenteId]
      );

      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          error: 'Docente no encontrado.',
        });
      }

      const docente = existing.rows[0];

      if (Number(req.user.usuario_id) === Number(docente.usuario_id)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'No puede eliminar la cuenta que mantiene la sesión actual.',
          code: 'CUENTA_EN_USO',
        });
      }

      const details = await getDeleteDependencies(
        client,
        docenteId,
        docente.usuario_id
      );

      if (hasDeleteDependencies(details)) {
        await client.query('ROLLBACK');

        return res.status(409).json({
          error:
            'No es posible eliminar definitivamente este docente porque posee información institucional vinculada. Puede dar de baja su cuenta para conservar el historial.',
          code: 'DOCENTE_CON_HISTORIAL',
          canDeactivate: Boolean(docente.activo),
          details,
        });
      }

      await writeAudit(client, req, 'ELIMINAR_DOCENTE', docenteId, {
        usuario_id: docente.usuario_id,
        codigo: docente.codigo,
        dni: docente.dni,
        correo: docente.email,
        nombre: `${docente.nombres} ${docente.apellidos}`.trim(),
        motivo: 'Eliminación definitiva sin historial institucional relacionado.',
      });

      const deleted = await client.query(
        `DELETE FROM usuarios
         WHERE id = $1
         RETURNING id`,
        [docente.usuario_id]
      );

      if (deleted.rows.length === 0) {
        throw new Error('No se pudo eliminar la cuenta asociada al docente.');
      }

      await client.query('COMMIT');

      return res.json({
        mensaje: 'Docente eliminado definitivamente.',
        docenteId,
        usuarioId: docente.usuario_id,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);

      if (error.code === '23503') {
        return res.status(409).json({
          error:
            'No es posible eliminar definitivamente este docente porque conserva información institucional relacionada. Desactive la cuenta para mantener el historial.',
          code: 'DOCENTE_CON_HISTORIAL',
          canDeactivate: true,
        });
      }

      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

router.put(
  '/:id/estado',
  autenticar,
  soloRol('Administrador'),
  updateStatus
);

router.patch(
  '/:id/estado',
  autenticar,
  soloRol('Administrador'),
  updateStatus
);

module.exports = router;
