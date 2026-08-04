"use client";

import { getToken } from "@/lib/auth";
import type {
  BiometricBridgeCapture,
  BiometricBridgeStatus,
  BiometricDashboardData,
  BiometricEnrollment,
  BiometricEnrollmentInput,
  BiometricRecentCaptureList,
  BiometricTeacherList,
} from "@/types/biometria";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface ErrorPayload {
  error?: string;
  code?: string;
}

export class BiometriaApiError extends Error {
  status: number;
  code?: string;

  constructor(
    message: string,
    status: number,
    code?: string
  ) {
    super(message);
    this.name = "BiometriaApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = 18000
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new BiometriaApiError(
      "No existe una sesión válida.",
      401
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      `${API_URL}${path}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init.headers ?? {}),
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const payload = (await response
      .json()
      .catch(() => null)) as
      | T
      | ErrorPayload
      | null;

    if (!response.ok) {
      const error = payload as ErrorPayload | null;

      throw new BiometriaApiError(
        error?.error ??
          "La operación biométrica no pudo completarse.",
        response.status,
        error?.code
      );
    }

    if (!payload) {
      throw new BiometriaApiError(
        "El servidor devolvió una respuesta vacía.",
        502
      );
    }

    return payload as T;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new BiometriaApiError(
        "La operación biométrica superó el tiempo máximo.",
        408
      );
    }

    if (error instanceof BiometriaApiError) {
      throw error;
    }

    throw new BiometriaApiError(
      "No se pudo conectar con el servicio biométrico.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getBiometricDashboard(): Promise<BiometricDashboardData> {
  return request<BiometricDashboardData>(
    "/biometria/dashboard"
  );
}

export function getBiometricTeachers(
  search = ""
): Promise<BiometricTeacherList> {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  const suffix = params.toString()
    ? `?${params.toString()}`
    : "";

  return request<BiometricTeacherList>(
    `/biometria/docentes${suffix}`
  );
}

export function saveBiometricEnrollment(
  input: BiometricEnrollmentInput
): Promise<{
  message: string;
  enrollment: BiometricEnrollment;
  security: {
    rawImageStored: false;
    encrypted: true;
    algorithm: string;
  };
}> {
  return request(
    "/biometria/enrolamientos",
    {
      method: "POST",
      body: JSON.stringify({
        docente_id: input.teacherId,
        dedo: input.finger,
        plantilla_base64: input.templateBase64,
        calidad: input.quality,
        version_sdk: input.sdkVersion,
        dispositivo: input.device,
        metadata: input.metadata,
      }),
    }
  );
}

export function getBiometricBridgeStatus(): Promise<BiometricBridgeStatus> {
  return request<BiometricBridgeStatus>(
    "/biometria/puente/estado",
    {},
    7000
  );
}

export function captureBiometricTemplate(
  finger: string
): Promise<BiometricBridgeCapture> {
  return request<BiometricBridgeCapture>(
    "/biometria/puente/capturar",
    {
      method: "POST",
      body: JSON.stringify({
        dedo: finger,
        timeout_ms: 30000,
      }),
    },
    95000
  );
}

export function diagnoseBiometricBridge(): Promise<{
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
  code?: string;
}> {
  return request(
    "/biometria/puente/diagnostico",
    {
      method: "POST",
      body: "{}",
    },
    30000
  );
}

export function getRecentBiometricCaptures(
  limit = 12
): Promise<BiometricRecentCaptureList> {
  const safeLimit = Math.min(
    Math.max(Math.trunc(limit), 1),
    100
  );

  return request<BiometricRecentCaptureList>(
    `/biometria/capturas/recientes?limit=${safeLimit}`
  );
}
// PASO_8J3_DISPOSITIVOS_REALES
export function getBiometricDevices(): Promise<
  import("@/types/biometria").BiometricDeviceList
> {
  return request("/biometria/dispositivos");
}

export function getBiometricDeviceDetail(
  deviceId: number
): Promise<
  import("@/types/biometria").BiometricDeviceDetail
> {
  return request(`/biometria/dispositivos/${deviceId}`);
}

export function createBiometricDevice(
  input: import("@/types/biometria").BiometricDeviceInput
): Promise<{
  message: string;
  device: import("@/types/biometria").BiometricDevice;
}> {
  return request("/biometria/dispositivos", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateBiometricDevice(
  deviceId: number,
  input: import("@/types/biometria").BiometricDeviceInput
): Promise<{
  message: string;
  device: import("@/types/biometria").BiometricDevice;
}> {
  return request(`/biometria/dispositivos/${deviceId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function runBiometricDeviceAction(
  deviceId: number,
  action: import("@/types/biometria").BiometricDeviceAction,
  reason = ""
): Promise<{
  message: string;
  device: import("@/types/biometria").BiometricDevice;
}> {
  return request(`/biometria/dispositivos/${deviceId}/accion`, {
    method: "POST",
    body: JSON.stringify({
      accion: action,
      motivo: reason,
    }),
  });
}

export function diagnoseBiometricDevice(
  deviceId: number
): Promise<
  import("@/types/biometria").BiometricDeviceDiagnosticResponse
> {
  return request(
    `/biometria/dispositivos/${deviceId}/diagnostico-real`,
    {
      method: "POST",
      body: "{}",
    },
    45000
  );
}

export function diagnoseAllBiometricDevices(): Promise<
  import("@/types/biometria").BiometricGeneralDiagnosticResponse
> {
  return request(
    "/biometria/dispositivos/diagnostico-general",
    {
      method: "POST",
      body: "{}",
    },
    60000
  );
}

// PASO_8J4_CIERRE_BIOMETRICO_ADMIN
export function getBiometricSynchronization(): Promise<
  import("@/types/biometria").BiometricSynchronizationDashboard
> {
  return request("/biometria/sincronizacion");
}

export function executeBiometricSynchronization(
  deviceId: number
): Promise<{
  message: string;
  job: import("@/types/biometria").BiometricSynchronizationJob;
  honestExecution: true;
}> {
  return request(
    `/biometria/sincronizacion/${deviceId}/ejecutar`,
    {
      method: "POST",
      body: "{}",
    },
    30000
  );
}

export function getBiometricHistory(
  filters: import("@/types/biometria").BiometricHistoryFilters = {}
): Promise<
  import("@/types/biometria").BiometricHistoryResponse
> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.result) {
    params.set("result", filters.result);
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.deviceId) {
    params.set("deviceId", String(filters.deviceId));
  }
  if (filters.teacherId) {
    params.set("teacherId", String(filters.teacherId));
  }
  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 25));

  return request(
    `/biometria/historial?${params.toString()}`
  );
}

export function getBiometricReport(
  dateFrom: string,
  dateTo: string
): Promise<
  import("@/types/biometria").BiometricReportResponse
> {
  const params = new URLSearchParams({
    dateFrom,
    dateTo,
  });

  return request(
    `/biometria/reportes?${params.toString()}`
  );
}

export function getBiometricIntegrity(): Promise<
  import("@/types/biometria").BiometricIntegrityResponse
> {
  return request("/biometria/integridad");
}
