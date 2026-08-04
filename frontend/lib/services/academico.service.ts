import { getToken } from "@/lib/auth";

import type {
  AcademicCatalogs,
  CursoCatalogo,
  CursoFormValues,
  DepartamentoAcademico,
  DepartamentoFormValues,
  SemestreCatalogo,
  SemestreFormValues,
} from "@/types/academico";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface ErrorPayload {
  error?: string;
  fields?: Record<string, string>;
  puedeDesactivar?: boolean;
}

interface BackendDepartment {
  id: number | string;
  codigo?: string;
  nombre?: string;
  activo?: boolean;
  creado_en?: string;
  docentes?: number | string;
  cursos?: number | string;
  cursos_activos?: number | string;
}

interface BackendCourse {
  id: number | string;
  codigo?: string;
  nombre?: string;
  departamento_id?: number | string;
  departamento?: string;
  creditos?: number | string;
  activo?: boolean;
  creado_en?: string;
  horarios?: number | string;
  horarios_activos?: number | string;
}

interface BackendSemester {
  id: number | string;
  codigo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
  creado_en?: string;
  horarios?: number | string;
  horarios_activos?: number | string;
}

export class ApiAcademicoError extends Error {
  status: number;
  fields?: Record<string, string>;
  puedeDesactivar?: boolean;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
    puedeDesactivar?: boolean
  ) {
    super(message);
    this.name = "ApiAcademicoError";
    this.status = status;
    this.fields = fields;
    this.puedeDesactivar = puedeDesactivar;
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new ApiAcademicoError(
      "No existe una sesión válida. Inicie sesión nuevamente.",
      401
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as
      | T
      | ErrorPayload
      | null;

    if (!response.ok) {
      const payload = data as ErrorPayload | null;
      throw new ApiAcademicoError(
        payload?.error ?? "No se pudo completar la operación.",
        response.status,
        payload?.fields,
        payload?.puedeDesactivar
      );
    }

    if (!data) {
      throw new ApiAcademicoError(
        "El servidor devolvió una respuesta vacía.",
        502
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiAcademicoError(
        "El servidor tardó demasiado en responder.",
        408
      );
    }

    if (error instanceof ApiAcademicoError) throw error;

    throw new ApiAcademicoError(
      "No se pudo conectar con el servidor.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeDepartment(raw: BackendDepartment): DepartamentoAcademico {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    nombre: raw.nombre ?? "",
    activo: Boolean(raw.activo),
    creadoEn: raw.creado_en ?? "",
    docentes: Number(raw.docentes ?? 0),
    cursos: Number(raw.cursos ?? 0),
    cursosActivos: Number(raw.cursos_activos ?? 0),
  };
}

function normalizeCourse(raw: BackendCourse): CursoCatalogo {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    nombre: raw.nombre ?? "",
    departamentoId: Number(raw.departamento_id ?? 0),
    departamento: raw.departamento ?? "",
    creditos: Number(raw.creditos ?? 0),
    activo: Boolean(raw.activo),
    creadoEn: raw.creado_en ?? "",
    horarios: Number(raw.horarios ?? 0),
    horariosActivos: Number(raw.horarios_activos ?? 0),
  };
}

function normalizeSemester(raw: BackendSemester): SemestreCatalogo {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    fechaInicio: raw.fecha_inicio ?? "",
    fechaFin: raw.fecha_fin ?? "",
    activo: Boolean(raw.activo),
    creadoEn: raw.creado_en ?? "",
    horarios: Number(raw.horarios ?? 0),
    horariosActivos: Number(raw.horarios_activos ?? 0),
  };
}

export async function getAcademicCatalogs(): Promise<AcademicCatalogs> {
  const response = await apiRequest<{
    departamentos: BackendDepartment[];
    cursos: BackendCourse[];
    semestres: BackendSemester[];
  }>("/academico/catalogos");

  return {
    departamentos: response.departamentos.map(normalizeDepartment),
    cursos: response.cursos.map(normalizeCourse),
    semestres: response.semestres.map(normalizeSemester),
  };
}

export async function createDepartment(
  values: DepartamentoFormValues
): Promise<DepartamentoAcademico> {
  const response = await apiRequest<{ departamento: BackendDepartment }>(
    "/academico/departamentos",
    {
      method: "POST",
      body: JSON.stringify(values),
    }
  );
  return normalizeDepartment(response.departamento);
}

export async function updateDepartment(
  id: number,
  values: DepartamentoFormValues
): Promise<DepartamentoAcademico> {
  const response = await apiRequest<{ departamento: BackendDepartment }>(
    `/academico/departamentos/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(values),
    }
  );
  return normalizeDepartment(response.departamento);
}

export async function changeDepartmentStatus(
  id: number,
  activo: boolean
): Promise<DepartamentoAcademico> {
  const response = await apiRequest<{ departamento: BackendDepartment }>(
    `/academico/departamentos/${id}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    }
  );
  return normalizeDepartment(response.departamento);
}

export async function deleteDepartment(id: number): Promise<void> {
  await apiRequest(`/academico/departamentos/${id}`, { method: "DELETE" });
}

export async function createCourse(
  values: CursoFormValues
): Promise<CursoCatalogo> {
  const response = await apiRequest<{ curso: BackendCourse }>(
    "/academico/cursos",
    {
      method: "POST",
      body: JSON.stringify({
        codigo: values.codigo,
        nombre: values.nombre,
        departamento_id: values.departamentoId,
        creditos: values.creditos,
        activo: values.activo,
      }),
    }
  );
  return normalizeCourse(response.curso);
}

export async function updateCourse(
  id: number,
  values: CursoFormValues
): Promise<CursoCatalogo> {
  const response = await apiRequest<{ curso: BackendCourse }>(
    `/academico/cursos/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        codigo: values.codigo,
        nombre: values.nombre,
        departamento_id: values.departamentoId,
        creditos: values.creditos,
        activo: values.activo,
      }),
    }
  );
  return normalizeCourse(response.curso);
}

export async function changeCourseStatus(
  id: number,
  activo: boolean
): Promise<CursoCatalogo> {
  const response = await apiRequest<{ curso: BackendCourse }>(
    `/academico/cursos/${id}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    }
  );
  return normalizeCourse(response.curso);
}

export async function deleteCourse(id: number): Promise<void> {
  await apiRequest(`/academico/cursos/${id}`, { method: "DELETE" });
}

export async function createSemester(
  values: SemestreFormValues
): Promise<SemestreCatalogo> {
  const response = await apiRequest<{ semestre: BackendSemester }>(
    "/academico/semestres",
    {
      method: "POST",
      body: JSON.stringify({
        codigo: values.codigo,
        fecha_inicio: values.fechaInicio,
        fecha_fin: values.fechaFin,
        activo: values.activo,
      }),
    }
  );
  return normalizeSemester(response.semestre);
}

export async function updateSemester(
  id: number,
  values: SemestreFormValues
): Promise<SemestreCatalogo> {
  const response = await apiRequest<{ semestre: BackendSemester }>(
    `/academico/semestres/${id}`,
    {
      method: "PUT",
      body: JSON.stringify({
        codigo: values.codigo,
        fecha_inicio: values.fechaInicio,
        fecha_fin: values.fechaFin,
        activo: values.activo,
      }),
    }
  );
  return normalizeSemester(response.semestre);
}

export async function activateSemester(id: number): Promise<SemestreCatalogo> {
  const response = await apiRequest<{ semestre: BackendSemester }>(
    `/academico/semestres/${id}/activar`,
    { method: "PATCH", body: JSON.stringify({}) }
  );
  return normalizeSemester(response.semestre);
}

export async function deleteSemester(id: number): Promise<void> {
  await apiRequest(`/academico/semestres/${id}`, { method: "DELETE" });
}
