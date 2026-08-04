"use client";

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

interface SessionUser {
  id?: number | string;
  usuario_id?: number | string;
  docente_id?: number | string | null;
  codigo?: string;
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  email?: string;
  correo?: string;
  rol?: string;
  activo?: boolean;
  categoria?: string | null;
  condicion?: string | null;
  departamento?: string | null;
}

interface BackendSchedule {
  id: number | string;
  curso_id: number | string;
  aula?: string;
  dia_semana: number | string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  curso_codigo?: string;
  curso?: string;
  creditos?: number | string;
  semestre?: string;
  semestre_activo?: boolean;
  departamento?: string;
}

interface ProfileResponse {
  user?: SessionUser;
  error?: string;
}

interface SchedulesResponse {
  horarios?: BackendSchedule[];
  error?: string;
}

interface CourseSummary {
  id: number;
  code: string;
  name: string;
  credits: number;
  semester: string;
  sessions: number;
}

class ProfileRequestError extends Error {
  status: number;

  constructor(
    message: string,
    status: number
  ) {
    super(message);
    this.name =
      "ProfileRequestError";
    this.status = status;
  }
}

function cleanText(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function fullName(
  user: SessionUser | null
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
    cleanText(user.nombre) ||
    "Docente"
  );
}

function initials(
  user: SessionUser | null
): string {
  const parts = fullName(user)
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "DO";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function formatTime(
  value: string
): string {
  return (
    String(value ?? "").slice(0, 5) ||
    "--:--"
  );
}

function dayLabel(
  value: number
): string {
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miercoles",
    "Jueves",
    "Viernes",
    "Sabado",
  ];

  return days[value] ?? "Dia";
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
  token: string,
  signal: AbortSignal
): Promise<T> {
  const response = await fetch(
    `${API_URL}${path}`,
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
      | T
      | { error?: string }
      | null;

  if (!response.ok) {
    throw new ProfileRequestError(
      (
        data as
          | { error?: string }
          | null
      )?.error ??
        "No se pudo consultar el perfil docente.",
      response.status
    );
  }

  return (data ?? {}) as T;
}

function MetricIcon({
  type,
}: {
  type:
    | "courses"
    | "sessions"
    | "credits"
    | "semester";
}) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;

  if (type === "courses") {
    return (
      <svg {...common}>
        <path d="M4 5.5 12 2l8 3.5-8 3.5-8-3.5Z" />
        <path d="M7 8v5c0 1.8 2.2 3 5 3s5-1.2 5-3V8" />
      </svg>
    );
  }

  if (type === "sessions") {
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
        <path d="M8 14h3M13 14h3M8 18h3" />
      </svg>
    );
  }

  if (type === "credits") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="12"
          r="9"
        />
        <path d="M8 12h8M12 8v8" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 3h14v18H5z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
      <path d="m15 18 2 2 4-4" />
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
    | "violet"
    | "amber";
  icon:
    | "courses"
    | "sessions"
    | "credits"
    | "semester";
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
          title={value}
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

function FieldRow({
  label,
  value,
  restricted = false,
}: {
  label: string;
  value: string;
  restricted?: boolean;
}) {
  return (
    <div
      className={
        styles.fieldRow
      }
    >
      <dt>{label}</dt>
      <dd
        className={
          restricted
            ? styles.restrictedValue
            : ""
        }
      >
        {value}
      </dd>
    </div>
  );
}

function StatusRow({
  label,
  value,
  tone,
  description,
}: {
  label: string;
  value: string;
  tone:
    | "success"
    | "blue"
    | "neutral";
  description: string;
}) {
  return (
    <div
      className={
        styles.statusRow
      }
    >
      <span
        className={`${styles.statusIcon} ${
          styles[`status${tone}`]
        }`}
        aria-hidden="true"
      >
        {tone === "success" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="m8 12 3 3 5-6" />
          </svg>
        ) : tone === "blue" ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
            <path d="M9 12h6" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />
            <path d="M12 11v5M12 8h.01" />
          </svg>
        )}
      </span>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

export default function TeacherProfilePage() {
  const router = useRouter();

  const [
    profile,
    setProfile,
  ] = useState<
    SessionUser | null
  >(null);
  const [
    schedules,
    setSchedules,
  ] = useState<
    BackendSchedule[]
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
    copiedField,
    setCopiedField,
  ] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller =
      new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      const storedUser =
        getLegacyUser() as
          | SessionUser
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

      try {
        const [
          profileResponse,
          schedulesResponse,
        ] = await Promise.all([
          requestJson<ProfileResponse>(
            "/auth/me",
            token,
            controller.signal
          ),
          requestJson<SchedulesResponse>(
            "/horarios/me",
            token,
            controller.signal
          ),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(
          profileResponse.user ??
            storedUser
        );
        setSchedules(
          (
            schedulesResponse.horarios ??
            []
          ).filter(
            (item) => item.activo
          )
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (
          loadError instanceof
            ProfileRequestError &&
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
            : "No se pudo cargar el perfil docente."
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

  const activeSemester =
    useMemo(
      () =>
        schedules.find(
          (schedule) =>
            schedule
              .semestre_activo
        )?.semestre ??
        schedules[0]?.semestre ??
        "Sin semestre",
      [schedules]
    );

  const courses =
    useMemo<CourseSummary[]>(
      () => {
        const map =
          new Map<
            number,
            CourseSummary
          >();

        schedules.forEach(
          (schedule) => {
            const courseId =
              Number(
                schedule.curso_id
              );
            const current =
              map.get(courseId);

            if (current) {
              current.sessions += 1;
              return;
            }

            map.set(courseId, {
              id: courseId,
              code:
                schedule.curso_codigo ??
                `CUR-${courseId}`,
              name:
                schedule.curso ??
                "Curso asignado",
              credits: Number(
                schedule.creditos ?? 0
              ),
              semester:
                schedule.semestre ??
                "Sin semestre",
              sessions: 1,
            });
          }
        );

        return Array.from(
          map.values()
        ).sort((first, second) =>
          first.name.localeCompare(
            second.name,
            "es-PE"
          )
        );
      },
      [schedules]
    );

  const totalCredits =
    useMemo(
      () =>
        courses.reduce(
          (sum, course) =>
            sum +
            course.credits,
          0
        ),
      [courses]
    );

  const department =
    cleanText(
      profile?.departamento
    ) ||
    cleanText(
      schedules[0]
        ?.departamento
    ) ||
    "No informado";

  const code =
    cleanText(
      profile?.codigo
    ) || "No informado";

  const email =
    cleanText(
      profile?.email ??
        profile?.correo
    ) || "No informado";

  const role =
    cleanText(profile?.rol) ||
    "Docente";

  const category =
    cleanText(
      profile?.categoria
    ) || "No informado";

  const condition =
    cleanText(
      profile?.condicion
    ) || "No informado";

  async function copyValue(
    label: string,
    value: string
  ) {
    try {
      await navigator.clipboard.writeText(
        value
      );
      setCopiedField(label);

      window.setTimeout(() => {
        setCopiedField("");
      }, 1800);
    } catch {
      setCopiedField("");
    }
  }

  function exportCsv() {
    const rows: Array<
      [string, string | number]
    > = [
      [
        "Nombre completo",
        fullName(profile),
      ],
      ["Codigo institucional", code],
      ["Correo institucional", email],
      ["Rol", role],
      ["Departamento", department],
      ["Categoria", category],
      ["Condicion", condition],
      [
        "Estado de cuenta",
        profile?.activo === false
          ? "Inactiva"
          : "Activa",
      ],
      [
        "Cursos asignados",
        courses.length,
      ],
      [
        "Sesiones semanales",
        schedules.length,
      ],
      [
        "Creditos acumulados",
        totalCredits,
      ],
      [
        "Semestre visible",
        activeSemester,
      ],
    ];

    const csv = [
      ["Campo", "Valor"],
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
      `perfil-docente-${code}.csv`;
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
        title="Cargando perfil docente"
        description="Consultando la identidad institucional y el resumen academico de la cuenta."
        fullHeight
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No se pudo cargar el perfil"
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
        eyebrow="Cuenta institucional"
        title="Perfil docente"
        description="Consulte su identidad, vinculo academico, estado de acceso y resumen de programacion registrado en el sistema."
        badge={
          <span
            className={
              profile?.activo ===
              false
                ? styles.inactiveBadge
                : styles.activeBadge
            }
          >
            <span />
            {profile?.activo ===
            false
              ? "Cuenta inactiva"
              : "Cuenta activa"}
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
            >
              Exportar ficha
            </Button>
          </div>
        }
      />

      <section
        className={
          styles.profileHero
        }
      >
        <div
          className={
            styles.avatar
          }
          aria-hidden="true"
        >
          {initials(profile)}
        </div>

        <div
          className={
            styles.identity
          }
        >
          <p
            className={
              styles.identityEyebrow
            }
          >
            {role}
          </p>

          <h2>
            {fullName(profile)}
          </h2>

          <p>
            {department}
          </p>

          <div
            className={
              styles.identityTags
            }
          >
            <span>{code}</span>
            <span>{category}</span>
            <span>{condition}</span>
          </div>
        </div>

        <div
          className={
            styles.heroActions
          }
        >
          <button
            type="button"
            onClick={() =>
              void copyValue(
                "codigo",
                code
              )
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="8"
                y="8"
                width="12"
                height="12"
                rx="2"
              />
              <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
            </svg>
            {copiedField ===
            "codigo"
              ? "Codigo copiado"
              : "Copiar codigo"}
          </button>

          <button
            type="button"
            onClick={() =>
              void copyValue(
                "correo",
                email
              )
            }
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
              />
              <path d="m4 7 8 6 8-6" />
            </svg>
            {copiedField ===
            "correo"
              ? "Correo copiado"
              : "Copiar correo"}
          </button>
        </div>
      </section>

      <section
        className={
          styles.metricsGrid
        }
      >
        <MetricCard
          title="Cursos asignados"
          value={String(
            courses.length
          ).padStart(2, "0")}
          description="Cursos distintos dentro de la programacion activa."
          tone="blue"
          icon="courses"
        />

        <MetricCard
          title="Sesiones semanales"
          value={String(
            schedules.length
          ).padStart(2, "0")}
          description="Bloques academicos activos por semana."
          tone="green"
          icon="sessions"
        />

        <MetricCard
          title="Creditos acumulados"
          value={String(
            totalCredits
          ).padStart(2, "0")}
          description="Suma de creditos de los cursos visibles."
          tone="violet"
          icon="credits"
        />

        <MetricCard
          title="Semestre visible"
          value={activeSemester}
          description="Periodo asociado a la programacion consultada."
          tone="amber"
          icon="semester"
        />
      </section>

      <section
        className={
          styles.informationGrid
        }
      >
        <article
          className={
            styles.infoCard
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
                Identidad
              </p>
              <h2>
                Datos institucionales
              </h2>
              <p>
                Informacion obtenida desde
                la sesion autenticada.
              </p>
            </div>
          </header>

          <dl
            className={
              styles.fieldsList
            }
          >
            <FieldRow
              label="Codigo institucional"
              value={code}
            />
            <FieldRow
              label="Nombres"
              value={
                cleanText(
                  profile?.nombres
                ) ||
                "No informado"
              }
            />
            <FieldRow
              label="Apellidos"
              value={
                cleanText(
                  profile?.apellidos
                ) ||
                "No informado"
              }
            />
            <FieldRow
              label="Correo institucional"
              value={email}
            />
            <FieldRow
              label="Rol de acceso"
              value={role}
            />
          </dl>
        </article>

        <article
          className={
            styles.infoCard
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
                Vinculo academico
              </p>
              <h2>
                Datos docentes
              </h2>
              <p>
                Informacion del perfil
                academico asociado.
              </p>
            </div>
          </header>

          <dl
            className={
              styles.fieldsList
            }
          >
            <FieldRow
              label="Departamento"
              value={department}
            />
            <FieldRow
              label="Categoria"
              value={category}
            />
            <FieldRow
              label="Condicion"
              value={condition}
            />
            <FieldRow
              label="DNI"
              value="Restringido al Administrador"
              restricted
            />
            <FieldRow
              label="Telefono"
              value="Restringido al Administrador"
              restricted
            />
          </dl>
        </article>
      </section>

      <section
        className={
          styles.securityGrid
        }
      >
        <article
          className={
            styles.securityCard
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
                Seguridad
              </p>
              <h2>
                Estado de la cuenta
              </h2>
              <p>
                Controles aplicados a la
                consulta del perfil.
              </p>
            </div>
          </header>

          <div
            className={
              styles.statusList
            }
          >
            <StatusRow
              label="Cuenta institucional"
              value={
                profile?.activo ===
                false
                  ? "Inactiva"
                  : "Activa"
              }
              tone={
                profile?.activo ===
                false
                  ? "neutral"
                  : "success"
              }
              description="Estado devuelto por el backend para la cuenta autenticada."
            />

            <StatusRow
              label="Perfil de acceso"
              value={role}
              tone="blue"
              description="La ruta requiere una sesion valida y permisos del rol Docente."
            />

            <StatusRow
              label="Datos personales"
              value="Consulta protegida"
              tone="blue"
              description="La pagina no solicita identificadores de otros docentes."
            />

            <StatusRow
              label="Actualizacion de datos"
              value="Gestion administrativa"
              tone="neutral"
              description="Los cambios de identidad y vinculo academico los realiza el Administrador."
            />
          </div>
        </article>

        <article
          className={
            styles.noticeCard
          }
        >
          <span
            className={
              styles.noticeIcon
            }
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </span>

          <p
            className={
              styles.noticeEyebrow
            }
          >
            Proteccion de datos
          </p>

          <h2>
            Perfil personal de solo lectura
          </h2>

          <p>
            Esta pantalla no modifica la
            base de datos. El DNI, telefono,
            cambio de correo, categoria,
            condicion y departamento se
            mantienen bajo gestion
            administrativa.
          </p>

          <div
            className={
              styles.noticeBox
            }
          >
            <strong>
              ¿Detecto un dato incorrecto?
            </strong>
            <span>
              Comuniquelo al Administrador
              para que actualice la ficha
              oficial y conserve la
              trazabilidad institucional.
            </span>
          </div>
        </article>
      </section>

      <section
        className={
          styles.coursesCard
        }
      >
        <header
          className={
            styles.coursesHeader
          }
        >
          <div>
            <h2>
              Resumen academico
            </h2>
            <p>
              Cursos vinculados a la
              programacion actualmente
              visible.
            </p>
          </div>

          <span
            className={
              styles.courseCount
            }
          >
            {courses.length} curso(s)
          </span>
        </header>

        <div
          className={
            styles.tableScroll
          }
        >
          <table
            className={
              styles.coursesTable
            }
          >
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Curso</th>
                <th>Semestre</th>
                <th>Creditos</th>
                <th>
                  Sesiones semanales
                </th>
                <th>
                  Primer horario
                </th>
              </tr>
            </thead>

            <tbody>
              {courses.length > 0 ? (
                courses.map(
                  (course) => {
                    const firstSchedule =
                      schedules
                        .filter(
                          (
                            schedule
                          ) =>
                            Number(
                              schedule.curso_id
                            ) ===
                            course.id
                        )
                        .sort(
                          (
                            first,
                            second
                          ) =>
                            Number(
                              first.dia_semana
                            ) -
                              Number(
                                second.dia_semana
                              ) ||
                            first.hora_inicio.localeCompare(
                              second.hora_inicio
                            )
                        )[0];

                    return (
                      <tr
                        key={course.id}
                      >
                        <td>
                          <strong>
                            {
                              course.code
                            }
                          </strong>
                        </td>

                        <td>
                          <strong>
                            {
                              course.name
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            course.semester
                          }
                        </td>

                        <td
                          className={
                            styles.numberCell
                          }
                        >
                          {
                            course.credits
                          }
                        </td>

                        <td
                          className={
                            styles.numberCell
                          }
                        >
                          {
                            course.sessions
                          }
                        </td>

                        <td>
                          {firstSchedule
                            ? `${dayLabel(
                                Number(
                                  firstSchedule.dia_semana
                                )
                              )} · ${formatTime(
                                firstSchedule.hora_inicio
                              )}`
                            : "-"}
                        </td>
                      </tr>
                    );
                  }
                )
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className={
                      styles.emptyCell
                    }
                  >
                    No existen cursos
                    activos para mostrar en
                    el perfil.
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
