"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import UsuarioFormModal from "@/components/admin/usuarios/UsuarioFormModal";
import UsuariosTable from "@/components/admin/usuarios/UsuariosTable";
import DashboardLayout from "@/components/layout/DashboardLayout";

import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

import { clearSession, getSession, saveSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import {
  ApiUsuariosError,
  changeUsuarioRole,
  changeUsuarioStatus,
  createUsuario,
  deleteUsuario,
  getRolesSistema,
  getUsuarios,
  updateUsuario,
} from "@/lib/services/usuarios.service";

import type {
  RolSistema,
  Usuario,
  UsuarioActivo,
  UsuarioFormValues,
  UsuarioRol,
  UsuarioRolId,
} from "@/types/usuario";

type RoleFilter = "Todos" | UsuarioRol;
type StatusFilter = "Todos" | "Activos" | "Inactivos";
type FormFieldErrors = Partial<
  Record<keyof UsuarioFormValues, string>
>;

export default function AdminUsuariosPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<UsuarioActivo>(MOCK_ADMIN);
  const [usuarios, setUsuarios] =
    useState<Usuario[]>([]);
  const [roles, setRoles] =
    useState<RolSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [operationError, setOperationError] =
    useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] =
    useState<string | null>(null);
  const [modalFieldErrors, setModalFieldErrors] =
    useState<FormFieldErrors>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("Todos");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("Todos");

  const [pendingStatusChange, setPendingStatusChange] =
    useState<Usuario | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] =
    useState<Usuario | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] =
    useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] =
    useState<Usuario | null>(null);

  const handleAuthError = useCallback(
    (error: unknown): boolean => {
      if (
        error instanceof ApiUsuariosError &&
        error.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return true;
      }

      return false;
    },
    [router]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [usersResponse, rolesResponse] =
        await Promise.all([
          getUsuarios(),
          getRolesSistema(),
        ]);

      setUsuarios(usersResponse);
      setRoles(rolesResponse);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la información de usuarios."
      );
    } finally {
      setLoading(false);
    }
  }, [handleAuthError]);

  const refreshRoles = useCallback(async () => {
    try {
      setRoles(await getRolesSistema());
    } catch (error) {
      if (!handleAuthError(error)) {
        console.error("No se pudieron actualizar los contadores de roles:", error);
      }
    }
  }, [handleAuthError]);

  useEffect(() => {
    const session = getSession();

    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentUser(session.user);
    }

    void loadData();
  }, [loadData]);

  const filteredUsuarios = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const fullName =
        `${usuario.nombres} ${usuario.apellidos}`.toLowerCase();

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        usuario.codigo.toLowerCase().includes(search) ||
        usuario.email.toLowerCase().includes(search);

      const matchesRole =
        roleFilter === "Todos" ||
        usuario.rol === roleFilter;

      const matchesStatus =
        statusFilter === "Todos" ||
        (statusFilter === "Activos" && usuario.activo) ||
        (statusFilter === "Inactivos" && !usuario.activo);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usuarios, searchTerm, roleFilter, statusFilter]);

  const summary = useMemo(() => ({
    total: usuarios.length,
    active: usuarios.filter((usuario) => usuario.activo).length,
    inactive: usuarios.filter((usuario) => !usuario.activo).length,
    administrators: usuarios.filter(
      (usuario) => usuario.rol === "Administrador"
    ).length,
    teachers: usuarios.filter(
      (usuario) => usuario.rol === "Docente"
    ).length,
    supervisors: usuarios.filter(
      (usuario) => usuario.rol === "Supervisor"
    ).length,
  }), [usuarios]);

  const hasFilters =
    searchTerm.trim().length > 0 ||
    roleFilter !== "Todos" ||
    statusFilter !== "Todos";

  async function handleRoleChange(
    usuarioId: number,
    rolId: UsuarioRolId
  ) {
    if (usuarioId === currentUser.id) {
      return;
    }

    setOperationError(null);

    try {
      const updated = await changeUsuarioRole(usuarioId, rolId);
      setUsuarios((current) =>
        current.map((usuario) =>
          usuario.id === updated.id ? updated : usuario
        )
      );
      await refreshRoles();
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setOperationError(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el rol del usuario."
      );
    }
  }

  async function handleConfirmStatus() {
    const target = pendingStatusChange;

    if (!target || target.id === currentUser.id) {
      setPendingStatusChange(null);
      return;
    }

    setOperationError(null);

    try {
      const updated = await changeUsuarioStatus(
        target.id,
        !target.activo
      );

      setUsuarios((current) =>
        current.map((usuario) =>
          usuario.id === updated.id ? updated : usuario
        )
      );
      await refreshRoles();
      setPendingStatusChange(null);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setOperationError(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado del usuario."
      );
      setPendingStatusChange(null);
    }
  }

  function openCreateModal() {
    setFormMode("create");
    setEditingUser(null);
    setModalError(null);
    setModalFieldErrors({});
    setFormOpen(true);
  }

  function openEditModal(usuario: Usuario) {
    setFormMode("edit");
    setEditingUser(usuario);
    setModalError(null);
    setModalFieldErrors({});
    setFormOpen(true);
  }

  function closeFormModal() {
    if (submitting) {
      return;
    }

    setFormOpen(false);
    setEditingUser(null);
    setModalError(null);
    setModalFieldErrors({});
  }

  async function handleSaveUser(values: UsuarioFormValues) {
    setSubmitting(true);
    setModalError(null);
    setModalFieldErrors({});

    try {
      if (formMode === "create") {
        const created = await createUsuario(values);
        setUsuarios((current) => [created, ...current]);
      } else if (editingUser) {
        const updated = await updateUsuario(editingUser.id, values);
        setUsuarios((current) =>
          current.map((usuario) =>
            usuario.id === updated.id ? updated : usuario
          )
        );

        if (updated.id === currentUser.id) {
          const displayName =
            `${updated.nombres} ${updated.apellidos}`.trim();

          setCurrentUser((current) => ({
            ...current,
            nombre: displayName,
            correo: updated.email,
          }));

          const session = getSession();

          if (session) {
            saveSession(
              {
                id: updated.id,
                usuario_id: updated.id,
                docente_id: updated.docenteId ?? null,
                nombres: updated.nombres,
                apellidos: updated.apellidos,
                email: updated.email,
                codigo: updated.codigo,
                rol: updated.rol,
              },
              session.token,
              session.persistence === "local"
            );
          }
        }
      }

      await refreshRoles();
      setFormOpen(false);
      setEditingUser(null);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      if (error instanceof ApiUsuariosError) {
        setModalError(error.message);
        setModalFieldErrors(
          (error.fields ?? {}) as FormFieldErrors
        );
      } else {
        setModalError(
          error instanceof Error
            ? error.message
            : "No se pudo guardar el usuario."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    const target = pendingDeleteUser;

    if (!target || target.id === currentUser.id) {
      setPendingDeleteUser(null);
      return;
    }

    setOperationError(null);

    try {
      await deleteUsuario(target.id);
      setUsuarios((current) =>
        current.filter((usuario) => usuario.id !== target.id)
      );
      await refreshRoles();

      if (editingUser?.id === target.id) {
        closeFormModal();
      }

      setPendingDeleteUser(null);
    } catch (error) {
      if (handleAuthError(error)) {
        return;
      }

      setOperationError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el usuario."
      );
      setPendingDeleteUser(null);
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setRoleFilter("Todos");
    setStatusFilter("Todos");
  }

  if (loading) {
    return (
      <DashboardLayout user={currentUser}>
        <LoadingState
          title="Cargando usuarios"
          description="Consultando las cuentas institucionales registradas."
          fullHeight
        />
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout user={currentUser}>
        <ErrorState
          title="No se pudieron cargar los usuarios"
          description={loadError}
          onRetry={loadData}
          fullHeight
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={currentUser}>
      <div className="admin-dashboard-animated space-y-6">
        <PageHeader
          eyebrow="Administración institucional"
          title="Gestión de usuarios"
          description="Administre las cuentas, estados y roles del sistema de asistencia docente."
          badge={
            <StatusBadge
              status="operativo"
              label={`${summary.active} usuarios activos`}
              size="md"
              showDot
            />
          }
          actions={
            <Button
              type="button"
              variant="primary"
              leftIcon={<AddUserIcon />}
              onClick={openCreateModal}
            >
              Nuevo usuario
            </Button>
          }
        />

        {operationError && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-extrabold text-red-800">
                No se pudo completar la operación
              </p>
              <p className="mt-1 text-sm font-semibold text-red-700">
                {operationError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOperationError(null)}
              className="text-sm font-extrabold text-red-700"
            >
              Cerrar
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Usuarios registrados"
            value={summary.total}
            description="Cuentas institucionales"
            tone="blue"
            icon={<UsersIcon />}
          />
          <SummaryCard
            title="Usuarios activos"
            value={summary.active}
            description="Acceso habilitado"
            tone="green"
            icon={<ActiveIcon />}
          />
          <SummaryCard
            title="Usuarios inactivos"
            value={summary.inactive}
            description="Acceso restringido"
            tone="red"
            icon={<InactiveIcon />}
          />
          <SummaryCard
            title="Roles oficiales"
            value={roles.length}
            description={`${summary.teachers} docentes y ${summary.supervisors} supervisores`}
            tone="orange"
            icon={<RoleIcon />}
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
            <Input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, código o correo"
              leftIcon={<SearchIcon />}
              aria-label="Buscar usuarios"
            />

            <Select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              aria-label="Filtrar por rol"
            >
              <option value="Todos">Todos los roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.nombre}>
                  {role.nombre}
                </option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filtrar por estado"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Activos">Activos</option>
              <option value="Inactivos">Inactivos</option>
            </Select>

            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              Limpiar
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <RoleCounter label="Administradores" value={summary.administrators} />
            <RoleCounter label="Docentes" value={summary.teachers} />
            <RoleCounter label="Supervisores" value={summary.supervisors} />
          </div>
        </section>

        <UsuariosTable
          usuarios={filteredUsuarios}
          roles={roles}
          currentUserId={currentUser.id}
          onRoleChange={handleRoleChange}
          onToggleStatus={setPendingStatusChange}
          onEdit={openEditModal}
          onDelete={setPendingDeleteUser}
        />
      </div>

      <UsuarioFormModal
        open={formOpen}
        mode={formMode}
        usuario={editingUser}
        usuarios={usuarios}
        roles={roles}
        currentUserId={currentUser.id}
        submitting={submitting}
        serverError={modalError}
        serverFieldErrors={modalFieldErrors}
        onClose={closeFormModal}
        onSave={handleSaveUser}
      />

      <ConfirmDialog
        open={pendingStatusChange !== null}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={handleConfirmStatus}
        title={
          pendingStatusChange?.activo
            ? "Desactivar usuario"
            : "Activar usuario"
        }
        description={
          pendingStatusChange
            ? pendingStatusChange.activo
              ? `La cuenta de ${pendingStatusChange.nombres} ${pendingStatusChange.apellidos} dejará de poder iniciar sesión.`
              : `La cuenta de ${pendingStatusChange.nombres} ${pendingStatusChange.apellidos} recuperará el acceso al sistema.`
            : ""
        }
        confirmText={pendingStatusChange?.activo ? "Desactivar" : "Activar"}
        cancelText="Cancelar"
        variant={pendingStatusChange?.activo ? "warning" : "info"}
      />

      <ConfirmDialog
        open={pendingDeleteUser !== null}
        onClose={() => setPendingDeleteUser(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar usuario"
        description={
          pendingDeleteUser
            ? `Se intentará eliminar la cuenta de ${pendingDeleteUser.nombres} ${pendingDeleteUser.apellidos}. Las cuentas con información institucional relacionada deben desactivarse en lugar de eliminarse.`
            : ""
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </DashboardLayout>
  );
}

type SummaryTone =
  | "blue"
  | "green"
  | "red"
  | "orange";

function SummaryCard({
  title,
  value,
  description,
  tone,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  tone: SummaryTone;
  icon: ReactNode;
}) {
  const styles: Record<
    SummaryTone,
    {
      icon: string;
      value: string;
      line: string;
    }
  > = {
    blue: {
      icon:
        "bg-blue-100 text-unsaac-blue",
      value: "text-unsaac-blue",
      line: "bg-unsaac-blue",
    },
    green: {
      icon:
        "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
      line: "bg-emerald-500",
    },
    red: {
      icon:
        "bg-red-100 text-red-700",
      value: "text-red-700",
      line: "bg-red-500",
    },
    orange: {
      icon:
        "bg-orange-100 text-orange-700",
      value: "text-orange-700",
      line: "bg-orange-500",
    },
  };

  const current = styles[tone];

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
          {icon}
        </span>
      </div>

      <div
        className={`h-1 ${current.line}`}
      />
    </Card>
  );
}

function RoleCounter({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-unsaac-muted">
      {label}
      <strong className="text-unsaac-blue">
        {value}
      </strong>
    </span>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AddUserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M3 21v-2a5 5 0 0 1 5-5h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 11v8M13 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ActiveIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InactiveIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RoleIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7l8-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}