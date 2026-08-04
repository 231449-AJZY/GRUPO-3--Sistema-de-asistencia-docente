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

interface AttendanceEntry {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface AttendancePayload {
  ingresos?: AttendanceEntry[];
}

class AttendanceError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name = "AttendanceError";
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
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(
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

  if (normalized === "TARDANZA") {
    return "Tardanza";
  }

  if (normalized === "AUSENTE") {
    return "Ausente";
  }

  if (normalized === "PRESENTE") {
    return "Presente";
  }

  return normalized
    ? normalized.toLowerCase()
    : "Sin registro";
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

async function loadAttendance(
  token: string,
  signal: AbortSignal
): Promise<AttendanceEntry[]> {
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
    throw new AttendanceError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo consultar el ingreso institucional.",
      response.status
    );
  }

  return (
    (
      data as AttendancePayload | null
    )?.ingresos ?? []
  );
}

function MetricIcon({
  type,
}: {
  type:
    | "status"
    | "clock"
    | "calendar"
    | "late";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "status") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (type === "clock") {
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

  if (type === "calendar") {
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

function FingerprintIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M7 12c0-3 2.2-5.3 5-5.3s5 2.3 5 5.3" />
      <path d="M9 17c-1-1.5-1.5-3-1.5-5" />
      <path d="M15 18c1-1.8 1.5-3.8 1.5-6" />
      <path d="M10 12c0-1.5.8-2.7 2-2.7s2 1.2 2 2.7c0 2.4-.8 4.7-2 7" />
      <path d="M12 3c5 0 9 4 9 9" />
      <path d="M3 12c0-5 4-9 9-9" />
    </svg>
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
    | "green"
    | "blue"
    | "amber"
    | "red";
  icon:
    | "status"
    | "clock"
    | "calendar"
    | "late";
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

const VALIDATION_STEPS = [
  {
    number: "01",
    title:
      "Dispositivo autorizado",
    description:
      "La aplicacion comprueba que el telefono este vinculado a la cuenta docente.",
  },
  {
    number: "02",
    title:
      "Validacion biometrica",
    description:
      "La identidad se valida localmente mediante la biometria protegida del dispositivo.",
  },
  {
    number: "03",
    title:
      "Presencia institucional",
    description:
      "Cuando corresponde, se valida la proximidad institucional configurada.",
  },
  {
    number: "04",
    title:
      "Firma y sincronizacion",
    description:
      "La marcacion firmada se transmite al backend y luego aparece en este historial.",
  },
] as const;

export default function InstitutionalEntryPage() {
  const router = useRouter();

  const [user, setUser] =
    useState<UserData | null>(
      null
    );
  const [entries, setEntries] =
    useState<
      AttendanceEntry[]
    >([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    reloadKey,
    setReloadKey,
  ] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller =
      new AbortController();

    async function fetchData() {
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
        const result =
          await loadAttendance(
            token,
            controller.signal
          );

        if (!cancelled) {
          setEntries(result);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (
          loadError instanceof
            AttendanceError &&
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
            : "No se pudo cargar el ingreso institucional."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reloadKey, router]);

  const today =
    localDateKey();

  const todayEntry =
    useMemo(
      () =>
        entries.find(
          (entry) =>
            cleanDate(
              entry.fecha
            ) === today
        ) ?? null,
      [entries, today]
    );

  const monthPrefix =
    today.slice(0, 7);

  const monthEntries =
    useMemo(
      () =>
        entries.filter(
          (entry) =>
            cleanDate(
              entry.fecha
            ).startsWith(
              monthPrefix
            )
        ),
      [entries, monthPrefix]
    );

  const punctualCount =
    monthEntries.filter(
      (entry) =>
        normalizeStatus(
          entry.estado
        ) === "PUNTUAL"
    ).length;

  const lateCount =
    monthEntries.filter(
      (entry) =>
        normalizeStatus(
          entry.estado
        ) === "TARDANZA"
    ).length;

  const teacherName =
    getUserName(user);

  if (loading) {
    return (
      <LoadingState
        title="Cargando ingreso institucional"
        description="Consultando el registro personal del docente."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar el ingreso institucional"
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
        title="Registro de ingreso institucional"
        description="Consulte el estado de su ingreso diario y las marcaciones institucionales sincronizadas desde la aplicacion movil."
        badge={
          <span
            className={
              styles.mobileBadge
            }
          >
            <span />
            Marcacion desde app movil
          </span>
        }
        actions={
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
            Actualizar datos
          </Button>
        }
      />

      <section
        className={
          styles.metricsGrid
        }
      >
        <MetricCard
          title="Estado del dia"
          value={
            todayEntry
              ? statusLabel(
                  todayEntry.estado
                )
              : "Sin registro"
          }
          description={
            todayEntry
              ? `Registro del ${formatShortDate(
                  todayEntry.fecha
                )}`
              : "Aun no existe una marcacion sincronizada hoy."
          }
          tone={
            todayEntry
              ? statusTone(
                  todayEntry.estado
                ) ===
                "success"
                ? "green"
                : statusTone(
                      todayEntry.estado
                    ) ===
                    "warning"
                  ? "amber"
                  : "red"
              : "blue"
          }
          icon="status"
        />

        <MetricCard
          title="Hora registrada"
          value={
            todayEntry
              ? formatTime(
                  todayEntry.hora_registro
                )
              : "--:--"
          }
          description="Hora guardada en el registro institucional."
          tone="blue"
          icon="clock"
        />

        <MetricCard
          title="Ingresos del mes"
          value={String(
            monthEntries.length
          ).padStart(2, "0")}
          description={`${punctualCount} registro(s) puntual(es).`}
          tone="green"
          icon="calendar"
        />

        <MetricCard
          title="Tardanzas del mes"
          value={String(
            lateCount
          ).padStart(2, "0")}
          description="Registros clasificados como tardanza."
          tone="amber"
          icon="late"
        />
      </section>

      <section
        className={
          styles.mainGrid
        }
      >
        <article
          className={
            styles.validationCard
          }
        >
          <header>
            <div>
              <p
                className={
                  styles.eyebrow
                }
              >
                Estado actual
              </p>
              <h2>
                Validacion de ingreso
              </h2>
              <p>
                La web consulta el resultado;
                la captura biometrica se
                realiza de forma segura en
                la aplicacion movil.
              </p>
            </div>

            <StatusBadge
              status={
                todayEntry
                  ?.estado ?? ""
              }
            />
          </header>

          <div
            className={
              styles.fingerprintArea
            }
          >
            <div
              className={`${styles.fingerprintHalo} ${
                todayEntry
                  ? styles.registeredHalo
                  : ""
              }`}
            >
              <span
                className={
                  styles.fingerprintIcon
                }
              >
                <FingerprintIcon />
              </span>
            </div>

            <h3>
              {todayEntry
                ? "Ingreso sincronizado correctamente"
                : "Ingreso pendiente de sincronizacion"}
            </h3>

            <p>
              {todayEntry
                ? `${teacherName}, su ingreso del ${formatDate(
                    todayEntry.fecha
                  )} fue registrado a las ${formatTime(
                    todayEntry.hora_registro
                  )}.`
                : `${teacherName}, todavia no aparece un ingreso institucional para hoy. Realice la marcacion desde la aplicacion movil autorizada.`}
            </p>

            <div
              className={
                styles.readOnlyNotice
              }
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
                <path d="M9 12h6M12 9v6" />
              </svg>

              <div>
                <strong>
                  Consulta protegida
                </strong>
                <span>
                  Esta pantalla no crea ni
                  altera marcaciones.
                </span>
              </div>
            </div>
          </div>
        </article>

        <article
          className={
            styles.flowCard
          }
        >
          <header>
            <p
              className={
                styles.eyebrow
              }
            >
              Proceso seguro
            </p>
            <h2>
              Flujo de marcacion
            </h2>
            <p>
              Etapas requeridas para que
              un ingreso aparezca como
              registrado.
            </p>
          </header>

          <ol
            className={
              styles.stepsList
            }
          >
            {VALIDATION_STEPS.map(
              (step) => (
                <li
                  key={
                    step.number
                  }
                >
                  <span>
                    {step.number}
                  </span>

                  <div>
                    <strong>
                      {step.title}
                    </strong>
                    <p>
                      {
                        step.description
                      }
                    </p>
                  </div>
                </li>
              )
            )}
          </ol>

          <div
            className={
              styles.flowFooter
            }
          >
            <span
              className={
                styles.phoneIcon
              }
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="7"
                  y="2"
                  width="10"
                  height="20"
                  rx="2"
                />
                <path d="M10 5h4M11 19h2" />
              </svg>
            </span>

            <div>
              <strong>
                Use la aplicacion movil
              </strong>
              <p>
                La web funciona como
                consulta y seguimiento del
                registro confirmado.
              </p>
            </div>
          </div>
        </article>
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
              Historial de ingresos
            </h2>
            <p>
              Ultimos registros
              institucionales devueltos por
              el servidor para su cuenta.
            </p>
          </div>

          <span
            className={
              styles.historyCount
            }
          >
            {entries.length} registro(s)
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
                <th>Estado</th>
                <th>Tipo</th>
                <th>Origen</th>
              </tr>
            </thead>

            <tbody>
              {entries.length > 0 ? (
                entries.map(
                  (
                    entry,
                    index
                  ) => (
                    <tr
                      key={`${entry.fecha}-${entry.hora_registro}-${index}`}
                    >
                      <td>
                        <strong>
                          {formatShortDate(
                            entry.fecha
                          )}
                        </strong>
                      </td>
                      <td
                        className={
                          styles.timeCell
                        }
                      >
                        {formatTime(
                          entry.hora_registro
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            entry.estado
                          }
                        />
                      </td>
                      <td>
                        Ingreso
                        institucional
                      </td>
                      <td>
                        Sistema
                        institucional
                      </td>
                    </tr>
                  )
                )
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className={
                      styles.emptyCell
                    }
                  >
                    Todavia no existen
                    ingresos institucionales
                    para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
