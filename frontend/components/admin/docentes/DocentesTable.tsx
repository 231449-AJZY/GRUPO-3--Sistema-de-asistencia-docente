"use client";

import Badge from "@/components/ui/Badge";
import type {
  Docente,
  EstadoBiometrico,
  EstadoDocente,
} from "@/types/docente";
import type { ReactNode } from "react";

interface DocentesTableProps {
  docentes: Docente[];
  onView: (docente: Docente) => void;
  onEdit: (docente: Docente) => void;
  onToggleStatus: (docente: Docente) => void;
}

export default function DocentesTable({
  docentes,
  onView,
  onEdit,
  onToggleStatus,
}: DocentesTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-unsaac-border">
      <table className="w-full border-collapse text-left">
        <thead className="bg-slate-100">
          <tr>
            <TableHead>Código</TableHead>
            <TableHead>Docente</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Biometría</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </tr>
        </thead>

        <tbody className="divide-y divide-unsaac-border">
          {docentes.map((docente) => (
            <tr
              key={docente.id}
              className="transition hover:bg-unsaac-content-soft"
            >
              <TableCell className="font-extrabold text-unsaac-blue">
                {docente.codigo}
              </TableCell>

              <TableCell>
                <div>
                  <p className="font-extrabold text-unsaac-text">
                    {docente.nombres} {docente.apellidos}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                    {docente.correo}
                  </p>
                </div>
              </TableCell>

              <TableCell>{docente.dni}</TableCell>
              <TableCell>{docente.departamento}</TableCell>
              <TableCell>{docente.categoria}</TableCell>

              <TableCell>
                <BiometriaBadge estado={docente.estadoBiometrico} />
              </TableCell>

              <TableCell>
                <EstadoBadge estado={docente.estado} />
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-2">
                  <ActionButton
                    label="Ver docente"
                    onClick={() => onView(docente)}
                  >
                    <EyeIcon className="h-5 w-5 text-unsaac-blue" />
                  </ActionButton>

                  <ActionButton
                    label="Editar docente"
                    onClick={() => onEdit(docente)}
                  >
                    <EditIcon className="h-5 w-5 text-unsaac-orange" />
                  </ActionButton>

                  <ActionButton
                    label={
                      docente.estado === "Inactivo"
                        ? "Activar docente"
                        : "Desactivar docente"
                    }
                    onClick={() => onToggleStatus(docente)}
                  >
                    <UserMinusIcon
                      className={`h-5 w-5 ${
                        docente.estado === "Inactivo"
                          ? "text-unsaac-green"
                          : "text-unsaac-red"
                      }`}
                    />
                  </ActionButton>
                </div>
              </TableCell>
            </tr>
          ))}

          {docentes.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center">
                <p className="text-base font-extrabold text-unsaac-text">
                  No se encontraron docentes
                </p>
                <p className="mt-1 text-sm font-semibold text-unsaac-muted">
                  Ajuste los filtros o registre un nuevo docente.
                </p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">
      {children}
    </th>
  );
}

function TableCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3 text-sm font-bold text-slate-700 ${className}`}>
      {children}
    </td>
  );
}

function BiometriaBadge({ estado }: { estado: EstadoBiometrico }) {
  if (estado === "Registrado") {
    return (
      <span className="inline-flex min-w-[112px] justify-center rounded-md bg-blue-100 px-3 py-1 text-xs font-extrabold text-unsaac-blue">
        Registrado
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-[112px] justify-center rounded-md bg-yellow-100 px-3 py-1 text-xs font-extrabold text-unsaac-yellow">
      Pendiente
    </span>
  );
}

function EstadoBadge({ estado }: { estado: EstadoDocente }) {
  if (estado === "Activo") {
    return <Badge variant="success">Activo</Badge>;
  }

  if (estado === "En pausa") {
    return <Badge variant="warning">En pausa</Badge>;
  }

  return <Badge variant="danger">Inactivo</Badge>;
}

function ActionButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-lg p-1.5 transition hover:bg-unsaac-content-soft"
    >
      {children}
    </button>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserMinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M17 11h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}