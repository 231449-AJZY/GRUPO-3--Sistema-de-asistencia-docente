'use strict';

const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const projectRoot = path.resolve(backendDir, '..');

require('dotenv').config({
  path: path.join(backendDir, '.env'),
});

const pool = require(
  path.join(backendDir, 'src', 'db', 'pool')
);

const TARGET_EMAIL = 'pedro@unsaac.edu.pe';

async function relationExists(client, tableName) {
  const result = await client.query(
    'SELECT to_regclass($1) IS NOT NULL AS existe',
    [`public.${tableName}`]
  );

  return Boolean(result.rows[0]?.existe);
}

async function columnExists(client, tableName, columnName) {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = $1
         AND column_name = $2
     ) AS existe`,
    [tableName, columnName]
  );

  return Boolean(result.rows[0]?.existe);
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const teacherResult = await client.query(
      `SELECT
         d.id AS docente_id,
         u.id AS usuario_id,
         u.codigo,
         u.nombres,
         u.apellidos,
         u.email
       FROM usuarios u
       JOIN docentes d
         ON d.usuario_id = u.id
       WHERE LOWER(u.email) = LOWER($1)
       FOR UPDATE OF u, d`,
      [TARGET_EMAIL]
    );

    if (teacherResult.rows.length !== 1) {
      throw new Error(
        `No se encontró exactamente un docente con el correo ${TARGET_EMAIL}.`
      );
    }

    const teacher = teacherResult.rows[0];
    const docenteId = Number(teacher.docente_id);

    const dateResult = await client.query(
      `SELECT
         CURRENT_DATE::text AS fecha,
         TO_CHAR(
           CURRENT_TIMESTAMP AT TIME ZONE 'America/Lima',
           'YYYY-MM-DD HH24:MI:SS'
         ) AS hora_lima`
    );

    const dbDate = dateResult.rows[0].fecha;

    const operations = [
      {
        table: 'usos_qr_asistencia',
        dateColumn: 'utilizado_en',
        condition:
          `docente_id = $1
           AND (utilizado_en AT TIME ZONE 'America/Lima')::date = CURRENT_DATE`,
      },
      {
        table: 'marcaciones_offline',
        dateColumn: 'recibido_en',
        condition:
          `docente_id = $1
           AND (recibido_en AT TIME ZONE 'America/Lima')::date = CURRENT_DATE`,
      },
      {
        table: 'firmas_marcacion_movil',
        dateColumn: 'creado_en',
        condition:
          `docente_id = $1
           AND (creado_en AT TIME ZONE 'America/Lima')::date = CURRENT_DATE`,
      },
      {
        table: 'registros_asistencia_curso',
        dateColumn: 'fecha',
        condition:
          `docente_id = $1
           AND fecha = CURRENT_DATE`,
      },
      {
        table: 'registros_ingreso_institucional',
        dateColumn: 'fecha',
        condition:
          `docente_id = $1
           AND fecha = CURRENT_DATE`,
      },
    ];

    const backup = {
      creado_en: new Date().toISOString(),
      fecha_base_datos: dbDate,
      docente: teacher,
      registros: {},
    };

    const availableOperations = [];

    for (const operation of operations) {
      const exists = await relationExists(
        client,
        operation.table
      );

      if (!exists) {
        backup.registros[operation.table] = {
          omitida: true,
          motivo: 'La tabla no existe.',
          filas: [],
        };
        continue;
      }

      const hasTeacherColumn = await columnExists(
        client,
        operation.table,
        'docente_id'
      );

      const hasDateColumn = await columnExists(
        client,
        operation.table,
        operation.dateColumn
      );

      if (!hasTeacherColumn || !hasDateColumn) {
        backup.registros[operation.table] = {
          omitida: true,
          motivo:
            'La tabla no contiene las columnas esperadas.',
          filas: [],
        };
        continue;
      }

      const rows = await client.query(
        `SELECT *
         FROM ${operation.table}
         WHERE ${operation.condition}
         ORDER BY id`,
        [docenteId]
      );

      backup.registros[operation.table] = {
        omitida: false,
        total: rows.rowCount,
        filas: rows.rows,
      };

      availableOperations.push(operation);
    }

    const backupRoot = path.resolve(
      projectRoot,
      '..',
      '..',
      'Copias de seguridad'
    );

    fs.mkdirSync(backupRoot, {
      recursive: true,
    });

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-');

    const backupPath = path.join(
      backupRoot,
      `REGISTROS-PEDRO-ANTES-${timestamp}.json`
    );

    fs.writeFileSync(
      backupPath,
      JSON.stringify(backup, null, 2),
      'utf8'
    );

    const deleted = {};

    // El orden evita conflictos por llaves foráneas.
    for (const operation of availableOperations) {
      const result = await client.query(
        `DELETE FROM ${operation.table}
         WHERE ${operation.condition}
         RETURNING id`,
        [docenteId]
      );

      deleted[operation.table] = result.rowCount;
    }

    await client.query('COMMIT');

    console.log('');
    console.log('LIMPIEZA COMPLETADA CORRECTAMENTE');
    console.log('================================');
    console.log(
      `Docente: ${teacher.nombres} ${teacher.apellidos}`
    );
    console.log(`Correo: ${teacher.email}`);
    console.log(`Código: ${teacher.codigo}`);
    console.log(`Fecha eliminada: ${dbDate}`);
    console.log(`Respaldo: ${backupPath}`);
    console.log('');

    console.table(
      Object.entries(deleted).map(([tabla, total]) => ({
        tabla,
        eliminados: total,
      }))
    );

    console.log('');
    console.log(
      'La cuenta, horarios y autorización móvil se conservaron.'
    );
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('');
    console.error('NO SE ELIMINÓ NADA');
    console.error('==================');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
