BEGIN;

ALTER TABLE datos_biometricos
  ADD COLUMN IF NOT EXISTS calidad SMALLINT,
  ADD COLUMN IF NOT EXISTS dispositivo_codigo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS plantilla_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS captura_origen VARCHAR(30) NOT NULL DEFAULT 'PUENTE_LOCAL',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS revocado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocado_por INT REFERENCES usuarios(id),
  ADD COLUMN IF NOT EXISTS motivo_revocacion VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_datos_biometricos_calidad'
  ) THEN
    ALTER TABLE datos_biometricos
      ADD CONSTRAINT chk_datos_biometricos_calidad
      CHECK (calidad IS NULL OR calidad BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS dispositivos_biometricos (
  id                         BIGSERIAL PRIMARY KEY,
  codigo                     VARCHAR(80) NOT NULL UNIQUE,
  nombre                     VARCHAR(160) NOT NULL,
  fabricante                 VARCHAR(120),
  modelo                     VARCHAR(120),
  numero_serie               VARCHAR(160),
  ubicacion                  VARCHAR(180),
  ip_address                 VARCHAR(64),
  puerto                     INT,
  mac_address                VARCHAR(32),
  version_firmware           VARCHAR(80),
  version_sdk                VARCHAR(80),
  agente_id                  VARCHAR(160),
  estado                     VARCHAR(24) NOT NULL DEFAULT 'DESCONECTADO',
  porcentaje_senal           SMALLINT NOT NULL DEFAULT 0,
  registros_pendientes       INT NOT NULL DEFAULT 0,
  plantillas_registradas     INT NOT NULL DEFAULT 0,
  sincronizacion_automatica  BOOLEAN NOT NULL DEFAULT TRUE,
  activo                     BOOLEAN NOT NULL DEFAULT TRUE,
  mensaje                    VARCHAR(500),
  ultima_actividad_en        TIMESTAMPTZ,
  ultima_sincronizacion_en   TIMESTAMPTZ,
  ultimo_diagnostico_en      TIMESTAMPTZ,
  creado_por                 INT REFERENCES usuarios(id) ON DELETE SET NULL,
  actualizado_por            INT REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_dispositivo_biometrico_estado CHECK (
    estado IN (
      'CONECTADO',
      'ADVERTENCIA',
      'DESCONECTADO',
      'MANTENIMIENTO'
    )
  ),
  CONSTRAINT chk_dispositivo_biometrico_senal CHECK (
    porcentaje_senal BETWEEN 0 AND 100
  ),
  CONSTRAINT chk_dispositivo_biometrico_puerto CHECK (
    puerto IS NULL OR puerto BETWEEN 1 AND 65535
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dispositivo_biometrico_serie
  ON dispositivos_biometricos (numero_serie)
  WHERE numero_serie IS NOT NULL AND BTRIM(numero_serie) <> '';

CREATE INDEX IF NOT EXISTS idx_dispositivo_biometrico_estado
  ON dispositivos_biometricos (estado, activo);

CREATE INDEX IF NOT EXISTS idx_dispositivo_biometrico_actividad
  ON dispositivos_biometricos (ultima_actividad_en DESC);

CREATE TABLE IF NOT EXISTS eventos_biometricos (
  id                BIGSERIAL PRIMARY KEY,
  tipo              VARCHAR(60) NOT NULL,
  resultado         VARCHAR(30) NOT NULL,
  docente_id        INT REFERENCES docentes(id) ON DELETE SET NULL,
  dato_biometrico_id INT REFERENCES datos_biometricos(id) ON DELETE SET NULL,
  dispositivo_id    BIGINT REFERENCES dispositivos_biometricos(id) ON DELETE SET NULL,
  calidad           SMALLINT,
  detalle           JSONB NOT NULL DEFAULT '{}'::jsonb,
  usuario_id        INT REFERENCES usuarios(id) ON DELETE SET NULL,
  ip_origen         INET,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_evento_biometrico_resultado CHECK (
    resultado IN ('EXITOSO', 'FALLIDO', 'ADVERTENCIA', 'REVOCADO')
  ),
  CONSTRAINT chk_evento_biometrico_calidad CHECK (
    calidad IS NULL OR calidad BETWEEN 0 AND 100
  )
);

CREATE INDEX IF NOT EXISTS idx_eventos_biometricos_fecha
  ON eventos_biometricos (creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_biometricos_docente
  ON eventos_biometricos (docente_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_biometricos_dispositivo
  ON eventos_biometricos (dispositivo_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_datos_biometricos_activos
  ON datos_biometricos (docente_id, activo, dedo);

COMMIT;
