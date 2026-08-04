require('dotenv').config();

const pool = require('../src/db/pool');

const DEPARTAMENTOS_INICIALES = [
  { codigo: 'DIS', nombre: 'Ingeniería de Sistemas' },
  { codigo: 'DIC', nombre: 'Ingeniería Civil' },
  { codigo: 'DIA', nombre: 'Ingeniería Agroindustrial' },
  { codigo: 'DED', nombre: 'Educación' },
  { codigo: 'DAR', nombre: 'Arquitectura' },
  { codigo: 'DMH', nombre: 'Medicina Humana' },
  { codigo: 'DOD', nombre: 'Odontología' },
  { codigo: 'DCO', nombre: 'Contabilidad' },
];

async function ensureDepartment(client, department) {
  const byName = await client.query(
    `SELECT id, codigo, nombre, activo
       FROM departamentos_academicos
      WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))
      LIMIT 1`,
    [department.nombre]
  );

  if (byName.rows.length > 0) {
    const updated = await client.query(
      `UPDATE departamentos_academicos
          SET activo = TRUE
        WHERE id = $1
        RETURNING id, codigo, nombre, activo`,
      [byName.rows[0].id]
    );

    return { action: 'reactivado', row: updated.rows[0] };
  }

  const byCode = await client.query(
    `SELECT id, codigo, nombre, activo
       FROM departamentos_academicos
      WHERE UPPER(TRIM(codigo)) = UPPER(TRIM($1))
      LIMIT 1`,
    [department.codigo]
  );

  if (byCode.rows.length > 0) {
    const updated = await client.query(
      `UPDATE departamentos_academicos
          SET activo = TRUE
        WHERE id = $1
        RETURNING id, codigo, nombre, activo`,
      [byCode.rows[0].id]
    );

    return { action: 'reactivado', row: updated.rows[0] };
  }

  const inserted = await client.query(
    `INSERT INTO departamentos_academicos (codigo, nombre, activo)
     VALUES ($1, $2, TRUE)
     RETURNING id, codigo, nombre, activo`,
    [department.codigo, department.nombre]
  );

  return { action: 'creado', row: inserted.rows[0] };
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tableExists = await client.query(
      `SELECT to_regclass('public.departamentos_academicos') AS tabla`
    );

    if (!tableExists.rows[0].tabla) {
      throw new Error(
        'No existe la tabla departamentos_academicos. Ejecute primero el modelo de base de datos.'
      );
    }

    const results = [];

    for (const department of DEPARTAMENTOS_INICIALES) {
      results.push(await ensureDepartment(client, department));
    }

    const activeDepartments = await client.query(
      `SELECT id, codigo, nombre
         FROM departamentos_academicos
        WHERE activo = TRUE
        ORDER BY nombre`
    );

    await client.query('COMMIT');

    console.log('Catálogo de departamentos académicos verificado.');
    console.log(`Departamentos activos: ${activeDepartments.rows.length}`);

    for (const result of results) {
      console.log(
        `- ${result.action.toUpperCase()}: ${result.row.codigo} - ${result.row.nombre}`
      );
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('No se pudo preparar el catálogo de departamentos:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Error inesperado al preparar departamentos:', error);
  process.exitCode = 1;
});
