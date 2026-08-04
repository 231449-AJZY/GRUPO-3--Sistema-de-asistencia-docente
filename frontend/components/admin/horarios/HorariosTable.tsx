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
  CursoAcademico,
  DocenteHorario,
  HorarioCurso,
  SemestreAcademico,
} from "@/types/horario";

interface HorariosTableProps {
  horarios: HorarioCurso[];
  cursos: CursoAcademico[];
  docentes: DocenteHorario[];
  semestres: SemestreAcademico[];
  onEdit: (horario: HorarioCurso) => void;
  onToggleStatus: (
    horario: HorarioCurso
  ) => void;
  onDelete: (
    horario: HorarioCurso
  ) => void;
}

const DAY_NAMES = [
  "",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

export default function HorariosTable({
  horarios,
  cursos,
  docentes,
  semestres,
  onEdit,
  onToggleStatus,
  onDelete,
}: HorariosTableProps) {
  return (
    <SectionCard
      title="Horarios académicos"
      description="Asignaciones de docentes, cursos, aulas y periodos."
      contentClassName="p-0"
      action={
        <Badge variant="info">
          {horarios.length} horario(s)
        </Badge>
      }
    >
      {horarios.length > 0 ? (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1430px] w-full border-collapse text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <TableHead>
                  Curso
                </TableHead>

                <TableHead>
                  Carrera
                </TableHead>

                <TableHead>
                  Docente
                </TableHead>

                <TableHead>
                  Semestre
                </TableHead>

                <TableHead>
                  Día
                </TableHead>

                <TableHead>
                  Horario
                </TableHead>

                <TableHead>
                  Aula
                </TableHead>

                <TableHead>
                  Estado
                </TableHead>

                <TableHead>
                  Acciones
                </TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {horarios.map((horario) => {
                const curso =
                  cursos.find(
                    (item) =>
                      item.id ===
                      horario.cursoId
                  );

                const docente =
                  docentes.find(
                    (item) =>
                      item.id ===
                      horario.docenteId
                  );

                const semestre =
                  semestres.find(
                    (item) =>
                      item.id ===
                      horario.semestreId
                  );

                return (
                  <tr
                    key={horario.id}
                    className="transition hover:bg-slate-50"
                  >
                    <TableCell>
                      <div className="min-w-[210px]">
                        <p className="font-extrabold text-unsaac-text">
                          {curso?.nombre}
                        </p>

                        <p className="mt-1 text-xs font-extrabold text-unsaac-blue">
                          {curso?.codigo}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                          {curso?.creditos} créditos
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-[190px]">
                        <p className="font-extrabold text-unsaac-text">
                          {curso?.departamento || "Sin carrera"}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-unsaac-muted">
                          Carrera académica
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-[210px]">
                        <p className="font-extrabold text-unsaac-text">
                          {docente?.nombre}
                        </p>

                        <p className="mt-1 text-xs font-bold text-unsaac-blue">
                          {docente?.codigo}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 text-xs font-extrabold text-unsaac-blue">
                        {semestre?.codigo}
                      </span>
                    </TableCell>

                    <TableCell>
                      <p className="font-bold text-unsaac-text">
                        {
                          DAY_NAMES[
                            horario.diaSemana
                          ]
                        }
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-[125px]">
                        <p className="font-extrabold tabular-nums text-unsaac-text">
                          {horario.horaInicio}
                        </p>

                        <p className="mt-1 text-xs font-semibold tabular-nums text-unsaac-muted">
                          hasta {horario.horaFin}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex rounded-lg bg-orange-50 px-3 py-2 text-xs font-extrabold text-orange-700">
                        {horario.aula}
                      </span>
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={
                          horario.activo
                            ? "activo"
                            : "inactivo"
                        }
                        label={
                          horario.activo
                            ? "Activo"
                            : "Inactivo"
                        }
                        showDot
                      />
                    </TableCell>

                    <TableCell>
                      <div className="flex min-w-[275px] gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            onEdit(horario)
                          }
                        >
                          Editar
                        </Button>

                        <Button
                          type="button"
                          variant={
                            horario.activo
                              ? "warning"
                              : "success"
                          }
                          onClick={() =>
                            onToggleStatus(
                              horario
                            )
                          }
                        >
                          {horario.activo
                            ? "Desactivar"
                            : "Activar"}
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          onClick={() =>
                            onDelete(horario)
                          }
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
      ) : (
        <EmptyState
          title="No se encontraron horarios"
          description="Modifique la búsqueda o restablezca los filtros."
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
