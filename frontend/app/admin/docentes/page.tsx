"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import DeleteDocenteDialog from "@/components/admin/docentes/DeleteDocenteDialog";
import DocenteFormModal from "@/components/admin/docentes/DocenteFormModal";
import DocentesTable from "@/components/admin/docentes/DocentesTable";
import DashboardLayout from "@/components/layout/DashboardLayout";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

import { clearSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";

import {
  ApiDocentesError,
  changeDocenteStatus,
  createDocente,
  deleteDocente,
  getDocenteCatalogos,
  getDocentes,
  updateDocente,
  type DeleteDocenteDependencies,
} from "@/lib/services/docentes.service";

import type {
  Docente,
  DocenteFormData,
  EstadoDocente,
} from "@/types/docente";

type ModalMode =
  | "create"
  | "edit"
  | "view";

type SummaryVariant =
  | "blue"
  | "green"
  | "yellow"
  | "red";

export default function AdminDocentesPage() {
  const router = useRouter();

  const [docentes, setDocentes] =
    useState<Docente[]>([]);

  const [
    departamentosDisponibles,
    setDepartamentosDisponibles,
  ] = useState<string[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [
    operationError,
    setOperationError,
  ] = useState<string | null>(null);

  const [
    temporaryPassword,
    setTemporaryPassword,
  ] = useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    departamentoFilter,
    setDepartamentoFilter,
  ] = useState("Todos");

  const [estadoFilter, setEstadoFilter] =
    useState<EstadoDocente | "Todos">(
      "Todos"
    );

  const [modalOpen, setModalOpen] =
    useState(false);

  const [modalMode, setModalMode] =
    useState<ModalMode>("create");

  const [
    selectedDocente,
    setSelectedDocente,
  ] = useState<Docente | null>(null);

  const [
    pendingStatusDocente,
    setPendingStatusDocente,
  ] = useState<Docente | null>(null);

  const [
    pendingDeleteDocente,
    setPendingDeleteDocente,
  ] = useState<Docente | null>(null);

  const [
    blockedDeleteDocente,
    setBlockedDeleteDocente,
  ] = useState<Docente | null>(null);

  const [
    blockedDeleteDetails,
    setBlockedDeleteDetails,
  ] = useState<
    Partial<DeleteDocenteDependencies> | null
  >(null);

  const loadDocentes = useCallback(
    async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const [data, catalogos] =
          await Promise.all([
            getDocentes(),
            getDocenteCatalogos(),
          ]);

        setDocentes(data);
        setDepartamentosDisponibles(
          catalogos.departamentos.map(
            (item) => item.nombre
          )
        );
      } catch (error) {
        if (
          error instanceof ApiDocentesError &&
          error.status === 401
        ) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (
          error instanceof ApiDocentesError &&
          error.status === 403
        ) {
          setLoadError(
            "La cuenta autenticada no tiene permiso para gestionar docentes."
          );
          return;
        }

        setLoadError(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    // La carga inicial sincroniza este módulo con PostgreSQL.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocentes();
  }, [loadDocentes]);

  const departamentos = useMemo(() => {
    return Array.from(
      new Set([
        ...departamentosDisponibles,
        ...docentes.map(
          (docente) => docente.departamento
        ),
      ])
    )
      .filter(Boolean)
      .sort((a, b) =>
        a.localeCompare(b, "es")
      );
  }, [
    departamentosDisponibles,
    docentes,
  ]);

  const filteredDocentes = useMemo(() => {
    const normalizedSearch =
      searchTerm
        .trim()
        .toLowerCase();

    return docentes.filter((docente) => {
      const fullName =
        `${docente.nombres} ${docente.apellidos}`
          .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        fullName.includes(normalizedSearch) ||
        docente.codigo
          .toLowerCase()
          .includes(normalizedSearch) ||
        docente.dni.includes(normalizedSearch) ||
        docente.correo
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesDepartamento =
        departamentoFilter === "Todos" ||
        docente.departamento ===
          departamentoFilter;

      const matchesEstado =
        estadoFilter === "Todos" ||
        docente.estado === estadoFilter;

      return (
        matchesSearch &&
        matchesDepartamento &&
        matchesEstado
      );
    });
  }, [
    docentes,
    searchTerm,
    departamentoFilter,
    estadoFilter,
  ]);

  const stats = useMemo(() => {
    const total = docentes.length;

    const activos = docentes.filter(
      (docente) =>
        docente.estado === "Activo"
    ).length;

    const biometricos = docentes.filter(
      (docente) =>
        docente.estadoBiometrico ===
        "Registrado"
    ).length;

    const pendientes = docentes.filter(
      (docente) =>
        docente.estadoBiometrico ===
          "Pendiente" ||
        docente.estado !== "Activo"
    ).length;

    return {
      total,
      activos,
      biometricos,
      pendientes,
    };
  }, [docentes]);

  const hasFilters =
    searchTerm.trim().length > 0 ||
    departamentoFilter !== "Todos" ||
    estadoFilter !== "Todos";

  function openCreateModal() {
    setOperationError(null);
    setModalMode("create");
    setSelectedDocente(null);
    setModalOpen(true);
  }

  function openViewModal(
    docente: Docente
  ) {
    setOperationError(null);
    setModalMode("view");
    setSelectedDocente(docente);
    setModalOpen(true);
  }

  function openEditModal(
    docente: Docente
  ) {
    setOperationError(null);
    setModalMode("edit");
    setSelectedDocente(docente);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setModalOpen(false);
    setSelectedDocente(null);
  }

  async function handleSubmitDocente(
    data: DocenteFormData
  ) {
    setSubmitting(true);
    setOperationError(null);
    setTemporaryPassword(null);

    try {
      if (
        modalMode === "edit" &&
        selectedDocente
      ) {
        const updated =
          await updateDocente(
            selectedDocente.id,
            data
          );

        setDocentes((current) =>
          current.map((docente) =>
            docente.id === updated.id
              ? updated
              : docente
          )
        );

        closeModalAfterSuccess();
        return;
      }

      const result =
        await createDocente(data);

      setDocentes((current) => [
        result.docente,
        ...current,
      ]);

      if (result.passwordTemporal) {
        setTemporaryPassword(
          result.passwordTemporal
        );
      }

      closeModalAfterSuccess();
    } catch (error) {
      setOperationError(
        getErrorMessage(error)
      );
    } finally {
      setSubmitting(false);
    }
  }

  function closeModalAfterSuccess() {
    setModalOpen(false);
    setSelectedDocente(null);
  }

  function requestToggleStatus(
    docente: Docente
  ) {
    setOperationError(null);
    setPendingStatusDocente(docente);
  }

  function closeStatusDialog() {
    setPendingStatusDocente(null);
  }

  async function handleConfirmToggleStatus() {
    if (!pendingStatusDocente) {
      return;
    }

    setOperationError(null);

    const nuevoEstadoActivo =
      pendingStatusDocente.estado !==
      "Activo";

    try {
      const updated =
        await changeDocenteStatus(
          pendingStatusDocente.id,
          nuevoEstadoActivo
        );

      setDocentes((current) =>
        current.map((docente) =>
          docente.id === updated.id
            ? updated
            : docente
        )
      );
    } catch (error) {
      setOperationError(
        getErrorMessage(error)
      );

      throw error;
    }
  }

  function requestDeleteDocente(
    docente: Docente
  ) {
    setOperationError(null);
    setBlockedDeleteDocente(null);
    setBlockedDeleteDetails(null);
    setPendingDeleteDocente(docente);
  }

  function closeDeleteDialog() {
    setPendingDeleteDocente(null);
  }

  function closeBlockedDeleteDialog() {
    setBlockedDeleteDocente(null);
    setBlockedDeleteDetails(null);
  }

  async function handleConfirmDelete() {
    if (!pendingDeleteDocente) {
      return;
    }

    const docente = pendingDeleteDocente;
    setOperationError(null);

    try {
      await deleteDocente(docente.id);

      setDocentes((current) =>
        current.filter(
          (item) => item.id !== docente.id
        )
      );

      setPendingDeleteDocente(null);
    } catch (error) {
      if (
        error instanceof ApiDocentesError &&
        error.status === 409 &&
        error.code === "DOCENTE_CON_HISTORIAL"
      ) {
        setPendingDeleteDocente(null);
        setBlockedDeleteDocente(docente);
        setBlockedDeleteDetails(
          error.details ?? null
        );
        return;
      }

      setOperationError(
        getErrorMessage(error)
      );

      throw error;
    }
  }

  async function handleDeactivateBlockedDocente() {
    if (!blockedDeleteDocente) {
      return;
    }

    if (
      blockedDeleteDocente.estado !==
      "Activo"
    ) {
      closeBlockedDeleteDialog();
      return;
    }

    setOperationError(null);

    try {
      const updated =
        await changeDocenteStatus(
          blockedDeleteDocente.id,
          false
        );

      setDocentes((current) =>
        current.map((docente) =>
          docente.id === updated.id
            ? updated
            : docente
        )
      );

      closeBlockedDeleteDialog();
    } catch (error) {
      setOperationError(
        getErrorMessage(error)
      );

      throw error;
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setDepartamentoFilter("Todos");
    setEstadoFilter("Todos");
  }

  if (loading) {
    return (
      <DashboardLayout user={MOCK_ADMIN}>
        <LoadingState
          title="Cargando docentes"
          description="Consultando el padrón docente registrado en el servidor."
          size="lg"
          fullHeight
        />
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout user={MOCK_ADMIN}>
        <ErrorState
          title="No se pudieron cargar los docentes"
          description={loadError}
          onRetry={loadDocentes}
          retryText="Volver a intentar"
          size="lg"
          fullHeight
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={MOCK_ADMIN}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Administración académica"
          title="Gestión de docentes"
          description="Administre el registro, actualización, estado y control biométrico de los docentes institucionales."
          badge={
            <Badge variant="info">
              Datos del servidor
            </Badge>
          }
          actions={
            <Button
              variant="primary"
              size="lg"
              leftIcon={<PlusIcon />}
              onClick={openCreateModal}
            >
              Nuevo docente
            </Button>
          }
        />

        {operationError && (
          <div
            role="alert"
            className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-extrabold text-red-700">
                No se pudo completar la operación
              </p>

              <p className="mt-1 text-sm font-semibold text-red-600">
                {operationError}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setOperationError(null)
              }
              className="shrink-0 text-sm font-extrabold text-red-700 hover:underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {temporaryPassword && (
          <div
            role="status"
            className="flex flex-col gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-extrabold text-unsaac-blue">
                Docente registrado correctamente
              </p>

              <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                Contraseña temporal:
                <code className="ml-2 rounded-lg bg-white px-3 py-1 font-extrabold text-unsaac-text">
                  {temporaryPassword}
                </code>
              </p>

              <p className="mt-2 text-xs font-semibold text-unsaac-muted">
                Entregue esta contraseña al docente de forma segura.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setTemporaryPassword(null)
              }
              className="shrink-0 text-sm font-extrabold text-unsaac-blue hover:underline"
            >
              Ocultar
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Docentes registrados"
            value={stats.total}
            description="Total del padrón docente"
            variant="blue"
          />

          <SummaryCard
            title="Docentes activos"
            value={stats.activos}
            description="Disponibles para asistencia"
            variant="green"
          />

          <SummaryCard
            title="Biometría registrada"
            value={stats.biometricos}
            description="Docentes con huella activa"
            variant="yellow"
          />

          <SummaryCard
            title="Pendientes"
            value={stats.pendientes}
            description="Requieren regularización"
            variant="red"
          />
        </section>

        <SectionCard
          title="Búsqueda y filtros"
          description="Localice docentes por nombre, código, DNI, correo, departamento o estado."
          action={
            <Badge variant="info">
              {filteredDocentes.length} resultado(s)
            </Badge>
          }
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-[1.5fr_0.9fr_0.65fr_auto]">
            <Input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Buscar por nombre, DNI, correo o código"
              leftIcon={<SearchIcon />}
              aria-label="Buscar docentes"
            />

            <Select
              value={departamentoFilter}
              onChange={(event) =>
                setDepartamentoFilter(
                  event.target.value
                )
              }
              aria-label="Filtrar por departamento"
            >
              <option value="Todos">
                Todos los departamentos
              </option>

              {departamentos.map(
                (departamento) => (
                  <option
                    key={departamento}
                    value={departamento}
                  >
                    {departamento}
                  </option>
                )
              )}
            </Select>

            <Select
              value={estadoFilter}
              onChange={(event) =>
                setEstadoFilter(
                  event.target.value as
                    | EstadoDocente
                    | "Todos"
                )
              }
              aria-label="Filtrar por estado"
            >
              <option value="Todos">
                Todos los estados
              </option>

              <option value="Activo">
                Activos
              </option>


              <option value="Inactivo">
                Inactivos
              </option>
            </Select>

            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Limpiar
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title="Listado de docentes"
          description={`${docentes.length} docente(s) registrados en el servidor.`}
          contentClassName="p-0"
          action={
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PlusIcon />}
              onClick={openCreateModal}
            >
              Registrar docente
            </Button>
          }
        >
          {filteredDocentes.length > 0 ? (
            <>
              <DocentesTable
                docentes={filteredDocentes}
                onView={openViewModal}
                onEdit={openEditModal}
                onToggleStatus={
                  requestToggleStatus
                }
                onDelete={
                  requestDeleteDocente
                }
              />

              <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-unsaac-muted">
                  Mostrando{" "}
                  {filteredDocentes.length} de{" "}
                  {docentes.length} registro(s)
                </p>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-left text-sm font-extrabold text-unsaac-blue transition hover:underline sm:text-right"
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              title={
                docentes.length === 0
                  ? "No hay docentes registrados"
                  : "No se encontraron docentes"
              }
              description={
                docentes.length === 0
                  ? "Registre el primer docente para comenzar a administrar el padrón institucional."
                  : "Modifique los criterios de búsqueda o restablezca los filtros aplicados."
              }
              action={
                docentes.length === 0 ? (
                  <Button
                    variant="primary"
                    leftIcon={<PlusIcon />}
                    onClick={
                      openCreateModal
                    }
                  >
                    Registrar docente
                  </Button>
                ) : undefined
              }
              secondaryAction={
                docentes.length > 0 ? (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                  >
                    Limpiar filtros
                  </Button>
                ) : undefined
              }
            />
          )}
        </SectionCard>
      </div>

      <DocenteFormModal
        open={modalOpen}
        mode={modalMode}
        docente={selectedDocente}
        submitting={submitting}
        departamentos={departamentosDisponibles}
        onClose={closeModal}
        onSubmit={handleSubmitDocente}
      />

      <ConfirmDialog
        open={Boolean(pendingStatusDocente)}
        onClose={closeStatusDialog}
        onConfirm={handleConfirmToggleStatus}
        title={
          pendingStatusDocente?.estado ===
          "Activo"
            ? "Desactivar docente"
            : "Activar docente"
        }
        description={
          pendingStatusDocente
            ? pendingStatusDocente.estado ===
              "Activo"
              ? `El docente ${pendingStatusDocente.nombres} ${pendingStatusDocente.apellidos} quedará inactivo y no podrá registrar asistencia hasta ser activado nuevamente.`
              : `El docente ${pendingStatusDocente.nombres} ${pendingStatusDocente.apellidos} volverá a estar activo en el sistema.`
            : "Confirme el cambio de estado."
        }
        confirmText={
          pendingStatusDocente?.estado ===
          "Activo"
            ? "Desactivar"
            : "Activar"
        }
        variant={
          pendingStatusDocente?.estado ===
          "Activo"
            ? "warning"
            : "info"
        }
      />

      <DeleteDocenteDialog
        open={Boolean(pendingDeleteDocente)}
        docente={pendingDeleteDocente}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={Boolean(blockedDeleteDocente)}
        onClose={closeBlockedDeleteDialog}
        onConfirm={handleDeactivateBlockedDocente}
        title={
          blockedDeleteDocente?.estado ===
          "Activo"
            ? "Conservar historial y dar de baja"
            : "No se puede eliminar"
        }
        description={
          blockedDeleteDocente
            ? blockedDeleteDocente.estado ===
              "Activo"
              ? `El docente ${blockedDeleteDocente.nombres} ${blockedDeleteDocente.apellidos} conserva información institucional vinculada${formatDeleteDependencies(blockedDeleteDetails)}. No se eliminarán esos registros. Puede dar de baja su cuenta para impedir nuevos accesos y conservar el historial.`
              : `El docente ${blockedDeleteDocente.nombres} ${blockedDeleteDocente.apellidos} conserva información institucional vinculada${formatDeleteDependencies(blockedDeleteDetails)}. Su cuenta ya se encuentra inactiva y el historial permanecerá protegido.`
            : "El historial institucional debe conservarse."
        }
        confirmText={
          blockedDeleteDocente?.estado ===
          "Activo"
            ? "Dar de baja"
            : "Entendido"
        }
        cancelText={
          blockedDeleteDocente?.estado ===
          "Activo"
            ? "Cancelar"
            : "Cerrar"
        }
        variant={
          blockedDeleteDocente?.estado ===
          "Activo"
            ? "warning"
            : "info"
        }
      />
    </DashboardLayout>
  );
}

function formatDeleteDependencies(
  details:
    | Partial<DeleteDocenteDependencies>
    | null
): string {
  if (!details) {
    return "";
  }

  const labels: Array<
    [
      keyof DeleteDocenteDependencies,
      string
    ]
  > = [
    ["horarios", "horario(s)"],
    ["ingresos", "registro(s) de ingreso"],
    ["asistencias", "asistencia(s) de curso"],
    ["alertas", "alerta(s) recibida(s)"],
    [
      "enrolamientosRealizados",
      "enrolamiento(s) realizado(s)",
    ],
    [
      "configuracionesActualizadas",
      "configuración(es) actualizada(s)",
    ],
    [
      "alertasGeneradas",
      "alerta(s) generada(s)",
    ],
    [
      "accionesAuditadas",
      "acción(es) registrada(s)",
    ],
  ];

  const summary = labels
    .map(([key, label]) => {
      const value = Number(
        details[key] ?? 0
      );

      return value > 0
        ? `${value} ${label}`
        : null;
    })
    .filter(
      (item): item is string =>
        Boolean(item)
    );

  return summary.length > 0
    ? `: ${summary.join(", ")}`
    : "";
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

function SummaryCard({
  title,
  value,
  description,
  variant,
}: {
  title: string;
  value: number;
  description: string;
  variant: SummaryVariant;
}) {
  const styles: Record<
    SummaryVariant,
    {
      icon: string;
      value: string;
      line: string;
    }
  > = {
    blue: {
      icon:
        "bg-blue-100 text-unsaac-blue",
      value:
        "text-unsaac-blue",
      line:
        "bg-unsaac-blue",
    },

    green: {
      icon:
        "bg-emerald-100 text-unsaac-green",
      value:
        "text-unsaac-green",
      line:
        "bg-unsaac-green",
    },

    yellow: {
      icon:
        "bg-amber-100 text-unsaac-yellow",
      value:
        "text-unsaac-yellow",
      line:
        "bg-unsaac-yellow",
    },

    red: {
      icon:
        "bg-red-100 text-unsaac-red",
      value:
        "text-unsaac-red",
      line:
        "bg-unsaac-red",
    },
  };

  const current = styles[variant];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-extrabold text-unsaac-muted">
            {title}
          </p>

          <p
            className={`mt-3 text-4xl font-extrabold tabular-nums ${current.value}`}
          >
            {value}
          </p>

          <p className="mt-2 text-sm font-semibold text-unsaac-muted">
            {description}
          </p>
        </div>

        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${current.icon}`}
        >
          <UsersIcon />
        </span>
      </div>

      <div
        className={`h-1 w-full ${current.line}`}
      />
    </Card>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <circle
        cx="9.5"
        cy="7"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}