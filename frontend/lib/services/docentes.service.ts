import { getToken } from "@/lib/auth";

import type {
  CategoriaDocente,
  Docente,
  DocenteFormData,
  EstadoBiometrico,
  EstadoDocente,
} from "@/types/docente";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

interface BackendDocente {
  id: number | string;
  usuario_id?: number | string;
  codigo?: string;
  dni?: string | null;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  email?: string;
  telefono?: string | null;
  departamento_id?: number | string;
  departamento?: string;
  categoria?: string | null;
  condicion?: string | null;
  estadoBiometrico?: string;
  estado_biometrico?: string;
  activo?: boolean;
  estado?: string;
  fechaRegistro?: string;
  fecha_registro?: string;
}

interface DocentesResponse {
  docentes: BackendDocente[];
}

interface DocenteResponse {
  docente: BackendDocente;
  mensaje?: string;
  passwordTemporal?: string;
  fields?: Record<string, string>;
}

interface BackendDepartment {
  id: number | string;
  codigo?: string;
  nombre: string;
}

interface CatalogosResponse {
  departamentos: BackendDepartment[];
  categorias?: string[];
  condiciones?: string[];
}

export interface DepartamentoDocente {
  id: number;
  codigo: string;
  nombre: string;
}

export interface DocenteCatalogos {
  departamentos: DepartamentoDocente[];
  categorias: string[];
  condiciones: string[];
}

export interface DocenteStats {
  total: number;
  activos: number;
  inactivos: number;
  biometricos: number;
  pendientesBiometricos: number;
}

interface DocenteStatsResponse {
  docentes: DocenteStats;
  porDepartamento: Array<{
    departamento: string;
    total: number;
  }>;
}

export interface CreateDocenteResult {
  docente: Docente;
  mensaje: string;
  passwordTemporal?: string;
}

export interface DeleteDocenteDependencies {
  horarios: number;
  ingresos: number;
  asistencias: number;
  alertas: number;
  enrolamientosRealizados: number;
  configuracionesActualizadas: number;
  alertasGeneradas: number;
  accionesAuditadas: number;
}

interface ErrorPayload {
  error?: string;
  code?: string;
  canDeactivate?: boolean;
  fields?: Record<string, string>;
  details?: Partial<DeleteDocenteDependencies>;
}

interface DeleteDocenteResponse {
  mensaje: string;
  docenteId: number | string;
  usuarioId: number | string;
}

export interface DeleteDocenteResult {
  mensaje: string;
  docenteId: number;
  usuarioId: number;
}

export class ApiDocentesError extends Error {
  status: number;
  code?: string;
  canDeactivate?: boolean;
  fields?: Record<string, string>;
  details?: Partial<DeleteDocenteDependencies>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
    options?: {
      code?: string;
      canDeactivate?: boolean;
      details?: Partial<DeleteDocenteDependencies>;
    }
  ) {
    super(message);
    this.name = "ApiDocentesError";
    this.status = status;
    this.fields = fields;
    this.code = options?.code;
    this.canDeactivate = options?.canDeactivate;
    this.details = options?.details;
  }
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new ApiDocentesError(
      "No existe una sesión válida. Inicie sesión nuevamente.",
      401
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const response = await fetch(
      `${API_URL}${path}`,
      {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const data = (await response
      .json()
      .catch(() => null)) as
      | T
      | ErrorPayload
      | null;

    if (!response.ok) {
      const errorData = data as ErrorPayload | null;

      throw new ApiDocentesError(
        errorData?.error ??
          "No se pudo completar la operación.",
        response.status,
        errorData?.fields,
        {
          code: errorData?.code,
          canDeactivate:
            errorData?.canDeactivate,
          details: errorData?.details,
        }
      );
    }

    if (!data) {
      throw new ApiDocentesError(
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
      throw new ApiDocentesError(
        "El servidor tardó demasiado en responder.",
        408
      );
    }

    if (error instanceof ApiDocentesError) {
      throw error;
    }

    throw new ApiDocentesError(
      "No se pudo conectar con el servidor.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalizeCategory(
  value?: string | null
): CategoriaDocente {
  const allowed: CategoriaDocente[] = [
    "Principal",
    "Asociado",
    "Auxiliar",
    "Contratado",
  ];

  return allowed.includes(
    value as CategoriaDocente
  )
    ? (value as CategoriaDocente)
    : "Contratado";
}

function normalizeBiometricStatus(
  value?: string
): EstadoBiometrico {
  return value === "Registrado"
    ? "Registrado"
    : "Pendiente";
}

function normalizeTeacherStatus(
  value?: string,
  active?: boolean
): EstadoDocente {
  if (
    value === "Activo" ||
    value === "En pausa" ||
    value === "Inactivo"
  ) {
    return value;
  }

  return active ? "Activo" : "Inactivo";
}

function normalizeDocente(
  raw: BackendDocente
): Docente {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    dni: raw.dni ?? "",
    nombres: raw.nombres ?? "",
    apellidos: raw.apellidos ?? "",
    correo:
      raw.correo ??
      raw.email ??
      "",
    telefono: raw.telefono ?? "",
    departamento: raw.departamento ?? "",
    categoria: normalizeCategory(
      raw.categoria
    ),
    estadoBiometrico:
      normalizeBiometricStatus(
        raw.estadoBiometrico ??
          raw.estado_biometrico
      ),
    estado: normalizeTeacherStatus(
      raw.estado,
      raw.activo
    ),
    fechaRegistro:
      raw.fechaRegistro ??
      raw.fecha_registro ??
      "",
  };
}

function toBackendPayload(
  data: DocenteFormData
) {
  return {
    nombres: data.nombres.trim(),
    apellidos: data.apellidos.trim(),
    dni: data.dni.trim(),
    correo: data.correo
      .trim()
      .toLowerCase(),
    telefono: data.telefono.trim(),
    departamento:
      data.departamento.trim(),
    categoria: data.categoria,
    condicion:
      data.categoria === "Contratado"
        ? "Contratado"
        : "Nombrado",
    estado: data.estado,
  };
}

export async function getDocentes(): Promise<
  Docente[]
> {
  const response =
    await apiRequest<DocentesResponse>(
      "/docentes"
    );

  return response.docentes.map(
    normalizeDocente
  );
}

export async function getDocenteById(
  docenteId: number
): Promise<Docente> {
  const response =
    await apiRequest<DocenteResponse>(
      `/docentes/${docenteId}`
    );

  return normalizeDocente(
    response.docente
  );
}

export async function getDocenteCatalogos(): Promise<
  DocenteCatalogos
> {
  const response =
    await apiRequest<CatalogosResponse>(
      "/docentes/catalogos"
    );

  return {
    departamentos:
      response.departamentos.map(
        (item) => ({
          id: Number(item.id),
          codigo: item.codigo ?? "",
          nombre: item.nombre,
        })
      ),
    categorias:
      response.categorias ?? [],
    condiciones:
      response.condiciones ?? [],
  };
}

export async function getDocenteStats(): Promise<
  DocenteStatsResponse
> {
  return apiRequest<DocenteStatsResponse>(
    "/docentes/stats"
  );
}

export async function createDocente(
  data: DocenteFormData
): Promise<CreateDocenteResult> {
  const response =
    await apiRequest<DocenteResponse>(
      "/docentes",
      {
        method: "POST",
        body: JSON.stringify(
          toBackendPayload(data)
        ),
      }
    );

  return {
    docente: normalizeDocente(
      response.docente
    ),
    mensaje:
      response.mensaje ??
      "Docente registrado correctamente.",
    passwordTemporal:
      response.passwordTemporal,
  };
}

export async function updateDocente(
  docenteId: number,
  data: DocenteFormData
): Promise<Docente> {
  const response =
    await apiRequest<DocenteResponse>(
      `/docentes/${docenteId}`,
      {
        method: "PUT",
        body: JSON.stringify(
          toBackendPayload(data)
        ),
      }
    );

  return normalizeDocente(
    response.docente
  );
}

export async function changeDocenteStatus(
  docenteId: number,
  activo: boolean
): Promise<Docente> {
  const response =
    await apiRequest<DocenteResponse>(
      `/docentes/${docenteId}/estado`,
      {
        method: "PATCH",
        body: JSON.stringify({ activo }),
      }
    );

  return normalizeDocente(
    response.docente
  );
}

export async function deleteDocente(
  docenteId: number
): Promise<DeleteDocenteResult> {
  const response =
    await apiRequest<DeleteDocenteResponse>(
      `/docentes/${docenteId}`,
      {
        method: "DELETE",
      }
    );

  return {
    mensaje:
      response.mensaje ??
      "Docente eliminado definitivamente.",
    docenteId: Number(response.docenteId),
    usuarioId: Number(response.usuarioId),
  };
}
