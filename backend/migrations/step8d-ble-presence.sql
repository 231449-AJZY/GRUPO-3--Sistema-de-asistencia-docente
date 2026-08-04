-- Paso 8D: validación de presencia mediante estaciones Bluetooth Low Energy.
-- Migración idempotente. No elimina información existente.

CREATE TABLE IF NOT EXISTS configuracion_ble (
  id                       SMALLINT PRIMARY KEY DEFAULT 1,
  intervalo_rotacion_seg   INT NOT NULL DEFAULT 15,
  margen_slots             INT NOT NULL DEFAULT 1,
  requerir_en_curso        BOOLEAN NOT NULL DEFAULT TRUE,
  requerir_en_ingreso      BOOLEAN NOT NULL DEFAULT FALSE,
  rssi_minimo_default      INT NOT NULL DEFAULT -75,
  muestras_minimas_default INT NOT NULL DEFAULT 3,
  actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_config_ble_unica CHECK (id = 1),
  CONSTRAINT chk_config_ble_intervalo CHECK (
    intervalo_rotacion_seg BETWEEN 5 AND 120
  ),
  CONSTRAINT chk_config_ble_margen CHECK (margen_slots BETWEEN 0 AND 3),
  CONSTRAINT chk_config_ble_rssi CHECK (
    rssi_minimo_default BETWEEN -110 AND -20
  ),
  CONSTRAINT chk_config_ble_muestras CHECK (
    muestras_minimas_default BETWEEN 1 AND 30
  )
);

INSERT INTO configuracion_ble (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS estaciones_ble (
  id                    BIGSERIAL PRIMARY KEY,
  uuid                  UUID NOT NULL UNIQUE,
  codigo                VARCHAR(40) NOT NULL UNIQUE,
  nombre                VARCHAR(160) NOT NULL,
  tipo                  VARCHAR(20) NOT NULL DEFAULT 'AULA',
  departamento_id       INT REFERENCES departamentos_academicos(id)
                          ON DELETE SET NULL,
  aula                  VARCHAR(120),
  rssi_minimo           INT NOT NULL DEFAULT -75,
  muestras_minimas      INT NOT NULL DEFAULT 3,
  intervalo_rotacion_seg INT NOT NULL DEFAULT 15,
  secreto_cifrado       TEXT NOT NULL,
  secreto_iv            VARCHAR(64) NOT NULL,
  secreto_tag           VARCHAR(64) NOT NULL,
  estado                VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  motivo_estado         VARCHAR(255),
  provisionada_en       TIMESTAMPTZ,
  ultima_deteccion_en   TIMESTAMPTZ,
  ultima_deteccion_rssi INT,
  creada_por            INT REFERENCES usuarios(id) ON DELETE SET NULL,
  provisionada_por      INT REFERENCES usuarios(id) ON DELETE SET NULL,
  creada_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_estacion_ble_tipo CHECK (
    tipo IN ('AULA', 'INGRESO', 'PRUEBA')
  ),
  CONSTRAINT chk_estacion_ble_estado CHECK (
    estado IN ('PENDIENTE', 'ACTIVA', 'SUSPENDIDA', 'REVOCADA')
  ),
  CONSTRAINT chk_estacion_ble_rssi CHECK (
    rssi_minimo BETWEEN -110 AND -20
  ),
  CONSTRAINT chk_estacion_ble_muestras CHECK (
    muestras_minimas BETWEEN 1 AND 30
  ),
  CONSTRAINT chk_estacion_ble_intervalo CHECK (
    intervalo_rotacion_seg BETWEEN 5 AND 120
  )
);

CREATE INDEX IF NOT EXISTS idx_estaciones_ble_estado
  ON estaciones_ble (estado, tipo, departamento_id);

CREATE INDEX IF NOT EXISTS idx_estaciones_ble_aula
  ON estaciones_ble (LOWER(COALESCE(aula, '')), departamento_id)
  WHERE estado = 'ACTIVA';

CREATE TABLE IF NOT EXISTS codigos_provisionamiento_ble (
  id             UUID PRIMARY KEY,
  estacion_id    BIGINT NOT NULL REFERENCES estaciones_ble(id)
                   ON DELETE CASCADE,
  token_hash     CHAR(64) NOT NULL UNIQUE,
  estado         VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
  expira_en      TIMESTAMPTZ NOT NULL,
  utilizado_en   TIMESTAMPTZ,
  cancelado_en   TIMESTAMPTZ,
  creado_por     INT REFERENCES usuarios(id) ON DELETE SET NULL,
  utilizado_por  INT REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_provision_ble_estado CHECK (
    estado IN ('VIGENTE', 'UTILIZADO', 'CANCELADO', 'EXPIRADO')
  )
);

CREATE INDEX IF NOT EXISTS idx_provision_ble_estacion_estado
  ON codigos_provisionamiento_ble (estacion_id, estado, expira_en DESC);

CREATE TABLE IF NOT EXISTS detecciones_ble_movil (
  id                 BIGSERIAL PRIMARY KEY,
  desafio_id         UUID NOT NULL UNIQUE
                       REFERENCES desafios_marcacion_movil(id)
                       ON DELETE CASCADE,
  estacion_id        BIGINT NOT NULL REFERENCES estaciones_ble(id),
  dispositivo_id     BIGINT NOT NULL REFERENCES dispositivos_moviles(id),
  docente_id         INT NOT NULL REFERENCES docentes(id),
  time_slot          BIGINT NOT NULL,
  token_hash         CHAR(64) NOT NULL,
  rssi_promedio      NUMERIC(6,2) NOT NULL,
  rssi_minimo        INT NOT NULL,
  rssi_maximo        INT NOT NULL,
  muestras           INT NOT NULL,
  umbral_rssi        INT NOT NULL,
  umbral_muestras    INT NOT NULL,
  prueba_valida      BOOLEAN NOT NULL,
  detalle            JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_origen          INET,
  creada_en          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_deteccion_ble_rssi CHECK (
    rssi_promedio BETWEEN -130 AND 0 AND
    rssi_minimo BETWEEN -130 AND 0 AND
    rssi_maximo BETWEEN -130 AND 0
  ),
  CONSTRAINT chk_deteccion_ble_muestras CHECK (
    muestras BETWEEN 1 AND 100
  )
);

CREATE INDEX IF NOT EXISTS idx_detecciones_ble_estacion_fecha
  ON detecciones_ble_movil (estacion_id, creada_en DESC);

CREATE INDEX IF NOT EXISTS idx_detecciones_ble_docente_fecha
  ON detecciones_ble_movil (docente_id, creada_en DESC);

CREATE TABLE IF NOT EXISTS eventos_seguridad_ble (
  id                BIGSERIAL PRIMARY KEY,
  estacion_id       BIGINT REFERENCES estaciones_ble(id) ON DELETE SET NULL,
  dispositivo_id    BIGINT REFERENCES dispositivos_moviles(id)
                       ON DELETE SET NULL,
  docente_id        INT REFERENCES docentes(id) ON DELETE SET NULL,
  actor_usuario_id  INT REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo              VARCHAR(80) NOT NULL,
  resultado         VARCHAR(30) NOT NULL DEFAULT 'EXITO',
  detalle           JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_origen         INET,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_eventos_ble_fecha
  ON eventos_seguridad_ble (creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_ble_estacion_fecha
  ON eventos_seguridad_ble (estacion_id, creado_en DESC);

ALTER TABLE desafios_marcacion_movil
  ADD COLUMN IF NOT EXISTS estacion_ble_id BIGINT
    REFERENCES estaciones_ble(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS presencia_ble_requerida BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS presencia_ble_validada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prueba_ble_hash CHAR(64);

CREATE INDEX IF NOT EXISTS idx_desafios_movil_estacion_fecha
  ON desafios_marcacion_movil (estacion_ble_id, creado_en DESC)
  WHERE estacion_ble_id IS NOT NULL;

CREATE OR REPLACE VIEW v_estaciones_ble_resumen AS
SELECT
  e.id,
  e.uuid,
  e.codigo,
  e.nombre,
  e.tipo,
  e.departamento_id,
  dep.nombre AS departamento,
  e.aula,
  e.rssi_minimo,
  e.muestras_minimas,
  e.intervalo_rotacion_seg,
  e.estado,
  e.motivo_estado,
  e.provisionada_en,
  e.ultima_deteccion_en,
  e.ultima_deteccion_rssi,
  e.creada_en,
  e.actualizada_en,
  creador.nombres || ' ' || creador.apellidos AS creada_por_nombre,
  provisionador.nombres || ' ' || provisionador.apellidos
    AS provisionada_por_nombre,
  COALESCE((
    SELECT COUNT(*)
    FROM detecciones_ble_movil d
    WHERE d.estacion_id = e.id
      AND d.creada_en >= CURRENT_DATE
  ), 0)::int AS detecciones_hoy
FROM estaciones_ble e
LEFT JOIN departamentos_academicos dep
  ON dep.id = e.departamento_id
LEFT JOIN usuarios creador
  ON creador.id = e.creada_por
LEFT JOIN usuarios provisionador
  ON provisionador.id = e.provisionada_por;

CREATE OR REPLACE VIEW v_marcaciones_moviles_recientes AS
SELECT
  -- Se conserva exactamente el orden de columnas creado en el Paso 8C.
  -- PostgreSQL solo permite agregar columnas nuevas al final de una vista
  -- mediante CREATE OR REPLACE VIEW.
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
  f.creado_en,
  -- Las columnas del Paso 8D se agregan únicamente al final.
  dmm.presencia_ble_requerida,
  dmm.presencia_ble_validada,
  e.codigo AS estacion_ble_codigo,
  e.nombre AS estacion_ble_nombre,
  det.rssi_promedio AS estacion_ble_rssi,
  det.muestras AS estacion_ble_muestras
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
LEFT JOIN estaciones_ble e
  ON e.id = dmm.estacion_ble_id
LEFT JOIN detecciones_ble_movil det
  ON det.desafio_id = dmm.id
LEFT JOIN registros_ingreso_institucional rii
  ON rii.id = f.registro_ingreso_id
LEFT JOIN registros_asistencia_curso rac
  ON rac.id = f.registro_asistencia_id;
