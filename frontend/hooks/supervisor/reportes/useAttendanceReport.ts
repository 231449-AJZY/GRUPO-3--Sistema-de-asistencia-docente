"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  fetchAttendanceAnalytics,
  fetchReportCatalogs,
  ReportApiError,
} from "@/lib/supervisor/reportes/api";
import type {
  AttendanceAnalyticsResponse,
  AttendanceReportFilters,
  ReportCatalogsResponse,
} from "@/types/supervisor-reportes";

interface UseAttendanceReportOptions {
  token: string | null;
  filters: AttendanceReportFilters;
  page: number;
  pageSize: number;
  onUnauthorized: () => void;
}

interface UseAttendanceReportResult {
  data: AttendanceAnalyticsResponse | null;
  catalogs: ReportCatalogsResponse | null;
  loading: boolean;
  refreshing: boolean;
  catalogsLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  reload: () => Promise<void>;
}

export function useAttendanceReport({
  token,
  filters,
  page,
  pageSize,
  onUnauthorized,
}: UseAttendanceReportOptions): UseAttendanceReportResult {
  const [data, setData] = useState<AttendanceAnalyticsResponse | null>(null);
  const [catalogs, setCatalogs] = useState<ReportCatalogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const hasDataRef = useRef(false);
  const analyticsAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      analyticsAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setCatalogsLoading(false);
      return;
    }

    const controller = new AbortController();
    setCatalogsLoading(true);

    void fetchReportCatalogs(token, controller.signal)
      .then((payload) => {
        if (!mountedRef.current) return;
        setCatalogs(payload);
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || !mountedRef.current) return;
        if (caught instanceof ReportApiError && caught.status === 401) {
          onUnauthorized();
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "No se pudieron cargar los catálogos del reporte."
        );
      })
      .finally(() => {
        if (mountedRef.current && !controller.signal.aborted) {
          setCatalogsLoading(false);
        }
      });

    return () => controller.abort();
  }, [onUnauthorized, token]);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    analyticsAbortRef.current?.abort();
    const controller = new AbortController();
    analyticsAbortRef.current = controller;

    if (hasDataRef.current) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const payload = await fetchAttendanceAnalytics(token, filters, {
        page,
        pageSize,
        signal: controller.signal,
      });

      if (!mountedRef.current || requestRef.current !== requestId) return;
      setData(payload);
      hasDataRef.current = true;
      setLastUpdated(new Date());
    } catch (caught: unknown) {
      if (controller.signal.aborted || !mountedRef.current) return;
      if (caught instanceof ReportApiError && caught.status === 401) {
        onUnauthorized();
        return;
      }
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar el reporte de asistencia."
      );
    } finally {
      if (requestRef.current === requestId) {
        analyticsAbortRef.current = null;
      }
      if (mountedRef.current && requestRef.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filters, onUnauthorized, page, pageSize, token]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    data,
    catalogs,
    loading,
    refreshing,
    catalogsLoading,
    error,
    lastUpdated,
    reload: load,
  };
}
