const router = require('express').Router();

const pool = require('../db/pool');
const {
  autenticar,
  soloRol,
} = require('../middlewares/auth.middleware');

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

function sendDatabaseError(res, error) {
  console.error('Error en el módulo de roles:', error);
  return res.status(500).json({
    error: 'No se pudo completar la operación solicitada.',
  });
}

// GET /api/roles
router.get(
  '/',
  autenticar,
  soloRol('Administrador'),
  async (_req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           r.id,
           r.nombre,
           r.descripcion,
           r.creado_en,
           COUNT(u.id)::int AS total_usuarios,
           COUNT(u.id) FILTER (WHERE u.activo = TRUE)::int AS usuarios_activos
         FROM roles r
         LEFT JOIN usuarios u ON u.rol_id = r.id
         GROUP BY r.id, r.nombre, r.descripcion, r.creado_en
         ORDER BY r.id`
      );

      return res.json({ roles: result.rows });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// GET /api/roles/:id/usuarios
router.get(
  '/:id/usuarios',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const roleId = toPositiveInteger(req.params.id);

    if (!roleId) {
      return res.status(400).json({ error: 'El identificador del rol no es válido.' });
    }

    try {
      const result = await pool.query(
        `SELECT
           u.id,
           u.codigo,
           u.nombres,
           u.apellidos,
           u.email,
           u.activo,
           u.creado_en,
           u.actualizado_en,
           r.id AS rol_id,
           r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         WHERE u.rol_id = $1
         ORDER BY u.apellidos, u.nombres`,
        [roleId]
      );

      return res.json({ usuarios: result.rows });
    } catch (error) {
      return sendDatabaseError(res, error);
    }
  }
);

// PUT /api/roles/usuario/:id
router.put(
  '/usuario/:id',
  autenticar,
  soloRol('Administrador'),
  async (req, res) => {
    const userId = toPositiveInteger(req.params.id);
    const roleId = toPositiveInteger(req.body.rol_id ?? req.body.rolId);

    if (!userId || !roleId) {
      return res.status(400).json({
        error: 'El usuario y el rol seleccionados no son válidos.',
      });
    }

    if (userId === req.user.usuario_id) {
      return res.status(403).json({
        error: 'No puede modificar el rol de la sesión actual.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `SELECT
           u.id,
           u.rol_id,
           u.activo,
           r.nombre AS rol,
           d.id AS docente_id
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         LEFT JOIN docentes d ON d.usuario_id = u.id
         WHERE u.id = $1
         FOR UPDATE OF u`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }

      const roleResult = await client.query(
        `SELECT id, nombre, descripcion
         FROM roles
         WHERE id = $1`,
        [roleId]
      );

      if (roleResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Rol no encontrado.' });
      }

      const user = userResult.rows[0];
      const nextRole = roleResult.rows[0];

      if (nextRole.nombre === 'Docente' && !user.docente_id) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Las cuentas docentes deben registrarse desde Gestión de docentes.',
        });
      }

      if (
        user.docente_id &&
        user.rol === 'Docente' &&
        nextRole.nombre !== 'Docente'
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'La cuenta está vinculada a un perfil docente y debe conservar el rol Docente.',
        });
      }

      if (
        user.rol === 'Administrador' &&
        user.activo &&
        nextRole.nombre !== 'Administrador'
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
         SET rol_id = $1,
             actualizado_en = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [roleId, userId]
      );

      await writeAudit(client, req, 'ASIGNAR_ROL_USUARIO', userId, {
        rol_anterior: user.rol,
        rol_nuevo: nextRole.nombre,
      });

      const updated = await client.query(
        `SELECT
           u.id,
           u.codigo,
           u.nombres,
           u.apellidos,
           u.email,
           u.activo,
           u.creado_en,
           u.actualizado_en,
           r.id AS rol_id,
           r.nombre AS rol
         FROM usuarios u
         JOIN roles r ON r.id = u.rol_id
         WHERE u.id = $1`,
        [userId]
      );

      await client.query('COMMIT');

      return res.json({
        mensaje: 'Rol actualizado correctamente.',
        usuario: updated.rows[0],
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      return sendDatabaseError(res, error);
    } finally {
      client.release();
    }
  }
);

module.exports = router;
