'use strict';

const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(backendDir, '.env') });

const bcrypt = require('bcrypt');
const pool = require(path.join(backendDir, 'src', 'db', 'pool'));

const DEMO_DATA = {
  "departments": [
    {
      "codigo": "DIS",
      "nombre": "Ingeniería de Sistemas",
      "courses": [
        {
          "codigo": "SIS101-DEMO",
          "nombre": "Programación I"
        },
        {
          "codigo": "SIS202-DEMO",
          "nombre": "Bases de Datos"
        },
        {
          "codigo": "SIS303-DEMO",
          "nombre": "Ingeniería de Software"
        },
        {
          "codigo": "SIS404-DEMO",
          "nombre": "Redes y Comunicaciones"
        }
      ]
    },
    {
      "codigo": "DIC",
      "nombre": "Ingeniería Civil",
      "courses": [
        {
          "codigo": "CIV101-DEMO",
          "nombre": "Topografía"
        },
        {
          "codigo": "CIV202-DEMO",
          "nombre": "Mecánica de Suelos"
        },
        {
          "codigo": "CIV303-DEMO",
          "nombre": "Análisis Estructural"
        },
        {
          "codigo": "CIV404-DEMO",
          "nombre": "Hidráulica"
        }
      ]
    },
    {
      "codigo": "DIA",
      "nombre": "Ingeniería Agroindustrial",
      "courses": [
        {
          "codigo": "AGI101-DEMO",
          "nombre": "Química de Alimentos"
        },
        {
          "codigo": "AGI202-DEMO",
          "nombre": "Operaciones Unitarias"
        },
        {
          "codigo": "AGI303-DEMO",
          "nombre": "Tecnología de Alimentos"
        },
        {
          "codigo": "AGI404-DEMO",
          "nombre": "Control de Calidad"
        }
      ]
    },
    {
      "codigo": "DED",
      "nombre": "Educación",
      "courses": [
        {
          "codigo": "EDU101-DEMO",
          "nombre": "Didáctica General"
        },
        {
          "codigo": "EDU202-DEMO",
          "nombre": "Psicología Educativa"
        },
        {
          "codigo": "EDU303-DEMO",
          "nombre": "Evaluación del Aprendizaje"
        },
        {
          "codigo": "EDU404-DEMO",
          "nombre": "Gestión Educativa"
        }
      ]
    },
    {
      "codigo": "DAR",
      "nombre": "Arquitectura",
      "courses": [
        {
          "codigo": "ARQ101-DEMO",
          "nombre": "Dibujo Arquitectónico"
        },
        {
          "codigo": "ARQ202-DEMO",
          "nombre": "Diseño Arquitectónico"
        },
        {
          "codigo": "ARQ303-DEMO",
          "nombre": "Urbanismo"
        },
        {
          "codigo": "ARQ404-DEMO",
          "nombre": "Tecnología de la Construcción"
        }
      ]
    },
    {
      "codigo": "DMH",
      "nombre": "Medicina Humana",
      "courses": [
        {
          "codigo": "MED101-DEMO",
          "nombre": "Anatomía Humana"
        },
        {
          "codigo": "MED202-DEMO",
          "nombre": "Fisiología"
        },
        {
          "codigo": "MED303-DEMO",
          "nombre": "Patología General"
        },
        {
          "codigo": "MED404-DEMO",
          "nombre": "Medicina Interna"
        }
      ]
    },
    {
      "codigo": "DOD",
      "nombre": "Odontología",
      "courses": [
        {
          "codigo": "ODO101-DEMO",
          "nombre": "Anatomía Dental"
        },
        {
          "codigo": "ODO202-DEMO",
          "nombre": "Materiales Dentales"
        },
        {
          "codigo": "ODO303-DEMO",
          "nombre": "Periodoncia"
        },
        {
          "codigo": "ODO404-DEMO",
          "nombre": "Odontología Restauradora"
        }
      ]
    },
    {
      "codigo": "DCO",
      "nombre": "Contabilidad",
      "courses": [
        {
          "codigo": "CON101-DEMO",
          "nombre": "Contabilidad General"
        },
        {
          "codigo": "CON202-DEMO",
          "nombre": "Tributación"
        },
        {
          "codigo": "CON303-DEMO",
          "nombre": "Auditoría"
        },
        {
          "codigo": "CON404-DEMO",
          "nombre": "Finanzas Empresariales"
        }
      ]
    }
  ],
  "teachers": [
    {
      "codigo": "DOC-DEMO-001",
      "nombres": "Lucía",
      "apellidos": "Valverde Quispe",
      "email": "docente01@demo.unsaac.edu.pe",
      "password": "Docente01#2026",
      "departamentoCodigo": "DIS",
      "dni": "91000001",
      "categoria": "Auxiliar",
      "condicion": "Nombrado",
      "telefono": "910000001"
    },
    {
      "codigo": "DOC-DEMO-002",
      "nombres": "Mateo",
      "apellidos": "Cárdenas Huamán",
      "email": "docente02@demo.unsaac.edu.pe",
      "password": "Docente02#2026",
      "departamentoCodigo": "DIS",
      "dni": "91000002",
      "categoria": "Asociado",
      "condicion": "Contratado",
      "telefono": "910000002"
    },
    {
      "codigo": "DOC-DEMO-003",
      "nombres": "Daniela",
      "apellidos": "Flores Paredes",
      "email": "docente03@demo.unsaac.edu.pe",
      "password": "Docente03#2026",
      "departamentoCodigo": "DIS",
      "dni": "91000003",
      "categoria": "Principal",
      "condicion": "Nombrado",
      "telefono": "910000003"
    },
    {
      "codigo": "DOC-DEMO-004",
      "nombres": "Renzo",
      "apellidos": "Salazar Choque",
      "email": "docente04@demo.unsaac.edu.pe",
      "password": "Docente04#2026",
      "departamentoCodigo": "DIC",
      "dni": "91000004",
      "categoria": "Auxiliar",
      "condicion": "Contratado",
      "telefono": "910000004"
    },
    {
      "codigo": "DOC-DEMO-005",
      "nombres": "Camila",
      "apellidos": "Mendoza Soria",
      "email": "docente05@demo.unsaac.edu.pe",
      "password": "Docente05#2026",
      "departamentoCodigo": "DIC",
      "dni": "91000005",
      "categoria": "Asociado",
      "condicion": "Nombrado",
      "telefono": "910000005"
    },
    {
      "codigo": "DOC-DEMO-006",
      "nombres": "Bruno",
      "apellidos": "Vargas Palomino",
      "email": "docente06@demo.unsaac.edu.pe",
      "password": "Docente06#2026",
      "departamentoCodigo": "DIC",
      "dni": "91000006",
      "categoria": "Principal",
      "condicion": "Contratado",
      "telefono": "910000006"
    },
    {
      "codigo": "DOC-DEMO-007",
      "nombres": "Adriana",
      "apellidos": "Rojas Ccahuana",
      "email": "docente07@demo.unsaac.edu.pe",
      "password": "Docente07#2026",
      "departamentoCodigo": "DIA",
      "dni": "91000007",
      "categoria": "Auxiliar",
      "condicion": "Nombrado",
      "telefono": "910000007"
    },
    {
      "codigo": "DOC-DEMO-008",
      "nombres": "Thiago",
      "apellidos": "Espinoza Yupanqui",
      "email": "docente08@demo.unsaac.edu.pe",
      "password": "Docente08#2026",
      "departamentoCodigo": "DIA",
      "dni": "91000008",
      "categoria": "Asociado",
      "condicion": "Contratado",
      "telefono": "910000008"
    },
    {
      "codigo": "DOC-DEMO-009",
      "nombres": "Valeria",
      "apellidos": "Cabrera Huillca",
      "email": "docente09@demo.unsaac.edu.pe",
      "password": "Docente09#2026",
      "departamentoCodigo": "DIA",
      "dni": "91000009",
      "categoria": "Principal",
      "condicion": "Nombrado",
      "telefono": "910000009"
    },
    {
      "codigo": "DOC-DEMO-010",
      "nombres": "Noelia",
      "apellidos": "Torres Condori",
      "email": "docente10@demo.unsaac.edu.pe",
      "password": "Docente10#2026",
      "departamentoCodigo": "DED",
      "dni": "91000010",
      "categoria": "Auxiliar",
      "condicion": "Contratado",
      "telefono": "910000010"
    },
    {
      "codigo": "DOC-DEMO-011",
      "nombres": "Sebastián",
      "apellidos": "Núñez Puma",
      "email": "docente11@demo.unsaac.edu.pe",
      "password": "Docente11#2026",
      "departamentoCodigo": "DED",
      "dni": "91000011",
      "categoria": "Asociado",
      "condicion": "Nombrado",
      "telefono": "910000011"
    },
    {
      "codigo": "DOC-DEMO-012",
      "nombres": "Mariana",
      "apellidos": "Gutiérrez Quispe",
      "email": "docente12@demo.unsaac.edu.pe",
      "password": "Docente12#2026",
      "departamentoCodigo": "DED",
      "dni": "91000012",
      "categoria": "Principal",
      "condicion": "Contratado",
      "telefono": "910000012"
    },
    {
      "codigo": "DOC-DEMO-013",
      "nombres": "Alonso",
      "apellidos": "Pacheco Zúñiga",
      "email": "docente13@demo.unsaac.edu.pe",
      "password": "Docente13#2026",
      "departamentoCodigo": "DAR",
      "dni": "91000013",
      "categoria": "Auxiliar",
      "condicion": "Nombrado",
      "telefono": "910000013"
    },
    {
      "codigo": "DOC-DEMO-014",
      "nombres": "Fernanda",
      "apellidos": "León Vilca",
      "email": "docente14@demo.unsaac.edu.pe",
      "password": "Docente14#2026",
      "departamentoCodigo": "DAR",
      "dni": "91000014",
      "categoria": "Asociado",
      "condicion": "Contratado",
      "telefono": "910000014"
    },
    {
      "codigo": "DOC-DEMO-015",
      "nombres": "Diego",
      "apellidos": "Herrera Cárdenas",
      "email": "docente15@demo.unsaac.edu.pe",
      "password": "Docente15#2026",
      "departamentoCodigo": "DMH",
      "dni": "91000015",
      "categoria": "Principal",
      "condicion": "Nombrado",
      "telefono": "910000015"
    },
    {
      "codigo": "DOC-DEMO-016",
      "nombres": "Sofía",
      "apellidos": "Castro Ramos",
      "email": "docente16@demo.unsaac.edu.pe",
      "password": "Docente16#2026",
      "departamentoCodigo": "DMH",
      "dni": "91000016",
      "categoria": "Auxiliar",
      "condicion": "Contratado",
      "telefono": "910000016"
    },
    {
      "codigo": "DOC-DEMO-017",
      "nombres": "Mauricio",
      "apellidos": "Vega Quispe",
      "email": "docente17@demo.unsaac.edu.pe",
      "password": "Docente17#2026",
      "departamentoCodigo": "DOD",
      "dni": "91000017",
      "categoria": "Asociado",
      "condicion": "Nombrado",
      "telefono": "910000017"
    },
    {
      "codigo": "DOC-DEMO-018",
      "nombres": "Paula",
      "apellidos": "Medina Huamán",
      "email": "docente18@demo.unsaac.edu.pe",
      "password": "Docente18#2026",
      "departamentoCodigo": "DOD",
      "dni": "91000018",
      "categoria": "Principal",
      "condicion": "Contratado",
      "telefono": "910000018"
    },
    {
      "codigo": "DOC-DEMO-019",
      "nombres": "Rodrigo",
      "apellidos": "Aguilar Sucso",
      "email": "docente19@demo.unsaac.edu.pe",
      "password": "Docente19#2026",
      "departamentoCodigo": "DCO",
      "dni": "91000019",
      "categoria": "Auxiliar",
      "condicion": "Nombrado",
      "telefono": "910000019"
    },
    {
      "codigo": "DOC-DEMO-020",
      "nombres": "Natalia",
      "apellidos": "Peña Flores",
      "email": "docente20@demo.unsaac.edu.pe",
      "password": "Docente20#2026",
      "departamentoCodigo": "DCO",
      "dni": "91000020",
      "categoria": "Asociado",
      "condicion": "Contratado",
      "telefono": "910000020"
    }
  ],
  "supervisors": [
    {
      "codigo": "SUP-DIS-DEMO",
      "nombres": "Elena",
      "apellidos": "Paredes Lazo",
      "email": "supervisor.sistemas@demo.unsaac.edu.pe",
      "password": "SupervisorDIS#2026",
      "departamentoCodigo": "DIS"
    },
    {
      "codigo": "SUP-DIC-DEMO",
      "nombres": "Óscar",
      "apellidos": "Quispe Salas",
      "email": "supervisor.civil@demo.unsaac.edu.pe",
      "password": "SupervisorDIC#2026",
      "departamentoCodigo": "DIC"
    },
    {
      "codigo": "SUP-DIA-DEMO",
      "nombres": "Mónica",
      "apellidos": "Huillca Rojas",
      "email": "supervisor.agroindustrial@demo.unsaac.edu.pe",
      "password": "SupervisorDIA#2026",
      "departamentoCodigo": "DIA"
    },
    {
      "codigo": "SUP-DED-DEMO",
      "nombres": "Javier",
      "apellidos": "Condori Núñez",
      "email": "supervisor.educacion@demo.unsaac.edu.pe",
      "password": "SupervisorDED#2026",
      "departamentoCodigo": "DED"
    },
    {
      "codigo": "SUP-DAR-DEMO",
      "nombres": "Patricia",
      "apellidos": "Vargas León",
      "email": "supervisor.arquitectura@demo.unsaac.edu.pe",
      "password": "SupervisorDAR#2026",
      "departamentoCodigo": "DAR"
    },
    {
      "codigo": "SUP-DMH-DEMO",
      "nombres": "Ricardo",
      "apellidos": "Medina Castro",
      "email": "supervisor.medicina@demo.unsaac.edu.pe",
      "password": "SupervisorDMH#2026",
      "departamentoCodigo": "DMH"
    },
    {
      "codigo": "SUP-DOD-DEMO",
      "nombres": "Claudia",
      "apellidos": "Torres Vega",
      "email": "supervisor.odontologia@demo.unsaac.edu.pe",
      "password": "SupervisorDOD#2026",
      "departamentoCodigo": "DOD"
    },
    {
      "codigo": "SUP-DCO-DEMO",
      "nombres": "Héctor",
      "apellidos": "Flores Aguilar",
      "email": "supervisor.contabilidad@demo.unsaac.edu.pe",
      "password": "SupervisorDCO#2026",
      "departamentoCodigo": "DCO"
    }
  ],
  "admins": [
    {
      "codigo": "ADM-DEMO-01",
      "nombres": "Gabriela",
      "apellidos": "Ríos Mendoza",
      "email": "admin.demo01@demo.unsaac.edu.pe",
      "password": "AdminDemo01#2026"
    },
    {
      "codigo": "ADM-DEMO-02",
      "nombres": "Carlos",
      "apellidos": "Zamora Paredes",
      "email": "admin.demo02@demo.unsaac.edu.pe",
      "password": "AdminDemo02#2026"
    }
  ]
};

const SCHEDULE_TEMPLATES = [
  [
    { dia: 1, inicio: '08:00:00', fin: '10:00:00' },
    { dia: 2, inicio: '10:00:00', fin: '12:00:00' },
    { dia: 3, inicio: '14:00:00', fin: '16:00:00' },
    { dia: 4, inicio: '16:00:00', fin: '18:00:00' },
  ],
  [
    { dia: 1, inicio: '10:00:00', fin: '12:00:00' },
    { dia: 2, inicio: '14:00:00', fin: '16:00:00' },
    { dia: 3, inicio: '16:00:00', fin: '18:00:00' },
    { dia: 5, inicio: '08:00:00', fin: '10:00:00' },
  ],
  [
    { dia: 2, inicio: '08:00:00', fin: '10:00:00' },
    { dia: 3, inicio: '10:00:00', fin: '12:00:00' },
    { dia: 4, inicio: '14:00:00', fin: '16:00:00' },
    { dia: 5, inicio: '16:00:00', fin: '18:00:00' },
  ],
  [
    { dia: 1, inicio: '14:00:00', fin: '16:00:00' },
    { dia: 2, inicio: '16:00:00', fin: '18:00:00' },
    { dia: 4, inicio: '08:00:00', fin: '10:00:00' },
    { dia: 5, inicio: '10:00:00', fin: '12:00:00' },
  ],
  [
    { dia: 1, inicio: '16:00:00', fin: '18:00:00' },
    { dia: 3, inicio: '08:00:00', fin: '10:00:00' },
    { dia: 4, inicio: '10:00:00', fin: '12:00:00' },
    { dia: 5, inicio: '14:00:00', fin: '16:00:00' },
  ],
];

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\r\n;]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCredentials() {
  const rows = [];

  for (const teacher of DEMO_DATA.teachers) {
    const department = DEMO_DATA.departments.find(
      (item) => item.codigo === teacher.departamentoCodigo
    );

    rows.push({
      rol: 'Docente',
      carrera: department?.nombre ?? teacher.departamentoCodigo,
      codigo: teacher.codigo,
      nombres: teacher.nombres,
      apellidos: teacher.apellidos,
      email: teacher.email,
      password: teacher.password,
    });
  }

  for (const supervisor of DEMO_DATA.supervisors) {
    const department = DEMO_DATA.departments.find(
      (item) => item.codigo === supervisor.departamentoCodigo
    );

    rows.push({
      rol: 'Supervisor',
      carrera: department?.nombre ?? supervisor.departamentoCodigo,
      codigo: supervisor.codigo,
      nombres: supervisor.nombres,
      apellidos: supervisor.apellidos,
      email: supervisor.email,
      password: supervisor.password,
    });
  }

  for (const admin of DEMO_DATA.admins) {
    rows.push({
      rol: 'Administrador',
      carrera: 'Todas',
      codigo: admin.codigo,
      nombres: admin.nombres,
      apellidos: admin.apellidos,
      email: admin.email,
      password: admin.password,
    });
  }

  return rows;
}

async function tableExists(client, tableName) {
  const result = await client.query(
    'SELECT to_regclass($1) AS table_name',
    [`public.${tableName}`]
  );

  return Boolean(result.rows[0]?.table_name);
}

async function createBackup(client, backupDir) {
  fs.mkdirSync(backupDir, { recursive: true });

  const backup = {
    generatedAt: new Date().toISOString(),
    note: 'Respaldo de registros demo antes de ejecutar el sembrado académico.',
    usuarios: [],
    docentes: [],
    horarios: [],
    cursos: [],
    supervisoresDepartamento: [],
  };

  const usersResult = await client.query(
    `SELECT u.*, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE LOWER(u.email) LIKE '%@demo.unsaac.edu.pe'
         OR u.codigo LIKE 'DOC-DEMO-%'
         OR u.codigo LIKE 'SUP-%-DEMO'
         OR u.codigo LIKE 'ADM-DEMO-%'
      ORDER BY u.id`
  );
  backup.usuarios = usersResult.rows;

  if (usersResult.rows.length > 0) {
    const userIds = usersResult.rows.map((row) => row.id);

    const docentesResult = await client.query(
      `SELECT d.*
         FROM docentes d
        WHERE d.usuario_id = ANY($1::int[])
        ORDER BY d.id`,
      [userIds]
    );
    backup.docentes = docentesResult.rows;

    const docenteIds = docentesResult.rows.map((row) => row.id);

    if (docenteIds.length > 0) {
      const schedulesResult = await client.query(
        `SELECT hc.*
           FROM horarios_curso hc
          WHERE hc.docente_id = ANY($1::int[])
          ORDER BY hc.docente_id, hc.dia_semana, hc.hora_inicio`,
        [docenteIds]
      );
      backup.horarios = schedulesResult.rows;
    }
  }

  const courseCodes = DEMO_DATA.departments.flatMap((department) =>
    department.courses.map((course) => course.codigo)
  );

  const coursesResult = await client.query(
    `SELECT *
       FROM cursos
      WHERE codigo = ANY($1::varchar[])
      ORDER BY codigo`,
    [courseCodes]
  );
  backup.cursos = coursesResult.rows;

  if (await tableExists(client, 'supervisores_departamento')) {
    const supervisorsResult = await client.query(
      `SELECT *
         FROM supervisores_departamento
        ORDER BY id`
    );
    backup.supervisoresDepartamento = supervisorsResult.rows;
  }

  const backupPath = path.join(
    backupDir,
    'DATOS-DEMO-ANTES-SEMILLADO.json'
  );

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  return backupPath;
}

async function ensureRole(client, name, description) {
  const result = await client.query(
    `INSERT INTO roles (nombre, descripcion)
     VALUES ($1, $2)
     ON CONFLICT (nombre)
     DO UPDATE SET descripcion = EXCLUDED.descripcion
     RETURNING id`,
    [name, description]
  );

  return Number(result.rows[0].id);
}

async function ensureDepartment(client, department) {
  const result = await client.query(
    `INSERT INTO departamentos_academicos (codigo, nombre, activo)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (codigo)
     DO UPDATE SET
       nombre = EXCLUDED.nombre,
       activo = TRUE
     RETURNING id`,
    [department.codigo, department.nombre]
  );

  return Number(result.rows[0].id);
}

async function ensureSemester(client) {
  const activeResult = await client.query(
    `SELECT id, codigo, fecha_inicio, fecha_fin
       FROM semestres
      WHERE activo = TRUE
      ORDER BY fecha_inicio DESC, id DESC
      LIMIT 1`
  );

  if (activeResult.rows.length > 0) {
    return activeResult.rows[0];
  }

  const fallbackResult = await client.query(
    `INSERT INTO semestres (
       codigo,
       fecha_inicio,
       fecha_fin,
       activo
     )
     VALUES ('2026-II', '2026-07-01', '2026-12-20', TRUE)
     ON CONFLICT (codigo)
     DO UPDATE SET
       fecha_inicio = EXCLUDED.fecha_inicio,
       fecha_fin = EXCLUDED.fecha_fin,
       activo = TRUE
     RETURNING id, codigo, fecha_inicio, fecha_fin`
  );

  return fallbackResult.rows[0];
}

async function findExistingUser(client, codigo, email) {
  const result = await client.query(
    `SELECT id, codigo, email
       FROM usuarios
      WHERE UPPER(codigo) = UPPER($1)
         OR LOWER(email) = LOWER($2)
      ORDER BY id`,
    [codigo, email]
  );

  if (result.rows.length > 1) {
    throw new Error(
      `Conflicto: el código ${codigo} y el correo ${email} pertenecen a cuentas distintas.`
    );
  }

  return result.rows[0] ?? null;
}

async function upsertUser(client, account, roleId) {
  const passwordHash = await bcrypt.hash(account.password, 12);
  const existing = await findExistingUser(client, account.codigo, account.email);

  if (existing) {
    const updated = await client.query(
      `UPDATE usuarios
          SET codigo = $1,
              nombres = $2,
              apellidos = $3,
              email = $4,
              contrasena_hash = $5,
              rol_id = $6,
              activo = TRUE,
              actualizado_en = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING id`,
      [
        account.codigo,
        account.nombres,
        account.apellidos,
        account.email,
        passwordHash,
        roleId,
        existing.id,
      ]
    );

    return Number(updated.rows[0].id);
  }

  const inserted = await client.query(
    `INSERT INTO usuarios (
       codigo,
       nombres,
       apellidos,
       email,
       contrasena_hash,
       rol_id,
       activo,
       actualizado_en
     )
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, CURRENT_TIMESTAMP)
     RETURNING id`,
    [
      account.codigo,
      account.nombres,
      account.apellidos,
      account.email,
      passwordHash,
      roleId,
    ]
  );

  return Number(inserted.rows[0].id);
}

async function upsertTeacherProfile(client, teacher, userId, departmentId) {
  const result = await client.query(
    `INSERT INTO docentes (
       usuario_id,
       departamento_id,
       dni,
       categoria,
       condicion,
       telefono,
       actualizado_en
     )
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
     ON CONFLICT (usuario_id)
     DO UPDATE SET
       departamento_id = EXCLUDED.departamento_id,
       dni = EXCLUDED.dni,
       categoria = EXCLUDED.categoria,
       condicion = EXCLUDED.condicion,
       telefono = EXCLUDED.telefono,
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      userId,
      departmentId,
      teacher.dni,
      teacher.categoria,
      teacher.condicion,
      teacher.telefono,
    ]
  );

  return Number(result.rows[0].id);
}

async function ensureCourse(client, course, departmentId) {
  const result = await client.query(
    `INSERT INTO cursos (
       codigo,
       nombre,
       departamento_id,
       creditos,
       activo
     )
     VALUES ($1, $2, $3, 3, TRUE)
     ON CONFLICT (codigo)
     DO UPDATE SET
       nombre = EXCLUDED.nombre,
       departamento_id = EXCLUDED.departamento_id,
       creditos = EXCLUDED.creditos,
       activo = TRUE
     RETURNING id`,
    [course.codigo, course.nombre, departmentId]
  );

  return Number(result.rows[0].id);
}

async function ensureSupervisorTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS supervisores_departamento (
      id                SERIAL PRIMARY KEY,
      usuario_id        INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
      departamento_id   INT NOT NULL REFERENCES departamentos_academicos(id),
      activo            BOOLEAN NOT NULL DEFAULT TRUE,
      creado_en         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_supervisor_departamento_activo
      ON supervisores_departamento (departamento_id)
      WHERE activo = TRUE
  `);
}

async function linkSupervisor(client, userId, departmentId) {
  await client.query(
    `UPDATE supervisores_departamento
        SET activo = FALSE,
            actualizado_en = CURRENT_TIMESTAMP
      WHERE departamento_id = $1
        AND usuario_id <> $2
        AND activo = TRUE`,
    [departmentId, userId]
  );

  await client.query(
    `INSERT INTO supervisores_departamento (
       usuario_id,
       departamento_id,
       activo,
       actualizado_en
     )
     VALUES ($1, $2, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (usuario_id)
     DO UPDATE SET
       departamento_id = EXCLUDED.departamento_id,
       activo = TRUE,
       actualizado_en = CURRENT_TIMESTAMP`,
    [userId, departmentId]
  );
}

async function ensureSchedule(
  client,
  {
    teacherId,
    courseId,
    semesterId,
    room,
    day,
    start,
    end,
  }
) {
  await client.query(
    `INSERT INTO horarios_curso (
       docente_id,
       curso_id,
       semestre_id,
       aula,
       dia_semana,
       hora_inicio,
       hora_fin,
       activo
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
     ON CONFLICT (
       docente_id,
       semestre_id,
       dia_semana,
       hora_inicio
     )
     DO UPDATE SET
       curso_id = EXCLUDED.curso_id,
       aula = EXCLUDED.aula,
       hora_fin = EXCLUDED.hora_fin,
       activo = TRUE`,
    [
      teacherId,
      courseId,
      semesterId,
      room,
      day,
      start,
      end,
    ]
  );
}

async function writeCredentialsFiles(credentials, semester) {
  const downloadsDir = path.join(
    process.env.USERPROFILE || process.env.HOME || backendDir,
    'Downloads'
  );

  fs.mkdirSync(downloadsDir, { recursive: true });

  const headers = [
    'rol',
    'carrera',
    'codigo',
    'nombres',
    'apellidos',
    'email',
    'password',
  ];

  const csvLines = [
    headers.join(';'),
    ...credentials.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(';')
    ),
  ];

  const csvPath = path.join(
    downloadsDir,
    'CREDENCIALES-DEMO-UNSAAC-2026.csv'
  );

  const textPath = path.join(
    downloadsDir,
    'CREDENCIALES-DEMO-UNSAAC-2026.txt'
  );

  fs.writeFileSync(csvPath, `\uFEFF${csvLines.join('\r\n')}`, 'utf8');

  const groups = ['Administrador', 'Supervisor', 'Docente'];
  const textLines = [
    'CREDENCIALES DEMO - UNSAAC',
    '==========================',
    `Semestre utilizado: ${semester.codigo}`,
    '',
    'ADVERTENCIA: cuentas ficticias para desarrollo y pruebas.',
    'No utilizar estas contraseñas en producción.',
    '',
  ];

  for (const role of groups) {
    textLines.push(role.toUpperCase());
    textLines.push('-'.repeat(role.length));

    for (const row of credentials.filter((item) => item.rol === role)) {
      textLines.push(
        `${row.codigo} | ${row.nombres} ${row.apellidos} | ${row.carrera}`
      );
      textLines.push(`Correo: ${row.email}`);
      textLines.push(`Contraseña: ${row.password}`);
      textLines.push('');
    }
  }

  fs.writeFileSync(textPath, textLines.join('\r\n'), 'utf8');

  return { csvPath, textPath };
}

async function verifySeed(client, semesterId) {
  const roleCounts = await client.query(
    `SELECT r.nombre AS rol, COUNT(*)::int AS total
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
      WHERE LOWER(u.email) LIKE '%@demo.unsaac.edu.pe'
      GROUP BY r.nombre
      ORDER BY r.nombre`
  );

  const teacherSchedules = await client.query(
    `SELECT
       u.codigo,
       u.nombres,
       u.apellidos,
       dep.nombre AS carrera,
       COUNT(hc.id)::int AS horarios
     FROM usuarios u
     JOIN docentes d ON d.usuario_id = u.id
     JOIN departamentos_academicos dep ON dep.id = d.departamento_id
     LEFT JOIN horarios_curso hc
       ON hc.docente_id = d.id
      AND hc.semestre_id = $1
      AND hc.activo = TRUE
    WHERE LOWER(u.email) LIKE 'docente%@demo.unsaac.edu.pe'
    GROUP BY u.codigo, u.nombres, u.apellidos, dep.nombre
    ORDER BY u.codigo`,
    [semesterId]
  );

  const invalidTeachers = teacherSchedules.rows.filter(
    (row) => Number(row.horarios) !== 4
  );

  if (teacherSchedules.rows.length !== 20 || invalidTeachers.length > 0) {
    throw new Error(
      `Verificación fallida: se esperaban 20 docentes con 4 horarios cada uno.`
    );
  }

  const supervisorLinks = await client.query(
    `SELECT COUNT(*)::int AS total
       FROM supervisores_departamento sd
       JOIN usuarios u ON u.id = sd.usuario_id
      WHERE sd.activo = TRUE
        AND LOWER(u.email) LIKE 'supervisor.%@demo.unsaac.edu.pe'`
  );

  if (Number(supervisorLinks.rows[0]?.total ?? 0) !== 8) {
    throw new Error(
      'Verificación fallida: se esperaban 8 supervisores vinculados.'
    );
  }

  return {
    roleCounts: roleCounts.rows,
    teacherSchedules: teacherSchedules.rows,
    supervisorLinks: Number(supervisorLinks.rows[0]?.total ?? 0),
  };
}

async function main() {
  const requiredTables = [
    'roles',
    'usuarios',
    'departamentos_academicos',
    'docentes',
    'semestres',
    'cursos',
    'horarios_curso',
  ];

  const client = await pool.connect();
  let transactionOpen = false;

  try {
    for (const tableName of requiredTables) {
      if (!(await tableExists(client, tableName))) {
        throw new Error(
          `No existe la tabla ${tableName}. Complete primero los pasos académicos del proyecto.`
        );
      }
    }

    const backupDir =
      process.env.GABO_BACKUP_DIR ||
      path.join(backendDir, 'backups', `demo-${Date.now()}`);

    const backupPath = await createBackup(client, backupDir);
    console.log(`Respaldo previo: ${backupPath}`);

    await client.query('BEGIN');
    transactionOpen = true;

    const roleIds = {
      Administrador: await ensureRole(
        client,
        'Administrador',
        'Gestión total del sistema'
      ),
      Docente: await ensureRole(
        client,
        'Docente',
        'Registro y consulta de asistencia personal'
      ),
      Supervisor: await ensureRole(
        client,
        'Supervisor',
        'Monitoreo académico por carrera'
      ),
    };

    const departmentIds = new Map();
    const courseIds = new Map();

    for (const department of DEMO_DATA.departments) {
      const departmentId = await ensureDepartment(client, department);
      departmentIds.set(department.codigo, departmentId);

      for (const course of department.courses) {
        const courseId = await ensureCourse(
          client,
          course,
          departmentId
        );
        courseIds.set(course.codigo, courseId);
      }
    }

    const semester = await ensureSemester(client);

    await ensureSupervisorTable(client);

    for (const admin of DEMO_DATA.admins) {
      await upsertUser(client, admin, roleIds.Administrador);
    }

    for (const supervisor of DEMO_DATA.supervisors) {
      const userId = await upsertUser(
        client,
        supervisor,
        roleIds.Supervisor
      );

      const departmentId = departmentIds.get(
        supervisor.departamentoCodigo
      );

      await linkSupervisor(client, userId, departmentId);
    }

    for (let index = 0; index < DEMO_DATA.teachers.length; index += 1) {
      const teacher = DEMO_DATA.teachers[index];
      const department = DEMO_DATA.departments.find(
        (item) => item.codigo === teacher.departamentoCodigo
      );

      if (!department) {
        throw new Error(
          `No se encontró el departamento ${teacher.departamentoCodigo}.`
        );
      }

      const departmentId = departmentIds.get(department.codigo);
      const userId = await upsertUser(
        client,
        teacher,
        roleIds.Docente
      );

      const teacherId = await upsertTeacherProfile(
        client,
        teacher,
        userId,
        departmentId
      );

      const template = SCHEDULE_TEMPLATES[index % SCHEDULE_TEMPLATES.length];

      for (let courseIndex = 0; courseIndex < 4; courseIndex += 1) {
        const course = department.courses[courseIndex];
        const schedule = template[courseIndex];

        await ensureSchedule(client, {
          teacherId,
          courseId: courseIds.get(course.codigo),
          semesterId: Number(semester.id),
          room: `${department.codigo}-A${String(index + 1).padStart(2, '0')}`,
          day: schedule.dia,
          start: schedule.inicio,
          end: schedule.fin,
        });
      }
    }

    const verification = await verifySeed(client, Number(semester.id));

    await client.query(
      `INSERT INTO audit_log (
         usuario_id,
         accion,
         tabla,
         registro_id,
         detalle
       )
       VALUES (
         NULL,
         'SEMBRAR_DATOS_DEMO_ACADEMICOS',
         'usuarios',
         NULL,
         $1::jsonb
       )`,
      [
        JSON.stringify({
          docentes: 20,
          horarios: 80,
          supervisores: 8,
          administradores: 2,
          semestre: semester.codigo,
          dominio_demo: 'demo.unsaac.edu.pe',
        }),
      ]
    );

    await client.query('COMMIT');
    transactionOpen = false;

    const credentials = buildCredentials();
    const credentialFiles = await writeCredentialsFiles(
      credentials,
      semester
    );

    console.log('');
    console.log('DATOS DEMO CREADOS CORRECTAMENTE');
    console.log('================================');
    console.log(`Semestre utilizado: ${semester.codigo}`);
    console.log('Docentes: 20');
    console.log('Horarios: 80 (4 por docente)');
    console.log('Supervisores: 8 (1 por carrera)');
    console.log('Administradores demo: 2');
    console.log('Cursos demo: 32 (4 por carrera)');
    console.log('');
    console.table(verification.roleCounts);
    console.log(`CSV de credenciales: ${credentialFiles.csvPath}`);
    console.log(`TXT de credenciales: ${credentialFiles.textPath}`);
    console.log('');
    console.log('Todas las cuentas son ficticias y exclusivas para desarrollo.');
  } catch (error) {
    if (transactionOpen) {
      await client.query('ROLLBACK').catch(() => undefined);
    }

    console.error('');
    console.error('NO SE PUDO CREAR EL CONJUNTO DEMO');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Error inesperado:', error);
  process.exitCode = 1;
});
