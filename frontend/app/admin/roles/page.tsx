"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useRouter } from "next/navigation";

import RoleCard from "@/components/admin/roles/RoleCard";
import RolePermissionMatrix from "@/components/admin/roles/RolePermissionMatrix";
import DashboardLayout from "@/components/layout/DashboardLayout";

import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

import { clearSession, getSession } from "@/lib/auth";
import { MOCK_ADMIN } from "@/lib/constants";
import { systemPermissions } from "@/lib/role-permissions";
import {
  ApiUsuariosError,
  getSystemRoles,
  getUsuarios,
} from "@/lib/services/usuarios.service";

import type {
  RoleId,
  SystemRole,
} from "@/types/rol";
import type {
  Usuario,
  UsuarioActivo,
} from "@/types/usuario";

export default function AdminRolesPage() {
  const router = useRouter();

  const [currentUser, setCurrentUser] =
    useState<UsuarioActivo>(MOCK_ADMIN);
  const [roles, setRoles] =
    useState<SystemRole[]>([]);
  const [usuarios, setUsuarios] =
    useState<Usuario[]>([]);
  const [selectedRoleId, setSelectedRoleId] =
    useState<RoleId>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesResponse, usersResponse] =
        await Promise.all([
          getSystemRoles(),
          getUsuarios(),
        ]);

      if (rolesResponse.length === 0) {
        throw new Error(
          "No existen roles institucionales configurados."
        );
      }

      setRoles(rolesResponse);
      setUsuarios(usersResponse);
      setSelectedRoleId((current) =>
        rolesResponse.some((role) => role.id === current)
          ? current
          : rolesResponse[0].id
      );
    } catch (loadError) {
      if (
        loadError instanceof ApiUsuariosError &&
        loadError.status === 401
      ) {
        clearSession();
        router.replace("/login");
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudo cargar la información de roles."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const session = getSession();

    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentUser(session.user);
    }

    void loadData();
  }, [loadData]);

  const selectedRole = useMemo(() => {
    return (
      roles.find((role) => role.id === selectedRoleId) ??
      roles[0]
    );
  }, [selectedRoleId, roles]);

  const roleUsers = useMemo(() => {
    return usuarios.filter(
      (usuario) => usuario.rolId === selectedRoleId
    );
  }, [selectedRoleId, usuarios]);

  const activeUsers = usuarios.filter(
    (usuario) => usuario.activo
  ).length;

  if (loading) {
    return (
      <DashboardLayout user={currentUser}>
        <LoadingState
          title="Cargando roles"
          description="Consultando la configuración institucional de accesos."
          fullHeight
        />
      </DashboardLayout>
    );
  }

  if (error || !selectedRole) {
    return (
      <DashboardLayout user={currentUser}>
        <ErrorState
          title="No se pudieron cargar los roles"
          description={
            error ??
            "El sistema no devolvió una configuración válida."
          }
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
          title="Gestión de roles"
          description="Consulte los roles oficiales, sus usuarios asignados y los accesos funcionales del sistema."
          badge={
            <StatusBadge
              status="operativo"
              label={`${roles.length} roles oficiales`}
              size="md"
              showDot
            />
          }
        />

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Roles del sistema"
            value={roles.length}
            description="Roles definidos institucionalmente"
            tone="blue"
            icon={<RoleIcon />}
          />
          <SummaryCard
            title="Usuarios asignados"
            value={usuarios.length}
            description="Cuentas con rol vigente"
            tone="green"
            icon={<UsersIcon />}
          />
          <SummaryCard
            title="Usuarios activos"
            value={activeUsers}
            description="Acceso habilitado"
            tone="orange"
            icon={<ActiveIcon />}
          />
          <SummaryCard
            title="Accesos funcionales"
            value={systemPermissions.length}
            description="Acciones institucionales"
            tone="purple"
            icon={<PermissionIcon />}
          />
        </section>

        <SectionCard
          title="Roles disponibles"
          description="Seleccione un rol para consultar su configuración y sus usuarios."
          action={
            <Badge variant="info">
              Seleccionado: {selectedRole.name}
            </Badge>
          }
        >
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {roles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRoleId === role.id}
                onSelect={setSelectedRoleId}
              />
            ))}
          </div>
        </SectionCard>

        <div className="grid items-start gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard
            title="Detalle del rol"
            description={selectedRole.code}
            action={
              <StatusBadge
                status="activo"
                label="Rol protegido"
                showDot
              />
            }
          >
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-unsaac-blue text-white">
                <RoleIcon />
              </span>

              <h2 className="mt-5 text-2xl font-extrabold text-unsaac-text">
                {selectedRole.name}
              </h2>

              <p className="mt-2 text-sm font-semibold leading-6 text-unsaac-muted">
                {selectedRole.description}
              </p>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3">
              <DetailMetric
                label="Identificador"
                value={String(selectedRole.id)}
              />
              <DetailMetric
                label="Código"
                value={selectedRole.code}
              />
              <DetailMetric
                label="Usuarios"
                value={String(selectedRole.userCount)}
              />
              <DetailMetric
                label="Accesos"
                value={String(selectedRole.permissionIds.length)}
              />
            </dl>

            <div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 px-4 py-4">
              <p className="font-extrabold text-orange-800">
                Rol oficial del sistema
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-unsaac-muted">
                Los roles oficiales no se eliminan. La asignación de cuentas se administra desde Gestión de usuarios.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title={`Usuarios con rol ${selectedRole.name}`}
            description="Cuentas institucionales asociadas al rol seleccionado."
            action={
              <Badge variant="info">
                {roleUsers.length} usuario(s)
              </Badge>
            }
            contentClassName="p-0"
          >
            {roleUsers.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {roleUsers.map((usuario) => {
                  const fullName =
                    `${usuario.nombres} ${usuario.apellidos}`;

                  return (
                    <article
                      key={usuario.id}
                      className="flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-extrabold text-unsaac-blue">
                        {getInitials(fullName)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-unsaac-text">
                          {fullName}
                        </p>
                        <p className="mt-1 text-xs font-bold text-unsaac-blue">
                          {usuario.codigo}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-unsaac-muted">
                          {usuario.email}
                        </p>
                      </div>

                      <StatusBadge
                        status={usuario.activo ? "activo" : "inactivo"}
                        label={usuario.activo ? "Activo" : "Inactivo"}
                        showDot
                      />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="font-extrabold text-unsaac-text">
                  Este rol no tiene usuarios.
                </p>
                <p className="mt-2 text-sm font-semibold text-unsaac-muted">
                  La asignación puede realizarse desde Gestión de usuarios.
                </p>
              </div>
            )}
          </SectionCard>
        </div>

        <RolePermissionMatrix
          roles={roles}
          permissions={systemPermissions}
          selectedRoleId={selectedRoleId}
        />
      </div>
    </DashboardLayout>
  );
}

type SummaryTone =
  | "blue"
  | "green"
  | "orange"
  | "purple";

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
  const styles = {
    blue: {
      icon: "bg-blue-100 text-unsaac-blue",
      value: "text-unsaac-blue",
      line: "bg-unsaac-blue",
    },
    green: {
      icon:
        "bg-emerald-100 text-emerald-700",
      value: "text-emerald-700",
      line: "bg-emerald-500",
    },
    orange: {
      icon:
        "bg-orange-100 text-orange-700",
      value: "text-orange-700",
      line: "bg-orange-500",
    },
    purple: {
      icon:
        "bg-violet-100 text-violet-700",
      value: "text-violet-700",
      line: "bg-violet-500",
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

      <div className={`h-1 ${current.line}`} />
    </Card>
  );
}

function DetailMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <dt className="text-xs font-extrabold uppercase tracking-[0.08em] text-unsaac-muted">
        {label}
      </dt>

      <dd className="mt-2 text-lg font-extrabold text-unsaac-blue">
        {value}
      </dd>
    </div>
  );
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "US"
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

function PermissionIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M12 12h9M18 12v3M15 12v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}