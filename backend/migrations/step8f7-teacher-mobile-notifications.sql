BEGIN;


CREATE TABLE IF NOT EXISTS notificaciones_docente (
  id                 BIGSERIAL PRIMARY KEY,
  docente_id         INT NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
  tipo               VARCHAR(80) NOT NULL,
  titulo             VARCHAR(180) NOT NULL,
  mensaje            VARCHAR(500) NOT NULL,
  prioridad          VARCHAR(20) NOT NULL DEFAULT 'MEDIA',
  clave_evento       VARCHAR(240) NOT NULL,
  referencia_tipo    VARCHAR(80),
  referencia_id      BIGINT,
  detalle            JSONB NOT NULL DEFAULT '{}'::jsonb,
  visible_desde      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en          TIMESTAMPTZ,
  leida_en           TIMESTAMPTZ,
  creada_en          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_notificacion_docente_prioridad CHECK (
    prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')
  ),
  CONSTRAINT chk_notificacion_docente_fechas CHECK (
    expira_en IS NULL OR expira_en > visible_desde
  )
);


CREATE UNIQUE INDEX IF NOT EXISTS uq_notificacion_docente_clave
  ON notificaciones_docente (docente_id, clave_evento);


CREATE INDEX IF NOT EXISTS idx_notificacion_docente_fecha
  ON notificaciones_docente (docente_id, visible_desde DESC);


CREATE INDEX IF NOT EXISTS idx_notificacion_docente_no_leida
  ON notificaciones_docente (docente_id, visible_desde DESC)
  WHERE leida_en IS NULL;


COMMIT;