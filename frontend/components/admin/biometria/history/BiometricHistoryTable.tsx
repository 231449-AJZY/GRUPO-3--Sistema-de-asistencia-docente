"use client";

import type {
  ReactNode,
} from "react";

import EmptyState from "@/components/shared/EmptyState";
import SectionCard from "@/components/shared/SectionCard";
import StatusBadge from "@/components/shared/StatusBadge";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

import type {
  BiometricHistoryRecord,
} from "@/types/biometricHistory";

interface BiometricHistoryTableProps {
  records: BiometricHistoryRecord[];
  selectedId: number | null;
  totalRecords: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onSelect: (recordId: number) => void;
  onPageChange: (page: number) => void;
}

export default function BiometricHistoryTable({
  records,
  selectedId,
  totalRecords,
  page,
  pageSize,
  totalPages,
  onSelect,
  onPageChange,
}: BiometricHistoryTableProps) {
  const firstRecord =
    totalRecords === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const lastRecord = Math.min(
    page * pageSize,
    totalRecords
  );

  return (
    <SectionCard
      title="Registros biométricos"
      description="Historial de validaciones, marcaciones y actualizaciones biométricas."
      contentClassName="p-0"
      action={
        <Badge variant="info">
          {totalRecords} registro(s)
        </Badge>
      }
    >
      {records.length > 0 ? (
        <>
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1260px] w-full border-collapse text-left">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <TableHead>
                    Registro
                  </TableHead>

                  <TableHead>
                    Docente
                  </TableHead>

                  <TableHead>
                    Fecha y hora
                  </TableHead>

                  <TableHead>
                    Evento
                  </TableHead>

                  <TableHead>
                    Validación
                  </TableHead>

                  <TableHead>
                    Dispositivo
                  </TableHead>

                  <TableHead>
                    Calidad
                  </TableHead>

                  <TableHead>
                    Resultado
                  </TableHead>

                  <TableHead>
                    Acción
                  </TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {records.map((record) => {
                  const selected =
                    selectedId === record.id;

                  return (
                    <tr
                      key={record.id}
                      className={`transition ${
                        selected
                          ? "bg-blue-50/70"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <TableCell>
                        <div className="min-w-[130px]">
                          <p className="font-extrabold text-unsaac-blue">
                            {record.codigo}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                            ID: {record.id}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex min-w-[230px] items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-extrabold text-unsaac-blue">
                            {getInitials(
                              record.docente
                            )}
                          </span>

                          <div className="min-w-0">
                            <p className="font-extrabold text-unsaac-text">
                              {record.docente}
                            </p>

                            <p className="mt-1 text-xs font-bold text-unsaac-blue">
                              {record.codigoDocente}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-[125px]">
                          <p className="font-bold text-unsaac-text">
                            {record.fecha}
                          </p>

                          <p className="mt-1 text-xs font-semibold tabular-nums text-unsaac-muted">
                            {record.hora}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex rounded-lg bg-slate-100 px-3 py-2 text-xs font-extrabold text-unsaac-text">
                          {record.evento}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex min-w-[130px] rounded-lg bg-blue-50 px-3 py-2 text-xs font-extrabold text-unsaac-blue">
                          {record.tipoValidacion}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="min-w-[130px]">
                          <p className="font-extrabold text-unsaac-text">
                            {record.dispositivo}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                            {record.ubicacion}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <QualityValue
                          quality={
                            record.calidad
                          }
                        />
                      </TableCell>

                      <TableCell>
                        <StatusBadge
                          status={
                            getStatusValue(
                              record.resultado
                            )
                          }
                          label={
                            record.resultado
                          }
                          showDot
                        />
                      </TableCell>

                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            onSelect(record.id)
                          }
                          className={`inline-flex h-9 items-center justify-center rounded-lg border px-3 text-xs font-extrabold transition ${
                            selected
                              ? "border-unsaac-blue bg-unsaac-blue text-white"
                              : "border-unsaac-blue bg-white text-unsaac-blue hover:bg-blue-50"
                          }`}
                        >
                          {selected
                            ? "Seleccionado"
                            : "Ver detalle"}
                        </button>
                      </TableCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-unsaac-muted">
              Mostrando {firstRecord}–{lastRecord} de{" "}
              {totalRecords} registros
            </p>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onPageChange(page - 1)
                }
                disabled={page <= 1}
              >
                Anterior
              </Button>

              <span className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-extrabold text-unsaac-blue">
                Página {page} de {totalPages}
              </span>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onPageChange(page + 1)
                }
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="No se encontraron registros"
          description="Modifique la búsqueda, las fechas o los filtros seleccionados."
        />
      )}
    </SectionCard>
  );
}

function QualityValue({
  quality,
}: {
  quality: number | null;
}) {
  if (quality === null) {
    return (
      <span className="text-xs font-bold text-unsaac-muted">
        No aplica
      </span>
    );
  }

  const style =
    quality >= 85
      ? "text-emerald-700"
      : quality >= 70
        ? "text-orange-700"
        : "text-red-700";

  return (
    <div className="min-w-[85px]">
      <p
        className={`font-extrabold tabular-nums ${style}`}
      >
        {quality}%
      </p>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            quality >= 85
              ? "bg-emerald-500"
              : quality >= 70
                ? "bg-orange-500"
                : "bg-red-500"
          }`}
          style={{
            width: `${quality}%`,
          }}
        />
      </div>
    </div>
  );
}

function getStatusValue(
  result: BiometricHistoryRecord["resultado"]
) {
  if (result === "Exitoso") {
    return "exitoso";
  }

  if (result === "Fallido") {
    return "fallido";
  }

  return "pendiente";
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
      .toUpperCase() || "DB"
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