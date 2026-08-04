-- Paso 8E: marcación offline firmada, cola cifrada y sincronización controlada.
-- Migración idempotente. No elimina datos existentes.

CREATE TABLE IF NOT EXISTS configuracion_asistencia_offline (
  id                           SMALLINT PRIMARY KEY DEFAULT 1,
  vigencia_credencial_horas    INT NOT NULL DEFAULT 24,
  antiguedad_maxima_horas      INT NOT NULL DEFAULT 12,
  maximo_pendientes_dispositivo INT NOT NULL DEFAULT 50,
  tolerancia_reloj_segundos    INT NOT NULL DEFAULT 180,
  actualizado_en               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_config_offline_unica CHECK (id = 1),
  CONSTRAINT chk_config_offline_vigencia CHECK (
    vigencia_credencial_horas BETWEEN 1 AND 168
  ),
  CONSTRAINT chk_config_offline_antiguedad CHECK (
    antiguedad_maxima_horas BETWEEN 1 AND 72
  ),
  CONSTRAINT chk_config_offline_pendientes CHECK (
    maximo_pendientes_dispositivo BETWEEN 1 AND 200
  ),
  CONSTRAINT chk_config_offline_reloj CHECK (
    tolerancia_reloj_segundos BETWEEN 30 AND 3600
  )
);

INSERT INTO configuracion_asistencia_offline (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS credenciales_offline_dispositivo (
  id                         UUID PRIMARY KEY,
  dispositivo_id             BIGINT NOT NULL
                               REFERENCES dispositivos_moviles(id)
                               ON DELETE CASCADE,
  usuario_id                 INT NOT NULL REFERENCES usuarios(id),
  docente_id                 INT NOT NULL REFERENCES docentes(id),
  huella_clave_asistencia    CHAR(64) NOT NULL,
  estado                     VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
  emitida_en                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en                  TIMESTAMPTZ NOT NULL,
  revocada_en                TIMESTAMPTZ,
  motivo_revocacion          VARCHAR(255),
  servidor_epoch_ms          BIGINT NOT NULL,
  dispositivo_elapsed_ms     BIGINT NOT NULL,
  dispositivo_boot_count     INT NOT NULL DEFAULT 0,
  ultima_secuencia           BIGINT NOT NULL DEFAULT 0,
  horarios_snapshot          JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuracion_snapshot     JSONB NOT NULL DEFAULT '{}'::jsonb,
  creada_en                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizada_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_credencial_offline_estado CHECK (
    estado IN ('ACTIVA', 'EXPIRADA', 'REVOCADA')
  ),
  CONSTRAINT chk_credencial_offline_secuencia CHECK (
    ultima_secuencia >= 0
  ),
  CONSTRAINT chk_credencial_offline_tiempo CHECK (
    expira_en > emitida_en
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_credencial_offline_activa_dispositivo
  ON credenciales_offline_dispositivo (dispositivo_id)
  WHERE estado = 'ACTIVA';

CREATE INDEX IF NOT EXISTS idx_credencial_offline_docente_fecha
  ON credenciales_offline_dispositivo (docente_id, emitida_en DESC);

CREATE TABLE IF NOT EXISTS lotes_sincronizacion_movil (
  id                    UUID PRIMARY KEY,
  dispositivo_id        BIGINT NOT NULL
                          REFERENCES dispositivos_moviles(id),
  credencial_id         UUID
                          REFERENCES credenciales_offline_dispositivo(id)
                          ON DELETE SET NULL,
  estado                VARCHAR(20) NOT NULL DEFAULT 'PROCESANDO',
  total_registros       INT NOT NULL DEFAULT 0,
  registrados           INT NOT NULL DEFAULT 0,
  duplicados            INT NOT NULL DEFAULT 0,
  rechazados            INT NOT NULL DEFAULT 0,
  requieren_revision    INT NOT NULL DEFAULT 0,
  ip_origen             INET,
  iniciado_en           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completado_en         TIMESTAMPTZ,
  detalle               JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT chk_lote_offline_estado CHECK (
    estado IN ('PROCESANDO', 'COMPLETADO', 'PARCIAL', 'RECHAZADO')
  ),
  CONSTRAINT chk_lote_offline_totales CHECK (
    total_registros >= 0 AND
    registrados >= 0 AND
    duplicados >= 0 AND
    rechazados >= 0 AND
    requieren_revision >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_lotes_offline_dispositivo_fecha
  ON lotes_sincronizacion_movil (dispositivo_id, iniciado_en DESC);

CREATE TABLE IF NOT EXISTS marcaciones_offline (
  id                         BIGSERIAL PRIMARY KEY,
  local_id                   UUID NOT NULL UNIQUE,
  lote_id                    UUID REFERENCES lotes_sincronizacion_movil(id)
                               ON DELETE SET NULL,
  credencial_id              UUID NOT NULL
                               REFERENCES credenciales_offline_dispositivo(id),
  dispositivo_id             BIGINT NOT NULL
                               REFERENCES dispositivos_moviles(id),
  docente_id                 INT NOT NULL REFERENCES docentes(id),
  horario_curso_id           INT REFERENCES horarios_curso(id)
                               ON DELETE SET NULL,
  estacion_ble_id            BIGINT REFERENCES estaciones_ble(id)
                               ON DELETE SET NULL,
  secuencia                  BIGINT NOT NULL,
  fecha_hora_estimada        TIMESTAMPTZ NOT NULL,
  fecha_local_estimada       DATE NOT NULL,
  hora_local_estimada        TIME NOT NULL,
  contenido_firmado          TEXT NOT NULL,
  contenido_hash             CHAR(64) NOT NULL,
  firma_base64               TEXT NOT NULL,
  firma_verificada           BOOLEAN NOT NULL DEFAULT FALSE,
  reloj_confiable            BOOLEAN NOT NULL DEFAULT FALSE,
  presencia_ble_validada     BOOLEAN NOT NULL DEFAULT FALSE,
  resultado                  VARCHAR(30) NOT NULL,
  motivo_resultado           VARCHAR(255),
  detalle_reloj              JSONB NOT NULL DEFAULT '{}'::jsonb,
  detalle_ble                JSONB NOT NULL DEFAULT '{}'::jsonb,
  registro_ingreso_id        BIGINT
                               REFERENCES registros_ingreso_institucional(id)
                               ON DELETE SET NULL,
  registro_asistencia_id     BIGINT
                               REFERENCES registros_asistencia_curso(id)
                               ON DELETE SET NULL,
  recibido_en                TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revisado_en                TIMESTAMPTZ,
  revisado_por               INT REFERENCES usuarios(id) ON DELETE SET NULL,
  observacion_revision       VARCHAR(500),
  CONSTRAINT chk_marcacion_offline_resultado CHECK (
    resultado IN (
      'PENDIENTE',
      'REGISTRADA',
      'DUPLICADA',
      'RECHAZADA',
      'REQUIERE_REVISION'
    )
  ),
  CONSTRAINT chk_marcacion_offline_secuencia CHECK (secuencia > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marcacion_offline_secuencia
  ON marcaciones_offline (credencial_id, secuencia);

CREATE INDEX IF NOT EXISTS idx_marcacion_offline_resultado_fecha
  ON marcaciones_offline (resultado, recibido_en DESC);

CREATE INDEX IF NOT EXISTS idx_marcacion_offline_docente_fecha
  ON marcaciones_offline (docente_id, fecha_hora_estimada DESC);

CREATE TABLE IF NOT EXISTS intentos_sincronizacion_movil (
  id                   BIGSERIAL PRIMARY KEY,
  lote_id              UUID REFERENCES lotes_sincronizacion_movil(id)
                         ON DELETE SET NULL,
  dispositivo_id       BIGINT REFERENCES dispositivos_moviles(id)
                         ON DELETE SET NULL,
  local_id             UUID,
  intento              INT NOT NULL DEFAULT 1,
  resultado            VARCHAR(30) NOT NULL,
  codigo               VARCHAR(80),
  mensaje              VARCHAR(500),
  detalle              JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_origen            INET,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_intento_sync_numero CHECK (intento BETWEEN 1 AND 100)
);

CREATE INDEX IF NOT EXISTS idx_intentos_sync_lote_fecha
  ON intentos_sincronizacion_movil (lote_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS conflictos_sincronizacion (
  id                    BIGSERIAL PRIMARY KEY,
  marcacion_offline_id  BIGINT NOT NULL
                          REFERENCES marcaciones_offline(id)
                          ON DELETE CASCADE,
  tipo                  VARCHAR(80) NOT NULL,
  estado                VARCHAR(20) NOT NULL DEFAULT 'ABIERTO',
  detalle               JSONB NOT NULL DEFAULT '{}'::jsonb,
  resuelto_en           TIMESTAMPTZ,
  resuelto_por          INT REFERENCES usuarios(id) ON DELETE SET NULL,
  resolucion            VARCHAR(500),
  creado_en             TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_conflicto_sync_estado CHECK (
    estado IN ('ABIERTO', 'RESUELTO', 'DESCARTADO')
  )
);

CREATE INDEX IF NOT EXISTS idx_conflictos_sync_estado_fecha
  ON conflictos_sincronizacion (estado, creado_en DESC);

CREATE OR REPLACE VIEW v_sincronizacion_movil_reciente AS
SELECT
  mo.id,
  mo.local_id,
  mo.lote_id,
  mo.credencial_id,
  mo.dispositivo_id,
  mo.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  dep.nombre AS departamento,
  dm.fabricante,
  dm.modelo,
  mo.horario_curso_id,
  c.codigo AS codigo_curso,
  c.nombre AS curso,
  hc.aula,
  mo.estacion_ble_id,
  eb.codigo AS estacion_codigo,
  eb.nombre AS estacion_nombre,
  mo.secuencia,
  mo.fecha_hora_estimada,
  mo.fecha_local_estimada,
  mo.hora_local_estimada,
  mo.firma_verificada,
  mo.reloj_confiable,
  mo.presencia_ble_validada,
  mo.resultado,
  mo.motivo_resultado,
  mo.detalle_reloj,
  mo.detalle_ble,
  mo.registro_ingreso_id,
  mo.registro_asistencia_id,
  mo.recibido_en,
  mo.revisado_en,
  mo.observacion_revision
FROM marcaciones_offline mo
JOIN dispositivos_moviles dm ON dm.id = mo.dispositivo_id
JOIN docentes d ON d.id = mo.docente_id
JOIN usuarios u ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep ON dep.id = d.departamento_id
LEFT JOIN horarios_curso hc ON hc.id = mo.horario_curso_id
LEFT JOIN cursos c ON c.id = hc.curso_id
LEFT JOIN estaciones_ble eb ON eb.id = mo.estacion_ble_id;
