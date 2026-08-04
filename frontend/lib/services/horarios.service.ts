import { getToken } from "@/lib/auth";

import type {
  CursoAcademico,
  DiaSemana,
  DocenteHorario,
  HorarioCatalogos,
  HorarioCurso,
  HorarioFormValues,
  SemestreAcademico,
} from "@/types/horario";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface BackendHorario {
  id: number | string;
  docente_id: number | string;
  curso_id: number | string;
  semestre_id: number | string;
  aula: string;
  dia_semana: number | string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  creado_en: string;
  registros_asistencia?: number | string;
  docente_codigo?: string;
  docente?: string;
  departamento?: string;
  curso_codigo?: string;
  curso?: string;
  creditos?: number | string;
  semestre?: string;
  semestre_activo?: boolean;
}

interface BackendDocente {
  id: number | string;
  codigo?: string;
  nombre?: string;
  departamento?: string;
  activo?: boolean;
}

interface BackendCurso {
  id: number | string;
  codigo?: string;
  nombre?: string;
  departamento_id?: number | string;
  departamento?: string;
  creditos?: number | string;
  activo?: boolean;
}

interface BackendSemestre {
  id: number | string;
  codigo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
  creado_en?: string;
}

interface ErrorPayload {
  error?: string;
  fields?: Record<string, string>;
  puedeDesactivar?: boolean;
}

export class ApiHorariosError extends Error {
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
    this.name = "ApiHorariosError";
    this.status = status;
    this.fields = fields;
    this.puedeDesactivar = puedeDesactivar;
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new ApiHorariosError(
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
      const errorData = data as ErrorPayload | null;
      throw new ApiHorariosError(
        errorData?.error ?? "No se pudo completar la operación.",
        response.status,
        errorData?.fields,
        errorData?.puedeDesactivar
      );
    }

    if (!data) {
      throw new ApiHorariosError(
        "El servidor devolvió una respuesta vacía.",
        502
      );
    }

    return data as T;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new ApiHorariosError(
        "El servidor tardó demasiado en responder.",
        408
      );
    }

    if (error instanceof ApiHorariosError) {
      throw error;
    }

    throw new ApiHorariosError(
      "No se pudo conectar con el servidor.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeHorario(raw: BackendHorario): HorarioCurso {
  return {
    id: Number(raw.id),
    docenteId: Number(raw.docente_id),
    cursoId: Number(raw.curso_id),
    semestreId: Number(raw.semestre_id),
    aula: raw.aula ?? "",
    diaSemana: Number(raw.dia_semana) as DiaSemana,
    horaInicio: String(raw.hora_inicio ?? "").slice(0, 5),
    horaFin: String(raw.hora_fin ?? "").slice(0, 5),
    activo: Boolean(raw.activo),
    creadoEn: raw.creado_en ?? "",
    registrosAsistencia: Number(raw.registros_asistencia ?? 0),
    docenteCodigo: raw.docente_codigo ?? "",
    docente: raw.docente ?? "",
    departamento: raw.departamento ?? "",
    cursoCodigo: raw.curso_codigo ?? "",
    curso: raw.curso ?? "",
    creditos: Number(raw.creditos ?? 0),
    semestre: raw.semestre ?? "",
    semestreActivo: Boolean(raw.semestre_activo),
  };
}

function normalizeDocente(raw: BackendDocente): DocenteHorario {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    nombre: raw.nombre ?? "",
    departamento: raw.departamento ?? "",
    activo: Boolean(raw.activo),
  };
}

function normalizeCurso(raw: BackendCurso): CursoAcademico {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    nombre: raw.nombre ?? "",
    departamentoId: Number(raw.departamento_id ?? 0),
    departamento: raw.departamento ?? "",
    creditos: Number(raw.creditos ?? 0),
    activo: Boolean(raw.activo),
  };
}

function normalizeSemestre(raw: BackendSemestre): SemestreAcademico {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    fechaInicio: raw.fecha_inicio ?? "",
    fechaFin: raw.fecha_fin ?? "",
    activo: Boolean(raw.activo),
    creadoEn: raw.creado_en ?? "",
  };
}

function toBackendPayload(values: HorarioFormValues) {
  return {
    docente_id: values.docenteId,
    curso_id: values.cursoId,
    semestre_id: values.semestreId,
    aula: values.aula.trim().toUpperCase(),
    dia_semana: values.diaSemana,
    hora_inicio: values.horaInicio,
    hora_fin: values.horaFin,
    activo: values.activo,
  };
}

export async function getHorarioCatalogos(): Promise<HorarioCatalogos> {
  const response = await apiRequest<{
    docentes: BackendDocente[];
    cursos: BackendCurso[];
    semestres: BackendSemestre[];
  }>("/horarios/catalogos");

  return {
    docentes: response.docentes.map(normalizeDocente),
    cursos: response.cursos.map(normalizeCurso),
    semestres: response.semestres.map(normalizeSemestre),
  };
}

export async function getHorarios(): Promise<HorarioCurso[]> {
  const response = await apiRequest<{ horarios: BackendHorario[] }>(
    "/horarios"
  );
  return response.horarios.map(normalizeHorario);
}

export async function getMisHorarios(): Promise<HorarioCurso[]> {
  const response = await apiRequest<{ horarios: BackendHorario[] }>(
    "/horarios/me"
  );
  return response.horarios.map(normalizeHorario);
}

export async function createHorario(
  values: HorarioFormValues
): Promise<HorarioCurso> {
  const response = await apiRequest<{ horario: BackendHorario }>(
    "/horarios",
    {
      method: "POST",
      body: JSON.stringify(toBackendPayload(values)),
    }
  );
  return normalizeHorario(response.horario);
}

export async function updateHorario(
  horarioId: number,
  values: HorarioFormValues
): Promise<HorarioCurso> {
  const response = await apiRequest<{ horario: BackendHorario }>(
    `/horarios/${horarioId}`,
    {
      method: "PUT",
      body: JSON.stringify(toBackendPayload(values)),
    }
  );
  return normalizeHorario(response.horario);
}

export async function changeHorarioStatus(
  horarioId: number,
  activo: boolean
): Promise<HorarioCurso> {
  const response = await apiRequest<{ horario: BackendHorario }>(
    `/horarios/${horarioId}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    }
  );
  return normalizeHorario(response.horario);
}

export async function deleteHorario(horarioId: number): Promise<void> {
  await apiRequest<{ horarioId: number }>(`/horarios/${horarioId}`, {
    method: "DELETE",
  });
}
