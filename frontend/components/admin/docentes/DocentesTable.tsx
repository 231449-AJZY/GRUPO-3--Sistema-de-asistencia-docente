"use client";

import type { ReactNode } from "react";

import StatusBadge from "@/components/shared/StatusBadge";
import Button from "@/components/ui/Button";

import type { Docente } from "@/types/docente";

interface DocentesTableProps {
  docentes: Docente[];
  onView: (docente: Docente) => void;
  onEdit: (docente: Docente) => void;
  onToggleStatus: (docente: Docente) => void;
  onDelete: (docente: Docente) => void;
}

export default function DocentesTable({
  docentes,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}: DocentesTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-[1280px] w-full border-collapse text-left">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            <TableHead>Código</TableHead>
            <TableHead>Docente</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Biometría</TableHead>
            <TableHead>Estado</TableHead>

            <TableHead className="text-right">
              Acciones
            </TableHead>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {docentes.map((docente) => {
            const activo =
              docente.estado === "Activo";

            return (
              <tr
                key={docente.id}
                className="transition-colors duration-150 hover:bg-slate-50"
              >
                <TableCell>
                  <span className="font-extrabold text-unsaac-blue">
                    {docente.codigo}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="flex min-w-[230px] items-center gap-3">
                    <DocenteAvatar
                      nombres={docente.nombres}
                      apellidos={docente.apellidos}
                    />

                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-unsaac-text">
                        {docente.nombres}{" "}
                        {docente.apellidos}
                      </p>

                      <p className="mt-1 truncate text-xs font-semibold text-unsaac-muted">
                        {docente.correo}
                      </p>

                      {docente.telefono && (
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-400">
                          {docente.telefono}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="font-semibold tabular-nums text-unsaac-text">
                    {docente.dni}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="block max-w-[210px] whitespace-normal font-semibold leading-5 text-unsaac-muted">
                    {docente.departamento}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="font-bold text-unsaac-text">
                    {docente.categoria}
                  </span>
                </TableCell>

                <TableCell>
                  <StatusBadge
                    status={docente.estadoBiometrico}
                    showDot
                  />
                </TableCell>

                <TableCell>
                  <StatusBadge
                    status={docente.estado}
                    showDot
                  />
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<EyeIcon />}
                      onClick={() => onView(docente)}
                      aria-label={`Ver información de ${docente.nombres} ${docente.apellidos}`}
                      title="Ver detalle"
                    >
                      Ver
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<EditIcon />}
                      onClick={() => onEdit(docente)}
                      aria-label={`Editar a ${docente.nombres} ${docente.apellidos}`}
                      title="Editar docente"
                    >
                      Editar
                    </Button>

                    <Button
                      type="button"
                      variant={activo ? "danger" : "success"}
                      size="sm"
                      leftIcon={
                        activo
                          ? <PauseIcon />
                          : <ActivateIcon />
                      }
                      onClick={() =>
                        onToggleStatus(docente)
                      }
                      aria-label={
                        activo
                          ? `Desactivar a ${docente.nombres} ${docente.apellidos}`
                          : `Activar a ${docente.nombres} ${docente.apellidos}`
                      }
                      title={
                        activo
                          ? "Desactivar docente"
                          : "Activar docente"
                      }
                    >
                      {activo
                        ? "Desactivar"
                        : "Activar"}
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      leftIcon={<TrashIcon />}
                      onClick={() => onDelete(docente)}
                      aria-label={`Eliminar a ${docente.nombres} ${docente.apellidos}`}
                      title="Eliminar docente"
                    >
                      Eliminar
                    </Button>
                  </div>
                </TableCell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DocenteAvatar({
  nombres,
  apellidos,
}: {
  nombres: string;
  apellidos: string;
}) {
  const initialNames = nombres
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const initialLastNames = apellidos
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstInitial =
    initialNames[0]?.[0] ?? "D";

  const secondInitial =
    initialLastNames[0]?.[0] ?? "";

  const initials =
    `${firstInitial}${secondInitial}`.toUpperCase();

  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-sm font-extrabold text-unsaac-blue"
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

function TableHead({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-5 py-4 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 ${className}`}
    >
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
    <td
      className={`px-5 py-4 align-middle text-sm ${className}`}
    >
      {children}
    </td>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.7"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M9.5 9v6M14.5 9v6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActivateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="m8.5 12 2.3 2.3 4.8-5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7h16M10 11v5M14 11v5M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
