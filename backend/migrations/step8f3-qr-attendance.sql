BEGIN;

ALTER TABLE registros_ingreso_institucional
  ADD COLUMN IF NOT EXISTS metodo_verificacion VARCHAR(30);

ALTER TABLE registros_asistencia_curso
  ADD COLUMN IF NOT EXISTS metodo_verificacion VARCHAR(30);

UPDATE registros_ingreso_institucional
SET metodo_verificacion = CASE
  WHEN dispositivo_id LIKE 'MOVIL:%' THEN 'BIOMETRIA_MOVIL'
  WHEN dispositivo_id LIKE 'QR:%' THEN 'QR_DINAMICO'
  ELSE 'LECTOR_O_MANUAL'
END
WHERE metodo_verificacion IS NULL;

UPDATE registros_asistencia_curso
SET metodo_verificacion = CASE
  WHEN dispositivo_id LIKE 'MOVIL:%' THEN 'BIOMETRIA_MOVIL'
  WHEN dispositivo_id LIKE 'QR:%' THEN 'QR_DINAMICO'
  ELSE 'LECTOR_O_MANUAL'
END
WHERE metodo_verificacion IS NULL;

ALTER TABLE registros_ingreso_institucional
  ALTER COLUMN metodo_verificacion SET DEFAULT 'LECTOR_O_MANUAL';

ALTER TABLE registros_asistencia_curso
  ALTER COLUMN metodo_verificacion SET DEFAULT 'LECTOR_O_MANUAL';

CREATE TABLE IF NOT EXISTS sesiones_qr_asistencia (
  id                    UUID PRIMARY KEY,
  token_hash            CHAR(64) NOT NULL UNIQUE,
  creado_por_usuario_id INT NOT NULL REFERENCES usuarios(id),
  estado                VARCHAR(20) NOT NULL DEFAULT 'VIGENTE',
  expira_en             TIMESTAMPTZ NOT NULL,
  reemplazado_en        TIMESTAMPTZ,
  ip_emision            INET,
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sesion_qr_estado CHECK (
    estado IN ('VIGENTE', 'EXPIRADO', 'REEMPLAZADO', 'REVOCADO')
  )
);

CREATE INDEX IF NOT EXISTS idx_sesiones_qr_vigencia
  ON sesiones_qr_asistencia (estado, expira_en DESC);

CREATE TABLE IF NOT EXISTS usos_qr_asistencia (
  id                     BIGSERIAL PRIMARY KEY,
  sesion_qr_id           UUID NOT NULL REFERENCES sesiones_qr_asistencia(id),
  dispositivo_id         BIGINT NOT NULL REFERENCES dispositivos_moviles(id),
  usuario_id             INT NOT NULL REFERENCES usuarios(id),
  docente_id             INT NOT NULL REFERENCES docentes(id),
  horario_curso_id       INT REFERENCES horarios_curso(id),
  registro_ingreso_id    BIGINT REFERENCES registros_ingreso_institucional(id),
  registro_asistencia_id BIGINT REFERENCES registros_asistencia_curso(id),
  tipo_objetivo          VARCHAR(30) NOT NULL,
  resultado              VARCHAR(20) NOT NULL,
  ip_uso                 INET,
  utilizado_en           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  detalle                JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_uso_qr_docente UNIQUE (sesion_qr_id, docente_id),
  CONSTRAINT chk_uso_qr_objetivo CHECK (
    tipo_objetivo IN ('INGRESO_INSTITUCIONAL', 'CURSO')
  ),
  CONSTRAINT chk_uso_qr_resultado CHECK (
    resultado IN ('REGISTRADA', 'DUPLICADA')
  )
);

CREATE INDEX IF NOT EXISTS idx_usos_qr_docente
  ON usos_qr_asistencia (docente_id, utilizado_en DESC);

COMMIT;
