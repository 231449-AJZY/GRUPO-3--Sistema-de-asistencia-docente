"use client";

import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Badge from "@/components/ui/Badge";

import type {
  SystemPermission,
  SystemRole,
} from "@/types/rol";

interface RolePermissionMatrixProps {
  roles: SystemRole[];
  permissions: SystemPermission[];
  selectedRoleId: SystemRole["id"];
}

export default function RolePermissionMatrix({
  roles,
  permissions,
  selectedRoleId,
}: RolePermissionMatrixProps) {
  return (
    <SectionCard
      title="Matriz de permisos"
      description="Comparación de los accesos funcionales asignados a cada rol."
      contentClassName="p-0"
      action={
        <Badge variant="info">
          Configuración institucional
        </Badge>
      }
    >
      <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
        <p className="text-sm font-semibold leading-6 text-unsaac-muted">
          Los accesos corresponden a la configuración funcional vigente. La asignación se administra por rol completo para mantener una política institucional uniforme.
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-[900px] w-full border-collapse text-left">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
                Módulo y acción
              </th>

              {roles.map((role) => (
                <th
                  key={role.id}
                  className={`px-5 py-4 text-center text-xs font-extrabold uppercase tracking-[0.08em] ${
                    selectedRoleId === role.id
                      ? "bg-blue-50 text-unsaac-blue"
                      : "text-slate-500"
                  }`}
                >
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {permissions.map((permission) => (
              <tr
                key={permission.id}
                className="transition hover:bg-slate-50"
              >
                <td className="px-5 py-4">
                  <p className="font-extrabold text-unsaac-text">
                    {permission.module}
                  </p>

                  <p className="mt-1 text-xs font-bold text-unsaac-blue">
                    {permission.action}
                  </p>

                  <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-unsaac-muted">
                    {permission.description}
                  </p>
                </td>

                {roles.map((role) => {
                  const granted =
                    role.permissionIds.includes(
                      permission.id
                    );

                  return (
                    <td
                      key={`${permission.id}-${role.id}`}
                      className={`px-5 py-4 text-center ${
                        selectedRoleId === role.id
                          ? "bg-blue-50/50"
                          : ""
                      }`}
                    >
                      <span className="inline-flex justify-center">
                        <StatusBadge
                          status={
                            granted
                              ? "activo"
                              : "inactivo"
                          }
                          label={
                            granted
                              ? "Permitido"
                              : "Sin acceso"
                          }
                          showDot
                        />
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}