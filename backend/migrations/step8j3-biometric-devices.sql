BEGIN;

ALTER TABLE dispositivos_biometricos
  ADD COLUMN IF NOT EXISTS tipo_conexion VARCHAR(30) NOT NULL DEFAULT 'PUENTE_LOCAL',
  ADD COLUMN IF NOT EXISTS ultima_latencia_ms INT,
  ADD COLUMN IF NOT EXISTS ultimo_error_codigo VARCHAR(80),
  ADD COLUMN IF NOT EXISTS diagnostico_detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS retirado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retirado_por INT REFERENCES usuarios(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_dispositivo_biometrico_tipo_conexion'
  ) THEN
    ALTER TABLE dispositivos_biometricos
      ADD CONSTRAINT chk_dispositivo_biometrico_tipo_conexion
      CHECK (
        tipo_conexion IN (
          'PUENTE_LOCAL',
          'AGENTE_REMOTO',
          'RED'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_dispositivo_biometrico_latencia'
  ) THEN
    ALTER TABLE dispositivos_biometricos
      ADD CONSTRAINT chk_dispositivo_biometrico_latencia
      CHECK (
        ultima_latencia_ms IS NULL OR
        ultima_latencia_ms BETWEEN 0 AND 600000
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_dispositivo_biometrico_diagnostico
  ON dispositivos_biometricos (ultimo_diagnostico_en DESC);

CREATE INDEX IF NOT EXISTS idx_dispositivo_biometrico_tipo_conexion
  ON dispositivos_biometricos (tipo_conexion, activo);

COMMIT;
