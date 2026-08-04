import type {
  AbsenceAnalyticsResponse,
  AbsenceReportFilters,
  AttendanceAnalyticsResponse,
  AttendanceReportFilters,
  CourseAnalyticsResponse,
  CourseReportFilters,
  DepartmentAnalyticsResponse,
  DepartmentReportFilters,
  DateRangeAnalyticsResponse,
  DateRangeExportResponse,
  DateRangeReportFilters,
  ReportCatalogsResponse,
  ReportSummaryResponse,
  TeacherAnalyticsResponse,
  TeacherReportFilters,
} from "@/types/supervisor-reportes";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ReportApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string
  ) {
    super(message);
    this.name = "ReportApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function buildQuery(
  params: Record<string, string | number | undefined>
): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && String(value).trim()) {
      query.set(key, String(value));
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response
    .json()
    .catch(() => ({}))) as {
    error?: string;
    codigo?: string;
    request_id?: string;
  } & Partial<T>;

  if (!response.ok) {
    throw new ReportApiError(
      payload.error || "No se pudo completar la consulta de reportes.",
      response.status,
      payload.codigo,
      payload.request_id
    );
  }

  return payload as T;
}

export async function fetchReportSummary(
  token: string,
  options: {
    dateFrom: string;
    dateTo: string;
    signal?: AbortSignal;
  }
): Promise<ReportSummaryResponse> {
  const response = await fetch(
    `${API_URL}/reportes/resumen${buildQuery({
      fecha_desde: options.dateFrom,
      fecha_hasta: options.dateTo,
      limite_recientes: 8,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: options.signal,
    }
  );

  return readJson<ReportSummaryResponse>(response);
}

export async function fetchReportCatalogs(
  token: string,
  signal?: AbortSignal
): Promise<ReportCatalogsResponse> {
  const response = await fetch(`${API_URL}/reportes/catalogos`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
    signal,
  });

  return readJson<ReportCatalogsResponse>(response);
}

export async function fetchAttendanceAnalytics(
  token: string,
  filters: AttendanceReportFilters,
  options: {
    page: number;
    pageSize: number;
    signal?: AbortSignal;
  }
): Promise<AttendanceAnalyticsResponse> {
  const response = await fetch(
    `${API_URL}/reportes/asistencia/analitica${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      docente_id: filters.teacherId || undefined,
      curso_codigo: filters.courseCode || undefined,
      departamento: filters.department || undefined,
      estado: filters.status || undefined,
      metodo: filters.method || undefined,
      pagina: options.page,
      limite: options.pageSize,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: options.signal,
    }
  );

  return readJson<AttendanceAnalyticsResponse>(response);
}

export async function fetchAbsenceAnalytics(
  token: string,
  filters: AbsenceReportFilters,
  options: {
    page: number;
    pageSize: number;
    signal?: AbortSignal;
  }
): Promise<AbsenceAnalyticsResponse> {
  const response = await fetch(
    `${API_URL}/reportes/inasistencias/analitica${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      docente_id: filters.teacherId || undefined,
      curso_codigo: filters.courseCode || undefined,
      departamento: filters.department || undefined,
      tipo: filters.type || undefined,
      pagina: options.page,
      limite: options.pageSize,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: options.signal,
    }
  );

  return readJson<AbsenceAnalyticsResponse>(response);
}

export async function fetchTeacherAnalytics(
  token: string,
  filters: TeacherReportFilters,
  signal?: AbortSignal
): Promise<TeacherAnalyticsResponse> {
  const response = await fetch(
    `${API_URL}/reportes/docente/analitica${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      docente_id: filters.teacherId || undefined,
      semestre_id: filters.semesterId || undefined,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }
  );

  return readJson<TeacherAnalyticsResponse>(response);
}



export async function fetchCourseAnalytics(
  token: string,
  filters: CourseReportFilters,
  signal?: AbortSignal
): Promise<CourseAnalyticsResponse> {
  const response = await fetch(
    `${API_URL}/reportes/curso/analitica${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      curso_codigo: filters.courseCode || undefined,
      semestre_id: filters.semesterId || undefined,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }
  );

  return readJson<CourseAnalyticsResponse>(response);
}

export async function fetchDepartmentAnalytics(
  token: string,
  filters: DepartmentReportFilters,
  signal?: AbortSignal
): Promise<DepartmentAnalyticsResponse> {
  const response = await fetch(
    `${API_URL}/reportes/departamento/analitica${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      departamento_id: filters.departmentId,
      semestre_id: filters.semesterId || undefined,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }
  );

  return readJson<DepartmentAnalyticsResponse>(response);
}

export async function fetchDateRangeAnalytics(
  token: string,
  filters: DateRangeReportFilters,
  options: {
    page: number;
    pageSize: number;
    signal?: AbortSignal;
  }
): Promise<DateRangeAnalyticsResponse> {
  const response = await fetch(
    `${API_URL}/reportes/asistencia/analitica${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      docente_id: filters.teacherId || undefined,
      curso_codigo: filters.courseCode || undefined,
      departamento: filters.department || undefined,
      estado: filters.status || undefined,
      metodo: filters.method || undefined,
      resultado: filters.result || undefined,
      tipo: filters.type || undefined,
      pagina: options.page,
      limite: options.pageSize,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: options.signal,
    }
  );

  return readJson<DateRangeAnalyticsResponse>(response);
}

export async function fetchDateRangeExport(
  token: string,
  filters: DateRangeReportFilters,
  signal?: AbortSignal
): Promise<DateRangeExportResponse> {
  const response = await fetch(
    `${API_URL}/reportes/asistencia${buildQuery({
      fecha_desde: filters.dateFrom,
      fecha_hasta: filters.dateTo,
      docente_id: filters.teacherId || undefined,
      curso_codigo: filters.courseCode || undefined,
      departamento: filters.department || undefined,
      estado: filters.status || undefined,
      metodo: filters.method || undefined,
      resultado: filters.result || undefined,
      tipo: filters.type || undefined,
    })}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }
  );

  return readJson<DateRangeExportResponse>(response);
}
