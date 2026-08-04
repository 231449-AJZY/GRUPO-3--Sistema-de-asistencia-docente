BEGIN;

CREATE OR REPLACE VIEW v_marcaciones_moviles_unificadas AS
SELECT
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
  dmm.presencia_ble_requerida,
  dmm.presencia_ble_validada,
  e.codigo AS estacion_ble_codigo,
  e.nombre AS estacion_ble_nombre,
  det.rssi_promedio AS estacion_ble_rssi,
  det.muestras AS estacion_ble_muestras,
  'BIOMETRIA_MOVIL'::text AS metodo_verificacion
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
  ON rac.id = f.registro_asistencia_id

UNION ALL

SELECT
  -uqa.id AS id,
  uqa.sesion_qr_id AS desafio_id,
  uqa.dispositivo_id,
  uqa.docente_id,
  u.codigo AS codigo_docente,
  u.nombres,
  u.apellidos,
  dep.nombre AS departamento,
  dm.fabricante,
  dm.modelo,
  uqa.tipo_objetivo,
  uqa.horario_curso_id,
  c.codigo AS codigo_curso,
  c.nombre AS curso,
  hc.aula,
  uqa.registro_ingreso_id,
  rii.estado AS estado_ingreso,
  rii.fecha AS fecha_ingreso,
  rii.hora_registro AS hora_ingreso,
  uqa.registro_asistencia_id,
  rac.estado AS estado_curso,
  rac.fecha AS fecha_curso,
  rac.hora_registro AS hora_curso,
  FALSE AS firma_verificada,
  uqa.resultado,
  uqa.detalle,
  uqa.ip_uso AS ip_origen,
  uqa.utilizado_en AS creado_en,
  FALSE AS presencia_ble_requerida,
  FALSE AS presencia_ble_validada,
  NULL::varchar AS estacion_ble_codigo,
  NULL::varchar AS estacion_ble_nombre,
  NULL::numeric AS estacion_ble_rssi,
  NULL::integer AS estacion_ble_muestras,
  'QR_DINAMICO'::text AS metodo_verificacion
FROM usos_qr_asistencia uqa
JOIN dispositivos_moviles dm
  ON dm.id = uqa.dispositivo_id
JOIN docentes d
  ON d.id = uqa.docente_id
JOIN usuarios u
  ON u.id = d.usuario_id
LEFT JOIN departamentos_academicos dep
  ON dep.id = d.departamento_id
LEFT JOIN horarios_curso hc
  ON hc.id = uqa.horario_curso_id
LEFT JOIN cursos c
  ON c.id = hc.curso_id
LEFT JOIN registros_ingreso_institucional rii
  ON rii.id = uqa.registro_ingreso_id
LEFT JOIN registros_asistencia_curso rac
  ON rac.id = uqa.registro_asistencia_id;

COMMIT;
