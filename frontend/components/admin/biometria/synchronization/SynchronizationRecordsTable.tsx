"use client";

import type {
  ReactNode,
} from "react";

import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Badge from "@/components/ui/Badge";

import type {
  BiometricSynchronizationRecord,
} from "@/types/biometricSynchronization";

interface SynchronizationRecordsTableProps {
  records: BiometricSynchronizationRecord[];
  retryingId: number | null;
  onRetry: (recordId: number) => void;
}

export default function SynchronizationRecordsTable({
  records,
  retryingId,
  onRetry,
}: SynchronizationRecordsTableProps) {
  return (
    <SectionCard
      title="Registros biométricos"
      description="Eventos locales disponibles para transferencia y revisión."
      contentClassName="p-0"
      action={
        <Badge variant="info">
          {records.length} registro(s)
        </Badge>
      }
    >
      {records.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>
                  Registro
                </TableHead>

                <TableHead>
                  Docente
                </TableHead>

                <TableHead>
                  Dispositivo
                </TableHead>

                <TableHead>
                  Evento local
                </TableHead>

                <TableHead>
                  Intentos
                </TableHead>

                <TableHead>
                  Sincronización
                </TableHead>

                <TableHead>
                  Estado
                </TableHead>

                <TableHead>
                  Acción
                </TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {records.map((record) => {
                const retrying =
                  retryingId === record.id;

                const canRetry =
                  record.estado === "Fallido" ||
                  record.estado === "Pendiente";

                return (
                  <tr
                    key={record.id}
                    className="transition hover:bg-slate-50"
                  >
                    <TableCell>
                      <p className="font-extrabold text-unsaac-blue">
                        {record.codigo}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                        {record.evento}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-[220px]">
                        <p className="font-extrabold text-unsaac-text">
                          {record.docente}
                        </p>

                        <p className="mt-1 text-xs font-bold text-unsaac-blue">
                          {record.codigoDocente}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-extrabold text-unsaac-blue">
                        {record.dispositivo}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p className="font-bold text-unsaac-text">
                        {record.fechaLocal}
                      </p>

                      <p className="mt-1 text-xs font-semibold tabular-nums text-unsaac-muted">
                        {record.horaLocal}
                      </p>
                    </TableCell>

                    <TableCell>
                      <span className="font-extrabold tabular-nums text-unsaac-text">
                        {record.intentos}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p className="min-w-[160px] text-sm font-semibold text-unsaac-muted">
                        {record.sincronizadoEn ??
                          "Aún no sincronizado"}
                      </p>
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={
                          getStatusValue(
                            record.estado
                          )
                        }
                        label={record.estado}
                        showDot
                      />
                    </TableCell>

                    <TableCell>
                      {canRetry ? (
                        <button
                          type="button"
                          onClick={() =>
                            onRetry(record.id)
                          }
                          disabled={retrying}
                          className="inline-flex h-9 min-w-[105px] items-center justify-center rounded-lg border border-unsaac-blue bg-white px-3 text-xs font-extrabold text-unsaac-blue transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {retrying
                            ? "Procesando..."
                            : "Reintentar"}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700">
                          Completado
                        </span>
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
          title="No se encontraron registros"
          description="Modifique la búsqueda o restablezca los filtros aplicados."
        />
      )}
    </SectionCard>
  );
}

function getStatusValue(
  status: BiometricSynchronizationRecord["estado"]
) {
  if (status === "Sincronizado") {
    return "sincronizado";
  }

  if (status === "Sincronizando") {
    return "procesando";
  }

  if (status === "Fallido") {
    return "fallido";
  }

  return "pendiente";
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