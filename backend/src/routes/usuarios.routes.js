const router = require('express').Router();
const bcrypt = require('bcrypt');

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');

const VALID_ROLE_NAMES = new Set([
  'Administrador',
  'Docente',
  'Supervisor',
]);

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

function normalizeActive(value, fallback = true) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = cleanText(value, 20).toLowerCase();

  if (normalized === 'true' || normalized === 'activo') {
    return true;
  }

  if (normalized === 'false' || normalized === 'inactivo') {
    return false;
  }

  return fallback;
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

function validatePayload(body, { partial = false } = {}) {
  const errors = {};

  const codigo = cleanText(body.codigo, 20).toUpperCase();
  const nombres = cleanText(body.nombres, 100);
  const apellidos = cleanText(body.apellidos, 100);
  const email = cleanEmail(body.email ?? body.correo);
  const rolId = toPositiveInteger(body.rol_id ?? body.rolId);
  const password = String(body.password ?? '');

  if (!partial || body.codigo !== undefined) {
    if (!codigo) {
      errors.codigo = 'El código institucional es obligatorio.';
    }
  }

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

  if (!partial || body.email !== undefined || body.correo !== undefined) {
    if (!email) {
      errors.email = 'El correo institucional es obligatorio.';
    } else if (!isValidEmail(email)) {
      errors.email = 'El correo institucional no tiene un formato válido.';
    }
  }

  if (!partial || body.rol_id !== undefined || body.rolId !== undefined) {
    if (!rolId) {
      errors.rolId = 'Seleccione un rol válido.';
    }
  }

  if (!partial && password.length < 8) {
    errors.password = 'La contraseña inicial debe contener al menos 8 caracteres.';
  }

  if (partial && password && password.length < 8) {
    errors.password = 'La nueva contraseña debe contener al menos 8 caracteres.';
  }

  return {
    errors,
    clean: {
      codigo,
      nombres,
      apellidos,
      email,
      rolId,
      password,
      activo: normalizeActive(body.activo, true),
    },
  };
}

const USER_SELECT = `
  SELECT
    u.id,
    u.codigo,
    u.nombres,
    u.apellidos,
    u.email,
    u.activo,
    u.creado_en,
    u.actualizado_en,
    r.id AS rol_id,
    r.nombre AS rol,
    d.id AS docente_id
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  LEFT JOIN docentes d ON d.usuario_id = u.id
`;

async function getUserById(client, userId, { forUpdate = false } = {}) {
  const result = await client.query(
    `${USER_SELECT}
     WHERE u.id = $1
     ${forUpdate ? 'FOR UPDATE OF u' : ''}`,
    [userId]
  );

  return result.rows[0] ?? null;
}

async function getRoleById(client, roleId) {
  const result = await client.query(
    `SELECT id, nombre, descripcion
     FROM roles
     WHERE id = $1`,
    [roleId]
  );

  const role = result.rows[0] ?? null;

  if (!role || !VALID_ROLE_NAMES.has(role.nombre)) {
    return null;
  }

  return role;
}

async function countOtherActiveAdministrators(client, excludedUserId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE r.nombre = 'Administrador'
       AND u.activo = TRUE
       AND u.id <> $1`,
    [excludedUserId]
  );

  return Number(result.rows[0]?.total ?? 0);
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
     VALUES ($1, $2, 'usuarios', $3, $4::jsonb, NULLIF($5, '')::inet)`,
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

    if (constraint.includes('codigo')) {
      return res.status(409).json({
        error: 'Ya existe una cuenta con ese código institucional.',
        fields: {
          codigo: 'El código institucional ya está registrado.',
        },
      });
    }

    if (constraint.includes('email')) {
      return res.status(409).json({
        error: 'Ya existe una cuenta con ese correo institucional.',
        fields: {
          email: 'El correo institucional ya está registrado.',
        },
      });
    }

    return res.status(409).json({
      error: 'Uno de los datos ingresados ya está registrado.',
    });
  }

  if (error.code === '23503') {
    return res.status(409).json({
      error: 'La cuenta tiene información relacionada y no puede eliminarse. Puede desactivarla para restringir el acceso.',
    });
  }

  console.error('Error en el módulo de usuarios:', error);
  return res.status(500).json({
    error: 'No se pudo completar la operación solicitada.',
  });
}

async function ensureUniqueIdentity(
  client,
  { codigo, email, excludedUserId = null }
) {
  const result = await client.query(
    `SELECT
       EXISTS (
         SELECT 1
         FROM usuarios
         WHERE UPPER(codigo) = UPPER($1)
           AND ($3::int IS NULL OR id <> $3)
       ) AS codigo_existe,
       EXISTS (
         SELECT 1
         FROM usuarios
         WHERE LOWER(email) = LOWER($2)
           AND ($3::int IS NULL OR id <> $3)
       ) AS email_existe`,
    [codigo, email, excludedUserId]
  );

  const errors = {};

  if (result.rows[0].codigo_existe) {
    errors.codigo = 'El código institucional ya está registrado.';
  }

  if (result.rows[0].email_existe) {
    errors.email = 'El correo institucional ya está registrado.';
  }

  return errors;
}

function validateRoleTransition({ targetUser, nextRole }) {
  if (nextRole.nombre === 'Docente' && !targetUser?.docente_id) {
    return 'Las cuentas docentes deben registrarse desde el módulo Gestión de docentes.';
  }

  if (
    targetUser?.docente_id &&
    targetUser.rol === 'Docente' &&
    nextRole.nombre !== 'Docente'
  ) {
    return 'La cuenta está vinculada a un perfil docente y debe conservar el rol Docente.';
  }

  return null;
}

// GET /api/usuarios
router.get(
  '/',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const search = cleanText(req.query.search, 120);
    const roleId = toPositiveInteger(req.query.rol_id ?? req.query.rolId);
    const estado = cleanText(req.query.estado, 20).toLowerCase();

    const conditions = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      const index = values.length;
      conditions.push(`(
        u.nombres ILIKE $${index}
        OR u.apellidos ILIKE $${index}
        OR CONCAT_WS(' ', u.nombres, u.apellidos) ILIKE $${index}
        OR u.codigo ILIKE $${index}
        OR u.email ILIKE $${index}
      )`);
    }

    if (roleId) {
      values.push(roleId);
      conditions.push(`u.rol_id = $${values.length}`);
    }

    if (estado === 'activo' || estado === 'inactivo') {
      values.push(estado === 'activo');
      conditions.push(`u.activo = $${values.length}`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    try {
      const result = await pool.query(
        `${USER_SELECT}
         ${where}
         ORDER BY u.apellidos, u.nombres, u.id`,
        values
      );

      return res.json({ usuarios: result.rows });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// GET /api/usuarios/:id
router.get(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const userId = toPositiveInteger(req.params.id);

    if (!userId) {
      return res.status(400).json({ error: 'El identificador del usuario no es válido.' });
    }

    try {
      const user = await getUserById(pool, userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      return res.json({ usuario: user });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// POST /api/usuarios
router.post(
  '/',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const { errors, clean } = validatePayload(req.body);

    if (hasErrors(errors)) {
      return res.status(400).json({
        error: 'Revise los datos ingresados.',
        fields: errors,
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const role = await getRoleById(client, clean.rolId);

      if (!role) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'El rol seleccionado no existe.',
          fields: { rolId: 'Seleccione un rol válido.' },
        });
      }

      if (role.nombre === 'Docente') {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Las cuentas docentes deben registrarse desde Gestión de docentes para mantener completo su perfil académico.',
          fields: { rolId: 'Registre al docente desde el módulo Gestión de docentes.' },
        });
      }

      const duplicateErrors = await ensureUniqueIdentity(client, clean);

      if (hasErrors(duplicateErrors)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'El código o el correo ya están registrados.',
          fields: duplicateErrors,
        });
      }

      const passwordHash = await bcrypt.hash(clean.password, 12);

      const inserted = await client.query(
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
          clean.codigo,
          clean.nombres,
          clean.apellidos,
          clean.email,
          passwordHash,
          role.id,
          clean.activo,
        ]
      );

      const userId = inserted.rows[0].id;

      await writeAudit(client, req, 'CREAR_USUARIO', userId, {
        codigo: clean.codigo,
        email: clean.email,
        rol: role.nombre,
        activo: clean.activo,
      });

      const user = await getUserById(client, userId);

      await client.query('COMMIT');

      return res.status(201).json({
        mensaje: 'Usuario registrado correctamente.',
        usuario: user,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

// PUT /api/usuarios/:id
router.put(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const userId = toPositiveInteger(req.params.id);

    if (!userId) {
      return res.status(400).json({ error: 'El identificador del usuario no es válido.' });
    }

    const { errors, clean } = validatePayload(req.body, { partial: true });

    if (hasErrors(errors)) {
      return res.status(400).json({
        error: 'Revise los datos ingresados.',
        fields: errors,
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const targetUser = await getUserById(client, userId, { forUpdate: true });

      if (!targetUser) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const role = await getRoleById(client, clean.rolId);

      if (!role) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'El rol seleccionado no existe.',
          fields: { rolId: 'Seleccione un rol válido.' },
        });
      }

      if (userId === req.user.usuario_id) {
        if (role.id !== Number(targetUser.rol_id)) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'No puede modificar el rol de la sesión actual.' });
        }

        if (!clean.activo) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'No puede desactivar la sesión actual.' });
        }
      }

      const transitionError = validateRoleTransition({ targetUser, nextRole: role });

      if (transitionError) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: transitionError,
          fields: { rolId: transitionError },
        });
      }

      const removingActiveAdministrator =
        targetUser.rol === 'Administrador' &&
        targetUser.activo &&
        (role.nombre !== 'Administrador' || !clean.activo);

      if (removingActiveAdministrator) {
        const otherAdmins = await countOtherActiveAdministrators(client, userId);

        if (otherAdmins === 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'Debe permanecer al menos una cuenta administradora activa.',
          });
        }
      }

      const duplicateErrors = await ensureUniqueIdentity(client, {
        ...clean,
        excludedUserId: userId,
      });

      if (hasErrors(duplicateErrors)) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'El código o el correo ya están registrados.',
          fields: duplicateErrors,
        });
      }

      const parameters = [
        clean.codigo,
        clean.nombres,
        clean.apellidos,
        clean.email,
        role.id,
        clean.activo,
        userId,
      ];

      let passwordSql = '';

      if (clean.password) {
        const passwordHash = await bcrypt.hash(clean.password, 12);
        parameters.push(passwordHash);
        passwordSql = `, contrasena_hash = $${parameters.length}`;
      }

      await client.query(
        `UPDATE usuarios
         SET codigo = $1,
             nombres = $2,
             apellidos = $3,
             email = $4,
             rol_id = $5,
             activo = $6,
             actualizado_en = CURRENT_TIMESTAMP
             ${passwordSql}
         WHERE id = $7`,
        parameters
      );

      await writeAudit(client, req, 'ACTUALIZAR_USUARIO', userId, {
        codigo: clean.codigo,
        email: clean.email,
        rol_anterior: targetUser.rol,
        rol_nuevo: role.nombre,
        activo_anterior: targetUser.activo,
        activo_nuevo: clean.activo,
        contrasena_actualizada: Boolean(clean.password),
      });

      const user = await getUserById(client, userId);

      await client.query('COMMIT');

      return res.json({
        mensaje: 'Usuario actualizado correctamente.',
        usuario: user,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

// PATCH /api/usuarios/:id/estado
router.patch(
  '/:id/estado',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const userId = toPositiveInteger(req.params.id);

    if (!userId || typeof req.body.activo !== 'boolean') {
      return res.status(400).json({
        error: 'El identificador y el estado del usuario no son válidos.',
      });
    }

    if (userId === req.user.usuario_id) {
      return res.status(403).json({
        error: 'No puede modificar el estado de la sesión actual.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const targetUser = await getUserById(client, userId, { forUpdate: true });

      if (!targetUser) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      if (
        targetUser.rol === 'Administrador' &&
        targetUser.activo &&
        !req.body.activo
      ) {
        const otherAdmins = await countOtherActiveAdministrators(client, userId);

        if (otherAdmins === 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'Debe permanecer al menos una cuenta administradora activa.',
          });
        }
      }

      await client.query(
        `UPDATE usuarios
         SET activo = $1,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [req.body.activo, userId]
      );

      await writeAudit(client, req, 'CAMBIAR_ESTADO_USUARIO', userId, {
        activo_anterior: targetUser.activo,
        activo_nuevo: req.body.activo,
      });

      const user = await getUserById(client, userId);

      await client.query('COMMIT');

      return res.json({
        mensaje: req.body.activo
          ? 'Usuario activado correctamente.'
          : 'Usuario desactivado correctamente.',
        usuario: user,
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

// DELETE /api/usuarios/:id
router.delete(
  '/:id',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const userId = toPositiveInteger(req.params.id);

    if (!userId) {
      return res.status(400).json({ error: 'El identificador del usuario no es válido.' });
    }

    if (userId === req.user.usuario_id) {
      return res.status(403).json({ error: 'No puede eliminar la sesión actual.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const targetUser = await getUserById(client, userId, { forUpdate: true });

      if (!targetUser) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      if (targetUser.docente_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'La cuenta está vinculada a un docente. Desactívela o gestione el perfil desde el módulo Docentes.',
        });
      }

      if (targetUser.rol === 'Administrador' && targetUser.activo) {
        const otherAdmins = await countOtherActiveAdministrators(client, userId);

        if (otherAdmins === 0) {
          await client.query('ROLLBACK');
          return res.status(409).json({
            error: 'Debe permanecer al menos una cuenta administradora activa.',
          });
        }
      }

      await writeAudit(client, req, 'ELIMINAR_USUARIO', userId, {
        codigo: targetUser.codigo,
        email: targetUser.email,
        rol: targetUser.rol,
      });

      await client.query('DELETE FROM usuarios WHERE id = $1', [userId]);
      await client.query('COMMIT');

      return res.json({ mensaje: 'Usuario eliminado correctamente.' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
