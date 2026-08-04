require('dotenv').config();
const pool = require('../src/db/pool');

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion_institucional (
        id                          SMALLINT PRIMARY KEY DEFAULT 1,
        nombre_sistema              VARCHAR(150) NOT NULL,
        nombre_institucion          VARCHAR(200) NOT NULL,
        codigo_institucional        VARCHAR(20) NOT NULL,
        correo_soporte              VARCHAR(150) NOT NULL,
        zona_horaria                VARCHAR(80) NOT NULL DEFAULT 'America/Lima',
        idioma                      VARCHAR(30) NOT NULL DEFAULT 'Español',
        requiere_salida             BOOLEAN NOT NULL DEFAULT TRUE,
        permitir_validacion_manual  BOOLEAN NOT NULL DEFAULT TRUE,
        limite_tardanza_minutos     INT NOT NULL DEFAULT 20,
        actualizado_en              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        actualizado_por             INT REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT chk_configuracion_unica CHECK (id = 1),
        CONSTRAINT chk_limite_tardanza CHECK (
          limite_tardanza_minutos BETWEEN 1 AND 240
        )
      )
    `);

    await client.query(`
      INSERT INTO configuracion_institucional (
        id,
        nombre_sistema,
        nombre_institucion,
        codigo_institucional,
        correo_soporte,
        zona_horaria,
        idioma,
        requiere_salida,
        permitir_validacion_manual,
        limite_tardanza_minutos
      )
      VALUES (
        1,
        'Sistema de Asistencia Docente',
        'Universidad Nacional de San Antonio Abad del Cusco',
        'UNSAAC',
        'soporte@unsaac.edu.pe',
        'America/Lima',
        'Español',
        TRUE,
        TRUE,
        20
      )
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query(`
      INSERT INTO configuracion_asistencia (
        hora_ingreso_limite,
        tolerancia_antes_minutos,
        tolerancia_despues_minutos,
        dias_laborables
      )
      SELECT '09:00:00', 15, 10, 'LUN-VIE'
      WHERE NOT EXISTS (SELECT 1 FROM configuracion_asistencia)
    `);

    await client.query('COMMIT');
    console.log('Migración académica del Paso 7 completada.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('No se pudo completar la migración del Paso 7:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

void migrate();
