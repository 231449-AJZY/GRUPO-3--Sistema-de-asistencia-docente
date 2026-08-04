export type DiaSemana = 1 | 2 | 3 | 4 | 5;

export interface SemestreAcademico {
  id: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  creadoEn: string;
}

export interface CursoAcademico {
  id: number;
  codigo: string;
  nombre: string;
  departamentoId: number;
  departamento: string;
  creditos: number;
  activo: boolean;
}

export interface DocenteHorario {
  id: number;
  codigo: string;
  nombre: string;
  departamento: string;
  activo: boolean;
}

export interface HorarioCurso {
  id: number;
  docenteId: number;
  cursoId: number;
  semestreId: number;
  aula: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
  creadoEn: string;
  registrosAsistencia?: number;
  docenteCodigo?: string;
  docente?: string;
  departamento?: string;
  cursoCodigo?: string;
  curso?: string;
  creditos?: number;
  semestre?: string;
  semestreActivo?: boolean;
}

export interface HorarioFormValues {
  docenteId: number;
  cursoId: number;
  semestreId: number;
  aula: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  activo: boolean;
}

export interface HorarioCatalogos {
  docentes: DocenteHorario[];
  cursos: CursoAcademico[];
  semestres: SemestreAcademico[];
}
