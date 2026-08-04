"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";
import {
  clearSession,
  getLegacyUser,
  getToken,
} from "@/lib/auth";

import styles from "./page.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api";
const ALL = "TODOS";
const CONCURRENCY = 6;
const PAGE_SIZE = 10;
const SNAPSHOT_KEY =
  "unsaac_supervisor_reports_snapshot_v1";

type ViewMode =
  | "modulo"
  | "asistencia"
  | "inasistencias"
  | "docente"
  | "curso"
  | "departamento"
  | "rango"
  | "exportacion";

type NormalizedStatus =
  | "ASISTENCIA"
  | "TARDANZA"
  | "INASISTENCIA"
  | "OTRO";

interface SessionUser {
  rol?: string;
}

interface Teacher {
  id: number | string;
  codigo?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
  departamento?: string;
}

interface Course {
  id: number | string;
  nombre?: string;
  activo?: boolean;
}

interface Semester {
  id: number | string;
  codigo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
}

interface Schedule {
  id: number | string;
  docente_id?: number | string;
  semestre_id?: number | string;
  curso?: string;
  aula?: string;
  dia_semana?: number | string;
  hora_inicio?: string;
  hora_fin?: string;
  activo?: boolean;
}

interface InstitutionalRecord {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface CourseRecord
  extends InstitutionalRecord {
  curso?: string;
  aula?: string;
}

interface Filters {
  semesterId: string;
  teacherId: string;
  course: string;
  department: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface ReportRow {
  id: string;
  dateKey: string;
  dateLabel: string;
  time: string;
  teacherId: string;
  teacher: string;
  teacherCode: string;
  department: string;
  semesterId: string;
  semester: string;
  course: string;
  room: string;
  scope: "Institucional" | "Curso";
  status: NormalizedStatus;
  statusLabel: string;
}

interface Snapshot {
  version: 1;
  title: string;
  view: ViewMode;
  generatedAt: string;
  filters: Filters;
  rows: ReportRow[];
  requestedTeachers: number;
  completedTeachers: number;
}

interface SourceState {
  key: string;
  label: string;
  ok: boolean;
  description: string;
}

interface ExportSettings {
  orientation: "landscape" | "portrait";
  paper: "A4" | "Letter";
  summary: boolean;
  filters: boolean;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const EMPTY_FILTERS: Filters = {
  semesterId: ALL,
  teacherId: "",
  course: ALL,
  department: ALL,
  status: ALL,
  startDate: "",
  endDate: "",
};

const VIEWS: Array<{
  id: ViewMode;
  title: string;
  description: string;
}> = [
  {
    id: "modulo",
    title: "MÃ³dulo de reportes",
    description:
      "Accesos a reportes institucionales y exportaciones.",
  },
  {
    id: "asistencia",
    title: "Reporte de asistencia",
    description:
      "Marcaciones y cumplimiento de asistencia.",
  },
  {
    id: "inasistencias",
    title: "Reporte de inasistencias",
    description:
      "Ausencias explÃ­citas y distribuciÃ³n institucional.",
  },
  {
    id: "docente",
    title: "Reporte por docente",
    description:
      "Consolidado individual y detalle por curso.",
  },
  {
    id: "curso",
    title: "Reporte por curso",
    description:
      "Sesiones visibles y cumplimiento por curso.",
  },
  {
    id: "departamento",
    title: "Reporte por departamento acadÃ©mico",
    description:
      "ComparaciÃ³n entre unidades acadÃ©micas.",
  },
  {
    id: "rango",
    title: "Reporte por rango de fechas",
    description:
      "EvoluciÃ³n diaria dentro de un periodo.",
  },
  {
    id: "exportacion",
    title: "ExportaciÃ³n de reportes",
    description:
      "CSV, Excel compatible e impresiÃ³n para PDF.",
  },
];

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function upper(value: unknown): string {
  return clean(value).toUpperCase();
}

function dateKey(value: string | undefined): string {
  return clean(value).slice(0, 10);
}

function formatDate(value: string | undefined): string {
  const date = dateKey(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date || "â€”";
  }

  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(value: string | undefined): string {
  return clean(value).slice(0, 8) || "â€”";
}

function teacherName(teacher: Teacher): string {
  return (
    `${teacher.nombres ?? ""} ${
      teacher.apellidos ?? ""
    }`.trim() || "Docente no informado"
  );
}

function statusInfo(value: string): {
  status: NormalizedStatus;
  label: string;
} {
  const state = upper(value);

  if (
    state === "PRESENTE" ||
    state === "PUNTUAL" ||
    state === "ASISTENCIA"
  ) {
    return {
      status: "ASISTENCIA",
      label: "Asistencia",
    };
  }

  if (state === "TARDANZA") {
    return {
      status: "TARDANZA",
      label: "Tardanza",
    };
  }

  if (state === "AUSENTE") {
    return {
      status: "INASISTENCIA",
      label: "Inasistencia",
    };
  }

  return {
    status: "OTRO",
    label: state || "Sin estado",
  };
}

function semesterForDate(
  value: string,
  semesters: Semester[]
): Semester | null {
  return (
    semesters.find((semester) => {
      const start = dateKey(semester.fecha_inicio);
      const end = dateKey(semester.fecha_fin);

      return (
        value &&
        start &&
        end &&
        value >= start &&
        value <= end
      );
    }) ?? null
  );
}

function percent(
  numerator: number,
  denominator: number
): number | null {
  if (denominator <= 0) {
    return null;
  }

  return (
    Math.round(
      (numerator / denominator) * 1000
    ) / 10
  );
}

function complianceLabel(
  value: number | null
): string {
  return value === null
    ? "Sin datos"
    : `${value.toFixed(1)}%`;
}

function calculateMetrics(rows: ReportRow[]) {
  const attendance = rows.filter(
    (row) => row.status === "ASISTENCIA"
  ).length;
  const late = rows.filter(
    (row) => row.status === "TARDANZA"
  ).length;
  const absent = rows.filter(
    (row) => row.status === "INASISTENCIA"
  ).length;
  const other = rows.filter(
    (row) => row.status === "OTRO"
  ).length;

  return {
    total: rows.length,
    attendance,
    late,
    absent,
    other,
    compliance: percent(
      attendance,
      attendance + late + absent
    ),
  };
}

function csvCell(value: unknown): string {
  let text = String(value ?? "");

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function requestJson<T>(
  path: string,
  token: string
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  const data = (await response
    .json()
    .catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo consultar una fuente del reporte.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

async function mapConcurrent<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          CONCURRENCY,
          Math.max(1, items.length)
        ),
      },
      () => worker()
    )
  );

  return results;
}

function upsertSource(
  current: SourceState[],
  next: SourceState
): SourceState[] {
  return [
    ...current.filter(
      (source) => source.key !== next.key
    ),
    next,
  ];
}

function buildRows(
  teacher: Teacher,
  history: {
    ingresos?: InstitutionalRecord[];
    cursos?: CourseRecord[];
  },
  semesters: Semester[]
): ReportRow[] {
  const common = {
    teacherId: String(teacher.id),
    teacher: teacherName(teacher),
    teacherCode: clean(teacher.codigo) || "â€”",
    department:
      clean(teacher.departamento) ||
      "No informado",
  };

  const institutional = (
    history.ingresos ?? []
  ).map((record, index): ReportRow => {
    const date = dateKey(record.fecha);
    const semester = semesterForDate(
      date,
      semesters
    );
    const status = statusInfo(record.estado);

    return {
      id: `i-${teacher.id}-${date}-${record.hora_registro}-${index}`,
      dateKey: date,
      dateLabel: formatDate(date),
      time: formatTime(record.hora_registro),
      ...common,
      semesterId: semester
        ? String(semester.id)
        : "",
      semester:
        clean(semester?.codigo) ||
        "Fuera de semestre",
      course: "Ingreso institucional",
      room: "â€”",
      scope: "Institucional",
      status: status.status,
      statusLabel: status.label,
    };
  });

  const academic = (
    history.cursos ?? []
  ).map((record, index): ReportRow => {
    const date = dateKey(record.fecha);
    const semester = semesterForDate(
      date,
      semesters
    );
    const status = statusInfo(record.estado);

    return {
      id: `c-${teacher.id}-${date}-${record.hora_registro}-${index}`,
      dateKey: date,
      dateLabel: formatDate(date),
      time: formatTime(record.hora_registro),
      ...common,
      semesterId: semester
        ? String(semester.id)
        : "",
      semester:
        clean(semester?.codigo) ||
        "Fuera de semestre",
      course:
        clean(record.curso) ||
        "Curso no informado",
      room: clean(record.aula) || "â€”",
      scope: "Curso",
      status: status.status,
      statusLabel: status.label,
    };
  });

  return [...institutional, ...academic];
}

function filterRows(
  rows: ReportRow[],
  filters: Filters,
  view: ViewMode
): ReportRow[] {
  return rows
    .filter((row) => {
      const bySemester =
        filters.semesterId === ALL ||
        row.semesterId === filters.semesterId;
      const byTeacher =
        !filters.teacherId ||
        filters.teacherId === ALL ||
        row.teacherId === filters.teacherId;
      const byCourse =
        filters.course === ALL ||
        row.course === filters.course;
      const byDepartment =
        filters.department === ALL ||
        row.department === filters.department;
      const byStatus =
        filters.status === ALL ||
        row.status === filters.status;
      const byStart =
        !filters.startDate ||
        row.dateKey >= filters.startDate;
      const byEnd =
        !filters.endDate ||
        row.dateKey <= filters.endDate;
      const byView =
        view === "inasistencias"
          ? row.status === "INASISTENCIA"
          : view === "asistencia"
            ? row.status !== "OTRO"
            : true;

      return (
        bySemester &&
        byTeacher &&
        byCourse &&
        byDepartment &&
        byStatus &&
        byStart &&
        byEnd &&
        byView
      );
    })
    .sort((a, b) => {
      const dateOrder =
        b.dateKey.localeCompare(a.dateKey);

      return (
        dateOrder ||
        b.time.localeCompare(a.time)
      );
    });
}

function resolveTargets(
  view: ViewMode,
  filters: Filters,
  teachers: Teacher[],
  schedules: Schedule[]
): Teacher[] {
  const active = teachers.filter(
    (teacher) => teacher.activo !== false
  );

  if (
    view === "docente" ||
    (filters.teacherId &&
      filters.teacherId !== ALL)
  ) {
    return active.filter(
      (teacher) =>
        String(teacher.id) ===
        filters.teacherId
    );
  }

  if (
    view === "curso" &&
    filters.course !== ALL
  ) {
    const ids = new Set(
      schedules
        .filter(
          (schedule) =>
            clean(schedule.curso) ===
              filters.course &&
            schedule.activo !== false
        )
        .map((schedule) =>
          String(schedule.docente_id ?? "")
        )
    );

    return active.filter((teacher) =>
      ids.has(String(teacher.id))
    );
  }

  if (filters.department !== ALL) {
    return active.filter(
      (teacher) =>
        clean(teacher.departamento) ===
        filters.department
    );
  }

  return active;
}

function downloadBlob(
  parts: BlobPart[],
  type: string,
  filename: string
) {
  const blob = new Blob(parts, { type });
  const url = URL.createObjectURL(blob);
  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows: ReportRow[]): string {
  const data = [
    [
      "Fecha",
      "Hora",
      "Docente",
      "Codigo",
      "Departamento",
      "Semestre",
      "Curso o registro",
      "Aula",
      "Tipo",
      "Estado",
    ],
    ...rows.map((row) => [
      row.dateLabel,
      row.time,
      row.teacher,
      row.teacherCode,
      row.department,
      row.semester,
      row.course,
      row.room,
      row.scope,
      row.statusLabel,
    ]),
  ];

  return data
    .map((line) =>
      line.map(csvCell).join(";")
    )
    .join("\r\n");
}

function reportHtml(
  snapshot: Snapshot,
  settings: ExportSettings
): string {
  const metrics = calculateMetrics(
    snapshot.rows
  );
  const body = snapshot.rows
    .map(
      (row) => `
<tr>
<td>${escapeHtml(row.dateLabel)}</td>
<td>${escapeHtml(row.time)}</td>
<td>${escapeHtml(row.teacher)}</td>
<td>${escapeHtml(row.teacherCode)}</td>
<td>${escapeHtml(row.department)}</td>
<td>${escapeHtml(row.semester)}</td>
<td>${escapeHtml(row.course)}</td>
<td>${escapeHtml(row.room)}</td>
<td>${escapeHtml(row.scope)}</td>
<td>${escapeHtml(row.statusLabel)}</td>
</tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escapeHtml(snapshot.title)}</title>
<style>
@page { size: ${settings.paper} ${settings.orientation}; margin: 14mm; }
body { font-family: Arial,sans-serif; color:#0f213a; margin:0; }
header { border-bottom:3px solid #ff8a00; padding-bottom:10px; }
h1 { font-size:24px; margin:0; }
p { color:#52627a; font-size:11px; }
.summary { display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin:14px 0; }
.summary div { border:1px solid #dfe7f1; border-radius:8px; padding:8px; }
.summary span { display:block; font-size:8px; color:#64748b; }
.summary strong { display:block; margin-top:4px; font-size:17px; }
table { width:100%; border-collapse:collapse; font-size:8px; margin-top:14px; }
th { background:#eef4fa; text-align:left; padding:6px; border:1px solid #dfe7f1; }
td { padding:6px; border:1px solid #dfe7f1; vertical-align:top; }
footer { margin-top:12px; color:#64748b; font-size:8px; }
</style>
</head>
<body>
<header>
<h1>${escapeHtml(snapshot.title)}</h1>
<p>UNSAAC Â· Generado ${escapeHtml(
    new Date(snapshot.generatedAt).toLocaleString(
      "es-PE"
    )
  )}</p>
</header>
${
  settings.filters
    ? `<p>Filtros: ${escapeHtml(
        JSON.stringify(snapshot.filters)
      )}</p>`
    : ""
}
${
  settings.summary
    ? `<section class="summary">
<div><span>Registros</span><strong>${metrics.total}</strong></div>
<div><span>Asistencias</span><strong>${metrics.attendance}</strong></div>
<div><span>Tardanzas</span><strong>${metrics.late}</strong></div>
<div><span>Inasistencias</span><strong>${metrics.absent}</strong></div>
<div><span>Cumplimiento</span><strong>${escapeHtml(
        complianceLabel(metrics.compliance)
      )}</strong></div>
</section>`
    : ""
}
<table>
<thead>
<tr>
<th>Fecha</th><th>Hora</th><th>Docente</th><th>CÃ³digo</th>
<th>Departamento</th><th>Semestre</th><th>Curso / registro</th>
<th>Aula</th><th>Tipo</th><th>Estado</th>
</tr>
</thead>
<tbody>${body}</tbody>
</table>
<footer>
Ventana disponible: hasta 30 ingresos institucionales y 30 registros acadÃ©micos por docente.
</footer>
</body>
</html>`;
}

function ViewIcon({
  view,
}: {
  view: ViewMode;
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (view === "inasistencias") {
    return (
      <svg {...common}>
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a6 6 0 0 1 9-5.2" />
        <path d="m17 14 4 4M21 14l-4 4" />
      </svg>
    );
  }

  if (view === "docente") {
    return (
      <svg {...common}>
        <circle cx="12" cy="7" r="4" />
        <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      </svg>
    );
  }

  if (view === "curso") {
    return (
      <svg {...common}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M8 8h8M8 12h6" />
      </svg>
    );
  }

  if (view === "departamento") {
    return (
      <svg {...common}>
        <path d="M3 21h18M5 21V8l7-4 7 4v13" />
        <path d="M9 21v-6h6v6" />
      </svg>
    );
  }

  if (view === "rango") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    );
  }

  if (view === "exportacion") {
    return (
      <svg {...common}>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14a2 2 0 0 0 2-2v-3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function StatusBadge({
  row,
}: {
  row: ReportRow;
}) {
  return (
    <span
      className={`${styles.statusBadge} ${
        row.status === "ASISTENCIA"
          ? styles.statusAttendance
          : row.status === "TARDANZA"
            ? styles.statusLate
            : row.status === "INASISTENCIA"
              ? styles.statusAbsent
              : styles.statusOther
      }`}
    >
      <span />
      {row.statusLabel}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "blue"
    | "green"
    | "amber"
    | "red"
    | "purple";
}) {
  return (
    <article
      className={`${styles.metric} ${
        styles[`metric${tone}`]
      }`}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function SupervisorReportsPage() {
  const router = useRouter();

  const [view, setView] =
    useState<ViewMode>("modulo");

  // PASO_8I8R1_QUERY_SYNC: permite abrir la vista anterior desde el nuevo hub.
  useEffect(() => {
    const requested = new URLSearchParams(
      window.location.search
    ).get("view");

    if (
      requested &&
      VIEWS.some((item) => item.id === requested)
    ) {
      setView(requested as ViewMode);
    }
  }, []);
  const [teachers, setTeachers] =
    useState<Teacher[]>([]);
  const [courses, setCourses] =
    useState<Course[]>([]);
  const [semesters, setSemesters] =
    useState<Semester[]>([]);
  const [schedules, setSchedules] =
    useState<Schedule[]>([]);
  const [dashboardStats, setDashboardStats] =
    useState<Record<string, unknown>>({});
  const [sources, setSources] =
    useState<SourceState[]>([]);
  const [filters, setFilters] =
    useState<Filters>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] =
    useState<Filters>({ ...EMPTY_FILTERS });
  const [rows, setRows] =
    useState<ReportRow[]>([]);
  const [snapshot, setSnapshot] =
    useState<Snapshot | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [generating, setGenerating] =
    useState(false);
  const [error, setError] =
    useState("");
  const [notice, setNotice] =
    useState("");
  const [page, setPage] =
    useState(1);
  const [requested, setRequested] =
    useState(0);
  const [completed, setCompleted] =
    useState(0);
  const [exportSettings, setExportSettings] =
    useState<ExportSettings>({
      orientation: "landscape",
      paper: "A4",
      summary: true,
      filters: true,
    });

  const loadBase = useCallback(async () => {
    const user =
      getLegacyUser() as SessionUser | null;
    const token = getToken();

    if (
      !user ||
      !token ||
      upper(user.rol) !== "SUPERVISOR"
    ) {
      clearSession();
      router.replace("/login");
      return;
    }

    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      requestJson<{ docentes?: Teacher[] }>(
        "/docentes",
        token
      ),
      requestJson<{
        cursos?: Course[];
        semestres?: Semester[];
      }>("/horarios/catalogos", token),
      requestJson<{ horarios?: Schedule[] }>(
        "/horarios",
        token
      ),
      requestJson<{
        stats?: Record<string, unknown>;
      }>("/dashboard/supervisor", token),
    ]);

    const authFailure = results.find(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof ApiError &&
        [401, 403].includes(result.reason.status)
    );

    if (authFailure) {
      clearSession();
      router.replace("/login");
      return;
    }

    const teacherResult = results[0];
    const catalogResult = results[1];
    const scheduleResult = results[2];
    const dashboardResult = results[3];

    const activeTeachers =
      teacherResult.status === "fulfilled"
        ? (
            teacherResult.value.docentes ?? []
          )
            .filter(
              (teacher) =>
                teacher.activo !== false
            )
            .sort((a, b) =>
              teacherName(a).localeCompare(
                teacherName(b),
                "es-PE"
              )
            )
        : [];

    setTeachers(activeTeachers);

    if (catalogResult.status === "fulfilled") {
      setCourses(
        (
          catalogResult.value.cursos ?? []
        ).filter(
          (course) => course.activo !== false
        )
      );
      setSemesters(
        (
          catalogResult.value.semestres ?? []
        ).sort((a, b) =>
          dateKey(
            b.fecha_inicio
          ).localeCompare(
            dateKey(a.fecha_inicio)
          )
        )
      );
    }

    if (scheduleResult.status === "fulfilled") {
      setSchedules(
        scheduleResult.value.horarios ?? []
      );
    }

    if (dashboardResult.status === "fulfilled") {
      setDashboardStats(
        dashboardResult.value.stats ?? {}
      );
    }

    setSources([
      {
        key: "teachers",
        label: "Directorio docente",
        ok: teacherResult.status === "fulfilled",
        description: `${activeTeachers.length} docente(s) activo(s)`,
      },
      {
        key: "catalogs",
        label: "CatÃ¡logos acadÃ©micos",
        ok: catalogResult.status === "fulfilled",
        description: "Cursos y semestres",
      },
      {
        key: "schedules",
        label: "Horarios",
        ok: scheduleResult.status === "fulfilled",
        description: "ProgramaciÃ³n acadÃ©mica",
      },
      {
        key: "dashboard",
        label: "Resumen Supervisor",
        ok: dashboardResult.status === "fulfilled",
        description: "Indicadores agregados",
      },
    ]);

    const first = activeTeachers[0];
    setFilters({
      ...EMPTY_FILTERS,
      teacherId: first
        ? String(first.id)
        : "",
      department:
        first?.departamento ?? ALL,
    });

    try {
      const saved = window.sessionStorage.getItem(
        SNAPSHOT_KEY
      );
      if (saved) {
        const parsed = JSON.parse(saved) as Snapshot;
        if (parsed.version === 1) {
          setSnapshot(parsed);
        }
      }
    } catch {
      // Sin snapshot.
    }

    if (
      results.every(
        (result) => result.status === "rejected"
      )
    ) {
      setError(
        "No se pudo preparar el mÃ³dulo de reportes."
      );
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  const courseNames = useMemo(
    () =>
      courses
        .map((course) => clean(course.nombre))
        .filter(Boolean)
        .sort((a, b) =>
          a.localeCompare(b, "es-PE")
        ),
    [courses]
  );

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          teachers
            .map((teacher) =>
              clean(teacher.departamento)
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(b, "es-PE")
      ),
    [teachers]
  );

  const targets = useMemo(
    () =>
      resolveTargets(
        view,
        filters,
        teachers,
        schedules
      ),
    [view, filters, teachers, schedules]
  );

  const metrics = useMemo(
    () => calculateMetrics(rows),
    [rows]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE)
  );
  const currentPage = Math.min(
    page,
    totalPages
  );
  const visibleRows = rows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const daily = useMemo(() => {
    const map = new Map<string, ReportRow[]>();

    rows.forEach((row) => {
      map.set(row.dateKey, [
        ...(map.get(row.dateKey) ?? []),
        row,
      ]);
    });

    return Array.from(map.entries())
      .map(([key, values]) => ({
        key,
        label: formatDate(key),
        ...calculateMetrics(values),
      }))
      .sort((a, b) =>
        a.key.localeCompare(b.key)
      )
      .slice(-10);
  }, [rows]);

  const groups = useMemo(() => {
    const map = new Map<string, ReportRow[]>();

    rows.forEach((row) => {
      const key =
        view === "departamento"
          ? row.department
          : view === "curso"
            ? row.course
            : row.teacherId;

      map.set(key, [
        ...(map.get(key) ?? []),
        row,
      ]);
    });

    return Array.from(map.entries())
      .map(([key, values]) => ({
        key,
        label:
          view === "departamento"
            ? values[0].department
            : view === "curso"
              ? values[0].course
              : values[0].teacher,
        secondary:
          view === "departamento"
            ? `${
                new Set(
                  values.map(
                    (row) => row.teacherId
                  )
                ).size
              } docente(s)`
            : `${
                new Set(
                  values.map(
                    (row) => row.course
                  )
                ).size
              } curso(s)`,
        ...calculateMetrics(values),
      }))
      .sort((a, b) => b.total - a.total);
  }, [rows, view]);

  const maxDaily = Math.max(
    1,
    ...daily.map((item) => item.total)
  );
  const maxGroup = Math.max(
    1,
    ...groups.map((item) => item.total)
  );

  async function generate() {
    const token = getToken();

    if (!token) {
      clearSession();
      router.replace("/login");
      return;
    }

    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      setError(
        "La fecha inicial no puede ser posterior a la fecha final."
      );
      return;
    }

    if (targets.length === 0) {
      setError(
        "No existen docentes para los filtros seleccionados."
      );
      return;
    }

    setGenerating(true);
    setError("");
    setNotice("");
    setRequested(targets.length);
    setCompleted(0);

    let completedCount = 0;
    let failed = 0;

    try {
      const batches = await mapConcurrent(
        targets,
        async (teacher) => {
          try {
            const history = await requestJson<{
              ingresos?: InstitutionalRecord[];
              cursos?: CourseRecord[];
            }>(
              `/asistencia/docente/${teacher.id}`,
              token
            );

            completedCount += 1;
            setCompleted(completedCount);

            return buildRows(
              teacher,
              history,
              semesters
            );
          } catch (historyError) {
            if (
              historyError instanceof ApiError &&
              [401, 403].includes(
                historyError.status
              )
            ) {
              throw historyError;
            }

            failed += 1;
            return [];
          }
        }
      );

      const filtered = filterRows(
        batches.flat(),
        filters,
        view
      );
      const now = new Date().toISOString();
      const title =
        VIEWS.find((item) => item.id === view)
          ?.title ?? "Reporte";
      const nextSnapshot: Snapshot = {
        version: 1,
        title,
        view,
        generatedAt: now,
        filters: { ...filters },
        rows: filtered,
        requestedTeachers: targets.length,
        completedTeachers: completedCount,
      };

      setRows(filtered);
      setAppliedFilters({ ...filters });
      setSnapshot(nextSnapshot);
      setPage(1);

      try {
        window.sessionStorage.setItem(
          SNAPSHOT_KEY,
          JSON.stringify(nextSnapshot)
        );
      } catch {
        // La exportaciÃ³n actual sigue disponible.
      }

      setSources((current) =>
        upsertSource(current, {
          key: "histories",
          label: "Historiales personales",
          ok: completedCount > 0,
          description:
            failed > 0
              ? `${completedCount} respondieron Â· ${failed} fallaron`
              : `${completedCount} respondieron`,
        })
      );

      setNotice(
        filtered.length > 0
          ? `Reporte generado con ${filtered.length} registro(s).`
          : "La consulta terminÃ³ sin registros coincidentes."
      );
    } catch (reportError) {
      if (
        reportError instanceof ApiError &&
        [401, 403].includes(
          reportError.status
        )
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(
        reportError instanceof Error
          ? reportError.message
          : "No se pudo generar el reporte."
      );
    } finally {
      setGenerating(false);
    }
  }

  function clearFilters() {
    const first = teachers[0];

    setFilters({
      ...EMPTY_FILTERS,
      teacherId: first
        ? String(first.id)
        : "",
      department:
        first?.departamento ?? ALL,
      course:
        view === "curso"
          ? courseNames[0] ?? ALL
          : ALL,
    });
    setRows([]);
    setPage(1);
    setNotice("");
    setError("");
  }

  function activeSnapshot(): Snapshot | null {
    if (view === "exportacion") {
      return snapshot;
    }

    if (rows.length === 0) {
      return null;
    }

    return {
      version: 1,
      title:
        VIEWS.find((item) => item.id === view)
          ?.title ?? "Reporte",
      view,
      generatedAt: new Date().toISOString(),
      filters: appliedFilters,
      rows,
      requestedTeachers: requested,
      completedTeachers: completed,
    };
  }

  function exportCsv() {
    const current = activeSnapshot();

    if (!current) {
      setNotice(
        "No existe un reporte con registros para exportar."
      );
      return;
    }

    downloadBlob(
      ["\uFEFF", rowsToCsv(current.rows)],
      "text/csv;charset=utf-8",
      `reporte-${current.view}.csv`
    );
  }

  function exportExcel() {
    const current = activeSnapshot();

    if (!current) {
      setNotice(
        "No existe un reporte con registros para exportar."
      );
      return;
    }

    downloadBlob(
      [
        "\uFEFF",
        reportHtml(current, {
          ...exportSettings,
          summary: false,
          filters: false,
        }),
      ],
      "application/vnd.ms-excel;charset=utf-8",
      `reporte-${current.view}.xls`
    );
  }

  function printReport() {
    const current = activeSnapshot();

    if (!current) {
      setNotice(
        "No existe un reporte con registros para imprimir."
      );
      return;
    }

    const popup = window.open(
      "",
      "_blank",
      "noopener,noreferrer"
    );

    if (!popup) {
      setNotice(
        "El navegador bloqueÃ³ la ventana de impresiÃ³n."
      );
      return;
    }

    popup.document.open();
    popup.document.write(
      reportHtml(current, exportSettings)
    );
    popup.document.close();
    popup.focus();

    window.setTimeout(() => {
      popup.print();
    }, 250);
  }

  function selectView(next: ViewMode) {
    setView(next);
    router.replace(
      `/supervisor/reportes/legacy?view=${next}`,
      { scroll: false }
    );
    setRows([]);
    setPage(1);
    setNotice("");
    setError("");

    if (
      next === "curso" &&
      filters.course === ALL
    ) {
      setFilters((current) => ({
        ...current,
        course: courseNames[0] ?? ALL,
        teacherId: ALL,
      }));
    }

    if (next === "departamento") {
      setFilters((current) => ({
        ...current,
        department:
          current.department === ALL
            ? departments[0] ?? ALL
            : current.department,
        teacherId: ALL,
      }));
    }

    if (next === "docente") {
      setFilters((current) => ({
        ...current,
        teacherId:
          current.teacherId === ALL
            ? teachers[0]
              ? String(teachers[0].id)
              : ""
            : current.teacherId,
      }));
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Preparando mÃ³dulo de reportes"
        description="Consultando docentes, cursos, semestres, horarios e indicadores."
        fullHeight
      />
    );
  }

  if (
    error &&
    teachers.length === 0 &&
    courses.length === 0
  ) {
    return (
      <ErrorState
        title="No se pudo preparar el mÃ³dulo"
        description={error}
        retryText="Reintentar"
        onRetry={() => void loadBase()}
        fullHeight
      />
    );
  }

  const currentView =
    VIEWS.find((item) => item.id === view) ??
    VIEWS[0];

  return (
    <div
      className={`${styles.page} admin-dashboard-animated`}
    >
      <PageHeader
        eyebrow="Reportes institucionales"
        title={currentView.title}
        description={currentView.description}
        badge={
          <span className={styles.badge}>
            <span />
            Datos reales disponibles
          </span>
        }
        actions={
          view !== "modulo" ? (
            <div className={styles.headerActions}>
              <Button
                type="button"
                variant="outline"
                onClick={exportCsv}
                disabled={
                  view !== "exportacion" &&
                  rows.length === 0
                }
              >
                CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={exportExcel}
                disabled={
                  view !== "exportacion" &&
                  rows.length === 0
                }
              >
                Excel
              </Button>
              <Button
                type="button"
                onClick={printReport}
                disabled={
                  view !== "exportacion" &&
                  rows.length === 0
                }
              >
                Imprimir / PDF
              </Button>
            </div>
          ) : null
        }
      />

      <nav
        className={styles.tabs}
        aria-label="Tipos de reporte"
      >
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.id === view
                ? styles.activeTab
                : ""
            }
            onClick={() =>
              selectView(item.id)
            }
          >
            {item.id === "modulo"
              ? "MÃ³dulo"
              : item.id === "inasistencias"
                ? "Inasistencias"
                : item.id === "departamento"
                  ? "Departamento"
                  : item.id === "exportacion"
                    ? "ExportaciÃ³n"
                    : item.title.replace(
                        "Reporte ",
                        ""
                      )}
          </button>
        ))}
      </nav>

      {view === "modulo" ? (
        <Overview
          teachers={teachers}
          courses={courses}
          semesters={semesters}
          schedules={schedules}
          dashboardStats={dashboardStats}
          sources={sources}
          snapshot={snapshot}
          selectView={selectView}
        />
      ) : view === "exportacion" ? (
        <ExportCenter
          snapshot={snapshot}
          settings={exportSettings}
          setSettings={setExportSettings}
          exportCsv={exportCsv}
          exportExcel={exportExcel}
          printReport={printReport}
          notice={notice}
        />
      ) : (
        <>
          <section className={styles.filtersCard}>
            <header className={styles.cardHeader}>
              <div>
                <h2>Filtros del reporte</h2>
                <p>
                  La consulta se aplica sobre la
                  ventana histÃ³rica disponible por
                  docente.
                </p>
              </div>
              <span className={styles.targetBadge}>
                {targets.length} docente(s)
              </span>
            </header>

            <div className={styles.filtersGrid}>
              <Field label="Semestre">
                <select
                  value={filters.semesterId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      semesterId:
                        event.target.value,
                    }))
                  }
                >
                  <option value={ALL}>
                    Todos
                  </option>
                  {semesters.map((semester) => (
                    <option
                      key={String(semester.id)}
                      value={String(semester.id)}
                    >
                      {semester.codigo ?? "Sin cÃ³digo"}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Docente">
                <select
                  value={filters.teacherId}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      teacherId:
                        event.target.value,
                    }))
                  }
                >
                  {view !== "docente" && (
                    <option value={ALL}>
                      Todos
                    </option>
                  )}
                  {teachers.map((teacher) => (
                    <option
                      key={String(teacher.id)}
                      value={String(teacher.id)}
                    >
                      {teacherName(teacher)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Curso">
                <select
                  value={filters.course}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      course: event.target.value,
                    }))
                  }
                >
                  {view !== "curso" && (
                    <option value={ALL}>
                      Todos
                    </option>
                  )}
                  {courseNames.map((course) => (
                    <option
                      key={course}
                      value={course}
                    >
                      {course}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Departamento">
                <select
                  value={filters.department}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      department:
                        event.target.value,
                      teacherId:
                        view === "departamento"
                          ? ALL
                          : current.teacherId,
                    }))
                  }
                >
                  {view !== "departamento" && (
                    <option value={ALL}>
                      Todos
                    </option>
                  )}
                  {departments.map((department) => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Estado">
                <select
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value={ALL}>
                    Todos
                  </option>
                  <option value="ASISTENCIA">
                    Asistencia
                  </option>
                  <option value="TARDANZA">
                    Tardanza
                  </option>
                  <option value="INASISTENCIA">
                    Inasistencia
                  </option>
                  <option value="OTRO">
                    Otros
                  </option>
                </select>
              </Field>

              <Field label="Fecha inicial">
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      startDate:
                        event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Fecha final">
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      endDate:
                        event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className={styles.filterActions}>
              <Button
                type="button"
                onClick={() => void generate()}
                disabled={
                  generating || targets.length === 0
                }
              >
                {generating
                  ? "Generando..."
                  : "Generar reporte"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
              <span>
                {requested > 0
                  ? `${completed}/${requested} historiales respondieron`
                  : "Reporte pendiente"}
              </span>
            </div>

            {error && (
              <p className={styles.error}>
                {error}
              </p>
            )}
            {notice && (
              <p className={styles.notice}>
                {notice}
              </p>
            )}
          </section>

          <section className={styles.metricsGrid}>
            <Metric
              label="Registros"
              value={String(metrics.total)}
              tone="blue"
            />
            <Metric
              label="Asistencias"
              value={String(metrics.attendance)}
              tone="green"
            />
            <Metric
              label="Tardanzas"
              value={String(metrics.late)}
              tone="amber"
            />
            <Metric
              label="Inasistencias"
              value={String(metrics.absent)}
              tone="red"
            />
            <Metric
              label="Cumplimiento"
              value={complianceLabel(
                metrics.compliance
              )}
              tone="purple"
            />
          </section>

          {view === "docente" ? (
            <TeacherView
              teachers={teachers}
              filters={appliedFilters}
              rows={rows}
              metrics={metrics}
              groups={groups}
            />
          ) : view === "curso" ? (
            <CourseView
              course={appliedFilters.course}
              rows={rows}
              daily={daily}
              maxDaily={maxDaily}
              schedules={schedules}
            />
          ) : view === "departamento" ? (
            <DepartmentView
              groups={groups}
              maxGroup={maxGroup}
            />
          ) : (
            <GenericView
              view={view}
              rows={visibleRows}
              allRows={rows}
              daily={daily}
              maxDaily={maxDaily}
              page={currentPage}
              totalPages={totalPages}
              setPage={setPage}
            />
          )}
        </>
      )}

      <section className={styles.scopeNote}>
        <strong>Alcance actual</strong>
        <p>
          Vista anterior conservada durante la migracion. Ahora existe la ruta agregada
          <code>/api/reportes</code>. Cada informe
          se construye con directorio, catÃ¡logos,
          horarios e historiales reales. La API
          personal entrega como mÃ¡ximo 30 ingresos
          institucionales y 30 registros de curso
          por docente.
        </p>
      </section>
    </div>
  );
}

function Overview({
  teachers,
  courses,
  semesters,
  schedules,
  dashboardStats,
  sources,
  snapshot,
  selectView,
}: {
  teachers: Teacher[];
  courses: Course[];
  semesters: Semester[];
  schedules: Schedule[];
  dashboardStats: Record<string, unknown>;
  sources: SourceState[];
  snapshot: Snapshot | null;
  selectView: (view: ViewMode) => void;
}) {
  const cards = VIEWS.filter(
    (item) => item.id !== "modulo"
  );

  return (
    <>
      <section className={styles.metricsGrid}>
        <Metric
          label="Docentes activos"
          value={String(teachers.length)}
          tone="blue"
        />
        <Metric
          label="Cursos activos"
          value={String(courses.length)}
          tone="green"
        />
        <Metric
          label="Semestres"
          value={String(semesters.length)}
          tone="amber"
        />
        <Metric
          label="Horarios"
          value={String(schedules.length)}
          tone="purple"
        />
        <Metric
          label="Registros validados"
          value={String(
            Number(
              dashboardStats.registrosValidados ??
                0
            )
          )}
          tone="red"
        />
      </section>

      <section className={styles.cardGrid}>
        {cards.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.accessCard}
            onClick={() => selectView(item.id)}
          >
            <span
              className={`${styles.accessIcon} ${
                styles[`icon${item.id}`]
              }`}
            >
              <ViewIcon view={item.id} />
            </span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span>Abrir reporte</span>
            </div>
          </button>
        ))}
      </section>

      <section className={styles.overviewBottom}>
        <article className={styles.panel}>
          <header className={styles.cardHeader}>
            <div>
              <h2>Ãšltimo reporte generado</h2>
              <p>
                InstantÃ¡nea conservada durante la
                sesiÃ³n.
              </p>
            </div>
          </header>
          {snapshot ? (
            <div className={styles.panelBody}>
              <strong>{snapshot.title}</strong>
              <p>
                {new Date(
                  snapshot.generatedAt
                ).toLocaleString("es-PE")}
              </p>
              <span>
                {snapshot.rows.length} registro(s) Â·{" "}
                {snapshot.completedTeachers}/
                {snapshot.requestedTeachers} historiales
              </span>
              <Button
                type="button"
                onClick={() =>
                  selectView("exportacion")
                }
              >
                Exportar nuevamente
              </Button>
            </div>
          ) : (
            <p className={styles.empty}>
              TodavÃ­a no se generÃ³ un reporte.
            </p>
          )}
        </article>

        <article className={styles.panel}>
          <header className={styles.cardHeader}>
            <div>
              <h2>Fuentes disponibles</h2>
              <p>
                Estado de las consultas del mÃ³dulo.
              </p>
            </div>
          </header>
          <div className={styles.sourceList}>
            {sources.map((source) => (
              <div key={source.key}>
                <span
                  className={
                    source.ok
                      ? styles.sourceOk
                      : styles.sourceWarning
                  }
                />
                <div>
                  <strong>{source.label}</strong>
                  <p>{source.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function GenericView({
  view,
  rows,
  allRows,
  daily,
  maxDaily,
  page,
  totalPages,
  setPage,
}: {
  view: ViewMode;
  rows: ReportRow[];
  allRows: ReportRow[];
  daily: Array<{
    key: string;
    label: string;
    total: number;
  }>;
  maxDaily: number;
  page: number;
  totalPages: number;
  setPage: (
    value:
      | number
      | ((current: number) => number)
  ) => void;
}) {
  return (
    <section className={styles.contentGrid}>
      <article className={styles.panel}>
        <header className={styles.cardHeader}>
          <div>
            <h2>
              {view === "inasistencias"
                ? "Tabla de inasistencias"
                : view === "rango"
                  ? "Resultados filtrados"
                  : "Tabla de registros"}
            </h2>
            <p>
              Detalle de los registros incluidos.
            </p>
          </div>
          <span className={styles.targetBadge}>
            {allRows.length} fila(s)
          </span>
        </header>
        <ReportTable rows={rows} />
        <footer className={styles.pagination}>
          <span>
            PÃ¡gina <strong>{page}</strong> de{" "}
            <strong>{totalPages}</strong>
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(1, current - 1)
                )
              }
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
                  )
                )
              }
            >
              Siguiente
            </button>
          </div>
        </footer>
      </article>

      <aside className={styles.sideColumn}>
        <article className={styles.panel}>
          <header className={styles.sideHeader}>
            <h2>EvoluciÃ³n diaria</h2>
            <p>Volumen de registros por fecha.</p>
          </header>
          <DailyChart
            daily={daily}
            max={maxDaily}
          />
        </article>

        <article className={styles.panel}>
          <header className={styles.sideHeader}>
            <h2>ObservaciÃ³n del Supervisor</h2>
          </header>
          <div className={styles.analysis}>
            <p>
              Los estados se muestran tal como los
              devuelve la API. El backend actual no
              entrega justificaciones; por eso las
              inasistencias no se clasifican como
              justificadas o no justificadas.
            </p>
          </div>
        </article>
      </aside>
    </section>
  );
}

function TeacherView({
  teachers,
  filters,
  rows,
  metrics,
  groups,
}: {
  teachers: Teacher[];
  filters: Filters;
  rows: ReportRow[];
  metrics: ReturnType<typeof calculateMetrics>;
  groups: Array<{
    key: string;
    label: string;
    secondary: string;
    total: number;
    attendance: number;
    late: number;
    absent: number;
    compliance: number | null;
  }>;
}) {
  const teacher =
    teachers.find(
      (item) =>
        String(item.id) === filters.teacherId
    ) ?? null;

  const courseMap = new Map<
    string,
    ReportRow[]
  >();

  rows
    .filter((row) => row.scope === "Curso")
    .forEach((row) => {
      courseMap.set(row.course, [
        ...(courseMap.get(row.course) ?? []),
        row,
      ]);
    });

  const courseGroups = Array.from(
    courseMap.entries()
  ).map(([key, values]) => ({
    key,
    label: key,
    secondary: `${values.length} registro(s)`,
    ...calculateMetrics(values),
  }));

  return (
    <section className={styles.teacherGrid}>
      <article className={styles.profile}>
        <span className={styles.avatar}>
          <ViewIcon view="docente" />
        </span>
        <h2>
          {teacher
            ? teacherName(teacher)
            : "Seleccione un docente"}
        </h2>
        <p>{teacher?.codigo ?? "â€”"}</p>
        <span>
          {teacher?.departamento ??
            "Departamento no informado"}
        </span>
      </article>

      <article className={styles.panel}>
        <header className={styles.sideHeader}>
          <h2>GrÃ¡fico de cumplimiento</h2>
          <p>Estados acadÃ©micos explÃ­citos.</p>
        </header>
        <div className={styles.gaugeBody}>
          <div
            className={styles.gauge}
            style={{
              background: `conic-gradient(#16a34a 0 ${
                metrics.compliance ?? 0
              }%, #f59e0b ${
                metrics.compliance ?? 0
              }% ${
                Math.min(
                  100,
                  (metrics.compliance ?? 0) + 5
                )
              }%, #dc2626 ${
                Math.min(
                  100,
                  (metrics.compliance ?? 0) + 5
                )
              }% 100%)`,
            }}
          >
            <span>
              <strong>
                {complianceLabel(
                  metrics.compliance
                )}
              </strong>
              <small>cumplimiento</small>
            </span>
          </div>
        </div>
      </article>

      <article className={styles.panel}>
        <header className={styles.cardHeader}>
          <div>
            <h2>Detalle por curso</h2>
            <p>
              Resumen del docente por curso visible.
            </p>
          </div>
        </header>
        <GroupTable
          groups={
            courseGroups.length > 0
              ? courseGroups
              : groups
          }
          firstColumn="Curso"
        />
      </article>
    </section>
  );
}

function CourseView({
  course,
  rows,
  daily,
  maxDaily,
  schedules,
}: {
  course: string;
  rows: ReportRow[];
  daily: Array<{
    key: string;
    label: string;
    total: number;
  }>;
  maxDaily: number;
  schedules: Schedule[];
}) {
  const related = schedules.filter(
    (schedule) =>
      course === ALL ||
      clean(schedule.curso) === course
  );

  return (
    <section className={styles.contentGrid}>
      <article className={styles.panel}>
        <header className={styles.cardHeader}>
          <div>
            <h2>
              {course === ALL
                ? "Curso seleccionado"
                : course}
            </h2>
            <p>
              Sesiones visibles dentro de la ventana
              consultada.
            </p>
          </div>
          <span className={styles.targetBadge}>
            {related.length} horario(s)
          </span>
        </header>
        <ReportTable rows={rows.slice(0, 12)} />
      </article>

      <aside className={styles.sideColumn}>
        <article className={styles.panel}>
          <header className={styles.sideHeader}>
            <h2>Cumplimiento por fecha</h2>
            <p>Volumen diario del curso.</p>
          </header>
          <DailyChart
            daily={daily}
            max={maxDaily}
          />
        </article>

        <article className={styles.panel}>
          <header className={styles.sideHeader}>
            <h2>ProgramaciÃ³n disponible</h2>
          </header>
          <div className={styles.scheduleList}>
            {related.slice(0, 8).map((schedule) => (
              <div key={String(schedule.id)}>
                <strong>
                  Aula {schedule.aula ?? "â€”"}
                </strong>
                <span>
                  DÃ­a {schedule.dia_semana ?? "â€”"} Â·{" "}
                  {formatTime(
                    schedule.hora_inicio
                  ).slice(0, 5)}{" "}
                  -{" "}
                  {formatTime(
                    schedule.hora_fin
                  ).slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </article>
      </aside>
    </section>
  );
}

function DepartmentView({
  groups,
  maxGroup,
}: {
  groups: Array<{
    key: string;
    label: string;
    secondary: string;
    total: number;
    attendance: number;
    late: number;
    absent: number;
    compliance: number | null;
  }>;
  maxGroup: number;
}) {
  return (
    <section className={styles.contentGrid}>
      <article className={styles.panel}>
        <header className={styles.cardHeader}>
          <div>
            <h2>
              GrÃ¡fico comparativo por departamento
            </h2>
            <p>
              Asistencias, tardanzas e inasistencias.
            </p>
          </div>
        </header>
        <div className={styles.departmentBars}>
          {groups.map((group) => (
            <div key={group.key}>
              <div>
                <strong>{group.label}</strong>
                <span>{group.secondary}</span>
              </div>
              <section>
                <i>
                  <i
                    className={styles.greenBar}
                    style={{
                      width: `${Math.max(
                        2,
                        (group.attendance /
                          maxGroup) *
                          100
                      )}%`,
                    }}
                  />
                </i>
                <i>
                  <i
                    className={styles.amberBar}
                    style={{
                      width: `${Math.max(
                        2,
                        (group.late / maxGroup) *
                          100
                      )}%`,
                    }}
                  />
                </i>
                <i>
                  <i
                    className={styles.redBar}
                    style={{
                      width: `${Math.max(
                        2,
                        (group.absent / maxGroup) *
                          100
                      )}%`,
                    }}
                  />
                </i>
              </section>
              <b>
                {complianceLabel(
                  group.compliance
                )}
              </b>
            </div>
          ))}
        </div>
      </article>

      <aside className={styles.sideColumn}>
        <article className={styles.panel}>
          <header className={styles.sideHeader}>
            <h2>Detalle institucional</h2>
          </header>
          <GroupTable
            groups={groups}
            firstColumn="Departamento"
          />
        </article>
      </aside>
    </section>
  );
}

function ReportTable({
  rows,
}: {
  rows: ReportRow[];
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Docente</th>
            <th>Curso / registro</th>
            <th>Aula</th>
            <th>Semestre</th>
            <th>Hora</th>
            <th>Estado</th>
            <th>Tipo</th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <tr key={row.id}>
                <td className={styles.numeric}>
                  {row.dateLabel}
                </td>
                <td>
                  <strong>{row.teacher}</strong>
                  <span>
                    {row.teacherCode} Â·{" "}
                    {row.department}
                  </span>
                </td>
                <td>
                  <strong>{row.course}</strong>
                </td>
                <td>{row.room}</td>
                <td>{row.semester}</td>
                <td className={styles.numeric}>
                  {row.time}
                </td>
                <td>
                  <StatusBadge row={row} />
                </td>
                <td>
                  <span className={styles.scope}>
                    {row.scope}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={8}
                className={styles.emptyCell}
              >
                Genere un reporte para mostrar
                resultados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function GroupTable({
  groups,
  firstColumn,
}: {
  groups: Array<{
    key: string;
    label: string;
    secondary: string;
    total: number;
    attendance: number;
    late: number;
    absent: number;
    compliance: number | null;
  }>;
  firstColumn: string;
}) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.groupTable}>
        <thead>
          <tr>
            <th>{firstColumn}</th>
            <th>Total</th>
            <th>Asist.</th>
            <th>Tard.</th>
            <th>Inas.</th>
            <th>Cumpl.</th>
          </tr>
        </thead>
        <tbody>
          {groups.length > 0 ? (
            groups.map((group) => (
              <tr key={group.key}>
                <td>
                  <strong>{group.label}</strong>
                  <span>{group.secondary}</span>
                </td>
                <td>{group.total}</td>
                <td>{group.attendance}</td>
                <td>{group.late}</td>
                <td>{group.absent}</td>
                <td>
                  {complianceLabel(
                    group.compliance
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className={styles.emptyCell}
              >
                Sin grupos para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DailyChart({
  daily,
  max,
}: {
  daily: Array<{
    key: string;
    label: string;
    total: number;
  }>;
  max: number;
}) {
  return (
    <div className={styles.dailyChart}>
      {daily.length > 0 ? (
        daily.map((item) => (
          <div key={item.key}>
            <strong>{item.total}</strong>
            <span>
              <span
                style={{
                  height: `${Math.max(
                    4,
                    (item.total / max) * 100
                  )}%`,
                }}
              />
            </span>
            <small>
              {item.label.slice(0, 5)}
            </small>
          </div>
        ))
      ) : (
        <p className={styles.empty}>
          Sin datos para representar.
        </p>
      )}
    </div>
  );
}

function ExportCenter({
  snapshot,
  settings,
  setSettings,
  exportCsv,
  exportExcel,
  printReport,
  notice,
}: {
  snapshot: Snapshot | null;
  settings: ExportSettings;
  setSettings: (
    value:
      | ExportSettings
      | ((
          current: ExportSettings
        ) => ExportSettings)
  ) => void;
  exportCsv: () => void;
  exportExcel: () => void;
  printReport: () => void;
  notice: string;
}) {
  const metrics = calculateMetrics(
    snapshot?.rows ?? []
  );

  return (
    <>
      <section className={styles.exportCards}>
        <article>
          <strong>PDF</strong>
          <div>
            <h2>Imprimir / guardar PDF</h2>
            <p>
              Usa la vista de impresiÃ³n del navegador.
            </p>
          </div>
        </article>
        <article>
          <strong>XLS</strong>
          <div>
            <h2>Excel compatible</h2>
            <p>
              Tabla HTML con extensiÃ³n .xls.
            </p>
          </div>
        </article>
        <article>
          <strong>CSV</strong>
          <div>
            <h2>Datos tabulares</h2>
            <p>
              Archivo UTF-8 para anÃ¡lisis posterior.
            </p>
          </div>
        </article>
        <article>
          <h2>Estado</h2>
          <p>
            {snapshot
              ? `${snapshot.rows.length} registro(s) disponibles`
              : "Sin reporte generado"}
          </p>
        </article>
      </section>

      <section className={styles.exportGrid}>
        <article className={styles.panel}>
          <header className={styles.cardHeader}>
            <div>
              <h2>
                ConfiguraciÃ³n de exportaciÃ³n
              </h2>
              <p>
                Ajustes para la vista imprimible.
              </p>
            </div>
          </header>

          <div className={styles.exportForm}>
            <Field label="OrientaciÃ³n">
              <select
                value={settings.orientation}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    orientation:
                      event.target.value as
                        | "landscape"
                        | "portrait",
                  }))
                }
              >
                <option value="landscape">
                  Horizontal
                </option>
                <option value="portrait">
                  Vertical
                </option>
              </select>
            </Field>

            <Field label="Papel">
              <select
                value={settings.paper}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    paper:
                      event.target.value as
                        | "A4"
                        | "Letter",
                  }))
                }
              >
                <option value="A4">A4</option>
                <option value="Letter">
                  Carta
                </option>
              </select>
            </Field>

            <label className={styles.toggle}>
              <div>
                <strong>Incluir resumen</strong>
                <span>MÃ©tricas principales.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.summary}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    summary:
                      event.target.checked,
                  }))
                }
              />
            </label>

            <label className={styles.toggle}>
              <div>
                <strong>Incluir filtros</strong>
                <span>Criterios utilizados.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.filters}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    filters:
                      event.target.checked,
                  }))
                }
              />
            </label>
          </div>

          <div className={styles.exportActions}>
            <Button
              type="button"
              onClick={printReport}
              disabled={!snapshot}
            >
              Imprimir / PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportExcel}
              disabled={!snapshot}
            >
              Exportar Excel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              disabled={!snapshot}
            >
              Descargar CSV
            </Button>
          </div>

          {notice && (
            <p className={styles.notice}>
              {notice}
            </p>
          )}
        </article>

        <article className={styles.panel}>
          <header className={styles.cardHeader}>
            <div>
              <h2>Vista previa</h2>
              <p>
                Resumen del Ãºltimo reporte generado.
              </p>
            </div>
          </header>

          {snapshot ? (
            <div className={styles.preview}>
              <header>
                <strong>UNSAAC</strong>
                <span>
                  Control de Asistencia Docente
                </span>
              </header>
              <h3>{snapshot.title}</h3>
              <p>
                {new Date(
                  snapshot.generatedAt
                ).toLocaleString("es-PE")}
              </p>
              <div>
                <span>
                  <b>{metrics.total}</b>
                  Registros
                </span>
                <span>
                  <b>{metrics.attendance}</b>
                  Asistencias
                </span>
                <span>
                  <b>{metrics.late}</b>
                  Tardanzas
                </span>
                <span>
                  <b>{metrics.absent}</b>
                  Inasistencias
                </span>
              </div>
              {snapshot.rows
                .slice(0, 5)
                .map((row) => (
                  <section key={row.id}>
                    <span>{row.teacher}</span>
                    <span>{row.course}</span>
                    <span>{row.dateLabel}</span>
                    <span>{row.statusLabel}</span>
                  </section>
                ))}
            </div>
          ) : (
            <p className={styles.empty}>
              No existe un reporte para previsualizar.
            </p>
          )}
        </article>
      </section>
    </>
  );
}
