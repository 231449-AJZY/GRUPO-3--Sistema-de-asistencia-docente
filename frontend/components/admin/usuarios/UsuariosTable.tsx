"use client";

import type {
  ReactNode,
} from "react";

import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";

import type {
  RolSistema,
  Usuario,
  UsuarioRolId,
} from "@/types/usuario";

interface UsuariosTableProps {
  usuarios: Usuario[];
  roles: RolSistema[];
  currentUserId: number;

  onRoleChange: (
    usuarioId: number,
    rolId: UsuarioRolId
  ) => void;

  onToggleStatus: (
    usuario: Usuario
  ) => void;

  onEdit: (
    usuario: Usuario
  ) => void;

  onDelete: (
    usuario: Usuario
  ) => void;
}

export default function UsuariosTable({
  usuarios,
  roles,
  currentUserId,
  onRoleChange,
  onToggleStatus,
  onEdit,
  onDelete,
}: UsuariosTableProps) {
  return (
    <SectionCard
      title="Usuarios del sistema"
      description="Cuentas institucionales registradas en la plataforma."
      contentClassName="p-0"
      action={
        <Badge variant="info">
          {usuarios.length} usuario(s)
        </Badge>
      }
    >
      {usuarios.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1120px] w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>
                  Usuario
                </TableHead>

                <TableHead>
                  Código
                </TableHead>

                <TableHead>
                  Correo institucional
                </TableHead>

                <TableHead>
                  Rol
                </TableHead>

                <TableHead>
                  Estado
                </TableHead>

                <TableHead>
                  Fecha de registro
                </TableHead>

                <TableHead>
                  Acción
                </TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {usuarios.map((usuario) => {
                const isCurrentUser =
                  usuario.id === currentUserId;

                const fullName =
                  `${usuario.nombres} ${usuario.apellidos}`;

                const hasTeacherProfile =
                  usuario.rol === "Docente" ||
                  Boolean(usuario.docenteId);

                const availableRoles = hasTeacherProfile
                  ? roles.filter((role) => role.nombre === "Docente")
                  : roles.filter((role) => role.nombre !== "Docente");

                return (
                  <tr
                    key={usuario.id}
                    className="transition hover:bg-slate-50"
                  >
                    <TableCell>
                      <div className="flex min-w-[230px] items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-extrabold text-unsaac-blue">
                          {getInitials(fullName)}
                        </span>

                        <div className="min-w-0">
                          <p className="font-extrabold text-unsaac-text">
                            {fullName}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                            Usuario #{usuario.id}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-extrabold text-unsaac-blue">
                        {usuario.codigo}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p className="min-w-[220px] font-semibold text-unsaac-text">
                        {usuario.email}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-[170px]">
                        <Select
                          value={String(
                            usuario.rolId
                          )}
                          onChange={(event) =>
                            onRoleChange(
                              usuario.id,
                              Number(
                                event.target.value
                              ) as UsuarioRolId
                            )
                          }
                          disabled={isCurrentUser || hasTeacherProfile}
                          aria-label={`Rol de ${fullName}`}
                        >
                          {availableRoles.map((rol) => (
                            <option
                              key={rol.id}
                              value={rol.id}
                            >
                              {rol.nombre}
                            </option>
                          ))}
                        </Select>

                        {isCurrentUser && (
                          <p className="mt-1 text-[11px] font-bold text-orange-700">
                            Rol de la sesión actual
                          </p>
                        )}

                        {hasTeacherProfile && !isCurrentUser && (
                          <p className="mt-1 text-[11px] font-bold text-blue-700">
                            Perfil docente vinculado
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={
                          usuario.activo
                            ? "activo"
                            : "inactivo"
                        }
                        label={
                          usuario.activo
                            ? "Activo"
                            : "Inactivo"
                        }
                        showDot
                      />
                    </TableCell>

                    <TableCell>
                      <p className="min-w-[135px] font-bold text-unsaac-text">
                        {formatDate(
                          usuario.creadoEn
                        )}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex min-w-[300px] items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onEdit(usuario)
                          }
                        >
                          Editar
                        </Button>

                        <Button
                          type="button"
                          variant={
                            usuario.activo
                              ? "warning"
                              : "success"
                          }
                          size="sm"
                          onClick={() =>
                            onToggleStatus(usuario)
                          }
                          disabled={isCurrentUser}
                        >
                          {usuario.activo
                            ? "Desactivar"
                            : "Activar"}
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            onDelete(usuario)
                          }
                          disabled={isCurrentUser || hasTeacherProfile}
                        >
                          Eliminar
                        </Button>
                      </div>

                      {isCurrentUser && (
                        <p className="mt-2 text-[11px] font-bold text-orange-700">
                          La cuenta actual está protegida.
                        </p>
                      )}

                      {hasTeacherProfile && !isCurrentUser && (
                        <p className="mt-2 text-[11px] font-bold text-blue-700">
                          La cuenta docente se gestiona desde Docentes.
                        </p>
                      )}
                    </TableCell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No se encontraron usuarios"
          description="Modifique la búsqueda o restablezca los filtros aplicados."
        />
      )}
    </SectionCard>
  );
}

function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">
      {children}
    </th>
  );
}

function TableCell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <td className="px-5 py-4 align-middle text-sm">
      {children}
    </td>
  );
}

function getInitials(
  name: string
) {
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

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "es-PE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Lima",
    }
  ).format(new Date(value));
}