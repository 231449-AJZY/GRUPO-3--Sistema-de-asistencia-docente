"use client";

import { useMemo } from "react";

import WeeklySchedule from "@/components/admin/horarios/WeeklySchedule";

import type {
  CursoAcademico,
  DocenteHorario,
  HorarioCurso,
} from "@/types/horario";

interface TeacherWeeklyScheduleProps {
  horarios: HorarioCurso[];
}

export default function TeacherWeeklySchedule({
  horarios,
}: TeacherWeeklyScheduleProps) {
  const cursos = useMemo<CursoAcademico[]>(() => {
    const unique = new Map<number, CursoAcademico>();

    for (const horario of horarios) {
      if (!unique.has(horario.cursoId)) {
        unique.set(horario.cursoId, {
          id: horario.cursoId,
          codigo: horario.cursoCodigo || `CUR-${horario.cursoId}`,
          nombre: horario.curso || "Curso asignado",
          departamentoId: 0,
          departamento: horario.departamento || "UNSAAC",
          creditos: horario.creditos ?? 0,
          activo: horario.activo,
        });
      }
    }

    return Array.from(unique.values());
  }, [horarios]);

  const docentes = useMemo<DocenteHorario[]>(() => {
    const unique = new Map<number, DocenteHorario>();

    for (const horario of horarios) {
      if (!unique.has(horario.docenteId)) {
        unique.set(horario.docenteId, {
          id: horario.docenteId,
          codigo: horario.docenteCodigo || `DOC-${horario.docenteId}`,
          nombre: horario.docente || "Docente autenticado",
          departamento: horario.departamento || "UNSAAC",
          activo: horario.activo,
        });
      }
    }

    return Array.from(unique.values());
  }, [horarios]);

  return (
    <section id="mi-horario" className="scroll-mt-28">
      <WeeklySchedule
        horarios={horarios}
        cursos={cursos}
        docentes={docentes}
      />
    </section>
  );
}
