"use strict";

import fs from "node:fs";
import path from "node:path";

const projectRoot = process.argv[2];
const reportPath = process.argv[3];

if (!projectRoot || !reportPath) {
  console.error("Uso: node auditar-supervisor.mjs <proyecto> <reporte>");
  process.exit(2);
}

const frontend = path.join(projectRoot, "frontend");
const backend = path.join(projectRoot, "backend");
const findings = [];

function add(level, area, message) {
  findings.push({ level, area, message });
}

function read(relative) {
  const absolute = path.join(projectRoot, relative);

  if (!fs.existsSync(absolute)) {
    add("FAIL", "Archivo", `No existe ${relative}`);
    return "";
  }

  return fs.readFileSync(absolute, "utf8");
}

const requiredRoutes = [
  ["Dashboard", "frontend/app/supervisor/dashboard/page.tsx"],
  ["Tiempo real", "frontend/app/supervisor/tiempo-real/page.tsx"],
  ["Inconsistencias", "frontend/app/supervisor/inconsistencias/page.tsx"],
  ["Alertas", "frontend/app/supervisor/alertas/page.tsx"],
  ["Consultas", "frontend/app/supervisor/consultas/page.tsx"],
  ["Historial", "frontend/app/supervisor/historial/page.tsx"],
  ["Reportes", "frontend/app/supervisor/reportes/page.tsx"],
  ["Reporte asistencia", "frontend/app/supervisor/reportes/asistencia/page.tsx"],
  ["Reporte inasistencias", "frontend/app/supervisor/reportes/inasistencias/page.tsx"],
  ["Reporte docente", "frontend/app/supervisor/reportes/docente/page.tsx"],
  ["Reporte curso", "frontend/app/supervisor/reportes/curso/page.tsx"],
  ["Reporte departamento", "frontend/app/supervisor/reportes/departamento/page.tsx"],
  ["Reporte rango", "frontend/app/supervisor/reportes/rango/page.tsx"],
  ["Centro exportación", "frontend/app/supervisor/reportes/exportacion/page.tsx"],
];

const pageSources = [];

for (const [label, relative] of requiredRoutes) {
  const source = read(relative);

  if (!source) {
    continue;
  }

  pageSources.push([label, relative, source]);

  if (source.length < 250) {
    add("FAIL", label, "La página parece incompleta.");
  } else {
    add("PASS", label, "Ruta presente y con contenido.");
  }

  if (
    source.includes("\uFFFD") ||
    source.includes("Ã") ||
    source.includes("Â")
  ) {
    add("FAIL", label, "Se detectó texto UTF-8 dañado.");
  }

  if (
    source.includes("fetch(") ||
    source.includes("useQuery") ||
    source.includes("useReport")
  ) {
    const hasLoading =
      /\bloading\b|\bisLoading\b|Cargando/i.test(source);
    const hasError =
      /\berror\b|\bsetError\b|No se pudo/i.test(source);

    if (!hasLoading) {
      add("WARN", label, "No se detectó estado de carga explícito.");
    }

    if (!hasError) {
      add("WARN", label, "No se detectó estado de error explícito.");
    }
  }

  if (
    source.includes("MOCK_SUPERVISOR") ||
    source.includes("Veronica Holgado")
  ) {
    add("WARN", label, "La página conserva una referencia simulada.");
  }
}

const navigation = read("frontend/config/navigation.ts");
const supervisorNavigationRoutes = [
  "/supervisor/dashboard",
  "/supervisor/tiempo-real",
  "/supervisor/inconsistencias",
  "/supervisor/alertas",
  "/supervisor/consultas",
  "/supervisor/historial",
  "/supervisor/reportes",
];

for (const route of supervisorNavigationRoutes) {
  if (navigation.includes(route)) {
    add("PASS", "Navegación", `Ruta habilitada: ${route}`);
  } else {
    add("FAIL", "Navegación", `Falta la ruta ${route}`);
  }
}

const navKeys = [
  ...navigation.matchAll(
    /key:\s*"(supervisor-[^"]+)"/g
  ),
].map((match) => match[1]);

for (const key of new Set(navKeys)) {
  if (navKeys.filter((value) => value === key).length > 1) {
    add("FAIL", "Navegación", `Clave duplicada: ${key}`);
  }
}

const hub = read("frontend/app/supervisor/reportes/page.tsx");

if (/\/supervisor\/reportes\/legacy\?view=/i.test(hub)) {
  add("FAIL", "Reportes", "El hub conserva enlaces heredados.");
} else {
  add("PASS", "Reportes", "Todos los enlaces del hub son nativos.");
}

const nativeReports = [
  "/supervisor/reportes/asistencia",
  "/supervisor/reportes/inasistencias",
  "/supervisor/reportes/docente",
  "/supervisor/reportes/curso",
  "/supervisor/reportes/departamento",
  "/supervisor/reportes/rango",
  "/supervisor/reportes/exportacion",
];

for (const route of nativeReports) {
  if (hub.includes(route)) {
    add("PASS", "Reportes", `Hub enlaza ${route}`);
  } else {
    add("FAIL", "Reportes", `Hub no enlaza ${route}`);
  }
}

const cssFiles = [];

function walkCss(directory) {
  if (!fs.existsSync(directory)) {
    return;
  }

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walkCss(absolute);
    } else if (entry.name.endsWith(".module.css")) {
      cssFiles.push(absolute);
    }
  }
}

walkCss(path.join(frontend, "app", "supervisor"));

for (const cssFile of cssFiles) {
  const source = fs.readFileSync(cssFile, "utf8");
  const relative = path.relative(projectRoot, cssFile);

  if (source.includes("PASO_8I10_CIERRE_RESPONSIVE")) {
    add("PASS", "Responsive", `Cierre aplicado: ${relative}`);
  } else {
    add("WARN", "Responsive", `Sin cierre común: ${relative}`);
  }

  if (
    source.includes("\uFFFD") ||
    source.includes("Ã") ||
    source.includes("Â")
  ) {
    add("FAIL", "Responsive", `UTF-8 dañado en ${relative}`);
  }
}

const dashboardRoutes = read(
  "backend/src/routes/dashboard.routes.js"
);

if (dashboardRoutes.includes("v_historial_asistencia_unificado")) {
  add("PASS", "Backend", "Dashboard usa historial unificado.");
} else {
  add("WARN", "Backend", "Dashboard no muestra marcador de historial unificado.");
}

if (
  dashboardRoutes.includes("PASO_8I9A_FECHA_LIMA_ADMIN") ||
  dashboardRoutes.includes("America/Lima")
) {
  add("PASS", "Backend", "Se detectó tratamiento de zona horaria Lima.");
} else {
  add(
    "WARN",
    "Backend",
    "No se confirmó la corrección de fecha Lima del Administrador."
  );
}

const reportRoutes = read(
  "backend/src/routes/reportes.routes.js"
);

if (
  reportRoutes.includes("Administrador") &&
  reportRoutes.includes("Supervisor")
) {
  add("PASS", "Permisos", "Reportes permite Administrador y Supervisor.");
} else {
  add("FAIL", "Permisos", "No se confirmaron ambos roles en Reportes.");
}

const authMiddleware = read(
  "backend/src/middlewares/auth.middleware.js"
);

if (authMiddleware.includes("internal-server-token")) {
  add(
    "WARN",
    "Seguridad",
    "Permanece el token interno heredado; debe retirarse antes de producción."
  );
} else {
  add("PASS", "Seguridad", "No se detectó el token interno heredado.");
}

const failures = findings.filter(
  (item) => item.level === "FAIL"
);
const warnings = findings.filter(
  (item) => item.level === "WARN"
);
const passes = findings.filter(
  (item) => item.level === "PASS"
);

const lines = [
  "INFORME DE CIERRE — MÓDULO SUPERVISOR",
  "======================================",
  `Fecha ISO: ${new Date().toISOString()}`,
  `Proyecto: ${projectRoot}`,
  "",
  `Correctos: ${passes.length}`,
  `Advertencias: ${warnings.length}`,
  `Errores críticos: ${failures.length}`,
  "",
];

for (const level of ["FAIL", "WARN", "PASS"]) {
  const group = findings.filter(
    (item) => item.level === level
  );

  lines.push(`${level} (${group.length})`);
  lines.push("-".repeat(28));

  if (!group.length) {
    lines.push("Ninguno.");
  } else {
    for (const item of group) {
      lines.push(`[${item.area}] ${item.message}`);
    }
  }

  lines.push("");
}

fs.mkdirSync(path.dirname(reportPath), {
  recursive: true,
});
fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

console.log(lines.slice(0, 11).join("\n"));
console.log(`Informe completo: ${reportPath}`);

process.exit(failures.length ? 1 : 0);