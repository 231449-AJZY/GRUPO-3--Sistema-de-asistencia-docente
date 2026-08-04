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

type AttendanceType =
  | "INSTITUCIONAL"
  | "CURSO";

type StatusFilter =
  | "TODOS"
  | "PUNTUAL"
  | "PRESENTE"
  | "TARDANZA"
  | "AUSENTE";

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

interface HistoryRecord {
  id: string;
  date: string;
  time: string;
  type: AttendanceType;
  course: string;
  room: string;
  status: string;
  detail: string;
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

function firstDayOfMonth(): string {
  const now = new Date();

  return localDateKey(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )
  );
}

function formatDate(
  value: string
): string {
  const clean = cleanDate(value);
  const [year, month, day] =
    clean.split("-").map(Number);

  if (!year || !month || !day) {
    return value || "-";
  }

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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

function statusLabel(
  value: string
): string {
  const normalized =
    normalizeStatus(value);

  if (normalized === "PUNTUAL") {
    return "Puntual";
  }

  if (normalized === "PRESENTE") {
    return "Presente";
  }

  if (normalized === "TARDANZA") {
    return "Tardanza";
  }

  if (normalized === "AUSENTE") {
    return "Ausente";
  }

  return normalized
    ? normalized.toLowerCase()
    : "Pendiente";
}

function statusTone(
  value: string
):
  | "success"
  | "warning"
  | "danger"
  | "neutral" {
  const normalized =
    normalizeStatus(value);

  if (
    normalized === "PUNTUAL" ||
    normalized === "PRESENTE"
  ) {
    return "success";
  }

  if (normalized === "TARDANZA") {
    return "warning";
  }

  if (normalized === "AUSENTE") {
    return "danger";
  }

  return "neutral";
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

function toHistoryRecords(
  payload: AttendancePayload
): HistoryRecord[] {
  const institutional =
    (payload.ingresos ?? []).map(
      (entry, index) => ({
        id: `institutional-${entry.fecha}-${entry.hora_registro}-${index}`,
        date: entry.fecha,
        time: entry.hora_registro,
        type:
          "INSTITUCIONAL" as const,
        course:
          "Ingreso institucional",
        room: "-",
        status: entry.estado,
        detail:
          "Acceso general a la universidad",
      })
    );

  const courses =
    (payload.cursos ?? []).map(
      (entry, index) => ({
        id: `course-${entry.fecha}-${entry.hora_registro}-${index}`,
        date: entry.fecha,
        time: entry.hora_registro,
        type: "CURSO" as const,
        course:
          entry.curso ||
          "Curso asignado",
        room: entry.aula || "-",
        status: entry.estado,
        detail:
          "Marcacion de sesion academica",
      })
    );

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
        "No se pudo cargar el historial de asistencia.",
      response.status
    );
  }

  return (
    (data as AttendancePayload | null) ??
    {}
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const tone =
    statusTone(status);

  return (
    <span
      className={`${styles.statusBadge} ${
        styles[`status${tone}`]
      }`}
    >
      <span />
      {statusLabel(status)}
    </span>
  );
}

function MetricIcon({
  type,
}: {
  type:
    | "total"
    | "success"
    | "late"
    | "absence";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "total") {
    return (
      <svg {...common}>
        <path d="M5 3h14v18H5z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    );
  }

  if (type === "success") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="m8 12 3 3 5-6" />
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
  value: string;
  description: string;
  tone:
    | "blue"
    | "green"
    | "amber"
    | "red";
  icon:
    | "total"
    | "success"
    | "late"
    | "absence";
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

export default function AttendanceHistoryPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserData | null>(
      null
    );
  const [
    records,
    setRecords,
  ] = useState<
    HistoryRecord[]
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
  ] = useState(
    firstDayOfMonth
  );
  const [endDate, setEndDate] =
    useState(localDateKey);
  const [typeFilter, setTypeFilter] =
    useState<
      "TODOS" | AttendanceType
    >("TODOS");
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>("TODOS");
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
            toHistoryRecords(
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
            : "No se pudo cargar el historial de asistencia."
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
          const matchesStatus =
            statusFilter ===
              "TODOS" ||
            normalizeStatus(
              record.status
            ) === statusFilter;
          const matchesCourse =
            courseFilter ===
              "TODOS" ||
            record.course ===
              courseFilter;

          return (
            matchesStart &&
            matchesEnd &&
            matchesType &&
            matchesStatus &&
            matchesCourse
          );
        }),
      [
        records,
        startDate,
        endDate,
        typeFilter,
        statusFilter,
        courseFilter,
      ]
    );

  useEffect(() => {
    setPage(1);
  }, [
    startDate,
    endDate,
    typeFilter,
    statusFilter,
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

  const successfulCount =
    filteredRecords.filter(
      (record) =>
        [
          "PUNTUAL",
          "PRESENTE",
        ].includes(
          normalizeStatus(
            record.status
          )
        )
    ).length;

  const lateCount =
    filteredRecords.filter(
      (record) =>
        normalizeStatus(
          record.status
        ) === "TARDANZA"
    ).length;

  const absenceCount =
    filteredRecords.filter(
      (record) =>
        normalizeStatus(
          record.status
        ) === "AUSENTE"
    ).length;

  const compliance =
    filteredRecords.length > 0
      ? Math.round(
          (successfulCount /
            filteredRecords.length) *
            100
        )
      : 0;

  const teacherName =
    getUserName(user);

  function clearFilters() {
    setStartDate(
      firstDayOfMonth()
    );
    setEndDate(
      localDateKey()
    );
    setTypeFilter("TODOS");
    setStatusFilter("TODOS");
    setCourseFilter("TODOS");
  }

  function exportCsv() {
    const header = [
      "Fecha",
      "Hora",
      "Tipo",
      "Curso o dependencia",
      "Aula",
      "Estado",
      "Detalle",
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
          statusLabel(
            record.status
          ),
          record.detail,
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
      `historial-asistencia-${localDateKey()}.csv`;
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
        title="Cargando historial de asistencia"
        description="Consolidando ingresos institucionales y marcaciones academicas."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar el historial"
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
      <div
        className={
          styles.backRow
        }
      >
        <Link
          href="/docente/asistencia"
          className={
            styles.backLink
          }
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a Mi asistencia
        </Link>
      </div>

      <PageHeader
        eyebrow="Mi asistencia"
        title="Historial de asistencia"
        description={`Consulta consolidada de ingresos institucionales y sesiones academicas de ${teacherName}.`}
        badge={
          <span
            className={
              styles.personalBadge
            }
          >
            <span />
            Historial personal
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
          title="Registros filtrados"
          value={String(
            filteredRecords.length
          ).padStart(2, "0")}
          description="Ingresos y sesiones en el periodo seleccionado."
          tone="blue"
          icon="total"
        />

        <MetricCard
          title="Puntuales / presentes"
          value={String(
            successfulCount
          ).padStart(2, "0")}
          description={`Cumplimiento calculado: ${compliance}%.`}
          tone="green"
          icon="success"
        />

        <MetricCard
          title="Tardanzas"
          value={String(
            lateCount
          ).padStart(2, "0")}
          description="Registros clasificados fuera de la hora esperada."
          tone="amber"
          icon="late"
        />

        <MetricCard
          title="Inasistencias"
          value={String(
            absenceCount
          ).padStart(2, "0")}
          description="Ausencias incluidas en la respuesta del servidor."
          tone="red"
          icon="absence"
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
              Filtros del historial
            </h2>
            <p>
              Ajuste el periodo y el tipo
              de registro para revisar
              resultados especificos.
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
              max={endDate || undefined}
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
              Tipo de registro
            </span>
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target
                    .value as
                    | "TODOS"
                    | AttendanceType
                )
              }
            >
              <option value="TODOS">
                Todos
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
            <span>Estado</span>
            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
            >
              <option value="TODOS">
                Todos
              </option>
              <option value="PUNTUAL">
                Puntual
              </option>
              <option value="PRESENTE">
                Presente
              </option>
              <option value="TARDANZA">
                Tardanza
              </option>
              <option value="AUSENTE">
                Ausente
              </option>
            </select>
          </label>

          <label
            className={`${styles.filterField} ${styles.courseFilter}`}
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

        <div
          className={
            styles.filterSummary
          }
        >
          <div>
            <span>
              Cumplimiento
            </span>
            <strong>
              {compliance}%
            </strong>
          </div>

          <div
            className={
              styles.progressTrack
            }
            aria-label={`Cumplimiento ${compliance}%`}
          >
            <span
              style={{
                width: `${Math.min(
                  compliance,
                  100
                )}%`,
              }}
            />
          </div>

          <p>
            El backend devuelve hasta 30
            ingresos y 30 marcaciones de
            cursos recientes para la cuenta
            autenticada.
          </p>
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
              Registros encontrados
            </h2>
            <p>
              Resultado consolidado segun
              los filtros aplicados.
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
                <th>Hora</th>
                <th>Tipo</th>
                <th>
                  Curso / dependencia
                </th>
                <th>Aula</th>
                <th>Estado</th>
                <th>Detalle</th>
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
                        <StatusBadge
                          status={
                            record.status
                          }
                        />
                      </td>
                      <td>
                        {record.detail}
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
                    No existen registros
                    que coincidan con los
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
