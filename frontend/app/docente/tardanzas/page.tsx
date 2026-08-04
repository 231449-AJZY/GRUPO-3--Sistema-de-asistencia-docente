"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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

type LateType =
  | "INSTITUCIONAL"
  | "CURSO";

interface UserData {
  id: number;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  email?: string;
  rol: string;
  codigo?: string;
  departamento?: string;
}

interface InstitutionalEntry {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface CourseEntry {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

interface AttendancePayload {
  ingresos?: InstitutionalEntry[];
  cursos?: CourseEntry[];
}

interface LateRecord {
  id: string;
  date: string;
  time: string;
  type: LateType;
  course: string;
  room: string;
  source: string;
}

interface TrendItem {
  key: string;
  label: string;
  count: number;
}

class AttendanceRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "AttendanceRequestError";
    this.status = status;
  }
}

function cleanDate(
  value: string
): string {
  return String(value ?? "").split(
    "T"
  )[0];
}

function localDateKey(
  date = new Date()
): string {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDate(
  value: string
): Date | null {
  const clean = cleanDate(value);
  const [year, month, day] =
    clean.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0,
    0
  );
}

function formatDate(
  value: string
): string {
  const date = parseDate(value);

  if (!date) {
    return value || "-";
  }

  return date.toLocaleDateString(
    "es-PE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatLongDate(
  value: string
): string {
  const date = parseDate(value);

  if (!date) {
    return value || "-";
  }

  return date.toLocaleDateString(
    "es-PE",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(
  value: string
): string {
  return (
    String(value ?? "").slice(0, 5) ||
    "--:--"
  );
}

function normalizeStatus(
  value: string
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function getUserName(
  user: UserData | null
): string {
  if (!user) {
    return "Docente";
  }

  const splitName =
    `${user.nombres ?? ""} ${
      user.apellidos ?? ""
    }`.trim();

  return (
    splitName ||
    user.nombre ||
    "Docente"
  );
}

function toLateRecords(
  payload: AttendancePayload
): LateRecord[] {
  const institutional =
    (payload.ingresos ?? [])
      .filter(
        (entry) =>
          normalizeStatus(
            entry.estado
          ) === "TARDANZA"
      )
      .map((entry, index) => ({
        id: `institutional-${entry.fecha}-${entry.hora_registro}-${index}`,
        date: entry.fecha,
        time: entry.hora_registro,
        type:
          "INSTITUCIONAL" as const,
        course:
          "Ingreso institucional",
        room: "-",
        source:
          "Control de ingreso",
      }));

  const courses =
    (payload.cursos ?? [])
      .filter(
        (entry) =>
          normalizeStatus(
            entry.estado
          ) === "TARDANZA"
      )
      .map((entry, index) => ({
        id: `course-${entry.fecha}-${entry.hora_registro}-${index}`,
        date: entry.fecha,
        time: entry.hora_registro,
        type: "CURSO" as const,
        course:
          entry.curso ||
          "Curso asignado",
        room: entry.aula || "-",
        source:
          "Asistencia a curso",
      }));

  return [
    ...institutional,
    ...courses,
  ].sort((first, second) =>
    `${cleanDate(
      second.date
    )}T${second.time}`.localeCompare(
      `${cleanDate(
        first.date
      )}T${first.time}`
    )
  );
}

async function requestAttendance(
  token: string,
  signal: AbortSignal
): Promise<AttendancePayload> {
  const response = await fetch(
    `${API_URL}/asistencia/docente/me`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal,
    }
  );

  const data =
    (await response
      .json()
      .catch(() => null)) as
      | AttendancePayload
      | { error?: string }
      | null;

  if (!response.ok) {
    throw new AttendanceRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo cargar la consulta de tardanzas.",
      response.status
    );
  }

  return (
    (data as AttendancePayload | null) ??
    {}
  );
}

function buildMonthlyTrend(
  records: LateRecord[]
): TrendItem[] {
  const counts =
    new Map<string, number>();

  records.forEach((record) => {
    const key =
      cleanDate(
        record.date
      ).slice(0, 7);

    if (key.length === 7) {
      counts.set(
        key,
        (counts.get(key) ?? 0) +
          1
      );
    }
  });

  const keys = Array.from(
    counts.keys()
  )
    .sort()
    .slice(-6);

  if (keys.length === 0) {
    const current =
      localDateKey().slice(0, 7);
    keys.push(current);
  }

  return keys.map((key) => {
    const [year, month] =
      key.split("-").map(Number);
    const date = new Date(
      year,
      month - 1,
      1,
      12
    );

    return {
      key,
      label:
        date.toLocaleDateString(
          "es-PE",
          {
            month: "short",
            year: "2-digit",
          }
        ),
      count: counts.get(key) ?? 0,
    };
  });
}

function buildWeekdayTrend(
  records: LateRecord[]
): TrendItem[] {
  const labels = [
    "Dom",
    "Lun",
    "Mar",
    "Mie",
    "Jue",
    "Vie",
    "Sab",
  ];
  const counts = Array.from(
    { length: 7 },
    () => 0
  );

  records.forEach((record) => {
    const date =
      parseDate(record.date);

    if (date) {
      counts[date.getDay()] += 1;
    }
  });

  return [1, 2, 3, 4, 5, 6, 0].map(
    (day) => ({
      key: String(day),
      label: labels[day],
      count: counts[day],
    })
  );
}

function MetricIcon({
  type,
}: {
  type:
    | "total"
    | "institution"
    | "course"
    | "recent";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "total") {
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

  if (type === "institution") {
    return (
      <svg {...common}>
        <path d="M3 21h18M5 21V8l7-5 7 5v13" />
        <path d="M9 21v-5h6v5M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    );
  }

  if (type === "course") {
    return (
      <svg {...common}>
        <path d="M4 5.5 12 2l8 3.5-8 3.5-8-3.5Z" />
        <path d="M7 8v5c0 1.8 2.2 3 5 3s5-1.2 5-3V8" />
      </svg>
    );
  }

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
  tone:
    | "amber"
    | "blue"
    | "violet"
    | "red";
  icon:
    | "total"
    | "institution"
    | "course"
    | "recent";
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

export default function TeacherTardinessPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserData | null>(
      null
    );
  const [
    records,
    setRecords,
  ] = useState<
    LateRecord[]
  >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    reloadKey,
    setReloadKey,
  ] = useState(0);

  const [
    startDate,
    setStartDate,
  ] = useState("");
  const [endDate, setEndDate] =
    useState("");
  const [typeFilter, setTypeFilter] =
    useState<
      "TODOS" | LateType
    >("TODOS");
  const [
    courseFilter,
    setCourseFilter,
  ] = useState("TODOS");
  const [page, setPage] =
    useState(1);

  useEffect(() => {
    let cancelled = false;
    const controller =
      new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      const storedUser =
        getLegacyUser() as
          | UserData
          | null;
      const token =
        getToken();

      if (
        !storedUser ||
        !token
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setUser(storedUser);

      try {
        const payload =
          await requestAttendance(
            token,
            controller.signal
          );

        if (!cancelled) {
          setRecords(
            toLateRecords(
              payload
            )
          );
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (
          loadError instanceof
            AttendanceRequestError &&
          [401, 403].includes(
            loadError.status
          )
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar la consulta de tardanzas."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey, router]);

  const availableCourses =
    useMemo(
      () =>
        Array.from(
          new Set(
            records
              .filter(
                (record) =>
                  record.type ===
                  "CURSO"
              )
              .map(
                (record) =>
                  record.course
              )
          )
        ).sort((first, second) =>
          first.localeCompare(
            second,
            "es-PE"
          )
        ),
      [records]
    );

  const filteredRecords =
    useMemo(
      () =>
        records.filter((record) => {
          const date =
            cleanDate(
              record.date
            );
          const matchesStart =
            !startDate ||
            date >= startDate;
          const matchesEnd =
            !endDate ||
            date <= endDate;
          const matchesType =
            typeFilter === "TODOS" ||
            record.type ===
              typeFilter;
          const matchesCourse =
            courseFilter ===
              "TODOS" ||
            record.course ===
              courseFilter;

          return (
            matchesStart &&
            matchesEnd &&
            matchesType &&
            matchesCourse
          );
        }),
      [
        records,
        startDate,
        endDate,
        typeFilter,
        courseFilter,
      ]
    );

  useEffect(() => {
    setPage(1);
  }, [
    startDate,
    endDate,
    typeFilter,
    courseFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRecords.length /
        PAGE_SIZE
    )
  );

  useEffect(() => {
    setPage((current) =>
      Math.min(
        current,
        totalPages
      )
    );
  }, [totalPages]);

  const visibleRecords =
    useMemo(
      () =>
        filteredRecords.slice(
          (page - 1) *
            PAGE_SIZE,
          page * PAGE_SIZE
        ),
      [filteredRecords, page]
    );

  const institutionalCount =
    filteredRecords.filter(
      (record) =>
        record.type ===
        "INSTITUCIONAL"
    ).length;

  const courseCount =
    filteredRecords.filter(
      (record) =>
        record.type === "CURSO"
    ).length;

  const currentMonth =
    localDateKey().slice(0, 7);

  const currentMonthCount =
    records.filter(
      (record) =>
        cleanDate(
          record.date
        ).startsWith(
          currentMonth
        )
    ).length;

  const latestRecord =
    filteredRecords[0] ??
    null;

  const courseCounts =
    useMemo(() => {
      const map =
        new Map<string, number>();

      filteredRecords
        .filter(
          (record) =>
            record.type ===
            "CURSO"
        )
        .forEach((record) => {
          map.set(
            record.course,
            (map.get(
              record.course
            ) ?? 0) + 1
          );
        });

      return Array.from(
        map.entries()
      ).sort(
        (first, second) =>
          second[1] - first[1] ||
          first[0].localeCompare(
            second[0],
            "es-PE"
          )
      );
    }, [filteredRecords]);

  const mostAffectedCourse =
    courseCounts[0] ??
    null;

  const monthlyTrend =
    useMemo(
      () =>
        buildMonthlyTrend(
          filteredRecords
        ),
      [filteredRecords]
    );

  const weekdayTrend =
    useMemo(
      () =>
        buildWeekdayTrend(
          filteredRecords
        ),
      [filteredRecords]
    );

  const maxMonthlyCount =
    Math.max(
      1,
      ...monthlyTrend.map(
        (item) => item.count
      )
    );

  const maxWeekdayCount =
    Math.max(
      1,
      ...weekdayTrend.map(
        (item) => item.count
      )
    );

  const teacherName =
    getUserName(user);

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setTypeFilter("TODOS");
    setCourseFilter("TODOS");
  }

  function changeType(
    value: "TODOS" | LateType
  ) {
    setTypeFilter(value);

    if (
      value ===
      "INSTITUCIONAL"
    ) {
      setCourseFilter("TODOS");
    }
  }

  function exportCsv() {
    const header = [
      "Fecha",
      "Hora registrada",
      "Tipo",
      "Curso o dependencia",
      "Aula",
      "Estado",
      "Fuente",
    ];

    const rows =
      filteredRecords.map(
        (record) => [
          formatDate(
            record.date
          ),
          formatTime(
            record.time
          ),
          record.type ===
          "INSTITUCIONAL"
            ? "Ingreso institucional"
            : "Asistencia a curso",
          record.course,
          record.room,
          "Tardanza",
          record.source,
        ]
      );

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row.map(csvCell).join(";")
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
      `mis-tardanzas-${localDateKey()}.csv`;
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
        title="Cargando tardanzas"
        description="Consultando los registros institucionales y academicos clasificados como tardanza."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar Tardanzas"
        description={error}
        retryText="Reintentar"
        onRetry={() =>
          setReloadKey(
            (current) =>
              current + 1
          )
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
        eyebrow="Control personal"
        title="Consulta de tardanzas"
        description={`Revise las marcaciones de ${teacherName} que el servidor clasifico como tardanza, tanto institucionales como academicas.`}
        badge={
          <span
            className={
              styles.warningBadge
            }
          >
            <span />
            Solo lectura
          </span>
        }
        actions={
          <div
            className={
              styles.headerActions
            }
          >
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setReloadKey(
                  (current) =>
                    current + 1
                )
              }
            >
              Actualizar
            </Button>

            <Button
              type="button"
              onClick={exportCsv}
              disabled={
                filteredRecords.length ===
                0
              }
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
          title="Tardanzas filtradas"
          value={String(
            filteredRecords.length
          ).padStart(2, "0")}
          description="Total visible segun los filtros aplicados."
          tone="amber"
          icon="total"
        />

        <MetricCard
          title="Ingreso institucional"
          value={String(
            institutionalCount
          ).padStart(2, "0")}
          description="Marcaciones tardias de acceso general."
          tone="blue"
          icon="institution"
        />

        <MetricCard
          title="Asistencia a cursos"
          value={String(
            courseCount
          ).padStart(2, "0")}
          description="Sesiones academicas registradas como tardanza."
          tone="violet"
          icon="course"
        />

        <MetricCard
          title="Tardanzas este mes"
          value={String(
            currentMonthCount
          ).padStart(2, "0")}
          description="Conteo mensual dentro de los registros disponibles."
          tone="red"
          icon="recent"
        />
      </section>

      <section
        className={
          styles.filterCard
        }
      >
        <header
          className={
            styles.filterHeader
          }
        >
          <div>
            <h2>
              Filtros de consulta
            </h2>
            <p>
              Delimite el periodo, el tipo
              de marcacion y el curso.
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
            <span>Desde</span>
            <input
              type="date"
              value={startDate}
              max={
                endDate ||
                undefined
              }
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
            />
          </label>

          <label
            className={
              styles.filterField
            }
          >
            <span>Hasta</span>
            <input
              type="date"
              value={endDate}
              min={
                startDate ||
                undefined
              }
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
            />
          </label>

          <label
            className={
              styles.filterField
            }
          >
            <span>
              Tipo de tardanza
            </span>
            <select
              value={typeFilter}
              onChange={(event) =>
                changeType(
                  event.target
                    .value as
                    | "TODOS"
                    | LateType
                )
              }
            >
              <option value="TODOS">
                Todas
              </option>
              <option value="INSTITUCIONAL">
                Ingreso institucional
              </option>
              <option value="CURSO">
                Asistencia a curso
              </option>
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
                courseFilter
              }
              onChange={(event) =>
                setCourseFilter(
                  event.target.value
                )
              }
              disabled={
                typeFilter ===
                "INSTITUCIONAL"
              }
            >
              <option value="TODOS">
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
        </div>

        <footer
          className={
            styles.sourceNotice
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
            La fuente actual devuelve hasta
            30 ingresos institucionales y
            30 marcaciones de cursos
            recientes. No incluye minutos
            exactos de retraso,
            justificaciones ni hora
            esperada.
          </p>

          <Link
            href="/docente/asistencia/historial"
          >
            Ver historial completo
          </Link>
        </footer>
      </section>

      <section
        className={
          styles.analysisGrid
        }
      >
        <article
          className={
            styles.trendCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Tendencia temporal
              </p>
              <h2>
                Tardanzas por mes
              </h2>
              <p>
                Distribucion calculada
                sobre los registros
                filtrados disponibles.
              </p>
            </div>
          </header>

          <div
            className={
              styles.monthChart
            }
          >
            {monthlyTrend.map(
              (item) => (
                <div
                  key={item.key}
                  className={
                    styles.monthBarItem
                  }
                >
                  <span
                    className={
                      styles.barValue
                    }
                  >
                    {item.count}
                  </span>

                  <div
                    className={
                      styles.barTrack
                    }
                  >
                    <span
                      style={{
                        height:
                          item.count ===
                          0
                            ? "4px"
                            : `${Math.max(
                                14,
                                (item.count /
                                  maxMonthlyCount) *
                                  100
                              )}%`,
                      }}
                    />
                  </div>

                  <strong>
                    {item.label}
                  </strong>
                </div>
              )
            )}
          </div>
        </article>

        <article
          className={
            styles.summaryCard
          }
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Resumen del filtro
              </p>
              <h2>
                Indicadores destacados
              </h2>
              <p>
                Lectura automatica de los
                datos visibles.
              </p>
            </div>
          </header>

          <dl
            className={
              styles.summaryList
            }
          >
            <div>
              <dt>
                Ultima tardanza
              </dt>
              <dd>
                {latestRecord
                  ? `${formatLongDate(
                      latestRecord.date
                    )} · ${formatTime(
                      latestRecord.time
                    )}`
                  : "Sin registros"}
              </dd>
            </div>

            <div>
              <dt>
                Curso con mayor frecuencia
              </dt>
              <dd>
                {mostAffectedCourse
                  ? `${mostAffectedCourse[0]} · ${mostAffectedCourse[1]}`
                  : "Sin tardanzas de cursos"}
              </dd>
            </div>

            <div>
              <dt>
                Tipo predominante
              </dt>
              <dd>
                {institutionalCount ===
                  0 &&
                courseCount === 0
                  ? "Sin datos"
                  : institutionalCount >
                      courseCount
                    ? "Ingreso institucional"
                    : courseCount >
                        institutionalCount
                      ? "Asistencia a cursos"
                      : "Distribucion equilibrada"}
              </dd>
            </div>

            <div>
              <dt>
                Registros disponibles
              </dt>
              <dd>
                {records.length} tardanza(s)
                devuelta(s) por el servidor
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section
        className={
          styles.weekdayCard
        }
      >
        <header
          className={
            styles.cardHeader
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Distribucion semanal
            </p>
            <h2>
              Frecuencia por dia
            </h2>
            <p>
              Comparacion de tardanzas
              filtradas segun el dia de la
              semana.
            </p>
          </div>
        </header>

        <div
          className={
            styles.weekdayBars
          }
        >
          {weekdayTrend.map(
            (item) => (
              <div
                key={item.key}
                className={
                  styles.weekdayItem
                }
              >
                <span>
                  {item.label}
                </span>

                <div>
                  <i
                    style={{
                      width:
                        item.count === 0
                          ? "3px"
                          : `${Math.max(
                              8,
                              (item.count /
                                maxWeekdayCount) *
                                100
                            )}%`,
                    }}
                  />
                </div>

                <strong>
                  {item.count}
                </strong>
              </div>
            )
          )}
        </div>
      </section>

      <section
        className={
          styles.historyCard
        }
      >
        <header
          className={
            styles.historyHeader
          }
        >
          <div>
            <h2>
              Detalle de tardanzas
            </h2>
            <p>
              Registros ordenados desde la
              marcacion mas reciente.
            </p>
          </div>

          <span
            className={
              styles.historyCount
            }
          >
            {filteredRecords.length}{" "}
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
                <th>
                  Hora registrada
                </th>
                <th>Tipo</th>
                <th>
                  Curso / dependencia
                </th>
                <th>Aula</th>
                <th>Estado</th>
                <th>Fuente</th>
              </tr>
            </thead>

            <tbody>
              {visibleRecords.length >
              0 ? (
                visibleRecords.map(
                  (record) => (
                    <tr
                      key={record.id}
                    >
                      <td>
                        <strong>
                          {formatDate(
                            record.date
                          )}
                        </strong>
                      </td>

                      <td
                        className={
                          styles.timeCell
                        }
                      >
                        {formatTime(
                          record.time
                        )}
                      </td>

                      <td>
                        <span
                          className={`${styles.typeBadge} ${
                            record.type ===
                            "INSTITUCIONAL"
                              ? styles.typeInstitutional
                              : styles.typeCourse
                          }`}
                        >
                          {record.type ===
                          "INSTITUCIONAL"
                            ? "Institucional"
                            : "Curso"}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {
                            record.course
                          }
                        </strong>
                      </td>

                      <td>
                        {record.room}
                      </td>

                      <td>
                        <span
                          className={
                            styles.lateBadge
                          }
                        >
                          <span />
                          Tardanza
                        </span>
                      </td>

                      <td>
                        {record.source}
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
                    No existen tardanzas que
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
          <p>
            Mostrando{" "}
            {filteredRecords.length === 0
              ? 0
              : (page - 1) *
                  PAGE_SIZE +
                1}
            {" - "}
            {Math.min(
              page * PAGE_SIZE,
              filteredRecords.length
            )}{" "}
            de{" "}
            {filteredRecords.length}
          </p>

          <div>
            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
                    )
                )
              }
              disabled={page === 1}
            >
              Anterior
            </button>

            <span>
              Pagina {page} de{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1
                    )
                )
              }
              disabled={
                page === totalPages
              }
            >
              Siguiente
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
