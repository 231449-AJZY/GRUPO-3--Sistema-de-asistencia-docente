BEGIN;

CREATE TABLE IF NOT EXISTS sincronizaciones_biometricas (
  id                    BIGSERIAL PRIMARY KEY,
  dispositivo_id        BIGINT REFERENCES dispositivos_biometricos(id) ON DELETE SET NULL,
  estado                VARCHAR(30) NOT NULL,
  registros_detectados  INT NOT NULL DEFAULT 0,
  registros_procesados  INT NOT NULL DEFAULT 0,
  registros_fallidos    INT NOT NULL DEFAULT 0,
  codigo_resultado      VARCHAR(80),
  mensaje               VARCHAR(500),
  detalle               JSONB NOT NULL DEFAULT '{}'::jsonb,
  solicitado_por        INT REFERENCES usuarios(id) ON DELETE SET NULL,
  solicitado_en         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  iniciado_en           TIMESTAMPTZ,
  completado_en         TIMESTAMPTZ,
  actualizado_en        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_sincronizacion_biometrica_estado CHECK (
    estado IN (
      'PENDIENTE',
      'EN_PROCESO',
      'SINCRONIZADO',
      'FALLIDO',
      'CANCELADO'
    )
  ),
  CONSTRAINT chk_sincronizacion_biometrica_contadores CHECK (
    registros_detectados >= 0 AND
    registros_procesados >= 0 AND
    registros_fallidos >= 0 AND
    registros_procesados + registros_fallidos <= registros_detectados
  )
);

CREATE INDEX IF NOT EXISTS idx_sincronizacion_biometrica_fecha
  ON sincronizaciones_biometricas (solicitado_en DESC);

CREATE INDEX IF NOT EXISTS idx_sincronizacion_biometrica_dispositivo
  ON sincronizaciones_biometricas (dispositivo_id, solicitado_en DESC);

CREATE INDEX IF NOT EXISTS idx_sincronizacion_biometrica_estado
  ON sincronizaciones_biometricas (estado, solicitado_en DESC);

COMMIT;
