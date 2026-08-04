-- Paso 8B: vinculación segura de dispositivos móviles
-- Tablas nuevas e idempotentes. No elimina ni altera información académica previa.


CREATE TABLE IF NOT EXISTS solicitudes_vinculacion_dispositivo (
  id              BIGSERIAL PRIMARY KEY,
  token_hash      CHAR(64) NOT NULL UNIQUE,
  docente_id      INT NOT NULL REFERENCES docentes(id),
  usuario_id      INT NOT NULL REFERENCES usuarios(id),
  creado_por      INT REFERENCES usuarios(id) ON DELETE SET NULL,
  estado          VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
  expira_en       TIMESTAMPTZ NOT NULL,
  utilizado_en    TIMESTAMPTZ,
  cancelado_en    TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_solicitud_vinculacion_estado CHECK (
    estado IN ('VIGENTE', 'UTILIZADA', 'CANCELADA', 'EXPIRADA')
  )
);

CREATE TABLE IF NOT EXISTS dispositivos_moviles (
  id                       BIGSERIAL PRIMARY KEY,
  uuid_instalacion         VARCHAR(120) NOT NULL UNIQUE,
  usuario_id               INT NOT NULL REFERENCES usuarios(id),
  docente_id               INT NOT NULL REFERENCES docentes(id),
  fabricante               VARCHAR(80) NOT NULL,
  modelo                   VARCHAR(120) NOT NULL,
  plataforma               VARCHAR(30) NOT NULL DEFAULT 'ANDROID',
  version_sistema          VARCHAR(80) NOT NULL,
  sdk_int                  INT NOT NULL,
  version_aplicacion       VARCHAR(40) NOT NULL,
  clave_publica            TEXT NOT NULL,
  huella_clave             CHAR(64) NOT NULL UNIQUE,
  algoritmo_clave          VARCHAR(40) NOT NULL DEFAULT 'EC_P256_SHA256',
  biometria_disponible     BOOLEAN NOT NULL DEFAULT FALSE,
  tipos_biometria          VARCHAR(200),
  estado                   VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
  motivo_estado            VARCHAR(255),
  solicitud_id             BIGINT REFERENCES solicitudes_vinculacion_dispositivo(id) ON DELETE SET NULL,
  autorizado_por           INT REFERENCES usuarios(id) ON DELETE SET NULL,
  autorizado_en            TIMESTAMPTZ,
  rechazado_por            INT REFERENCES usuarios(id) ON DELETE SET NULL,
  rechazado_en             TIMESTAMPTZ,
  suspendido_por           INT REFERENCES usuarios(id) ON DELETE SET NULL,
  suspendido_en            TIMESTAMPTZ,
  revocado_por             INT REFERENCES usuarios(id) ON DELETE SET NULL,
  revocado_en              TIMESTAMPTZ,
  ultimo_acceso            TIMESTAMPTZ,
  creado_en                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dispositivo_movil_estado CHECK (
    estado IN ('PENDIENTE', 'AUTORIZADO', 'SUSPENDIDO', 'RECHAZADO', 'REVOCADO')
  ),
  CONSTRAINT chk_dispositivo_movil_plataforma CHECK (
    plataforma IN ('ANDROID', 'IOS')
  ),
  CONSTRAINT chk_dispositivo_movil_sdk CHECK (sdk_int BETWEEN 1 AND 999)
);

CREATE TABLE IF NOT EXISTS eventos_seguridad_movil (
  id                BIGSERIAL PRIMARY KEY,
  dispositivo_id    BIGINT REFERENCES dispositivos_moviles(id) ON DELETE SET NULL,
  usuario_id         INT REFERENCES usuarios(id) ON DELETE SET NULL,
  docente_id         INT REFERENCES docentes(id) ON DELETE SET NULL,
  actor_usuario_id   INT REFERENCES usuarios(id) ON DELETE SET NULL,
  tipo               VARCHAR(100) NOT NULL,
  resultado          VARCHAR(30) NOT NULL DEFAULT 'EXITO',
  detalle            JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_origen          INET,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_vinculacion_docente
  ON solicitudes_vinculacion_dispositivo (docente_id, estado, expira_en DESC);

CREATE INDEX IF NOT EXISTS idx_dispositivos_moviles_docente
  ON dispositivos_moviles (docente_id, estado, actualizado_en DESC);

CREATE INDEX IF NOT EXISTS idx_dispositivos_moviles_usuario
  ON dispositivos_moviles (usuario_id, estado);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispositivo_activo_por_docente
  ON dispositivos_moviles (docente_id)
  WHERE estado IN ('PENDIENTE', 'AUTORIZADO', 'SUSPENDIDO');

CREATE INDEX IF NOT EXISTS idx_eventos_seguridad_movil_fecha
  ON eventos_seguridad_movil (creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_seguridad_movil_dispositivo
  ON eventos_seguridad_movil (dispositivo_id, creado_en DESC);

