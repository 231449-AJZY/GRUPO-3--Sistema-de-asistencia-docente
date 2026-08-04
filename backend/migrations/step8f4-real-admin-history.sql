BEGIN;

CREATE OR REPLACE VIEW v_historial_asistencia_unificado AS
SELECT
  CASE
    WHEN v.metodo_verificacion = 'QR_DINAMICO'
      THEN 'QR:' || ABS(v.id)::text
    ELSE 'BIOMETRIA:' || v.id::text
  END AS registro_uid,
  CASE
    WHEN v.metodo_verificacion = 'QR_DINAMICO' THEN 'QR'
    ELSE 'BIOMETRIA_MOVIL'
  END AS fuente,
  v.docente_id,
  v.codigo_docente,
  v.nombres,
  v.apellidos,
  u.email,
  v.departamento,
  v.dispositivo_id,
  v.fabricante,
  v.modelo,
  v.tipo_objetivo,
  v.horario_curso_id,
  v.codigo_curso,
  v.curso,
  v.aula,
  COALESCE(
    v.fecha_curso,
    v.fecha_ingreso,
    (v.creado_en AT TIME ZONE 'America/Lima')::date
  ) AS fecha,
  COALESCE(
    v.hora_curso,
    v.hora_ingreso,
    (v.creado_en AT TIME ZONE 'America/Lima')::time
  ) AS hora,
  COALESCE(v.estado_curso, v.estado_ingreso, v.resultado) AS estado,
  v.resultado,
  v.metodo_verificacion,
  v.firma_verificada,
  v.presencia_ble_requerida,
  v.presencia_ble_validada,
  v.registro_ingreso_id,
  v.registro_asistencia_id,
  COALESCE(v.detalle, '{}'::jsonb) AS detalle,
  v.ip_origen,
  v.creado_en
FROM v_marcaciones_moviles_unificadas v
JOIN docentes d
  ON d.id = v.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id

UNION ALL

SELECT
  'OFFLINE:' || mo.id::text AS registro_uid,
  'OFFLINE'::text AS fuente,
  mo.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  u.email,
  dep.nombre AS departamento,
  mo.dispositivo_id,
  dm.fabricante,
  dm.modelo,
  CASE
    WHEN mo.horario_curso_id IS NULL
      THEN 'INGRESO_INSTITUCIONAL'
    ELSE 'CURSO'
  END AS tipo_objetivo,
  mo.horario_curso_id,
  c.codigo AS codigo_curso,
  c.nombre AS curso,
  hc.aula,
  mo.fecha_local_estimada AS fecha,
  mo.hora_local_estimada AS hora,
  COALESCE(rac.estado, rii.estado, mo.resultado) AS estado,
  mo.resultado,
  'OFFLINE_SINCRONIZADO'::text AS metodo_verificacion,
  mo.firma_verificada,
  mo.horario_curso_id IS NOT NULL AS presencia_ble_requerida,
  mo.presencia_ble_validada,
  mo.registro_ingreso_id,
  mo.registro_asistencia_id,
  jsonb_build_object(
    'motivo_resultado', mo.motivo_resultado,
    'reloj_confiable', mo.reloj_confiable,
    'secuencia', mo.secuencia,
    'detalle_reloj', mo.detalle_reloj,
    'detalle_ble', mo.detalle_ble
  ) AS detalle,
  NULL::inet AS ip_origen,
  mo.recibido_en AS creado_en
FROM marcaciones_offline mo
JOIN dispositivos_moviles dm
  ON dm.id = mo.dispositivo_id
JOIN docentes d
  ON d.id = mo.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep
  ON dep.id = d.departamento_id
LEFT JOIN horarios_curso hc
  ON hc.id = mo.horario_curso_id
LEFT JOIN cursos c
  ON c.id = hc.curso_id
LEFT JOIN registros_ingreso_institucional rii
  ON rii.id = mo.registro_ingreso_id
LEFT JOIN registros_asistencia_curso rac
  ON rac.id = mo.registro_asistencia_id

UNION ALL

SELECT
  'RECHAZO:' || dmm.id::text AS registro_uid,
  'BIOMETRIA_RECHAZADA'::text AS fuente,
  dmm.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  u.email,
  dep.nombre AS departamento,
  dmm.dispositivo_id,
  dm.fabricante,
  dm.modelo,
  dmm.tipo_objetivo,
  dmm.horario_curso_id,
  c.codigo AS codigo_curso,
  c.nombre AS curso,
  hc.aula,
  dmm.fecha_objetivo AS fecha,
  (dmm.creado_en AT TIME ZONE 'America/Lima')::time AS hora,
  dmm.estado AS estado,
  'RECHAZADA'::text AS resultado,
  'BIOMETRIA_MOVIL'::text AS metodo_verificacion,
  FALSE AS firma_verificada,
  COALESCE(dmm.presencia_ble_requerida, FALSE),
  COALESCE(dmm.presencia_ble_validada, FALSE),
  NULL::bigint AS registro_ingreso_id,
  NULL::bigint AS registro_asistencia_id,
  jsonb_build_object(
    'motivo_rechazo', dmm.motivo_rechazo,
    'intentos', dmm.intentos,
    'estado_desafio', dmm.estado
  ) AS detalle,
  dmm.ip_origen,
  dmm.creado_en
FROM desafios_marcacion_movil dmm
JOIN dispositivos_moviles dm
  ON dm.id = dmm.dispositivo_id
JOIN docentes d
  ON d.id = dmm.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep
  ON dep.id = d.departamento_id
LEFT JOIN horarios_curso hc
  ON hc.id = dmm.horario_curso_id
LEFT JOIN cursos c
  ON c.id = hc.curso_id
WHERE dmm.estado IN ('RECHAZADO', 'EXPIRADO')
  AND NOT EXISTS (
    SELECT 1
    FROM firmas_marcacion_movil f
    WHERE f.desafio_id = dmm.id
  )

UNION ALL

SELECT
  'CURSO:' || rac.id::text AS registro_uid,
  'REGISTRO_BASE'::text AS fuente,
  rac.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  u.email,
  dep.nombre AS departamento,
  CASE
    WHEN rac.dispositivo_id ~ '^[A-Z-]+:[0-9]+$'
      THEN NULLIF(REGEXP_REPLACE(rac.dispositivo_id, '^.*:', ''), '')::bigint
    ELSE NULL::bigint
  END AS dispositivo_id,
  NULL::varchar AS fabricante,
  NULL::varchar AS modelo,
  'CURSO'::text AS tipo_objetivo,
  rac.horario_curso_id,
  c.codigo AS codigo_curso,
  c.nombre AS curso,
  hc.aula,
  rac.fecha,
  rac.hora_registro AS hora,
  rac.estado,
  'REGISTRADA'::text AS resultado,
  CASE
    WHEN rac.metodo_verificacion = 'QR_DINAMICO'
      THEN 'QR_DINAMICO'
    WHEN rac.metodo_verificacion = 'BIOMETRIA_MOVIL'
      THEN 'BIOMETRIA_MOVIL'
    WHEN COALESCE(rac.dispositivo_id, '') LIKE 'MOVIL-OFFLINE:%'
      THEN 'OFFLINE_SINCRONIZADO'
    WHEN COALESCE(rac.dispositivo_id, '') LIKE 'MOVIL:%'
      THEN 'BIOMETRIA_MOVIL'
    WHEN NULLIF(BTRIM(COALESCE(rac.dispositivo_id, '')), '') IS NOT NULL
      THEN 'LECTOR_BIOMETRICO'
    ELSE 'MANUAL'
  END AS metodo_verificacion,
  FALSE AS firma_verificada,
  FALSE AS presencia_ble_requerida,
  FALSE AS presencia_ble_validada,
  NULL::bigint AS registro_ingreso_id,
  rac.id AS registro_asistencia_id,
  jsonb_build_object(
    'observacion', rac.observacion,
    'dispositivo_original', rac.dispositivo_id
  ) AS detalle,
  NULL::inet AS ip_origen,
  rac.creado_en AT TIME ZONE 'America/Lima' AS creado_en
FROM registros_asistencia_curso rac
JOIN docentes d
  ON d.id = rac.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep
  ON dep.id = d.departamento_id
JOIN horarios_curso hc
  ON hc.id = rac.horario_curso_id
JOIN cursos c
  ON c.id = hc.curso_id
WHERE NOT EXISTS (
    SELECT 1
    FROM v_marcaciones_moviles_unificadas v
    WHERE v.registro_asistencia_id = rac.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM marcaciones_offline mo
    WHERE mo.registro_asistencia_id = rac.id
  )

UNION ALL

SELECT
  'INGRESO:' || rii.id::text AS registro_uid,
  'REGISTRO_BASE'::text AS fuente,
  rii.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  u.email,
  dep.nombre AS departamento,
  CASE
    WHEN rii.dispositivo_id ~ '^[A-Z-]+:[0-9]+$'
      THEN NULLIF(REGEXP_REPLACE(rii.dispositivo_id, '^.*:', ''), '')::bigint
    ELSE NULL::bigint
  END AS dispositivo_id,
  NULL::varchar AS fabricante,
  NULL::varchar AS modelo,
  'INGRESO_INSTITUCIONAL'::text AS tipo_objetivo,
  NULL::integer AS horario_curso_id,
  NULL::varchar AS codigo_curso,
  NULL::varchar AS curso,
  NULL::varchar AS aula,
  rii.fecha,
  rii.hora_registro AS hora,
  rii.estado,
  'REGISTRADA'::text AS resultado,
  CASE
    WHEN rii.metodo_verificacion = 'QR_DINAMICO'
      THEN 'QR_DINAMICO'
    WHEN rii.metodo_verificacion = 'BIOMETRIA_MOVIL'
      THEN 'BIOMETRIA_MOVIL'
    WHEN COALESCE(rii.dispositivo_id, '') LIKE 'MOVIL-OFFLINE:%'
      THEN 'OFFLINE_SINCRONIZADO'
    WHEN COALESCE(rii.dispositivo_id, '') LIKE 'MOVIL:%'
      THEN 'BIOMETRIA_MOVIL'
    WHEN NULLIF(BTRIM(COALESCE(rii.dispositivo_id, '')), '') IS NOT NULL
      THEN 'LECTOR_BIOMETRICO'
    ELSE 'MANUAL'
  END AS metodo_verificacion,
  FALSE AS firma_verificada,
  FALSE AS presencia_ble_requerida,
  FALSE AS presencia_ble_validada,
  rii.id AS registro_ingreso_id,
  NULL::bigint AS registro_asistencia_id,
  jsonb_build_object(
    'observacion', rii.observacion,
    'dispositivo_original', rii.dispositivo_id
  ) AS detalle,
  NULL::inet AS ip_origen,
  rii.creado_en AT TIME ZONE 'America/Lima' AS creado_en
FROM registros_ingreso_institucional rii
JOIN docentes d
  ON d.id = rii.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep
  ON dep.id = d.departamento_id
WHERE NOT EXISTS (
    SELECT 1
    FROM v_marcaciones_moviles_unificadas v
    WHERE v.registro_ingreso_id = rii.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM marcaciones_offline mo
    WHERE mo.registro_ingreso_id = rii.id
  );

COMMIT;
