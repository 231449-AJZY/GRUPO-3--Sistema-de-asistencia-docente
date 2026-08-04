const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const frontend = process.env.FRONTEND_DIRECTORY;
const reportPath = process.env.IDENTITY_REPORT;

if (!frontend || !fs.existsSync(frontend)) {
  throw new Error(
    "No se encontró el frontend."
  );
}

if (!reportPath) {
  throw new Error(
    "No se definió la ruta del reporte."
  );
}

const identities = {
  "ADM-001": {
    nombres: "Gabriel",
    apellidos: "Administrador UNSAAC",
    nombreCompleto:
      "Gabriel Administrador UNSAAC",
    email: "admin@unsaac.edu.pe",
  },
  "DOC-001": {
    nombres: "Alberto",
    apellidos: "Acosta Sullca",
    nombreCompleto:
      "Alberto Acosta Sullca",
    email: "aacosta@unsaac.edu.pe",
  },
  "DOC-002": {
    nombres: "Verónica",
    apellidos: "Holgado Canales",
    nombreCompleto:
      "Verónica Holgado Canales",
    email: "vholgado@unsaac.edu.pe",
  },
  "DOC-003": {
    nombres: "Miguel Ángel",
    apellidos: "Valdivia Cárdenas",
    nombreCompleto:
      "Miguel Ángel Valdivia Cárdenas",
    email: "mvaldivia@unsaac.edu.pe",
  },
  "DOC-004": {
    nombres: "Nelly Patricia",
    apellidos: "Jiménez Chino",
    nombreCompleto:
      "Nelly Patricia Jiménez Chino",
    email: "njimenez@unsaac.edu.pe",
  },
  "DOC-005": {
    nombres: "Walter Paul",
    apellidos: "Orosco Soto",
    nombreCompleto:
      "Walter Paul Orosco Soto",
    email: "worosco@unsaac.edu.pe",
  },
  "DOC-006": {
    nombres: "Eliana",
    apellidos: "Cáceres Andía",
    nombreCompleto:
      "Eliana Cáceres Andía",
    email: "ecaceres@unsaac.edu.pe",
  },
  "DOC-007": {
    nombres: "Juan Carlos",
    apellidos: "Arias Loayza",
    nombreCompleto:
      "Juan Carlos Arias Loayza",
    email: "jarias@unsaac.edu.pe",
  },
  "DOC-008": {
    nombres: "Rosario",
    apellidos: "Quispe Apaza",
    nombreCompleto:
      "Rosario Quispe Apaza",
    email: "rquispe@unsaac.edu.pe",
  },
  "DOC-009": {
    nombres: "Gabriela",
    apellidos: "Núñez Vargas",
    nombreCompleto:
      "Gabriela Núñez Vargas",
    email: "gnunez@unsaac.edu.pe",
  },
  "DOC-010": {
    nombres: "Luis Fernando",
    apellidos: "Chura Salas",
    nombreCompleto:
      "Luis Fernando Chura Salas",
    email: "lchura@unsaac.edu.pe",
  },
  "DOC-011": {
    nombres: "Patricia Milagros",
    apellidos: "Sucso León",
    nombreCompleto:
      "Patricia Milagros Sucso León",
    email: "psucso@unsaac.edu.pe",
  },
  "DOC-012": {
    nombres: "Jorge Wilfredo",
    apellidos: "Yábar Mendoza",
    nombreCompleto:
      "Jorge Wilfredo Yábar Mendoza",
    email: "jyabar@unsaac.edu.pe",
  },
  "SUP-001": {
    nombres: "Rosa Isabel",
    apellidos: "Condori Ccama",
    nombreCompleto:
      "Rosa Isabel Condori Ccama",
    email: "rcondori@unsaac.edu.pe",
  },
  "SUP-002": {
    nombres: "Ana Lucía",
    apellidos: "Ccahuana Ramos",
    nombreCompleto:
      "Ana Lucía Ccahuana Ramos",
    email: "accahuana@unsaac.edu.pe",
  },
};

const relativeFiles = [
  "data/mockUsuarios.ts",
  "data/mockDocentes.ts",
  "data/mockHorarios.ts",
  "data/mockBiometricCapture.ts",
  "data/mockBiometricHistory.ts",
  "data/mockBiometricSynchronization.ts",
];

const fieldValues = {
  docente: "nombreCompleto",
  nombre: "nombreCompleto",
  nombres: "nombres",
  apellidos: "apellidos",
  email: "email",
  correo: "email",
};

function propertyName(property) {
  if (
    ts.isIdentifier(property.name) ||
    ts.isStringLiteral(property.name) ||
    ts.isNumericLiteral(property.name)
  ) {
    return property.name.text;
  }

  return "";
}

function stringProperty(
  objectLiteral,
  fieldName
) {
  for (
    const property of objectLiteral.properties
  ) {
    if (
      !ts.isPropertyAssignment(property)
    ) {
      continue;
    }

    if (
      propertyName(property) !==
      fieldName
    ) {
      continue;
    }

    if (
      ts.isStringLiteral(
        property.initializer
      ) ||
      ts.isNoSubstitutionTemplateLiteral(
        property.initializer
      )
    ) {
      return property.initializer.text;
    }
  }

  return "";
}

function identityCode(objectLiteral) {
  const teacherCode =
    stringProperty(
      objectLiteral,
      "codigoDocente"
    );

  if (
    /^(ADM|DOC|SUP)-\d+$/i.test(
      teacherCode
    )
  ) {
    return teacherCode.toUpperCase();
  }

  const generalCode =
    stringProperty(
      objectLiteral,
      "codigo"
    );

  if (
    /^(ADM|DOC|SUP)-\d+$/i.test(
      generalCode
    )
  ) {
    return generalCode.toUpperCase();
  }

  return "";
}

function updateFile(relativeFile) {
  const fullPath = path.join(
    frontend,
    relativeFile
  );

  const source =
    fs.readFileSync(fullPath, "utf8");

  const sourceFile =
    ts.createSourceFile(
      fullPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

  const replacements = [];

  function visit(node) {
    if (
      ts.isObjectLiteralExpression(node)
    ) {
      const code =
        identityCode(node);

      const identity =
        identities[code];

      if (identity) {
        for (
          const property of node.properties
        ) {
          if (
            !ts.isPropertyAssignment(
              property
            )
          ) {
            continue;
          }

          const name =
            propertyName(property);

          const identityField =
            fieldValues[name];

          if (!identityField) {
            continue;
          }

          const initializer =
            property.initializer;

          if (
            !ts.isStringLiteral(
              initializer
            ) &&
            !ts.isNoSubstitutionTemplateLiteral(
              initializer
            )
          ) {
            continue;
          }

          const newValue =
            identity[identityField];

          if (
            initializer.text ===
            newValue
          ) {
            continue;
          }

          replacements.push({
            start:
              initializer.getStart(
                sourceFile
              ),
            end:
              initializer.getEnd(),
            value:
              JSON.stringify(newValue),
            code,
            field: name,
            previous:
              initializer.text,
            next: newValue,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  replacements.sort(
    (first, second) =>
      second.start - first.start
  );

  let updated = source;

  for (const replacement of replacements) {
    updated =
      updated.slice(
        0,
        replacement.start
      ) +
      replacement.value +
      updated.slice(
        replacement.end
      );
  }

  if (updated !== source) {
    fs.writeFileSync(
      fullPath,
      updated,
      "utf8"
    );
  }

  return replacements;
}

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function verifyFile(relativeFile) {
  const fullPath = path.join(
    frontend,
    relativeFile
  );

  const source =
    fs.readFileSync(fullPath, "utf8");

  const sourceFile =
    ts.createSourceFile(
      fullPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

  const problems = [];

  function visit(node) {
    if (
      ts.isObjectLiteralExpression(node)
    ) {
      const code =
        identityCode(node);

      const identity =
        identities[code];

      if (identity) {
        const nombres =
          stringProperty(
            node,
            "nombres"
          );

        const apellidos =
          stringProperty(
            node,
            "apellidos"
          );

        const fullName =
          stringProperty(
            node,
            "docente"
          ) ||
          stringProperty(
            node,
            "nombre"
          ) ||
          `${nombres} ${apellidos}`.trim();

        const email =
          stringProperty(
            node,
            "email"
          ) ||
          stringProperty(
            node,
            "correo"
          );

        if (
          fullName &&
          normalize(fullName) !==
            normalize(
              identity.nombreCompleto
            )
        ) {
          problems.push(
            `${code}: nombre "${fullName}"`
          );
        }

        if (
          email &&
          email.trim().toLowerCase() !==
            identity.email
        ) {
          problems.push(
            `${code}: correo "${email}"`
          );
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return problems;
}

const changes = [];

for (const relativeFile of relativeFiles) {
  const replacements =
    updateFile(relativeFile);

  changes.push({
    relativeFile,
    replacements,
  });
}

const verificationProblems = [];

for (const relativeFile of relativeFiles) {
  const problems =
    verifyFile(relativeFile);

  for (const problem of problems) {
    verificationProblems.push(
      `${relativeFile}: ${problem}`
    );
  }
}

const reportLines = [
  "SINCRONIZACIÓN DE IDENTIDADES SIMULADAS",
  `Fecha: ${new Date().toISOString()}`,
  `Frontend: ${frontend}`,
  "",
  "============================================================",
  "CAMBIOS REALIZADOS",
  "============================================================",
  "",
];

let totalChanges = 0;

for (const result of changes) {
  reportLines.push(
    result.relativeFile
  );

  if (
    result.replacements.length === 0
  ) {
    reportLines.push(
      "  Sin cambios."
    );
  } else {
    for (
      const replacement of result.replacements
    ) {
      totalChanges += 1;

      reportLines.push(
        `  ${replacement.code} | ${replacement.field}:`
      );

      reportLines.push(
        `    Antes: ${replacement.previous}`
      );

      reportLines.push(
        `    Ahora: ${replacement.next}`
      );
    }
  }

  reportLines.push("");
}

reportLines.push(
  "============================================================",
  "VERIFICACIÓN POSTERIOR",
  "============================================================",
  ""
);

if (
  verificationProblems.length === 0
) {
  reportLines.push(
    "No se detectaron identidades inconsistentes."
  );
} else {
  for (
    const problem of verificationProblems
  ) {
    reportLines.push(
      `- ${problem}`
    );
  }
}

reportLines.push(
  "",
  `Total de campos actualizados: ${totalChanges}`,
  `Problemas pendientes: ${verificationProblems.length}`
);

fs.writeFileSync(
  reportPath,
  reportLines.join("\r\n"),
  "utf8"
);

console.log("");
console.log(
  "SINCRONIZACIÓN FINALIZADA"
);
console.log(
  "========================="
);
console.log(
  `Campos actualizados: ${totalChanges}`
);
console.log(
  `Problemas pendientes: ${verificationProblems.length}`
);
console.log(
  `Reporte: ${reportPath}`
);

if (
  verificationProblems.length > 0
) {
  process.exitCode = 2;
}