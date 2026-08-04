const router = require('express').Router();
const pool   = require('../db/pool');
const { autenticar, soloRol } = require('../middlewares/auth.middleware');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function toPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function findDocenteIdByUsuarioId(usuarioId) {
  const result = await pool.query(
    `SELECT d.id
     FROM docentes d
     JOIN usuarios u ON u.id = d.usuario_id
     WHERE d.usuario_id = $1 AND u.activo = TRUE`,
    [usuarioId]
  );

  return result.rows.length > 0 ? Number(result.rows[0].id) : null;
}

async function ensureDocenteExists(docenteId) {
  const result = await pool.query(
    `SELECT d.id
     FROM docentes d
     JOIN usuarios u ON u.id = d.usuario_id
     WHERE d.id = $1 AND u.activo = TRUE`,
    [docenteId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Perfil de docente no encontrado o inactivo');
  }

  return docenteId;
}

async function getAuthenticatedDocenteId(req) {
  if (req.user.rol !== 'Docente') {
    throw new HttpError(403, 'La cuenta autenticada no corresponde a un docente');
  }

  const tokenDocenteId = toPositiveInteger(req.user.docente_id);

  if (tokenDocenteId) {
    return ensureDocenteExists(tokenDocenteId);
  }

  // Compatibilidad con tokens emitidos antes de incorporar docente_id.
  const resolvedId = await findDocenteIdByUsuarioId(req.user.usuario_id);

  if (!resolvedId) {
    throw new HttpError(404, 'Perfil de docente no encontrado');
  }

  return resolvedId;
}

async function resolveDocenteIdForWrite(req, requestedDocenteId) {
  if (req.user.rol === 'Docente') {
    const ownDocenteId = await getAuthenticatedDocenteId(req);
    const requested = toPositiveInteger(requestedDocenteId);

    if (requested && requested !== ownDocenteId) {
      throw new HttpError(403, 'No puede registrar asistencia para otro docente');
    }

    return ownDocenteId;
  }

  if (!['Administrador', 'Supervisor'].includes(req.user.rol)) {
    throw new HttpError(403, 'Sin permiso para registrar asistencia');
  }

  const requested = toPositiveInteger(requestedDocenteId);

  if (!requested) {
    throw new HttpError(400, 'docente_id es requerido para esta operación');
  }

  return ensureDocenteExists(requested);
}

async function resolveDocenteIdForRead(req, requestedDocenteId) {
  if (req.user.rol === 'Docente') {
    const ownDocenteId = await getAuthenticatedDocenteId(req);
    const requested = toPositiveInteger(requestedDocenteId);

    if (requested && requested !== ownDocenteId) {
      throw new HttpError(403, 'No puede consultar la asistencia de otro docente');
    }

    return ownDocenteId;
  }

  if (!['Administrador', 'Supervisor'].includes(req.user.rol)) {
    throw new HttpError(403, 'Sin permiso para consultar este recurso');
  }

  const requested = toPositiveInteger(requestedDocenteId);

  if (!requested) {
    throw new HttpError(400, 'docente_id inválido');
  }

  return ensureDocenteExists(requested);
}

async function getAsistenciaDocente(docenteId) {
  const ingresos = await pool.query(
    `SELECT fecha, hora_registro, estado, metodo_verificacion, dispositivo_id, observacion
     FROM registros_ingreso_institucional
     WHERE docente_id = $1
     ORDER BY fecha DESC, hora_registro DESC
     LIMIT 30`,
    [docenteId]
  );

  const cursos = await pool.query(
    `SELECT rac.fecha, rac.hora_registro, rac.estado,
             rac.metodo_verificacion, rac.dispositivo_id, rac.observacion,
            c.nombre AS curso, hc.aula
     FROM registros_asistencia_curso rac
     JOIN horarios_curso hc ON hc.id = rac.horario_curso_id
     JOIN cursos c ON c.id = hc.curso_id
     WHERE rac.docente_id = $1
     ORDER BY rac.fecha DESC, rac.hora_registro DESC
     LIMIT 30`,
    [docenteId]
  );

  return { ingresos: ingresos.rows, cursos: cursos.rows };
}

function handleRouteError(err, res) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err?.code === '23505') {
    return res.status(409).json({ error: 'La asistencia ya fue registrada' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

router.post('/ingreso', autenticar, async (req, res) => {
  try {
    const docenteId = await resolveDocenteIdForWrite(req, req.body.docente_id);
    const { dispositivo_id } = req.body;

    const config = await pool.query(
      'SELECT hora_ingreso_limite FROM configuracion_asistencia LIMIT 1'
    );
    const horaLimite = config.rows[0]?.hora_ingreso_limite || '09:00:00';

    const yaRegistro = await pool.query(
      `SELECT id
       FROM registros_ingreso_institucional
       WHERE docente_id = $1 AND fecha = CURRENT_DATE`,
      [docenteId]
    );

    if (yaRegistro.rows.length > 0) {
      return res.status(409).json({ error: 'El docente ya registró su ingreso hoy' });
    }

    const ahora = await pool.query('SELECT CURRENT_TIME AS hora');
    const estado = ahora.rows[0].hora <= horaLimite ? 'PUNTUAL' : 'TARDANZA';

    const result = await pool.query(
      `INSERT INTO registros_ingreso_institucional
         (docente_id, fecha, hora_registro, dispositivo_id, estado)
       VALUES ($1, CURRENT_DATE, CURRENT_TIME, $2, $3)
       RETURNING *`,
      [docenteId, dispositivo_id || null, estado]
    );

    res.status(201).json({
      mensaje: `Ingreso registrado como ${estado}`,
      registro: result.rows[0],
    });
  } catch (err) {
    handleRouteError(err, res);
  }
});

router.post('/curso', autenticar, async (req, res) => {
  try {
    const horarioCursoId = toPositiveInteger(req.body.horario_curso_id);

    if (!horarioCursoId) {
      return res.status(400).json({ error: 'horario_curso_id es requerido' });
    }

    const docenteId = await resolveDocenteIdForWrite(req, req.body.docente_id);
    const { dispositivo_id } = req.body;

    const horario = await pool.query(
      `SELECT id, docente_id, dia_semana, hora_inicio
       FROM horarios_curso
       WHERE id = $1 AND activo = TRUE`,
      [horarioCursoId]
    );

    if (horario.rows.length === 0) {
      return res.status(404).json({ error: 'Horario no encontrado' });
    }

    if (Number(horario.rows[0].docente_id) !== docenteId) {
      return res.status(403).json({
        error: 'El horario seleccionado no pertenece al docente autenticado',
      });
    }

    const currentDay = await pool.query(
      'SELECT EXTRACT(ISODOW FROM CURRENT_DATE)::int AS dia_semana'
    );

    if (Number(horario.rows[0].dia_semana) !== Number(currentDay.rows[0].dia_semana)) {
      return res.status(400).json({
        error: 'La sesión seleccionada no corresponde al día de hoy',
      });
    }

    const config = await pool.query(
      `SELECT tolerancia_antes_minutos, tolerancia_despues_minutos
       FROM configuracion_asistencia
       LIMIT 1`
    );

    const antesMin = config.rows[0]?.tolerancia_antes_minutos ?? 15;
    const despuesMin = config.rows[0]?.tolerancia_despues_minutos ?? 10;

    const yaRegistro = await pool.query(
      `SELECT id
       FROM registros_asistencia_curso
       WHERE horario_curso_id = $1 AND fecha = CURRENT_DATE`,
      [horarioCursoId]
    );

    if (yaRegistro.rows.length > 0) {
      return res.status(409).json({
        error: 'Ya se registró asistencia para esta sesión hoy',
      });
    }

    const ventana = await pool.query(
      `SELECT ($1::time - INTERVAL '1 minute' * $2) AS desde,
              ($1::time + INTERVAL '1 minute' * $3) AS hasta,
              CURRENT_TIME AS ahora`,
      [horario.rows[0].hora_inicio, antesMin, despuesMin]
    );

    const { desde, hasta, ahora } = ventana.rows[0];

    if (ahora < desde || ahora > hasta) {
      return res.status(400).json({
        error: `Fuera del margen permitido. Puede registrar desde ${desde} hasta ${hasta}`,
      });
    }

    const estado = ahora > horario.rows[0].hora_inicio ? 'TARDANZA' : 'PRESENTE';

    const result = await pool.query(
      `INSERT INTO registros_asistencia_curso
         (horario_curso_id, docente_id, fecha, hora_registro, dispositivo_id, estado)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_TIME, $3, $4)
       RETURNING *`,
      [horarioCursoId, docenteId, dispositivo_id || null, estado]
    );

    res.status(201).json({
      mensaje: `Asistencia registrada como ${estado}`,
      registro: result.rows[0],
    });
  } catch (err) {
    handleRouteError(err, res);
  }
});

router.get('/hoy', autenticar, soloRol('Administrador', 'Supervisor'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.nombres, u.apellidos, u.codigo,
              dep.nombre AS departamento, r.hora_registro, r.estado
       FROM registros_ingreso_institucional r
       JOIN docentes d ON d.id = r.docente_id
       JOIN usuarios u ON u.id = d.usuario_id
       JOIN departamentos_academicos dep ON dep.id = d.departamento_id
       WHERE r.fecha = CURRENT_DATE
       ORDER BY r.hora_registro`
    );

    res.json({
      fecha: new Date().toISOString().split('T')[0],
      registros: result.rows,
    });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// Ruta personal: el docente nunca envía ni controla un docente_id.
router.get('/docente/me', autenticar, soloRol('Docente'), async (req, res) => {
  try {
    const docenteId = await getAuthenticatedDocenteId(req);
    const asistencia = await getAsistenciaDocente(docenteId);

    res.json({ docente_id: docenteId, ...asistencia });
  } catch (err) {
    handleRouteError(err, res);
  }
});

// Administrador y supervisor pueden consultar un docente concreto.
// Un docente solo puede consultar su propio perfil, incluso si altera la URL.
router.get('/docente/:id', autenticar, async (req, res) => {
  try {
    const docenteId = await resolveDocenteIdForRead(req, req.params.id);
    const asistencia = await getAsistenciaDocente(docenteId);

    res.json({ docente_id: docenteId, ...asistencia });
  } catch (err) {
    handleRouteError(err, res);
  }
});

module.exports = router;
