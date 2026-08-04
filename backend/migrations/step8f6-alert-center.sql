BEGIN;


ALTER TABLE alertas
  ADD COLUMN IF NOT EXISTS prioridad VARCHAR(20) DEFAULT 'MEDIA',
  ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'NUEVA',
  ADD COLUMN IF NOT EXISTS origen VARCHAR(40) DEFAULT 'SISTEMA',
  ADD COLUMN IF NOT EXISTS referencia_tipo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS referencia_id BIGINT,
  ADD COLUMN IF NOT EXISTS clave_evento VARCHAR(220),
  ADD COLUMN IF NOT EXISTS detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS atendida_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS atendida_en TIMESTAMP,
  ADD COLUMN IF NOT EXISTS comentario VARCHAR(500),
  ADD COLUMN IF NOT EXISTS actualizada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;


UPDATE alertas
SET prioridad = COALESCE(NULLIF(prioridad, ''), 'MEDIA'),
    estado = COALESCE(NULLIF(estado, ''), CASE WHEN leida THEN 'REVISADA' ELSE 'NUEVA' END),
    origen = COALESCE(NULLIF(origen, ''), 'LEGACY'),
    clave_evento = COALESCE(clave_evento, 'LEGACY:' || id::text),
    actualizada_en = COALESCE(actualizada_en, fecha_alerta, CURRENT_TIMESTAMP);


ALTER TABLE alertas
  ALTER COLUMN prioridad SET NOT NULL,
  ALTER COLUMN estado SET NOT NULL,
  ALTER COLUMN origen SET NOT NULL;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_alertas_prioridad'
  ) THEN
    ALTER TABLE alertas
      ADD CONSTRAINT chk_alertas_prioridad
      CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA'));
  END IF;


  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_alertas_estado_operativo'
  ) THEN
    ALTER TABLE alertas
      ADD CONSTRAINT chk_alertas_estado_operativo
      CHECK (estado IN ('NUEVA', 'REVISADA', 'RESUELTA', 'DESCARTADA'));
  END IF;
END $$;


CREATE UNIQUE INDEX IF NOT EXISTS uq_alertas_clave_evento
  ON alertas (clave_evento);


CREATE INDEX IF NOT EXISTS idx_alertas_estado_prioridad_fecha
  ON alertas (estado, prioridad, fecha_alerta DESC);


CREATE INDEX IF NOT EXISTS idx_alertas_tipo_fecha
  ON alertas (tipo, fecha_alerta DESC);


CREATE INDEX IF NOT EXISTS idx_alertas_atendida_por
  ON alertas (atendida_por, atendida_en DESC);


COMMIT;