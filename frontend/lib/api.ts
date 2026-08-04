import { getToken } from "@/lib/auth";
import type { AdminDashboardData } from "@/types/dashboard";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

interface ErrorPayload {
  error?: string;
}

export class ApiDashboardError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiDashboardError";
    this.status = status;
  }
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const token = getToken();

  if (!token) {
    throw new ApiDashboardError(
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
      `${API_URL}/dashboard/admin`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const payload = (await response
      .json()
      .catch(() => null)) as
      | AdminDashboardData
      | ErrorPayload
      | null;

    if (!response.ok) {
      const errorPayload =
        payload as ErrorPayload | null;

      throw new ApiDashboardError(
        errorPayload?.error ??
          "No se pudo obtener la información del dashboard.",
        response.status
      );
    }

    if (!payload || !("metrics" in payload)) {
      throw new ApiDashboardError(
        "El servidor devolvió una respuesta vacía o inválida.",
        502
      );
    }

    return payload;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new ApiDashboardError(
        "El servidor tardó demasiado en responder.",
        408
      );
    }

    if (error instanceof ApiDashboardError) {
      throw error;
    }

    throw new ApiDashboardError(
      "No se pudo conectar con los servicios del sistema.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}
