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

const PAGE_SIZE = 10;
const LIMA_TIME_ZONE =
  "America/Lima";

type QueryStatus =
  | "TODOS"
  | "ASISTENCIA"
  | "TARDANZA"
  | "INASISTENCIA";

type RecordScope =
  | "Ingreso institucional"
  | "Asistencia a curso";

interface SessionUser {
  rol?: string;
}

interface TeacherRecord {
  id: number | string;
  codigo?: string;
  nombres?: string;
  apellidos?: string;
  activo?: boolean;
  departamento?: string;
  departamento_id?: number | string;
}

interface TeachersResponse {
  docentes?: TeacherRecord[];
  error?: string;
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

interface TeacherHistoryResponse {
  docente_id?: number | string;
  ingresos?: InstitutionalRecord[];
  cursos?: CourseRecord[];
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
  fecha_inicio?: string;
  fecha_fin?: string;
}

interface SchedulesResponse {
  horarios?: ScheduleRecord[];
  error?: string;
}

interface QueryRecord {
  id: string;
  dateKey: string;
  dateLabel: string;
  teacher: string;
  teacherCode: string;
  department: string;
  course: string;
  room: string;
  schedule: string;
  registeredTime: string;
  rawStatus: string;
  normalizedStatus:
    | "ASISTENCIA"
    | "TARDANZA"
    | "INASISTENCIA"
    | "OTRO";
  statusLabel: string;
  scope: RecordScope;
  source: string;
}

interface QueryFilters {
  teacherId: string;
  course: string;
  department: string;
  startDate: string;
  endDate: string;
  status: QueryStatus;
}

interface SourceStatus {
  key: string;
  label: string;
  ok: boolean;
  description: string;
}

class QueryRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "QueryRequestError";
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

function teacherName(
  teacher: TeacherRecord
): string {
  return (
    `${teacher.nombres ?? ""} ${
      teacher.apellidos ?? ""
    }`.trim() ||
    "Docente no informado"
  );
}

function dateKey(
  value: string | undefined
): string {
  return cleanText(value).slice(
    0,
    10
  );
}

function formatDate(
  value: string
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value || "—";
  }

  const [
    year,
    month,
    day,
  ] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatTime(
  value: string | undefined
): string {
  return (
    cleanText(value).slice(0, 8) ||
    "—"
  );
}

function statusInfo(
  value: string
): {
  normalized:
    | "ASISTENCIA"
    | "TARDANZA"
    | "INASISTENCIA"
    | "OTRO";
  label: string;
} {
  const status =
    normalizeStatus(value);

  if (
    status === "PUNTUAL" ||
    status === "PRESENTE" ||
    status === "ASISTENCIA"
  ) {
    return {
      normalized:
        "ASISTENCIA",
      label: "Asistencia",
    };
  }

  if (status === "TARDANZA") {
    return {
      normalized:
        "TARDANZA",
      label: "Tardanza",
    };
  }

  if (status === "AUSENTE") {
    return {
      normalized:
        "INASISTENCIA",
      label: "Inasistencia",
    };
  }

  return {
    normalized: "OTRO",
    label:
      status ||
      "Estado no informado",
  };
}

function isoWeekday(
  value: string
): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const date = new Date(
    `${value}T12:00:00Z`
  );
  const day =
    date.getUTCDay();

  return day === 0 ? 7 : day;
}

function scheduleLabel(
  schedule:
    | ScheduleRecord
    | null
): string {
  if (!schedule) {
    return "Sin horario coincidente";
  }

  const start =
    formatTime(
      schedule.hora_inicio
    ).slice(0, 5);
  const end =
    formatTime(
      schedule.hora_fin
    ).slice(0, 5);

  return `${start} - ${end}`;
}

function findSchedule(
  record: CourseRecord,
  schedules: ScheduleRecord[]
): ScheduleRecord | null {
  const recordDate =
    dateKey(record.fecha);
  const weekday =
    isoWeekday(recordDate);
  const course =
    normalizeText(record.curso);
  const room =
    normalizeText(record.aula);

  const candidates =
    schedules.filter(
      (schedule) => {
        const sameCourse =
          course &&
          normalizeText(
            schedule.curso
          ) === course;
        const sameRoom =
          !room ||
          !cleanText(
            schedule.aula
          ) ||
          normalizeText(
            schedule.aula
          ) === room;
        const sameDay =
          weekday === null ||
          Number(
            schedule.dia_semana
          ) === weekday;

        return (
          sameCourse &&
          sameRoom &&
          sameDay
        );
      }
    );

  return (
    candidates[0] ??
    schedules.find(
      (schedule) =>
        course &&
        normalizeText(
          schedule.curso
        ) === course
    ) ??
    null
  );
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

function getTodayLima(): string {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: LIMA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(
      new Date()
    );

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
  const day =
    parts.find(
      (part) => part.type === "day"
    )?.value ?? "00";

  return `${year}-${month}-${day}`;
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
    throw new QueryRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo completar la consulta.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

function StatusBadge({
  record,
}: {
  record: QueryRecord;
}) {
  return (
    <span
      className={`${styles.statusBadge} ${
        record.normalizedStatus ===
        "ASISTENCIA"
          ? styles.statusAttendance
          : record.normalizedStatus ===
              "TARDANZA"
            ? styles.statusLate
            : record.normalizedStatus ===
                "INASISTENCIA"
              ? styles.statusAbsent
              : styles.statusOther
      }`}
    >
      <span />
      {record.statusLabel}
    </span>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone:
    | "green"
    | "amber"
    | "red"
    | "blue";
}) {
  return (
    <article
      className={`${styles.metricTile} ${
        styles[`metric${tone}`]
      }`}
    >
      <span>{label}</span>
      <strong>
        {String(value).padStart(
          2,
          "0"
        )}
      </strong>
    </article>
  );
}

function initialFilters(): QueryFilters {
  return {
    teacherId: "",
    course: "TODOS",
    department: "TODOS",
    startDate: "",
    endDate: "",
    status: "TODOS",
  };
}

export default function SupervisorQueriesPage() {
  const router = useRouter();

  const [teachers, setTeachers] =
    useState<TeacherRecord[]>(
      []
    );
  const [
    schedulesResponse,
    setSchedulesResponse,
  ] =
    useState<SchedulesResponse | null>(
      null
    );
  const [
    history,
    setHistory,
  ] =
    useState<TeacherHistoryResponse | null>(
      null
    );
  const [loading, setLoading] =
    useState(true);
  const [
    consulting,
    setConsulting,
  ] = useState(false);
  const [error, setError] =
    useState("");
  const [
    lastUpdated,
    setLastUpdated,
  ] = useState<Date | null>(
    null
  );
  const [
    draftFilters,
    setDraftFilters,
  ] =
    useState<QueryFilters>(
      initialFilters()
    );
  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<QueryFilters>(
      initialFilters()
    );
  const [page, setPage] =
    useState(1);
  const [
    sources,
    setSources,
  ] = useState<SourceStatus[]>(
    []
  );

  const loadBaseData =
    useCallback(
      async () => {
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

        setLoading(true);
        setError("");

        const results =
          await Promise.allSettled([
            requestJson<TeachersResponse>(
              "/docentes",
              token
            ),
            requestJson<SchedulesResponse>(
              "/horarios",
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
                QueryRequestError &&
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

        const teacherResult =
          results[0];
        const scheduleResult =
          results[1];

        let activeTeachers:
          TeacherRecord[] = [];

        if (
          teacherResult.status ===
          "fulfilled"
        ) {
          activeTeachers =
            (
              teacherResult.value
                .docentes ?? []
            )
              .filter(
                (teacher) =>
                  teacher.activo !==
                  false
              )
              .sort((a, b) =>
                teacherName(
                  a
                ).localeCompare(
                  teacherName(b),
                  "es-PE"
                )
              );

          setTeachers(
            activeTeachers
          );
        }

        if (
          scheduleResult.status ===
          "fulfilled"
        ) {
          setSchedulesResponse(
            scheduleResult.value
          );
        }

        setSources([
          {
            key: "teachers",
            label:
              "Directorio docente",
            ok:
              teacherResult.status ===
              "fulfilled",
            description:
              teacherResult.status ===
              "fulfilled"
                ? `${activeTeachers.length} docente(s) activo(s)`
                : "Fuente no disponible",
          },
          {
            key: "schedules",
            label:
              "Horarios asignados",
            ok:
              scheduleResult.status ===
              "fulfilled",
            description:
              scheduleResult.status ===
              "fulfilled"
                ? "Programacion disponible"
                : "Fuente no disponible",
          },
        ]);

        if (
          results.every(
            (result) =>
              result.status ===
              "rejected"
          )
        ) {
          setError(
            rejected[0]?.reason instanceof
              Error
              ? rejected[0].reason
                  .message
              : "No se pudo preparar la consulta."
          );
          setLoading(false);
          return;
        }

        if (
          activeTeachers.length > 0
        ) {
          const firstId =
            String(
              activeTeachers[0].id
            );

          setDraftFilters(
            (current) => ({
              ...current,
              teacherId:
                current.teacherId ||
                firstId,
            })
          );
          setAppliedFilters(
            (current) => ({
              ...current,
              teacherId:
                current.teacherId ||
                firstId,
            })
          );

          try {
            const firstHistory =
              await requestJson<TeacherHistoryResponse>(
                `/asistencia/docente/${firstId}`,
                token
              );

            setHistory(
              firstHistory
            );
            setSources(
              (current) => [
                ...current.filter(
                  (source) =>
                    source.key !==
                    "attendance"
                ),
                {
                  key:
                    "attendance",
                  label:
                    "Historial personal",
                  ok: true,
                  description:
                    "Hasta 30 ingresos y 30 cursos",
                },
              ]
            );
          } catch (
            historyError
          ) {
            if (
              historyError instanceof
                QueryRequestError &&
              [401, 403].includes(
                historyError.status
              )
            ) {
              clearSession();
              router.replace(
                "/login"
              );
              return;
            }

            setSources(
              (current) => [
                ...current.filter(
                  (source) =>
                    source.key !==
                    "attendance"
                ),
                {
                  key:
                    "attendance",
                  label:
                    "Historial personal",
                  ok: false,
                  description:
                    "No se pudo consultar",
                },
              ]
            );
          }
        }

        setLastUpdated(
          new Date()
        );
        setLoading(false);
      },
      [router]
    );

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  const selectedTeacher =
    useMemo(
      () =>
        teachers.find(
          (teacher) =>
            String(teacher.id) ===
            appliedFilters.teacherId
        ) ??
        teachers.find(
          (teacher) =>
            String(teacher.id) ===
            draftFilters.teacherId
        ) ??
        null,
      [
        teachers,
        appliedFilters.teacherId,
        draftFilters.teacherId,
      ]
    );

  const schedules =
    useMemo(
      () => {
        const all =
          schedulesResponse
            ?.horarios ?? [];
        const teacherId =
          appliedFilters.teacherId ||
          draftFilters.teacherId;
        const hasActiveSemester =
          all.some(
            (schedule) =>
              schedule.semestre_activo ===
              true
          );

        return all.filter(
          (schedule) =>
            String(
              schedule.docente_id ??
                ""
            ) === teacherId &&
            schedule.activo !==
              false &&
            (!hasActiveSemester ||
              schedule.semestre_activo ===
                true)
        );
      },
      [
        schedulesResponse,
        appliedFilters.teacherId,
        draftFilters.teacherId,
      ]
    );

  const availableCourses =
    useMemo(
      () =>
        Array.from(
          new Set(
            [
              ...schedules.map(
                (schedule) =>
                  cleanText(
                    schedule.curso
                  )
              ),
              ...(
                history?.cursos ?? []
              ).map((record) =>
                cleanText(
                  record.curso
                )
              ),
            ].filter(Boolean)
          )
        ).sort((a, b) =>
          a.localeCompare(
            b,
            "es-PE"
          )
        ),
      [schedules, history]
    );

  const departments =
    useMemo(
      () =>
        Array.from(
          new Set(
            teachers
              .map(
                (teacher) =>
                  cleanText(
                    teacher.departamento
                  )
              )
              .filter(Boolean)
          )
        ).sort((a, b) =>
          a.localeCompare(
            b,
            "es-PE"
          )
        ),
      [teachers]
    );

  const allRecords =
    useMemo<QueryRecord[]>(
      () => {
        if (
          !selectedTeacher ||
          !history
        ) {
          return [];
        }

        const common = {
          teacher:
            teacherName(
              selectedTeacher
            ),
          teacherCode:
            cleanText(
              selectedTeacher.codigo
            ) || "—",
          department:
            cleanText(
              selectedTeacher.departamento
            ) ||
            "No informado",
        };

        const institutional =
          (
            history.ingresos ?? []
          ).map(
            (
              record,
              index
            ): QueryRecord => {
              const status =
                statusInfo(
                  record.estado
                );
              const date =
                dateKey(
                  record.fecha
                );

              return {
                id: `institutional-${date}-${record.hora_registro}-${index}`,
                dateKey: date,
                dateLabel:
                  formatDate(date),
                ...common,
                course:
                  "Ingreso institucional",
                room: "—",
                schedule:
                  "No aplica",
                registeredTime:
                  formatTime(
                    record.hora_registro
                  ),
                rawStatus:
                  normalizeStatus(
                    record.estado
                  ),
                normalizedStatus:
                  status.normalized,
                statusLabel:
                  status.label,
                scope:
                  "Ingreso institucional",
                source:
                  "GET /api/asistencia/docente/:id",
              };
            }
          );

        const academic =
          (
            history.cursos ?? []
          ).map(
            (
              record,
              index
            ): QueryRecord => {
              const status =
                statusInfo(
                  record.estado
                );
              const date =
                dateKey(
                  record.fecha
                );
              const matchedSchedule =
                findSchedule(
                  record,
                  schedules
                );

              return {
                id: `course-${date}-${record.hora_registro}-${index}`,
                dateKey: date,
                dateLabel:
                  formatDate(date),
                ...common,
                course:
                  cleanText(
                    record.curso
                  ) ||
                  "Curso no informado",
                room:
                  cleanText(
                    record.aula
                  ) ||
                  cleanText(
                    matchedSchedule?.aula
                  ) ||
                  "—",
                schedule:
                  scheduleLabel(
                    matchedSchedule
                  ),
                registeredTime:
                  formatTime(
                    record.hora_registro
                  ),
                rawStatus:
                  normalizeStatus(
                    record.estado
                  ),
                normalizedStatus:
                  status.normalized,
                statusLabel:
                  status.label,
                scope:
                  "Asistencia a curso",
                source:
                  matchedSchedule
                    ? "Historial y horario coincidente"
                    : "Historial academico",
              };
            }
          );

        return [
          ...institutional,
          ...academic,
        ].sort(
          (first, second) => {
            const dateOrder =
              second.dateKey.localeCompare(
                first.dateKey
              );

            if (dateOrder) {
              return dateOrder;
            }

            return second.registeredTime.localeCompare(
              first.registeredTime
            );
          }
        );
      },
      [
        selectedTeacher,
        history,
        schedules,
      ]
    );

  const filteredRecords =
    useMemo(
      () =>
        allRecords.filter(
          (record) => {
            const matchesCourse =
              appliedFilters.course ===
                "TODOS" ||
              record.course ===
                appliedFilters.course;

            const matchesDepartment =
              appliedFilters.department ===
                "TODOS" ||
              record.department ===
                appliedFilters.department;

            const matchesStart =
              !appliedFilters.startDate ||
              record.dateKey >=
                appliedFilters.startDate;

            const matchesEnd =
              !appliedFilters.endDate ||
              record.dateKey <=
                appliedFilters.endDate;

            const matchesStatus =
              appliedFilters.status ===
                "TODOS" ||
              record.normalizedStatus ===
                appliedFilters.status;

            return (
              matchesCourse &&
              matchesDepartment &&
              matchesStart &&
              matchesEnd &&
              matchesStatus
            );
          }
        ),
      [
        allRecords,
        appliedFilters,
      ]
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredRecords.length /
          PAGE_SIZE
      )
    );
  const currentPage =
    Math.min(page, totalPages);
  const paginatedRecords =
    filteredRecords.slice(
      (currentPage - 1) *
        PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

  const metrics =
    useMemo(
      () => ({
        attendance:
          filteredRecords.filter(
            (record) =>
              record.normalizedStatus ===
              "ASISTENCIA"
          ).length,
        late:
          filteredRecords.filter(
            (record) =>
              record.normalizedStatus ===
              "TARDANZA"
          ).length,
        absent:
          filteredRecords.filter(
            (record) =>
              record.normalizedStatus ===
              "INASISTENCIA"
          ).length,
        total:
          filteredRecords.length,
      }),
      [filteredRecords]
    );

  const distributionMax =
    Math.max(
      1,
      metrics.attendance,
      metrics.late,
      metrics.absent
    );

  const dateRangeLabel =
    appliedFilters.startDate ||
    appliedFilters.endDate
      ? `${appliedFilters.startDate
          ? formatDate(
              appliedFilters.startDate
            )
          : "Inicio disponible"} al ${
          appliedFilters.endDate
            ? formatDate(
                appliedFilters.endDate
              )
            : "Fin disponible"
        }`
      : "Todos los registros disponibles";

  const observations =
    useMemo(
      () => {
        const items: {
          tone:
            | "amber"
            | "red"
            | "blue";
          title: string;
          description: string;
        }[] = [];

        if (metrics.late > 0) {
          items.push({
            tone: "amber",
            title:
              "Revisar tardanzas",
            description: `${metrics.late} registro(s) tardio(s) en la consulta.`,
          });
        }

        if (metrics.absent > 0) {
          items.push({
            tone: "red",
            title:
              "Validar inasistencias",
            description: `${metrics.absent} ausencia(s) explicita(s) devuelta(s) por el backend.`,
          });
        }

        const unmatched =
          filteredRecords.filter(
            (record) =>
              record.scope ===
                "Asistencia a curso" &&
              record.schedule ===
                "Sin horario coincidente"
          ).length;

        if (unmatched > 0) {
          items.push({
            tone: "blue",
            title:
              "Horarios no relacionados",
            description: `${unmatched} registro(s) academico(s) sin horario coincidente.`,
          });
        }

        if (items.length === 0) {
          items.push({
            tone: "blue",
            title:
              "Sin incidencias visibles",
            description:
              "La consulta filtrada no contiene tardanzas ni ausencias explicitas.",
          });
        }

        return items.slice(0, 3);
      },
      [
        metrics,
        filteredRecords,
      ]
    );

  async function runQuery() {
    const token =
      getToken();
    const teacherId =
      draftFilters.teacherId;

    if (!token) {
      clearSession();
      router.replace("/login");
      return;
    }

    if (!teacherId) {
      setError(
        "Seleccione un docente para realizar la consulta."
      );
      return;
    }

    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate >
        draftFilters.endDate
    ) {
      setError(
        "La fecha inicial no puede ser posterior a la fecha final."
      );
      return;
    }

    setConsulting(true);
    setError("");

    try {
      const nextHistory =
        await requestJson<TeacherHistoryResponse>(
          `/asistencia/docente/${teacherId}`,
          token
        );

      setHistory(nextHistory);
      setAppliedFilters({
        ...draftFilters,
      });
      setPage(1);
      setLastUpdated(
        new Date()
      );
      setSources(
        (current) => {
          const withoutHistory =
            current.filter(
              (source) =>
                source.key !==
                "attendance"
            );

          return [
            ...withoutHistory,
            {
              key:
                "attendance",
              label:
                "Historial personal",
              ok: true,
              description:
                "Hasta 30 ingresos y 30 cursos",
            },
          ];
        }
      );
    } catch (queryError) {
      if (
        queryError instanceof
          QueryRequestError &&
        [401, 403].includes(
          queryError.status
        )
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(
        queryError instanceof Error
          ? queryError.message
          : "No se pudo completar la consulta."
      );
    } finally {
      setConsulting(false);
    }
  }

  function clearFilters() {
    const teacherId =
      draftFilters.teacherId ||
      (teachers[0]
        ? String(
            teachers[0].id
          )
        : "");

    const cleared = {
      ...initialFilters(),
      teacherId,
    };

    setDraftFilters(
      cleared
    );
    setAppliedFilters(
      cleared
    );
    setPage(1);
    setError("");
  }

  function exportCsv() {
    const rows = [
      [
        "Fecha",
        "Docente",
        "Codigo",
        "Departamento",
        "Curso o registro",
        "Aula",
        "Horario",
        "Hora de registro",
        "Estado",
        "Tipo de consulta",
        "Fuente",
      ],
      ...filteredRecords.map(
        (record) => [
          record.dateLabel,
          record.teacher,
          record.teacherCode,
          record.department,
          record.course,
          record.room,
          record.schedule,
          record.registeredTime,
          record.statusLabel,
          record.scope,
          record.source,
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
      `consulta-asistencia-${selectedTeacher?.codigo ?? "docente"}-${getTodayLima()}.csv`;
    document.body.appendChild(
      anchor
    );
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <LoadingState
        title="Preparando consultas de asistencia"
        description="Consultando directorio docente, horarios y el historial inicial."
        fullHeight
      />
    );
  }

  if (
    error &&
    teachers.length === 0 &&
    !schedulesResponse
  ) {
    return (
      <ErrorState
        title="No se pudo preparar el modulo de consultas"
        description={error}
        retryText="Reintentar"
        onRetry={() =>
          void loadBaseData()
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
        eyebrow="Busqueda academica"
        title="Consultas de asistencia"
        description="Consulta el historial institucional y academico disponible para un docente, con filtros y exportacion."
        badge={
          <span
            className={
              styles.queryBadge
            }
          >
            <span />
            Consulta avanzada
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
              onClick={exportCsv}
              disabled={
                filteredRecords.length ===
                0
              }
            >
              Exportar consulta
            </Button>
          </div>
        }
      />

      <section
        className={
          styles.topGrid
        }
      >
        <article
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
                Filtros de consulta
              </h2>
              <p>
                Complete uno o mas
                criterios para consultar
                los registros disponibles.
              </p>
            </div>
          </header>

          <div
            className={
              styles.filtersGrid
            }
          >
            <label
              className={`${styles.filterField} ${styles.teacherField}`}
            >
              <span>Docente</span>
              <select
                value={
                  draftFilters.teacherId
                }
                onChange={(event) => {
                  const teacherId =
                    event.target.value;
                  const teacher =
                    teachers.find(
                      (item) =>
                        String(
                          item.id
                        ) ===
                        teacherId
                    );

                  setDraftFilters(
                    (current) => ({
                      ...current,
                      teacherId,
                      course:
                        "TODOS",
                      department:
                        teacher?.departamento ??
                        "TODOS",
                    })
                  );
                }}
              >
                {teachers.length ===
                0 ? (
                  <option value="">
                    No hay docentes activos
                  </option>
                ) : (
                  teachers.map(
                    (teacher) => (
                      <option
                        key={String(
                          teacher.id
                        )}
                        value={String(
                          teacher.id
                        )}
                      >
                        {teacherName(
                          teacher
                        )}{" "}
                        ·{" "}
                        {teacher.codigo ??
                          "Sin codigo"}
                      </option>
                    )
                  )
                )}
              </select>
            </label>

            <label
              className={
                styles.filterField
              }
            >
              <span>Curso</span>
              <select
                value={
                  draftFilters.course
                }
                onChange={(event) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      course:
                        event.target
                          .value,
                    })
                  )
                }
              >
                <option value="TODOS">
                  Todos los registros
                </option>
                {availableCourses.map(
                  (course) => (
                    <option
                      key={course}
                      value={course}
                    >
                      {course}
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
                  (departmentName) => (
                    <option
                      key={
                        departmentName
                      }
                      value={
                        departmentName
                      }
                    >
                      {
                        departmentName
                      }
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
              <span>Fecha inicial</span>
              <input
                type="date"
                value={
                  draftFilters.startDate
                }
                onChange={(event) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      startDate:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </label>

            <label
              className={
                styles.filterField
              }
            >
              <span>Fecha final</span>
              <input
                type="date"
                value={
                  draftFilters.endDate
                }
                onChange={(event) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      endDate:
                        event.target
                          .value,
                    })
                  )
                }
              />
            </label>

            <label
              className={
                styles.filterField
              }
            >
              <span>Estado</span>
              <select
                value={
                  draftFilters.status
                }
                onChange={(event) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      status:
                        event.target
                          .value as QueryStatus,
                    })
                  )
                }
              >
                <option value="TODOS">
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
              </select>
            </label>
          </div>

          <div
            className={
              styles.filterActions
            }
          >
            <Button
              type="button"
              onClick={() =>
                void runQuery()
              }
              disabled={consulting}
            >
              {consulting
                ? "Consultando..."
                : "Consultar"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
            >
              Limpiar filtros
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              disabled={
                filteredRecords.length ===
                0
              }
            >
              Exportar CSV
            </Button>
          </div>

          {error && (
            <p
              className={
                styles.inlineError
              }
            >
              {error}
            </p>
          )}

          <footer
            className={
              styles.limitNotice
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
              La API entrega como maximo
              los 30 ingresos
              institucionales y los 30
              registros de curso mas
              recientes del docente. Los
              filtros se aplican sobre ese
              conjunto disponible.
            </p>
          </footer>
        </article>

        <article
          className={
            styles.resultsCard
          }
        >
          <header>
            <h2>
              Resultados encontrados
            </h2>
            <p>
              Rango: {dateRangeLabel}
            </p>
          </header>

          <div
            className={
              styles.resultMetrics
            }
          >
            <MetricTile
              label="Asistencias"
              value={
                metrics.attendance
              }
              tone="green"
            />
            <MetricTile
              label="Tardanzas"
              value={metrics.late}
              tone="amber"
            />
            <MetricTile
              label="Inasistencias"
              value={
                metrics.absent
              }
              tone="red"
            />
            <MetricTile
              label="Total"
              value={metrics.total}
              tone="blue"
            />
          </div>

          <div
            className={
              styles.teacherSummary
            }
          >
            <strong>
              {selectedTeacher
                ? teacherName(
                    selectedTeacher
                  )
                : "Sin docente"}
            </strong>
            <span>
              {selectedTeacher?.codigo ??
                "—"}
            </span>
            <p>
              {selectedTeacher?.departamento ??
                "Departamento no informado"}
            </p>
          </div>
        </article>
      </section>

      <section
        className={
          styles.contentGrid
        }
      >
        <article
          className={
            styles.historyCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Historial consultado
              </h2>
              <p>
                Ingresos institucionales y
                asistencias a cursos,
                conservados como fuentes
                separadas.
              </p>
            </div>

            <span
              className={
                styles.recordsBadge
              }
            >
              {
                filteredRecords.length
              }{" "}
              registro(s)
            </span>
          </header>

          <div
            className={
              styles.tableScroll
            }
          >
            <table
              className={
                styles.historyTable
              }
            >
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Docente</th>
                  <th>Curso / Registro</th>
                  <th>Aula</th>
                  <th>Horario</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th>Tipo consulta</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRecords.length >
                0 ? (
                  paginatedRecords.map(
                    (record) => (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td
                          className={
                            styles.dateCell
                          }
                        >
                          {
                            record.dateLabel
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              record.teacher
                            }
                          </strong>
                          <span
                            className={
                              styles.rowMeta
                            }
                          >
                            {
                              record.teacherCode
                            }{" "}
                            ·{" "}
                            {
                              record.department
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              record.course
                            }
                          </strong>
                          <span
                            className={
                              styles.rowMeta
                            }
                          >
                            {record.source}
                          </span>
                        </td>

                        <td>
                          {record.room}
                        </td>

                        <td
                          className={
                            styles.timeCell
                          }
                        >
                          {
                            record.schedule
                          }
                        </td>

                        <td
                          className={
                            styles.timeCell
                          }
                        >
                          {
                            record.registeredTime
                          }
                        </td>

                        <td>
                          <StatusBadge
                            record={
                              record
                            }
                          />
                        </td>

                        <td>
                          <span
                            className={
                              record.scope ===
                              "Ingreso institucional"
                                ? styles.scopeInstitutional
                                : styles.scopeAcademic
                            }
                          >
                            {
                              record.scope
                            }
                          </span>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={8}
                      className={
                        styles.emptyCell
                      }
                    >
                      No existen registros
                      que coincidan con la
                      consulta aplicada.
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
                Ver mas registros
              </button>
            </div>
          </footer>
        </article>

        <aside
          className={
            styles.sideColumn
          }
        >
          <article
            className={
              styles.distributionCard
            }
          >
            <header
              className={
                styles.sideHeader
              }
            >
              <h2>Distribucion</h2>
              <p>
                Resultados por estado
                consultado.
              </p>
            </header>

            <div
              className={
                styles.distributionChart
              }
            >
              {[
                {
                  label: "Asist.",
                  value:
                    metrics.attendance,
                  className:
                    styles.barGreen,
                },
                {
                  label: "Tard.",
                  value:
                    metrics.late,
                  className:
                    styles.barAmber,
                },
                {
                  label: "Inas.",
                  value:
                    metrics.absent,
                  className:
                    styles.barRed,
                },
              ].map(
                (item) => (
                  <div
                    key={item.label}
                    className={
                      styles.chartColumn
                    }
                  >
                    <strong>
                      {item.value}
                    </strong>
                    <span
                      className={
                        styles.chartTrack
                      }
                    >
                      <span
                        className={
                          item.className
                        }
                        style={{
                          height: `${Math.max(
                            4,
                            (item.value /
                              distributionMax) *
                              100
                          )}%`,
                        }}
                      />
                    </span>
                    <small>
                      {item.label}
                    </small>
                  </div>
                )
              )}
            </div>
          </article>

          <article
            className={
              styles.observationsCard
            }
          >
            <header
              className={
                styles.sideHeader
              }
            >
              <h2>
                Observacion del supervisor
              </h2>
              <p>
                Resumen automatico del
                conjunto filtrado.
              </p>
            </header>

            <div
              className={
                styles.observationList
              }
            >
              {observations.map(
                (observation) => (
                  <article
                    key={
                      observation.title
                    }
                    className={
                      styles[
                        `observation${observation.tone}`
                      ]
                    }
                  >
                    <strong>
                      {
                        observation.title
                      }
                    </strong>
                    <p>
                      {
                        observation.description
                      }
                    </p>
                  </article>
                )
              )}
            </div>

            <footer>
              Este resumen no valida
              justificaciones ni genera
              sanciones; solo describe los
              estados disponibles.
            </footer>
          </article>

          <article
            className={
              styles.sourcesCard
            }
          >
            <header
              className={
                styles.sideHeader
              }
            >
              <h2>
                Fuentes de consulta
              </h2>
            </header>

            <div
              className={
                styles.sourcesList
              }
            >
              {sources.map(
                (source) => (
                  <div
                    key={source.key}
                  >
                    <span
                      className={
                        source.ok
                          ? styles.sourceOk
                          : styles.sourceWarning
                      }
                    />
                    <div>
                      <strong>
                        {
                          source.label
                        }
                      </strong>
                      <p>
                        {
                          source.description
                        }
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </article>
        </aside>
      </section>
    </div>
  );
}
