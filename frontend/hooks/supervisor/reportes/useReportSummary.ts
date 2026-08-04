"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  fetchReportSummary,
  ReportApiError,
} from "@/lib/supervisor/reportes/api";
import type {
  ReportSummaryResponse,
} from "@/types/supervisor-reportes";

interface UseReportSummaryOptions {
  token: string | null;
  dateFrom: string;
  dateTo: string;
  onUnauthorized?: () => void;
}

interface UseReportSummaryResult {
  data: ReportSummaryResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string;
  lastUpdated: Date | null;
  reload: () => Promise<void>;
}

export function useReportSummary({
  token,
  dateFrom,
  dateTo,
  onUnauthorized,
}: UseReportSummaryOptions): UseReportSummaryResult {
  const [data, setData] =
    useState<ReportSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    if (!token || !dateFrom || !dateTo) {
      setLoading(false);
      return;
    }

    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    const controller = new AbortController();

    if (data) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetchReportSummary(token, {
        dateFrom,
        dateTo,
        signal: controller.signal,
      });

      if (sequence !== requestSequence.current) {
        return;
      }

      setData(response);
      setLastUpdated(new Date());
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return;
      }

      if (sequence !== requestSequence.current) {
        return;
      }

      if (
        requestError instanceof ReportApiError &&
        [401, 403].includes(requestError.status)
      ) {
        onUnauthorized?.();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo cargar el módulo de reportes."
      );
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [data, dateFrom, dateTo, onUnauthorized, token]);

  useEffect(() => {
    void load();
  }, [dateFrom, dateTo, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    reload: load,
  };
}
