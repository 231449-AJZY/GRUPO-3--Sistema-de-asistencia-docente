"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

const REFRESH_INTERVAL_MS = 30_000;
const LIMA_TIME_ZONE =
  "America/Lima";
const PAGE_SIZE = 8;

type Severity =
  | "Alta"
  | "Media";

type Evidence =
  | "Confirmada"
  | "Observacion";

type InconsistencyType =
  | "TARDANZA_REGISTRADA"
  | "AUSENCIA_EXPLICITA"
  | "BIOMETRIA_PENDIENTE"
  | "MARCACION_DUPLICADA"
  | "PROGRAMACION_INCOMPLETA"
  | "SESION_SIN_INGRESO_VISIBLE";

interface SessionUser {
  rol?: string;
}

interface AttendanceRecord {
  nombres?: string;
  apellidos?: string;
  docente?: string;
  codigo?: string;
  departamento?: string;
  hora_registro: string;
  estado: string;
}

interface AttendanceTodayResponse {
  fecha?: string;
  registros?: AttendanceRecord[];
  error?: string;
}

interface ScheduleRecord {
  id: number | string;
  docente_id?: number | string;
  curso_id?: number | string;
  semestre_id?: number | string;
  aula?: string;
  dia_semana?: number | string;
  hora_inicio?: string;
  hora_fin?: string;
  activo?: boolean;
  docente_codigo?: string;
  docente?: string;
  departamento?: string;
  curso_codigo?: string;
  curso?: string;
  semestre?: string;
  semestre_activo?: boolean;
}

interface SchedulesResponse {
  horarios?: ScheduleRecord[];
  error?: string;
}

interface TeacherRecord {
  id: number | string;
  codigo?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
  departamento?: string;
  estado_biometrico?: string;
}

interface TeachersResponse {
  docentes?: TeacherRecord[];
  error?: string;
}

interface SupervisorDashboardResponse {
  stats?: {
    docentesMonitoreados?: number | string;
    alertasNuevas?: number | string;
    inconsistencias?: number | string;
    registrosValidados?: number | string;
  };
  error?: string;
}

interface Inconsistency {
  id: string;
  type: InconsistencyType;
  typeLabel: string;
  subject: string;
  code: string;
  department: string;
  date: string;
  time: string;
  severity: Severity;
  evidence: Evidence;
  description: string;
  source: string;
  recommendation: string;
  course?: string;
  room?: string;
}

interface Filters {
  search: string;
  type: string;
  severity: string;
  department: string;
  evidence: string;
}

interface LimaClock {
  day: number;
  minutes: number;
  timeLabel: string;
  dateLabel: string;
}

class InconsistencyRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "InconsistencyRequestError";
    this.status = status;
  }
}

function cleanText(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function normalizeText(
  value: unknown
): string {
  return cleanText(value)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}

function normalizeStatus(
  value: unknown
): string {
  return cleanText(value).toUpperCase();
}

function toNumber(
  value: number | string | null | undefined
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function teacherName(
  value:
    | AttendanceRecord
    | TeacherRecord
): string {
  const names =
    `${value.nombres ?? ""} ${
      value.apellidos ?? ""
    }`.trim();

  return (
    names ||
    ("docente" in value
      ? cleanText(value.docente)
      : "") ||
    "Docente no informado"
  );
}

function timeToMinutes(
  value: string | undefined
): number | null {
  const match =
    cleanText(value).match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function formatTime(
  value: string | undefined
): string {
  return (
    cleanText(value).slice(0, 8) ||
    "—"
  );
}

function formatDate(
  value: string | undefined
): string {
  const normalized =
    cleanText(value).slice(0, 10);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized
    )
  ) {
    return normalized || "—";
  }

  const [
    year,
    month,
    day,
  ] = normalized.split("-");

  return `${day}/${month}/${year}`;
}

function getLimaClock(
  date = new Date()
): LimaClock {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: LIMA_TIME_ZONE,
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(date);

  const weekday =
    parts.find(
      (part) =>
        part.type === "weekday"
    )?.value ?? "Sun";
  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "0000";
  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "00";
  const dayOfMonth =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "00";
  const hour = Number(
    parts.find(
      (part) => part.type === "hour"
    )?.value ?? 0
  );
  const minute = Number(
    parts.find(
      (part) =>
        part.type === "minute"
    )?.value ?? 0
  );

  const dayMap: Record<
    string,
    number
  > = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: dayMap[weekday] ?? 0,
    minutes:
      hour * 60 + minute,
    timeLabel: `${String(
      hour
    ).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}`,
    dateLabel: `${year}-${month}-${dayOfMonth}`,
  };
}

function csvCell(
  value: string | number
): string {
  let text = String(value ?? "");

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(
    /"/g,
    '""'
  )}"`;
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

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | T
      | { error?: string }
      | null;

  if (!response.ok) {
    throw new InconsistencyRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo consultar una fuente de inconsistencias.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

function MetricIcon({
  type,
}: {
  type:
    | "late"
    | "biometric"
    | "duplicate"
    | "schedule"
    | "review";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "late") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="M12 7v6l4 2" />
      </svg>
    );
  }

  if (type === "biometric") {
    return (
      <svg {...common}>
        <circle
          cx="9"
          cy="7"
          r="4"
        />
        <path d="M3 21v-2a6 6 0 0 1 9-5.2" />
        <path d="m17 14 4 4M21 14l-4 4" />
      </svg>
    );
  }

  if (type === "duplicate") {
    return (
      <svg {...common}>
        <rect
          x="7"
          y="7"
          width="13"
          height="13"
          rx="2"
        />
        <path d="M16 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
        <path d="m9 9 9 9" />
      </svg>
    );
  }

  if (type === "schedule") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="4"
          width="18"
          height="17"
          rx="3"
        />
        <path d="M8 2v4M16 2v4M3 9h18" />
        <path d="M8 14h8M8 18h5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  tone:
    | "amber"
    | "red"
    | "orange"
    | "blue";
  icon:
    | "late"
    | "biometric"
    | "duplicate"
    | "schedule"
    | "review";
}) {
  return (
    <article
      className={styles.metricCard}
    >
      <span
        className={`${styles.metricIcon} ${
          styles[`metric${tone}`]
        }`}
      >
        <MetricIcon type={icon} />
      </span>

      <div>
        <p
          className={
            styles.metricTitle
          }
        >
          {title}
        </p>

        <strong
          className={`${styles.metricValue} ${
            styles[`value${tone}`]
          }`}
        >
          {String(value).padStart(
            2,
            "0"
          )}
        </strong>

        <p
          className={
            styles.metricDescription
          }
        >
          {description}
        </p>
      </div>
    </article>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: Severity;
}) {
  return (
    <span
      className={`${styles.severityBadge} ${
        severity === "Alta"
          ? styles.severityHigh
          : styles.severityMedium
      }`}
    >
      {severity}
    </span>
  );
}

function EvidenceBadge({
  evidence,
}: {
  evidence: Evidence;
}) {
  return (
    <span
      className={`${styles.evidenceBadge} ${
        evidence ===
        "Confirmada"
          ? styles.evidenceConfirmed
          : styles.evidenceObservation
      }`}
    >
      <span />
      {evidence}
    </span>
  );
}

const EMPTY_FILTERS: Filters =
  {
    search: "",
    type: "TODOS",
    severity: "TODAS",
    department: "TODOS",
    evidence: "TODAS",
  };

export default function SupervisorInconsistenciesPage() {
  const router = useRouter();

  const [
    attendance,
    setAttendance,
  ] =
    useState<AttendanceTodayResponse | null>(
      null
    );
  const [
    schedulesResponse,
    setSchedulesResponse,
  ] =
    useState<SchedulesResponse | null>(
      null
    );
  const [
    teachersResponse,
    setTeachersResponse,
  ] =
    useState<TeachersResponse | null>(
      null
    );
  const [
    dashboard,
    setDashboard,
  ] =
    useState<SupervisorDashboardResponse | null>(
      null
    );
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState("");
  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(
    null
  );
  const [
    clock,
    setClock,
  ] = useState<LimaClock>(
    () => getLimaClock()
  );
  const [
    draftFilters,
    setDraftFilters,
  ] =
    useState<Filters>(
      EMPTY_FILTERS
    );
  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<Filters>(
      EMPTY_FILTERS
    );
  const [
    selectedId,
    setSelectedId,
  ] = useState("");
  const [page, setPage] =
    useState(1);
  const [notice, setNotice] =
    useState("");

  const loadData =
    useCallback(
      async (
        silent = false
      ) => {
        const storedUser =
          getLegacyUser() as
            | SessionUser
            | null;
        const token =
          getToken();

        if (
          !storedUser ||
          !token ||
          normalizeStatus(
            storedUser.rol
          ) !== "SUPERVISOR"
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const results =
          await Promise.allSettled([
            requestJson<AttendanceTodayResponse>(
              "/asistencia/hoy",
              token
            ),
            requestJson<SchedulesResponse>(
              "/horarios",
              token
            ),
            requestJson<TeachersResponse>(
              "/docentes",
              token
            ),
            requestJson<SupervisorDashboardResponse>(
              "/dashboard/supervisor",
              token
            ),
          ]);

        const rejected =
          results.filter(
            (
              result
            ): result is PromiseRejectedResult =>
              result.status ===
              "rejected"
          );

        const unauthorized =
          rejected.find((result) => {
            const reason =
              result.reason;

            return (
              reason instanceof
                InconsistencyRequestError &&
              [401, 403].includes(
                reason.status
              )
            );
          });

        if (unauthorized) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (
          results[0].status ===
          "fulfilled"
        ) {
          setAttendance(
            results[0].value
          );
        }

        if (
          results[1].status ===
          "fulfilled"
        ) {
          setSchedulesResponse(
            results[1].value
          );
        }

        if (
          results[2].status ===
          "fulfilled"
        ) {
          setTeachersResponse(
            results[2].value
          );
        }

        if (
          results[3].status ===
          "fulfilled"
        ) {
          setDashboard(
            results[3].value
          );
        }

        if (
          results.every(
            (result) =>
              result.status ===
              "rejected"
          )
        ) {
          const firstReason =
            rejected[0]?.reason;

          setError(
            firstReason instanceof Error
              ? firstReason.message
              : "No se pudieron consultar las inconsistencias."
          );
        } else {
          setLastUpdated(
            new Date()
          );
          setClock(
            getLimaClock()
          );
        }

        setLoading(false);
        setRefreshing(false);
      },
      [router]
    );

  useEffect(() => {
    void loadData();

    const refreshTimer =
      window.setInterval(() => {
        void loadData(true);
      }, REFRESH_INTERVAL_MS);

    const clockTimer =
      window.setInterval(() => {
        setClock(
          getLimaClock()
        );
      }, 30_000);

    return () => {
      window.clearInterval(
        refreshTimer
      );
      window.clearInterval(
        clockTimer
      );
    };
  }, [loadData]);

  const records =
    useMemo(
      () =>
        attendance?.registros ??
        [],
      [attendance]
    );

  const teachers =
    useMemo(
      () =>
        teachersResponse?.docentes ??
        [],
      [teachersResponse]
    );

  const schedules =
    useMemo(
      () => {
        const all =
          schedulesResponse
            ?.horarios ?? [];
        const hasActiveSemester =
          all.some(
            (schedule) =>
              schedule.semestre_activo ===
              true
          );

        return all.filter(
          (schedule) =>
            schedule.activo !==
              false &&
            (!hasActiveSemester ||
              schedule.semestre_activo ===
                true)
        );
      },
      [schedulesResponse]
    );

  const inconsistencies =
    useMemo<Inconsistency[]>(
      () => {
        const result: Inconsistency[] =
          [];
        const date =
          attendance?.fecha ??
          clock.dateLabel;
        const dateFormatted =
          formatDate(date);

        const teacherByCode =
          new Map(
            teachers.map(
              (teacher) => [
                normalizeText(
                  teacher.codigo
                ),
                teacher,
              ]
            )
          );

        const markedCodes =
          new Set(
            records
              .map((record) =>
                normalizeText(
                  record.codigo
                )
              )
              .filter(Boolean)
          );

        records.forEach(
          (record, index) => {
            const status =
              normalizeStatus(
                record.estado
              );
            const code =
              cleanText(
                record.codigo
              ) || "—";
            const linkedTeacher =
              teacherByCode.get(
                normalizeText(code)
              );
            const department =
              cleanText(
                record.departamento
              ) ||
              cleanText(
                linkedTeacher?.departamento
              ) ||
              "No informado";

            if (
              status === "TARDANZA"
            ) {
              result.push({
                id: `late-${code}-${record.hora_registro}-${index}`,
                type:
                  "TARDANZA_REGISTRADA",
                typeLabel:
                  "Tardanza registrada",
                subject:
                  teacherName(
                    record
                  ),
                code,
                department,
                date: dateFormatted,
                time: formatTime(
                  record.hora_registro
                ),
                severity: "Media",
                evidence:
                  "Confirmada",
                description:
                  "La marcacion institucional fue almacenada expresamente con estado TARDANZA.",
                source:
                  "GET /api/asistencia/hoy",
                recommendation:
                  "Revisar el horario institucional aplicable y continuar la gestion en el modulo de Alertas cuando corresponda.",
              });
            }

            if (
              status === "AUSENTE"
            ) {
              result.push({
                id: `absence-${code}-${record.hora_registro}-${index}`,
                type:
                  "AUSENCIA_EXPLICITA",
                typeLabel:
                  "Ausencia explicita",
                subject:
                  teacherName(
                    record
                  ),
                code,
                department,
                date: dateFormatted,
                time: formatTime(
                  record.hora_registro
                ),
                severity: "Alta",
                evidence:
                  "Confirmada",
                description:
                  "El registro fue devuelto por el backend con estado AUSENTE; no se calculo por falta de marcacion.",
                source:
                  "GET /api/asistencia/hoy",
                recommendation:
                  "Verificar el registro institucional y revisar si existe una justificacion formal en el flujo correspondiente.",
              });
            }
          }
        );

        const recordsByCode =
          new Map<
            string,
            AttendanceRecord[]
          >();

        records.forEach(
          (record) => {
            const key =
              normalizeText(
                record.codigo
              ) ||
              normalizeText(
                teacherName(
                  record
                )
              );

            if (!key) {
              return;
            }

            const current =
              recordsByCode.get(
                key
              ) ?? [];

            current.push(record);
            recordsByCode.set(
              key,
              current
            );
          }
        );

        recordsByCode.forEach(
          (teacherRecords) => {
            if (
              teacherRecords.length <=
              1
            ) {
              return;
            }

            const first =
              teacherRecords[0];
            const code =
              cleanText(
                first.codigo
              ) || "—";

            result.push({
              id: `duplicate-${normalizeText(
                code
              )}-${date}`,
              type:
                "MARCACION_DUPLICADA",
              typeLabel:
                "Marcacion duplicada",
              subject:
                teacherName(first),
              code,
              department:
                cleanText(
                  first.departamento
                ) ||
                "No informado",
              date: dateFormatted,
              time: teacherRecords
                .map((record) =>
                  formatTime(
                    record.hora_registro
                  )
                )
                .join(" · "),
              severity: "Media",
              evidence:
                "Confirmada",
              description: `La API devolvio ${teacherRecords.length} marcaciones institucionales para el mismo docente en la fecha consultada.`,
              source:
                "GET /api/asistencia/hoy",
              recommendation:
                "Comparar los registros y confirmar si existe un duplicado operativo o una correccion valida.",
            });
          }
        );

        teachers
          .filter(
            (teacher) =>
              teacher.activo !==
                false &&
              normalizeText(
                teacher.estado_biometrico
              ) !== "registrado"
          )
          .forEach(
            (teacher) => {
              result.push({
                id: `biometric-${teacher.id}`,
                type:
                  "BIOMETRIA_PENDIENTE",
                typeLabel:
                  "Biometria pendiente",
                subject:
                  teacherName(
                    teacher
                  ),
                code:
                  cleanText(
                    teacher.codigo
                  ) || "—",
                department:
                  cleanText(
                    teacher.departamento
                  ) ||
                  "No informado",
                date: dateFormatted,
                time: "—",
                severity: "Alta",
                evidence:
                  "Confirmada",
                description:
                  "El docente activo no posee un dato biometrico activo segun su ficha institucional.",
                source:
                  "GET /api/docentes",
                recommendation:
                  "Derivar el enrolamiento al Administrador. El Supervisor mantiene esta pantalla en modo consulta.",
              });
            }
          );

        schedules
          .filter(
            (schedule) =>
              !cleanText(
                schedule.docente
              ) ||
              !cleanText(
                schedule.curso
              ) ||
              !cleanText(
                schedule.aula
              ) ||
              timeToMinutes(
                schedule.hora_inicio
              ) === null ||
              timeToMinutes(
                schedule.hora_fin
              ) === null
          )
          .forEach(
            (schedule) => {
              result.push({
                id: `schedule-${schedule.id}`,
                type:
                  "PROGRAMACION_INCOMPLETA",
                typeLabel:
                  "Programacion incompleta",
                subject:
                  cleanText(
                    schedule.curso
                  ) ||
                  "Curso no informado",
                code:
                  cleanText(
                    schedule.curso_codigo
                  ) || "—",
                department:
                  cleanText(
                    schedule.departamento
                  ) ||
                  "No informado",
                date: dateFormatted,
                time: `${formatTime(
                  schedule.hora_inicio
                )} - ${formatTime(
                  schedule.hora_fin
                )}`,
                severity: "Alta",
                evidence:
                  "Confirmada",
                description:
                  "La programacion activa carece de docente, curso, aula o un rango horario valido.",
                source:
                  "GET /api/horarios",
                recommendation:
                  "Solicitar al Administrador la correccion de la programacion academica.",
                course:
                  cleanText(
                    schedule.curso
                  ) || "No informado",
                room:
                  cleanText(
                    schedule.aula
                  ) || "No informado",
              });
            }
          );

        schedules
          .filter(
            (schedule) => {
              if (
                Number(
                  schedule.dia_semana
                ) !== clock.day
              ) {
                return false;
              }

              const end =
                timeToMinutes(
                  schedule.hora_fin
                );

              if (
                end === null ||
                clock.minutes <
                  end + 30
              ) {
                return false;
              }

              const code =
                normalizeText(
                  schedule.docente_codigo
                );

              return (
                code &&
                !markedCodes.has(
                  code
                )
              );
            }
          )
          .forEach(
            (schedule) => {
              result.push({
                id: `observation-${schedule.id}`,
                type:
                  "SESION_SIN_INGRESO_VISIBLE",
                typeLabel:
                  "Sesion sin ingreso visible",
                subject:
                  cleanText(
                    schedule.docente
                  ) ||
                  "Docente no informado",
                code:
                  cleanText(
                    schedule.docente_codigo
                  ) || "—",
                department:
                  cleanText(
                    schedule.departamento
                  ) ||
                  "No informado",
                date: dateFormatted,
                time: `${formatTime(
                  schedule.hora_inicio
                )} - ${formatTime(
                  schedule.hora_fin
                )}`,
                severity: "Media",
                evidence:
                  "Observacion",
                description:
                  "La sesion programada termino hace mas de 30 minutos y no se observa un ingreso institucional para el docente en la respuesta actual.",
                source:
                  "GET /api/horarios + GET /api/asistencia/hoy",
                recommendation:
                  "Revisar sincronizacion y contexto operativo. Esta observacion no equivale automaticamente a inasistencia.",
                course:
                  cleanText(
                    schedule.curso
                  ) ||
                  "Curso no informado",
                room:
                  cleanText(
                    schedule.aula
                  ) || "No informado",
              });
            }
          );

        return result.sort(
          (first, second) => {
            const severityOrder =
              first.severity ===
              second.severity
                ? 0
                : first.severity ===
                    "Alta"
                  ? -1
                  : 1;

            if (severityOrder) {
              return severityOrder;
            }

            return second.time.localeCompare(
              first.time
            );
          }
        );
      },
      [
        attendance,
        records,
        teachers,
        schedules,
        clock,
      ]
    );

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            inconsistencies
              .map(
                (item) =>
                  item.department
              )
              .filter(
                (value) =>
                  value &&
                  value !==
                    "No informado"
              )
          )
        ).sort((a, b) =>
          a.localeCompare(
            b,
            "es-PE"
          )
        ),
      [inconsistencies]
    );

  const types =
    useMemo(
      () =>
        Array.from(
          new Map(
            inconsistencies.map(
              (item) => [
                item.type,
                item.typeLabel,
              ]
            )
          ).entries()
        ),
      [inconsistencies]
    );

  const filtered =
    useMemo(
      () =>
        inconsistencies.filter(
          (item) => {
            const search =
              normalizeText(
                appliedFilters.search
              );

            const matchesSearch =
              !search ||
              [
                item.typeLabel,
                item.subject,
                item.code,
                item.department,
                item.course,
                item.room,
              ].some((value) =>
                normalizeText(
                  value
                ).includes(search)
              );

            return (
              matchesSearch &&
              (appliedFilters.type ===
                "TODOS" ||
                item.type ===
                  appliedFilters.type) &&
              (appliedFilters.severity ===
                "TODAS" ||
                item.severity ===
                  appliedFilters.severity) &&
              (appliedFilters.department ===
                "TODOS" ||
                item.department ===
                  appliedFilters.department) &&
              (appliedFilters.evidence ===
                "TODAS" ||
                item.evidence ===
                  appliedFilters.evidence)
            );
          }
        ),
      [
        inconsistencies,
        appliedFilters,
      ]
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
          PAGE_SIZE
      )
    );

  const currentPage =
    Math.min(page, totalPages);

  const paginated =
    filtered.slice(
      (currentPage - 1) *
        PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

  const selected =
    inconsistencies.find(
      (item) =>
        item.id === selectedId
    ) ??
    filtered[0] ??
    inconsistencies[0] ??
    null;

  useEffect(() => {
    if (
      selected &&
      selected.id !==
        selectedId
    ) {
      setSelectedId(
        selected.id
      );
    }
  }, [selected, selectedId]);

  const tardinessCount =
    inconsistencies.filter(
      (item) =>
        item.type ===
        "TARDANZA_REGISTRADA"
    ).length;

  const biometricCount =
    inconsistencies.filter(
      (item) =>
        item.type ===
        "BIOMETRIA_PENDIENTE"
    ).length;

  const duplicateCount =
    inconsistencies.filter(
      (item) =>
        item.type ===
        "MARCACION_DUPLICADA"
    ).length;

  const scheduleCount =
    inconsistencies.filter(
      (item) =>
        item.type ===
        "PROGRAMACION_INCOMPLETA"
    ).length;

  const observationCount =
    inconsistencies.filter(
      (item) =>
        item.evidence ===
        "Observacion"
    ).length;

  const aggregatedGap =
    toNumber(
      dashboard?.stats
        ?.inconsistencias
    );

  function applyFilters() {
    setAppliedFilters({
      ...draftFilters,
      search:
        draftFilters.search.trim(),
    });
    setPage(1);
  }

  function clearFilters() {
    setDraftFilters(
      EMPTY_FILTERS
    );
    setAppliedFilters(
      EMPTY_FILTERS
    );
    setPage(1);
  }

  function exportCsv() {
    const rows = [
      [
        "Tipo",
        "Docente o curso",
        "Codigo",
        "Departamento",
        "Fecha",
        "Hora",
        "Gravedad",
        "Evidencia",
        "Descripcion",
        "Fuente",
        "Recomendacion",
      ],
      ...filtered.map(
        (item) => [
          item.typeLabel,
          item.subject,
          item.code,
          item.department,
          item.date,
          item.time,
          item.severity,
          item.evidence,
          item.description,
          item.source,
          item.recommendation,
        ]
      ),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) =>
            csvCell(value)
          )
          .join(";")
      )
      .join("\r\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8",
      }
    );
    const url =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      `inconsistencias-supervisor-${clock.dateLabel}.csv`;
    document.body.appendChild(
      anchor
    );
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function copyDetail() {
    if (!selected) {
      return;
    }

    const text = [
      `Tipo: ${selected.typeLabel}`,
      `Sujeto: ${selected.subject}`,
      `Codigo: ${selected.code}`,
      `Departamento: ${selected.department}`,
      `Fecha: ${selected.date}`,
      `Hora: ${selected.time}`,
      `Gravedad: ${selected.severity}`,
      `Evidencia: ${selected.evidence}`,
      `Descripcion: ${selected.description}`,
      `Fuente: ${selected.source}`,
      `Recomendacion: ${selected.recommendation}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(
        text
      );
      setNotice(
        "Detalle copiado al portapapeles."
      );
      window.setTimeout(
        () => setNotice(""),
        2200
      );
    } catch {
      setNotice(
        "No se pudo copiar el detalle."
      );
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Cargando inconsistencias detectadas"
        description="Contrastando marcaciones institucionales, docentes activos y programacion academica."
        fullHeight
      />
    );
  }

  if (
    error &&
    !attendance &&
    !schedulesResponse &&
    !teachersResponse &&
    !dashboard
  ) {
    return (
      <ErrorState
        title="No se pudieron cargar las inconsistencias"
        description={error}
        retryText="Reintentar"
        onRetry={() =>
          void loadData()
        }
        fullHeight
      />
    );
  }

  return (
    <div
      className={`${styles.page} admin-dashboard-animated`}
    >
      <PageHeader
        eyebrow="Control y revision"
        title="Inconsistencias detectadas"
        description="Consolidado verificable de incidencias institucionales, datos biometricos pendientes y observaciones de programacion."
        badge={
          <span
            className={
              styles.reviewBadge
            }
          >
            <span />
            Revision activa
          </span>
        }
        actions={
          <div
            className={
              styles.headerActions
            }
          >
            <span
              className={
                styles.updateLabel
              }
            >
              Actualizado:{" "}
              <strong>
                {lastUpdated
                  ? new Intl.DateTimeFormat(
                      "es-PE",
                      {
                        timeZone:
                          LIMA_TIME_ZONE,
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                        second:
                          "2-digit",
                        hour12: false,
                      }
                    ).format(
                      lastUpdated
                    )
                  : "—"}
              </strong>
            </span>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void loadData(
                  true
                )
              }
              disabled={refreshing}
            >
              {refreshing
                ? "Actualizando..."
                : "Actualizar"}
            </Button>

            <Button
              type="button"
              onClick={exportCsv}
            >
              Exportar CSV
            </Button>
          </div>
        }
      />

      <section
        className={
          styles.metricsGrid
        }
      >
        <MetricCard
          title="Tardanzas registradas"
          value={tardinessCount}
          description="Estados TARDANZA confirmados por la API"
          tone="amber"
          icon="late"
        />

        <MetricCard
          title="Biometria pendiente"
          value={biometricCount}
          description="Docentes activos sin dato biometrico vigente"
          tone="red"
          icon="biometric"
        />

        <MetricCard
          title="Marcaciones duplicadas"
          value={duplicateCount}
          description="Mas de un ingreso institucional por docente"
          tone="orange"
          icon="duplicate"
        />

        <MetricCard
          title="Programacion incompleta"
          value={scheduleCount}
          description="Horarios activos con datos obligatorios ausentes"
          tone="red"
          icon="schedule"
        />

        <MetricCard
          title="Observaciones por revisar"
          value={observationCount}
          description={`${aggregatedGap} brecha(s) agregada(s) reportadas por el dashboard`}
          tone="blue"
          icon="review"
        />
      </section>

      <section
        className={
          styles.filtersCard
        }
      >
        <header
          className={
            styles.cardHeader
          }
        >
          <div>
            <h2>
              Filtros de revision
            </h2>
            <p>
              Consulte por tipo, gravedad,
              departamento y nivel de
              evidencia.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.clearButton
            }
            onClick={clearFilters}
          >
            Limpiar filtros
          </button>
        </header>

        <div
          className={
            styles.filtersGrid
          }
        >
          <label
            className={
              styles.filterField
            }
          >
            <span>Buscar</span>
            <input
              type="search"
              placeholder="Docente, codigo o curso"
              value={
                draftFilters.search
              }
              onChange={(event) =>
                setDraftFilters(
                  (current) => ({
                    ...current,
                    search:
                      event.target
                        .value,
                  })
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  applyFilters();
                }
              }}
            />
          </label>

          <label
            className={
              styles.filterField
            }
          >
            <span>Tipo</span>
            <select
              value={
                draftFilters.type
              }
              onChange={(event) =>
                setDraftFilters(
                  (current) => ({
                    ...current,
                    type:
                      event.target
                        .value,
                  })
                )
              }
            >
              <option value="TODOS">
                Todos
              </option>
              {types.map(
                ([
                  type,
                  label,
                ]) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </label>

          <label
            className={
              styles.filterField
            }
          >
            <span>Gravedad</span>
            <select
              value={
                draftFilters.severity
              }
              onChange={(event) =>
                setDraftFilters(
                  (current) => ({
                    ...current,
                    severity:
                      event.target
                        .value,
                  })
                )
              }
            >
              <option value="TODAS">
                Todas
              </option>
              <option value="Alta">
                Alta
              </option>
              <option value="Media">
                Media
              </option>
            </select>
          </label>

          <label
            className={
              styles.filterField
            }
          >
            <span>Departamento</span>
            <select
              value={
                draftFilters.department
              }
              onChange={(event) =>
                setDraftFilters(
                  (current) => ({
                    ...current,
                    department:
                      event.target
                        .value,
                  })
                )
              }
            >
              <option value="TODOS">
                Todos
              </option>
              {departments.map(
                (department) => (
                  <option
                    key={department}
                    value={department}
                  >
                    {department}
                  </option>
                )
              )}
            </select>
          </label>

          <label
            className={
              styles.filterField
            }
          >
            <span>Evidencia</span>
            <select
              value={
                draftFilters.evidence
              }
              onChange={(event) =>
                setDraftFilters(
                  (current) => ({
                    ...current,
                    evidence:
                      event.target
                        .value,
                  })
                )
              }
            >
              <option value="TODAS">
                Todas
              </option>
              <option value="Confirmada">
                Confirmada
              </option>
              <option value="Observacion">
                Observacion
              </option>
            </select>
          </label>

          <Button
            type="button"
            onClick={applyFilters}
          >
            Aplicar
          </Button>
        </div>

        <footer
          className={
            styles.noticeBar
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="M12 11v5M12 8h.01" />
          </svg>

          <p>
            “Observacion” significa que el
            sistema encontro una situacion
            que merece contraste humano.
            No se convierte automaticamente
            en ausencia, sancion ni alerta.
          </p>
        </footer>
      </section>

      <section
        className={
          styles.contentGrid
        }
      >
        <article
          className={
            styles.listCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Listado de inconsistencias
              </h2>
              <p>
                Incidencias confirmadas y
                observaciones detectadas en
                la jornada actual.
              </p>
            </div>

            <span
              className={
                styles.totalBadge
              }
            >
              {filtered.length} resultado(s)
            </span>
          </header>

          <div
            className={
              styles.tableScroll
            }
          >
            <table
              className={
                styles.inconsistencyTable
              }
            >
              <thead>
                <tr>
                  <th>
                    Tipo de inconsistencia
                  </th>
                  <th>
                    Docente / Curso
                  </th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Gravedad</th>
                  <th>Evidencia</th>
                  <th>Accion</th>
                </tr>
              </thead>

              <tbody>
                {paginated.length >
                0 ? (
                  paginated.map(
                    (item) => (
                      <tr
                        key={item.id}
                        className={
                          selected?.id ===
                          item.id
                            ? styles.selectedRow
                            : ""
                        }
                      >
                        <td>
                          <strong>
                            {
                              item.typeLabel
                            }
                          </strong>
                          <span
                            className={
                              styles.sourceText
                            }
                          >
                            {item.source}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              item.subject
                            }
                          </strong>
                          <span
                            className={
                              styles.subjectMeta
                            }
                          >
                            {item.code} ·{" "}
                            {
                              item.department
                            }
                          </span>
                        </td>

                        <td>
                          {item.date}
                        </td>

                        <td
                          className={
                            styles.timeCell
                          }
                        >
                          {item.time}
                        </td>

                        <td>
                          <SeverityBadge
                            severity={
                              item.severity
                            }
                          />
                        </td>

                        <td>
                          <EvidenceBadge
                            evidence={
                              item.evidence
                            }
                          />
                        </td>

                        <td>
                          <button
                            type="button"
                            className={
                              styles.detailButton
                            }
                            onClick={() =>
                              setSelectedId(
                                item.id
                              )
                            }
                          >
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className={
                        styles.emptyCell
                      }
                    >
                      No existen
                      inconsistencias que
                      coincidan con los
                      filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer
            className={
              styles.pagination
            }
          >
            <span>
              Pagina{" "}
              <strong>
                {currentPage}
              </strong>{" "}
              de{" "}
              <strong>
                {totalPages}
              </strong>
            </span>

            <div>
              <button
                type="button"
                disabled={
                  currentPage <= 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
              >
                Anterior
              </button>

              <button
                type="button"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setPage(
                    (current) =>
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

        <aside
          className={
            styles.detailCard
          }
        >
          <header
            className={
              styles.detailHeader
            }
          >
            <div>
              <h2>
                Detalle de inconsistencia
              </h2>
              <p>
                Evidencia y recomendacion
                para el evento seleccionado.
              </p>
            </div>
          </header>

          {selected ? (
            <div
              className={
                styles.detailBody
              }
            >
              <section
                className={`${styles.detailHero} ${
                  selected.severity ===
                  "Alta"
                    ? styles.detailHeroHigh
                    : styles.detailHeroMedium
                }`}
              >
                <span
                  className={
                    styles.detailIcon
                  }
                >
                  <MetricIcon
                    type={
                      selected.type ===
                      "BIOMETRIA_PENDIENTE"
                        ? "biometric"
                        : selected.type ===
                            "MARCACION_DUPLICADA"
                          ? "duplicate"
                          : selected.type ===
                              "PROGRAMACION_INCOMPLETA"
                            ? "schedule"
                            : selected.type ===
                                "TARDANZA_REGISTRADA"
                              ? "late"
                              : "review"
                    }
                  />
                </span>

                <div>
                  <h3>
                    {
                      selected.typeLabel
                    }
                  </h3>
                  <p>
                    {selected.subject}
                  </p>
                  <span>
                    Gravedad{" "}
                    {
                      selected.severity
                    }{" "}
                    ·{" "}
                    {
                      selected.evidence
                    }
                  </span>
                </div>
              </section>

              <section
                className={
                  styles.detailSection
                }
              >
                <h3>Descripcion</h3>
                <p>
                  {
                    selected.description
                  }
                </p>
              </section>

              <section
                className={
                  styles.detailSection
                }
              >
                <h3>
                  Datos asociados
                </h3>

                <dl
                  className={
                    styles.detailList
                  }
                >
                  <div>
                    <dt>Codigo</dt>
                    <dd>
                      {selected.code}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      Departamento
                    </dt>
                    <dd>
                      {
                        selected.department
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Fecha y hora</dt>
                    <dd>
                      {selected.date} ·{" "}
                      {selected.time}
                    </dd>
                  </div>
                  {selected.course && (
                    <div>
                      <dt>Curso</dt>
                      <dd>
                        {
                          selected.course
                        }
                      </dd>
                    </div>
                  )}
                  {selected.room && (
                    <div>
                      <dt>Aula</dt>
                      <dd>
                        {
                          selected.room
                        }
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Fuente</dt>
                    <dd>
                      {
                        selected.source
                      }
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                className={
                  styles.recommendation
                }
              >
                <h3>
                  Accion sugerida
                </h3>
                <p>
                  {
                    selected.recommendation
                  }
                </p>
              </section>

              {notice && (
                <p
                  className={
                    styles.copyNotice
                  }
                >
                  {notice}
                </p>
              )}

              <div
                className={
                  styles.detailActions
                }
              >
                <Button
                  type="button"
                  onClick={() =>
                    void copyDetail()
                  }
                >
                  Copiar evidencia
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={exportCsv}
                >
                  Exportar listado
                </Button>
              </div>

              <p
                className={
                  styles.readOnlyNote
                }
              >
                Vista de solo lectura. La
                revision no se guarda porque
                el backend aun no dispone de
                una ruta del Supervisor para
                resolver inconsistencias.
              </p>
            </div>
          ) : (
            <p
              className={
                styles.emptyDetail
              }
            >
              No existen inconsistencias
              para mostrar en el periodo
              actual.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
