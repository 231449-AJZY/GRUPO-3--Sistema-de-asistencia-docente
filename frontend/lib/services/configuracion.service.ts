import { getToken } from "@/lib/auth";

import type {
  ConfigurationSemesterOption,
  InstitutionalConfiguration,
  InstitutionalConfigurationResponse,
} from "@/types/configuration";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface ErrorPayload {
  error?: string;
  fields?: Record<string, string>;
}

interface BackendSemester {
  id: number | string;
  codigo?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  activo?: boolean;
}

interface BackendResponse {
  configuration: InstitutionalConfiguration;
  semestres: BackendSemester[];
  updatedAt: string;
  fields?: Record<string, string>;
}

export class ApiConfiguracionError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiConfiguracionError";
    this.status = status;
    this.fields = fields;
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new ApiConfiguracionError(
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
      throw new ApiConfiguracionError(
        payload?.error ?? "No se pudo completar la operación.",
        response.status,
        payload?.fields
      );
    }

    if (!data) {
      throw new ApiConfiguracionError(
        "El servidor devolvió una respuesta vacía.",
        502
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiConfiguracionError(
        "El servidor tardó demasiado en responder.",
        408
      );
    }

    if (error instanceof ApiConfiguracionError) throw error;

    throw new ApiConfiguracionError(
      "No se pudo conectar con el servidor.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function normalize(response: BackendResponse): InstitutionalConfigurationResponse {
  const semestres: ConfigurationSemesterOption[] = response.semestres.map(
    (item) => ({
      id: Number(item.id),
      codigo: item.codigo ?? "",
      fechaInicio: item.fecha_inicio ?? "",
      fechaFin: item.fecha_fin ?? "",
      activo: Boolean(item.activo),
    })
  );

  return {
    configuration: response.configuration,
    semestres,
    updatedAt: response.updatedAt,
  };
}

export async function getInstitutionalConfiguration(): Promise<InstitutionalConfigurationResponse> {
  const response = await apiRequest<BackendResponse>("/configuracion");
  return normalize(response);
}

export async function saveInstitutionalConfiguration(
  configuration: InstitutionalConfiguration
): Promise<InstitutionalConfigurationResponse> {
  const response = await apiRequest<BackendResponse>("/configuracion", {
    method: "PUT",
    body: JSON.stringify(configuration),
  });
  return normalize(response);
}
