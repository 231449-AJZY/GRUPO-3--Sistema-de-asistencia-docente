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

const PAGE_SIZE = 8;
const ALL_SEMESTERS =
  "TODOS_ANTERIORES";
const ALL_COURSES =
  "TODOS";
const ALL_DEPARTMENTS =
  "TODOS";

type MetricTone =
  | "green"
  | "amber"
  | "red"
  | "blue";

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
}

interface TeachersResponse {
  docentes?: TeacherRecord[];
  error?: string;
}

interface SemesterRecord {
  id: number | string;
  codigo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
  creado_en?: string;
}

interface CatalogCourse {
  id: number | string;
  codigo?: string;
  nombre?: string;
  departamento_id?: number | string;
  departamento?: string;
  creditos?: number | string;
  activo?: boolean;
}

interface CatalogsResponse {
  docentes?: Array<{
    id: number | string;
    codigo?: string;
    nombre?: string;
    departamento?: string;
    activo?: boolean;
  }>;
  cursos?: CatalogCourse[];
  semestres?: SemesterRecord[];
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
  registros_asistencia?: number | string;
  docente_codigo?: string;
  docente?: string;
  departamento?: string;
  curso_codigo?: string;
  curso?: string;
  creditos?: number | string;
  semestre?: string;
  semestre_activo?: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
}

interface SchedulesResponse {
  horarios?: ScheduleRecord[];
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

interface HistoricalFilters {
  semesterId: string;
  teacherId: string;
  course: string;
  department: string;
}

interface SemesterSummary {
  id: string;
  semesterId: string;
  semester: string;
  startDate: string;
  endDate: string;
  teacher: string;
  teacherCode: string;
  department: string;
  principalCourse: string;
  scheduledCourses: number;
  attendance: number;
  late: number;
  absent: number;
  other: number;
  total: number;
  compliance: number | null;
  institutionalRecords: number;
  coverage:
    | "Con registros"
    | "Sin registros visibles";
}

interface SourceStatus {
  key: string;
  label: string;
  ok: boolean;
  description: string;
}

class HistoricalRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "HistoricalRequestError";
    this.status = status;
  }
}

const METRIC_CLASSES: Record<
  MetricTone,
  {
    icon: string;
    value: string;
  }
> = {
  green: {
    icon: styles.metricGreen,
    value: styles.valueGreen,
  },
  amber: {
    icon: styles.metricAmber,
    value: styles.valueAmber,
  },
  red: {
    icon: styles.metricRed,
    value: styles.valueRed,
  },
  blue: {
    icon: styles.metricBlue,
    value: styles.valueBlue,
  },
};

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
  value:
    | number
    | string
    | null
    | undefined
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
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
  value: string | undefined
): string {
  const normalized =
    dateKey(value);

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

function teacherName(
  teacher: TeacherRecord | null
): string {
  if (!teacher) {
    return "Docente no seleccionado";
  }

  return (
    `${teacher.nombres ?? ""} ${
      teacher.apellidos ?? ""
    }`.trim() ||
    "Docente no informado"
  );
}

function isInsideSemester(
  recordDate: string,
  semester: SemesterRecord
): boolean {
  const start =
    dateKey(
      semester.fecha_inicio
    );
  const end =
    dateKey(
      semester.fecha_fin
    );

  return Boolean(
    recordDate &&
      start &&
      end &&
      recordDate >= start &&
      recordDate <= end
  );
}

function classifyStatus(
  value: string
):
  | "attendance"
  | "late"
  | "absent"
  | "other" {
  const status =
    normalizeStatus(value);

  if (
    status === "PUNTUAL" ||
    status === "PRESENTE" ||
    status === "ASISTENCIA"
  ) {
    return "attendance";
  }

  if (status === "TARDANZA") {
    return "late";
  }

  if (status === "AUSENTE") {
    return "absent";
  }

  return "other";
}

function percentage(
  numerator: number,
  denominator: number
): number | null {
  if (denominator <= 0) {
    return null;
  }

  return Math.round(
    (numerator / denominator) *
      1000
  ) / 10;
}

function complianceLabel(
  value: number | null
): string {
  return value === null
    ? "Sin datos"
    : `${value.toFixed(1)}%`;
}

function complianceTone(
  value: number | null
): string {
  if (value === null) {
    return styles.complianceNeutral;
  }

  if (value >= 90) {
    return styles.complianceGood;
  }

  if (value >= 75) {
    return styles.complianceWarning;
  }

  return styles.complianceDanger;
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
    throw new HistoricalRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo completar la consulta historica.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

function MetricIcon({
  type,
}: {
  type:
    | "attendance"
    | "late"
    | "absent"
    | "chart";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "attendance") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

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

  if (type === "absent") {
    return (
      <svg {...common}>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
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
  value: string;
  description: string;
  tone: MetricTone;
  icon:
    | "attendance"
    | "late"
    | "absent"
    | "chart";
}) {
  const toneClass =
    METRIC_CLASSES[tone];

  return (
    <article
      className={styles.metricCard}
    >
      <span
        className={`${styles.metricIcon} ${toneClass.icon}`}
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
          className={`${styles.metricValue} ${toneClass.value}`}
        >
          {value}
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

function initialFilters(): HistoricalFilters {
  return {
    semesterId:
      ALL_SEMESTERS,
    teacherId: "",
    course: ALL_COURSES,
    department:
      ALL_DEPARTMENTS,
  };
}

export default function SupervisorHistoricalPage() {
  const router = useRouter();

  const [teachers, setTeachers] =
    useState<TeacherRecord[]>(
      []
    );
  const [
    catalogs,
    setCatalogs,
  ] =
    useState<CatalogsResponse | null>(
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
    useState<HistoricalFilters>(
      initialFilters()
    );
  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<HistoricalFilters>(
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
            requestJson<CatalogsResponse>(
              "/horarios/catalogos",
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
                HistoricalRequestError &&
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

        const teachersResult =
          results[0];
        const catalogsResult =
          results[1];
        const schedulesResult =
          results[2];

        let activeTeachers:
          TeacherRecord[] = [];

        if (
          teachersResult.status ===
          "fulfilled"
        ) {
          activeTeachers =
            (
              teachersResult.value
                .docentes ?? []
            )
              .filter(
                (teacher) =>
                  teacher.activo !==
                  false
              )
              .sort((first, second) =>
                teacherName(
                  first
                ).localeCompare(
                  teacherName(
                    second
                  ),
                  "es-PE"
                )
              );

          setTeachers(
            activeTeachers
          );
        }

        if (
          catalogsResult.status ===
          "fulfilled"
        ) {
          setCatalogs(
            catalogsResult.value
          );
        }

        if (
          schedulesResult.status ===
          "fulfilled"
        ) {
          setSchedulesResponse(
            schedulesResult.value
          );
        }

        setSources([
          {
            key: "teachers",
            label:
              "Directorio docente",
            ok:
              teachersResult.status ===
              "fulfilled",
            description:
              teachersResult.status ===
              "fulfilled"
                ? `${activeTeachers.length} docente(s) activo(s)`
                : "No disponible",
          },
          {
            key: "catalogs",
            label:
              "Catalogo de semestres",
            ok:
              catalogsResult.status ===
              "fulfilled",
            description:
              catalogsResult.status ===
              "fulfilled"
                ? "Periodos y fechas disponibles"
                : "No disponible",
          },
          {
            key: "schedules",
            label:
              "Programacion historica",
            ok:
              schedulesResult.status ===
              "fulfilled",
            description:
              schedulesResult.status ===
              "fulfilled"
                ? "Horarios por semestre disponibles"
                : "No disponible",
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
              : "No se pudo preparar el historial de semestres."
          );
          setLoading(false);
          return;
        }

        if (
          activeTeachers.length > 0
        ) {
          const firstTeacher =
            activeTeachers[0];
          const firstId =
            String(
              firstTeacher.id
            );
          const nextFilters = {
            ...initialFilters(),
            teacherId: firstId,
            department:
              firstTeacher.departamento ??
              ALL_DEPARTMENTS,
          };

          setDraftFilters(
            nextFilters
          );
          setAppliedFilters(
            nextFilters
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
                    "history"
                ),
                {
                  key: "history",
                  label:
                    "Historial personal",
                  ok: true,
                  description:
                    "Ventana de 30 ingresos y 30 cursos",
                },
              ]
            );
          } catch (
            historyError
          ) {
            if (
              historyError instanceof
                HistoricalRequestError &&
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
                    "history"
                ),
                {
                  key: "history",
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

  const previousSemesters =
    useMemo(
      () =>
        (
          catalogs?.semestres ??
          []
        )
          .filter(
            (semester) =>
              semester.activo !==
              true
          )
          .sort((first, second) =>
            dateKey(
              second.fecha_inicio
            ).localeCompare(
              dateKey(
                first.fecha_inicio
              )
            )
          ),
      [catalogs]
    );

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
        ).sort((first, second) =>
          first.localeCompare(
            second,
            "es-PE"
          )
        ),
      [teachers]
    );

  const visibleTeachers =
    useMemo(
      () =>
        teachers.filter(
          (teacher) =>
            draftFilters.department ===
              ALL_DEPARTMENTS ||
            cleanText(
              teacher.departamento
            ) ===
              draftFilters.department
        ),
      [
        teachers,
        draftFilters.department,
      ]
    );

  const teacherSchedules =
    useMemo(
      () =>
        (
          schedulesResponse
            ?.horarios ?? []
        ).filter(
          (schedule) =>
            String(
              schedule.docente_id ??
                ""
            ) ===
            appliedFilters.teacherId
        ),
      [
        schedulesResponse,
        appliedFilters.teacherId,
      ]
    );

  const availableCourses =
    useMemo(
      () =>
        Array.from(
          new Set(
            [
              ...teacherSchedules.map(
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
        ).sort((first, second) =>
          first.localeCompare(
            second,
            "es-PE"
          )
        ),
      [
        teacherSchedules,
        history,
      ]
    );

  const semesterSummaries =
    useMemo<SemesterSummary[]>(
      () => {
        if (
          !selectedTeacher ||
          !history
        ) {
          return [];
        }

        const selectedSemesters =
          previousSemesters.filter(
            (semester) =>
              appliedFilters.semesterId ===
                ALL_SEMESTERS ||
              String(semester.id) ===
                appliedFilters.semesterId
          );

        return selectedSemesters.map(
          (semester) => {
            const semesterSchedules =
              teacherSchedules.filter(
                (schedule) =>
                  String(
                    schedule.semestre_id ??
                      ""
                  ) ===
                  String(semester.id)
              );

            const academicRecords =
              (
                history.cursos ?? []
              ).filter((record) => {
                const recordCourse =
                  cleanText(
                    record.curso
                  );

                return (
                  isInsideSemester(
                    dateKey(
                      record.fecha
                    ),
                    semester
                  ) &&
                  (appliedFilters.course ===
                    ALL_COURSES ||
                    recordCourse ===
                      appliedFilters.course)
                );
              });

            const institutionalRecords =
              (
                history.ingresos ?? []
              ).filter((record) =>
                isInsideSemester(
                  dateKey(
                    record.fecha
                  ),
                  semester
                )
              );

            const counts = {
              attendance: 0,
              late: 0,
              absent: 0,
              other: 0,
            };

            const courseFrequency =
              new Map<
                string,
                number
              >();

            academicRecords.forEach(
              (record) => {
                const classification =
                  classifyStatus(
                    record.estado
                  );

                counts[
                  classification
                ] += 1;

                const course =
                  cleanText(
                    record.curso
                  );

                if (course) {
                  courseFrequency.set(
                    course,
                    (courseFrequency.get(
                      course
                    ) ?? 0) + 1
                  );
                }
              }
            );

            const scheduledCourseNames =
              Array.from(
                new Set(
                  semesterSchedules
                    .map(
                      (schedule) =>
                        cleanText(
                          schedule.curso
                        )
                    )
                    .filter(Boolean)
                )
              );

            const principalCourse =
              Array.from(
                courseFrequency.entries()
              ).sort(
                (
                  first,
                  second
                ) =>
                  second[1] -
                  first[1]
              )[0]?.[0] ??
              scheduledCourseNames[0] ??
              "Sin curso visible";

            const total =
              counts.attendance +
              counts.late +
              counts.absent +
              counts.other;

            const explicitTotal =
              counts.attendance +
              counts.late +
              counts.absent;

            return {
              id: String(
                semester.id
              ),
              semesterId: String(
                semester.id
              ),
              semester:
                cleanText(
                  semester.codigo
                ) ||
                "Semestre sin codigo",
              startDate:
                formatDate(
                  semester.fecha_inicio
                ),
              endDate:
                formatDate(
                  semester.fecha_fin
                ),
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
              principalCourse,
              scheduledCourses:
                scheduledCourseNames.length,
              attendance:
                counts.attendance,
              late: counts.late,
              absent:
                counts.absent,
              other: counts.other,
              total,
              compliance:
                percentage(
                  counts.attendance,
                  explicitTotal
                ),
              institutionalRecords:
                institutionalRecords.length,
              coverage:
                total > 0 ||
                institutionalRecords.length >
                  0
                  ? "Con registros"
                  : "Sin registros visibles",
            };
          }
        );
      },
      [
        selectedTeacher,
        history,
        previousSemesters,
        appliedFilters,
        teacherSchedules,
      ]
    );

  const totals =
    useMemo(
      () =>
        semesterSummaries.reduce(
          (result, summary) => ({
            attendance:
              result.attendance +
              summary.attendance,
            late:
              result.late +
              summary.late,
            absent:
              result.absent +
              summary.absent,
            other:
              result.other +
              summary.other,
            institutional:
              result.institutional +
              summary.institutionalRecords,
          }),
          {
            attendance: 0,
            late: 0,
            absent: 0,
            other: 0,
            institutional: 0,
          }
        ),
      [semesterSummaries]
    );

  const overallCompliance =
    percentage(
      totals.attendance,
      totals.attendance +
        totals.late +
        totals.absent
    );

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        semesterSummaries.length /
          PAGE_SIZE
      )
    );
  const currentPage =
    Math.min(page, totalPages);
  const paginated =
    semesterSummaries.slice(
      (currentPage - 1) *
        PAGE_SIZE,
      currentPage * PAGE_SIZE
    );

  const chartMax =
    100;

  const historicalReading =
    useMemo(
      () => {
        const withData =
          semesterSummaries.filter(
            (summary) =>
              summary.compliance !==
              null
          );

        if (withData.length === 0) {
          return {
            title:
              "Cobertura historica insuficiente",
            description:
              "La ventana personal disponible no contiene registros academicos para los semestres seleccionados.",
            tags: [
              {
                label:
                  "Revisar cobertura",
                tone: "amber",
              },
              {
                label:
                  "Ventana limitada",
                tone: "blue",
              },
            ],
          };
        }

        const best =
          [...withData].sort(
            (first, second) =>
              (second.compliance ??
                0) -
              (first.compliance ??
                0)
          )[0];

        const highestIncidence =
          [...withData].sort(
            (first, second) =>
              second.late +
                second.absent -
              (first.late +
                first.absent)
          )[0];

        const favorable =
          (overallCompliance ??
            0) >= 90;

        return {
          title: favorable
            ? "Tendencia favorable en la ventana disponible"
            : "Periodo con oportunidades de mejora",
          description: `El mejor cumplimiento observado corresponde a ${best.semester} (${complianceLabel(
            best.compliance
          )}). La mayor cantidad de tardanzas e inasistencias visibles aparece en ${highestIncidence.semester}.`,
          tags: [
            {
              label: favorable
                ? "Tendencia favorable"
                : "Requiere revision",
              tone: favorable
                ? "green"
                : "amber",
            },
            {
              label: `Revisar ${highestIncidence.semester}`,
              tone: "amber",
            },
            {
              label:
                "Exportable",
              tone: "blue",
            },
          ],
        };
      },
      [
        semesterSummaries,
        overallCompliance,
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
        "Seleccione un docente para consultar su historial."
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
        (current) => [
          ...current.filter(
            (source) =>
              source.key !==
              "history"
          ),
          {
            key: "history",
            label:
              "Historial personal",
            ok: true,
            description:
              "Ventana de 30 ingresos y 30 cursos",
          },
        ]
      );
    } catch (queryError) {
      if (
        queryError instanceof
          HistoricalRequestError &&
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
          : "No se pudo completar la consulta historica."
      );

      setSources(
        (current) => [
          ...current.filter(
            (source) =>
              source.key !==
              "history"
          ),
          {
            key: "history",
            label:
              "Historial personal",
            ok: false,
            description:
              "No se pudo consultar",
          },
        ]
      );
    } finally {
      setConsulting(false);
    }
  }

  function clearFilters() {
    const firstTeacher =
      teachers[0] ?? null;

    const cleared = {
      ...initialFilters(),
      teacherId: firstTeacher
        ? String(firstTeacher.id)
        : "",
      department:
        firstTeacher?.departamento ??
        ALL_DEPARTMENTS,
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
        "Semestre",
        "Fecha inicial",
        "Fecha final",
        "Docente",
        "Codigo docente",
        "Departamento",
        "Curso principal",
        "Cursos programados",
        "Asistencias academicas",
        "Tardanzas",
        "Inasistencias",
        "Otros estados",
        "Registros institucionales",
        "Cumplimiento observado",
        "Cobertura",
      ],
      ...semesterSummaries.map(
        (summary) => [
          summary.semester,
          summary.startDate,
          summary.endDate,
          summary.teacher,
          summary.teacherCode,
          summary.department,
          summary.principalCourse,
          summary.scheduledCourses,
          summary.attendance,
          summary.late,
          summary.absent,
          summary.other,
          summary.institutionalRecords,
          complianceLabel(
            summary.compliance
          ),
          summary.coverage,
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
      `historial-semestres-${selectedTeacher?.codigo ?? "docente"}.csv`;
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
        title="Preparando historial de semestres"
        description="Consultando docentes, catalogo de periodos, horarios y ventana historica disponible."
        fullHeight
      />
    );
  }

  if (
    error &&
    teachers.length === 0 &&
    !catalogs &&
    !schedulesResponse
  ) {
    return (
      <ErrorState
        title="No se pudo preparar el historial"
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
        eyebrow="Analisis historico"
        title="Historial de semestres anteriores"
        description="Consulta comparativa del desempeño visible por semestre, curso y docente."
        badge={
          <span
            className={
              styles.historyBadge
            }
          >
            <span />
            Semestres cerrados
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
                        hour:
                          "2-digit",
                        minute:
                          "2-digit",
                        second:
                          "2-digit",
                        hour12: false,
                        timeZone:
                          "America/Lima",
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
                semesterSummaries.length ===
                0
              }
            >
              Exportar historial
            </Button>
          </div>
        }
      />

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
              Filtros historicos
            </h2>
            <p>
              Seleccione los criterios para
              comparar registros de
              semestres anteriores.
            </p>
          </div>
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
            <span>Semestre</span>
            <select
              value={
                draftFilters.semesterId
              }
              onChange={(event) =>
                setDraftFilters(
                  (current) => ({
                    ...current,
                    semesterId:
                      event.target
                        .value,
                  })
                )
              }
            >
              <option
                value={
                  ALL_SEMESTERS
                }
              >
                Todos los anteriores
              </option>

              {previousSemesters.map(
                (semester) => (
                  <option
                    key={String(
                      semester.id
                    )}
                    value={String(
                      semester.id
                    )}
                  >
                    {semester.codigo ??
                      "Sin codigo"}{" "}
                    ·{" "}
                    {formatDate(
                      semester.fecha_inicio
                    )}{" "}
                    -{" "}
                    {formatDate(
                      semester.fecha_fin
                    )}
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
            <span>Docente</span>
            <select
              value={
                draftFilters.teacherId
              }
              onChange={(event) => {
                const teacherId =
                  event.target.value;
                const nextTeacher =
                  teachers.find(
                    (teacher) =>
                      String(
                        teacher.id
                      ) === teacherId
                  );

                setDraftFilters(
                  (current) => ({
                    ...current,
                    teacherId,
                    course:
                      ALL_COURSES,
                    department:
                      nextTeacher?.departamento ??
                      current.department,
                  })
                );
              }}
            >
              {visibleTeachers.length ===
              0 ? (
                <option value="">
                  No hay docentes
                </option>
              ) : (
                visibleTeachers.map(
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
              <option
                value={
                  ALL_COURSES
                }
              >
                Todos los cursos
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
              onChange={(event) => {
                const nextDepartment =
                  event.target.value;
                const compatible =
                  teachers.filter(
                    (teacher) =>
                      nextDepartment ===
                        ALL_DEPARTMENTS ||
                      cleanText(
                        teacher.departamento
                      ) ===
                        nextDepartment
                  );
                const keepsTeacher =
                  compatible.some(
                    (teacher) =>
                      String(
                        teacher.id
                      ) ===
                      draftFilters.teacherId
                  );

                setDraftFilters(
                  (current) => ({
                    ...current,
                    department:
                      nextDepartment,
                    teacherId:
                      keepsTeacher
                        ? current.teacherId
                        : compatible[0]
                            ? String(
                                compatible[0]
                                  .id
                              )
                            : "",
                    course:
                      ALL_COURSES,
                  })
                );
              }}
            >
              <option
                value={
                  ALL_DEPARTMENTS
                }
              >
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
            Limpiar
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
            styles.coverageNotice
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
            La relacion con el semestre se
            calcula usando la fecha del
            registro y el rango oficial del
            periodo. La API personal
            conserva una ventana maxima de
            30 ingresos institucionales y
            30 registros de curso; por ello,
            los semestres antiguos pueden
            aparecer sin registros visibles
            aunque existan datos fuera de
            esa ventana.
          </p>

          <div
            className={
              styles.sourcePills
            }
          >
            {sources.map(
              (source) => (
                <span
                  key={source.key}
                  className={
                    source.ok
                      ? styles.sourceOk
                      : styles.sourceWarning
                  }
                  title={
                    source.description
                  }
                >
                  <span />
                  {source.label}
                </span>
              )
            )}
          </div>
        </footer>
      </section>

      <section
        className={
          styles.metricsGrid
        }
      >
        <MetricCard
          title="Asistencias historicas"
          value={String(
            totals.attendance
          ).padStart(2, "0")}
          description="Registros academicos con estado puntual o presente"
          tone="green"
          icon="attendance"
        />

        <MetricCard
          title="Tardanzas historicas"
          value={String(
            totals.late
          ).padStart(2, "0")}
          description="Estados TARDANZA dentro de los periodos consultados"
          tone="amber"
          icon="late"
        />

        <MetricCard
          title="Inasistencias historicas"
          value={String(
            totals.absent
          ).padStart(2, "0")}
          description="Solo estados AUSENTE devueltos expresamente"
          tone="red"
          icon="absent"
        />

        <MetricCard
          title="Cumplimiento observado"
          value={complianceLabel(
            overallCompliance
          )}
          description="Asistencias sobre estados academicos explicitos"
          tone="blue"
          icon="chart"
        />

        <article
          className={
            styles.actionsCard
          }
        >
          <h2>
            Acciones historicas
          </h2>
          <p>
            Revise el detalle por periodo,
            curso y programacion disponible.
          </p>

          <div>
            <strong>
              {
                semesterSummaries.length
              }
            </strong>
            <span>
              semestre(s) comparado(s)
            </span>
          </div>

          <Button
            type="button"
            onClick={exportCsv}
            disabled={
              semesterSummaries.length ===
              0
            }
          >
            Exportar detalle
          </Button>
        </article>
      </section>

      <section
        className={
          styles.contentGrid
        }
      >
        <article
          className={
            styles.tableCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <h2>
                Tabla historica por
                semestre
              </h2>
              <p>
                Comparacion de asistencia,
                tardanzas, inasistencias y
                cumplimiento en la ventana
                disponible.
              </p>
            </div>

            <span
              className={
                styles.recordsBadge
              }
            >
              {
                semesterSummaries.length
              }{" "}
              periodo(s)
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
                  <th>Semestre</th>
                  <th>Docente</th>
                  <th>
                    Curso principal
                  </th>
                  <th>Asistencia</th>
                  <th>Tardanzas</th>
                  <th>Inasistencias</th>
                  <th>
                    Ingresos institucionales
                  </th>
                  <th>Cumplimiento</th>
                  <th>Cobertura</th>
                </tr>
              </thead>

              <tbody>
                {paginated.length >
                0 ? (
                  paginated.map(
                    (summary) => (
                      <tr
                        key={
                          summary.id
                        }
                      >
                        <td>
                          <strong>
                            {
                              summary.semester
                            }
                          </strong>
                          <span
                            className={
                              styles.rowMeta
                            }
                          >
                            {
                              summary.startDate
                            }{" "}
                            -{" "}
                            {
                              summary.endDate
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              summary.teacher
                            }
                          </strong>
                          <span
                            className={
                              styles.rowMeta
                            }
                          >
                            {
                              summary.teacherCode
                            }{" "}
                            ·{" "}
                            {
                              summary.department
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              summary.principalCourse
                            }
                          </strong>
                          <span
                            className={
                              styles.rowMeta
                            }
                          >
                            {
                              summary.scheduledCourses
                            }{" "}
                            curso(s)
                            programado(s)
                          </span>
                        </td>

                        <td
                          className={
                            styles.attendanceCell
                          }
                        >
                          {
                            summary.attendance
                          }
                        </td>

                        <td
                          className={
                            styles.lateCell
                          }
                        >
                          {summary.late}
                        </td>

                        <td
                          className={
                            styles.absentCell
                          }
                        >
                          {
                            summary.absent
                          }
                        </td>

                        <td
                          className={
                            styles.numericCell
                          }
                        >
                          {
                            summary.institutionalRecords
                          }
                        </td>

                        <td>
                          <span
                            className={`${styles.complianceBadge} ${complianceTone(
                              summary.compliance
                            )}`}
                          >
                            {complianceLabel(
                              summary.compliance
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              summary.coverage ===
                              "Con registros"
                                ? styles.coverageAvailable
                                : styles.coverageLimited
                            }
                          >
                            <span />
                            {
                              summary.coverage
                            }
                          </span>
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className={
                        styles.emptyCell
                      }
                    >
                      No existen semestres
                      anteriores o registros
                      visibles para la
                      consulta seleccionada.
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
            styles.sideColumn
          }
        >
          <article
            className={
              styles.chartCard
            }
          >
            <header
              className={
                styles.sideHeader
              }
            >
              <h2>
                Grafico comparativo por
                semestre
              </h2>
              <p>
                Porcentaje de cumplimiento
                observado.
              </p>
            </header>

            <div
              className={
                styles.chartArea
              }
            >
              {semesterSummaries.length >
              0 ? (
                semesterSummaries
                  .slice(0, 8)
                  .reverse()
                  .map(
                    (summary) => {
                      const value =
                        summary.compliance ??
                        0;

                      return (
                        <div
                          key={
                            summary.id
                          }
                          className={
                            styles.chartColumn
                          }
                        >
                          <strong>
                            {summary.compliance ===
                            null
                              ? "—"
                              : value.toFixed(
                                  1
                                )}
                          </strong>

                          <span
                            className={
                              styles.chartTrack
                            }
                          >
                            <span
                              className={
                                value >= 90
                                  ? styles.barGood
                                  : value >=
                                      75
                                    ? styles.barWarning
                                    : styles.barDanger
                              }
                              style={{
                                height: `${Math.max(
                                  summary.compliance ===
                                    null
                                    ? 0
                                    : 5,
                                  (value /
                                    chartMax) *
                                    100
                                )}%`,
                              }}
                            />
                          </span>

                          <small>
                            {
                              summary.semester
                            }
                          </small>
                        </div>
                      );
                    }
                  )
              ) : (
                <p
                  className={
                    styles.emptyChart
                  }
                >
                  Sin periodos para
                  representar.
                </p>
              )}
            </div>

            <footer>
              El porcentaje usa solamente
              estados academicos explicitos:
              asistencia, tardanza y
              ausencia.
            </footer>
          </article>

          <article
            className={
              styles.readingCard
            }
          >
            <header
              className={
                styles.sideHeader
              }
            >
              <h2>
                Lectura historica del
                supervisor
              </h2>
            </header>

            <div
              className={
                styles.readingBody
              }
            >
              <strong>
                {
                  historicalReading.title
                }
              </strong>

              <p>
                {
                  historicalReading.description
                }
              </p>

              <div
                className={
                  styles.readingTags
                }
              >
                {historicalReading.tags.map(
                  (tag) => (
                    <span
                      key={tag.label}
                      className={
                        tag.tone ===
                        "green"
                          ? styles.tagGreen
                          : tag.tone ===
                              "amber"
                            ? styles.tagAmber
                            : styles.tagBlue
                      }
                    >
                      {tag.label}
                    </span>
                  )
                )}
              </div>
            </div>
          </article>

          <article
            className={
              styles.scopeCard
            }
          >
            <header
              className={
                styles.sideHeader
              }
            >
              <h2>
                Alcance de la consulta
              </h2>
            </header>

            <dl>
              <div>
                <dt>
                  Docente
                </dt>
                <dd>
                  {teacherName(
                    selectedTeacher
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Semestres cerrados
                </dt>
                <dd>
                  {
                    previousSemesters.length
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Ingresos visibles
                </dt>
                <dd>
                  {
                    totals.institutional
                  }
                </dd>
              </div>

              <div>
                <dt>
                  Registros academicos
                </dt>
                <dd>
                  {totals.attendance +
                    totals.late +
                    totals.absent +
                    totals.other}
                </dd>
              </div>
            </dl>

            <footer>
              Vista de solo lectura. No se
              modifican semestres, horarios
              ni registros de asistencia.
            </footer>
          </article>
        </aside>
      </section>
    </div>
  );
}
