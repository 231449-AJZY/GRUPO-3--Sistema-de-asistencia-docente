-- Paso 8C: marcación móvil real con desafío de un solo uso,
-- firma ECDSA y autenticación biométrica por operación.
-- Migración idempotente: no elimina información existente.

ALTER TABLE dispositivos_moviles
  ADD COLUMN IF NOT EXISTS clave_publica_asistencia TEXT,
  ADD COLUMN IF NOT EXISTS huella_clave_asistencia CHAR(64),
  ADD COLUMN IF NOT EXISTS algoritmo_clave_asistencia VARCHAR(40),
  ADD COLUMN IF NOT EXISTS clave_asistencia_registrada_en TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispositivo_huella_clave_asistencia
  ON dispositivos_moviles (huella_clave_asistencia)
  WHERE huella_clave_asistencia IS NOT NULL;

CREATE TABLE IF NOT EXISTS desafios_marcacion_movil (
  id                  UUID PRIMARY KEY,
  nonce_hash          CHAR(64) NOT NULL UNIQUE,
  dispositivo_id      BIGINT NOT NULL REFERENCES dispositivos_moviles(id),
  usuario_id          INT NOT NULL REFERENCES usuarios(id),
  docente_id          INT NOT NULL REFERENCES docentes(id),
  horario_curso_id    INT REFERENCES horarios_curso(id),
  tipo_objetivo       VARCHAR(30) NOT NULL,
  fecha_objetivo      DATE NOT NULL,
  contenido_firmado   TEXT NOT NULL,
  contenido_hash      CHAR(64) NOT NULL,
  estado              VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
  intentos            INT NOT NULL DEFAULT 0,
  expira_en           TIMESTAMPTZ NOT NULL,
  utilizado_en        TIMESTAMPTZ,
  rechazado_en        TIMESTAMPTZ,
  motivo_rechazo      VARCHAR(255),
  ip_origen           INET,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_desafio_movil_tipo CHECK (
    tipo_objetivo IN ('INGRESO_INSTITUCIONAL', 'CURSO')
  ),
  CONSTRAINT chk_desafio_movil_estado CHECK (
    estado IN ('VIGENTE', 'UTILIZADO', 'EXPIRADO', 'RECHAZADO')
  ),
  CONSTRAINT chk_desafio_movil_intentos CHECK (intentos BETWEEN 0 AND 20)
);

CREATE TABLE IF NOT EXISTS firmas_marcacion_movil (
  id                       BIGSERIAL PRIMARY KEY,
  desafio_id               UUID NOT NULL UNIQUE
                             REFERENCES desafios_marcacion_movil(id),
  dispositivo_id           BIGINT NOT NULL
                             REFERENCES dispositivos_moviles(id),
  docente_id               INT NOT NULL REFERENCES docentes(id),
  registro_ingreso_id      BIGINT
                             REFERENCES registros_ingreso_institucional(id)
                             ON DELETE SET NULL,
  registro_asistencia_id   BIGINT
                             REFERENCES registros_asistencia_curso(id)
                             ON DELETE SET NULL,
  algoritmo                VARCHAR(40) NOT NULL DEFAULT 'SHA256withECDSA',
  firma_base64             TEXT NOT NULL,
  contenido_hash           CHAR(64) NOT NULL,
  firma_verificada         BOOLEAN NOT NULL,
  resultado                VARCHAR(30) NOT NULL,
  detalle                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_origen                INET,
  creado_en                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_firma_movil_resultado CHECK (
    resultado IN ('REGISTRADA', 'DUPLICADA', 'RECHAZADA')
  )
);

CREATE INDEX IF NOT EXISTS idx_desafios_movil_dispositivo_fecha
  ON desafios_marcacion_movil (dispositivo_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_desafios_movil_docente_estado
  ON desafios_marcacion_movil (docente_id, estado, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_desafios_movil_expiracion
  ON desafios_marcacion_movil (estado, expira_en);

CREATE INDEX IF NOT EXISTS idx_firmas_movil_docente_fecha
  ON firmas_marcacion_movil (docente_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_firmas_movil_dispositivo_fecha
  ON firmas_marcacion_movil (dispositivo_id, creado_en DESC);

CREATE OR REPLACE VIEW v_marcaciones_moviles_recientes AS
SELECT
  f.id,
  f.desafio_id,
  f.dispositivo_id,
  f.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  dep.nombre AS departamento,
  dm.fabricante,
  dm.modelo,
  dmm.tipo_objetivo,
  dmm.horario_curso_id,
  c.codigo AS codigo_curso,
  c.nombre AS curso,
  hc.aula,
  f.registro_ingreso_id,
  rii.estado AS estado_ingreso,
  rii.fecha AS fecha_ingreso,
  rii.hora_registro AS hora_ingreso,
  f.registro_asistencia_id,
  rac.estado AS estado_curso,
  rac.fecha AS fecha_curso,
  rac.hora_registro AS hora_curso,
  f.firma_verificada,
  f.resultado,
  f.detalle,
  f.ip_origen,
  f.creado_en
FROM firmas_marcacion_movil f
JOIN desafios_marcacion_movil dmm
  ON dmm.id = f.desafio_id
JOIN dispositivos_moviles dm
  ON dm.id = f.dispositivo_id
JOIN docentes d
  ON d.id = f.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep
  ON dep.id = d.departamento_id
LEFT JOIN horarios_curso hc
  ON hc.id = dmm.horario_curso_id
LEFT JOIN cursos c
  ON c.id = hc.curso_id
LEFT JOIN registros_ingreso_institucional rii
  ON rii.id = f.registro_ingreso_id
LEFT JOIN registros_asistencia_curso rac
  ON rac.id = f.registro_asistencia_id;
