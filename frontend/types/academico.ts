export interface DepartamentoAcademico {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  creadoEn: string;
  docentes: number;
  cursos: number;
  cursosActivos: number;
}

export interface CursoCatalogo {
  id: number;
  codigo: string;
  nombre: string;
  departamentoId: number;
  departamento: string;
  creditos: number;
  activo: boolean;
  creadoEn: string;
  horarios: number;
  horariosActivos: number;
}

export interface SemestreCatalogo {
  id: number;
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  creadoEn: string;
  horarios: number;
  horariosActivos: number;
}

export interface AcademicCatalogs {
  departamentos: DepartamentoAcademico[];
  cursos: CursoCatalogo[];
  semestres: SemestreCatalogo[];
}

export interface DepartamentoFormValues {
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface CursoFormValues {
  codigo: string;
  nombre: string;
  departamentoId: number;
  creditos: number;
  activo: boolean;
}

export interface SemestreFormValues {
  codigo: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}
