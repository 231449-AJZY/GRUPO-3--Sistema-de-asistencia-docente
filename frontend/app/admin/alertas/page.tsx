"use client";


import { useCallback, useEffect, useMemo, useState } from "react";


import DashboardLayout from "@/components/layout/DashboardLayout";
import { getCurrentUser, getToken } from "@/lib/auth";


interface AlertRecord {
  id: number;
  teacherId: number;
  teacherCode: string;
  teacher: string;
  email: string;
  department: string | null;
  type: string;
  message: string;
  priority: "BAJA" | "MEDIA" | "ALTA" | "CRITICA";
  status: "NUEVA" | "REVISADA" | "RESUELTA" | "DESCARTADA";
  source: string;
  createdAt: string;
  handledAt: string | null;
  handledBy: string | null;
  comment: string | null;
}


interface Summary {
  total: number;
  nuevas: number;
  revisadas: number;
  resueltas: number;
  descartadas: number;
  criticas: number;
  altas: number;
  offline_pendientes: number;
}


interface Catalogs {
  teachers: Array<{ id: number; codigo: string; nombre: string }>;
  types: string[];
}


const EMPTY_SUMMARY: Summary = {
  total: 0,
  nuevas: 0,
  revisadas: 0,
  resueltas: 0,
  descartadas: 0,
  criticas: 0,
  altas: 0,
  offline_pendientes: 0,
};


function priorityClass(priority: AlertRecord["priority"]): string {
  if (priority === "CRITICA") return "bg-red-100 text-red-800 border-red-200";
  if (priority === "ALTA") return "bg-orange-100 text-orange-800 border-orange-200";
  if (priority === "MEDIA") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}


function statusClass(status: AlertRecord["status"]): string {
  if (status === "NUEVA") return "bg-red-50 text-red-700";
  if (status === "REVISADA") return "bg-blue-50 text-blue-700";
  if (status === "RESUELTA") return "bg-emerald-50 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}


function typeLabel(value: string): string {
  return value.replaceAll("_", " ");
}


export default function AdminAlertsPage() {
  const user = getCurrentUser();
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [catalogs, setCatalogs] = useState<Catalogs>({ teachers: [], types: [] });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    priority: "",
    type: "",
    teacherId: "",
    from: "",
    to: "",
  });


  const authHeaders = useCallback((): HeadersInit => {
    const token = getToken();
    if (!token) throw new Error("No existe una sesión administrativa válida.");
    return { Accept: "application/json", Authorization: `Bearer ${token}` };
  }, []);


  const loadAll = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError("");


    try {
      const query = new URLSearchParams();
      if (filters.q) query.set("q", filters.q);
      if (filters.status) query.set("estado", filters.status);
      if (filters.priority) query.set("prioridad", filters.priority);
      if (filters.type) query.set("tipo", filters.type);
      if (filters.teacherId) query.set("docente_id", filters.teacherId);
      if (filters.from) query.set("desde", filters.from);
      if (filters.to) query.set("hasta", filters.to);
      query.set("limit", "250");


      const [alertsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/alertas?${query.toString()}`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch("/api/alertas/resumen", {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ]);


      const alertsData = (await alertsResponse.json()) as {
        alerts?: AlertRecord[];
        error?: string;
      };
      const summaryData = (await summaryResponse.json()) as Summary & { error?: string };


      if (!alertsResponse.ok) throw new Error(alertsData.error ?? "No se pudieron cargar las alertas.");
      if (!summaryResponse.ok) throw new Error(summaryData.error ?? "No se pudo cargar el resumen.");


      setAlerts(alertsData.alerts ?? []);
      setSummary(summaryData);
      setLastUpdate(new Date().toLocaleTimeString("es-PE"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el centro de alertas.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, filters]);


  useEffect(() => {
    async function loadCatalogs(): Promise<void> {
      try {
        const response = await fetch("/api/alertas/catalogos", {
          headers: authHeaders(),
          cache: "no-store",
        });
        const data = (await response.json()) as Catalogs & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar los filtros.");
        setCatalogs(data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudieron cargar los filtros.");
      }
    }


    void loadCatalogs();
  }, [authHeaders]);


  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(true), 180);
    return () => window.clearTimeout(timer);
  }, [loadAll]);


  useEffect(() => {
    const interval = window.setInterval(() => void loadAll(false), 60000);
    return () => window.clearInterval(interval);
  }, [loadAll]);


  const activeCount = useMemo(
    () => alerts.filter((alert) => alert.status === "NUEVA" || alert.status === "REVISADA").length,
    [alerts]
  );


  async function generateNow(): Promise<void> {
    setLoading(true);
    setError("");


    try {
      const response = await fetch("/api/alertas/generar", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudieron actualizar las alertas.");
      await loadAll(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron actualizar las alertas.");
      setLoading(false);
    }
  }


  async function changeStatus(alert: AlertRecord, status: AlertRecord["status"]): Promise<void> {
    let comment = "";


    if (status === "RESUELTA" || status === "DESCARTADA") {
      comment = window.prompt("Ingrese una observación breve para cerrar la alerta:", alert.comment ?? "") ?? "";
      if (!comment.trim()) return;
    }


    setUpdatingId(alert.id);
    setError("");


    try {
      const response = await fetch(`/api/alertas/${alert.id}/estado`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ estado: status, comentario: comment }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar la alerta.");
      await loadAll(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo actualizar la alerta.");
    } finally {
      setUpdatingId(null);
    }
  }


  function clearFilters(): void {
    setFilters({ q: "", status: "", priority: "", type: "", teacherId: "", from: "", to: "" });
  }


  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#071d35] text-white">
        Validando sesión administrativa...
      </main>
    );
  }


  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Centro de alertas operativas</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Incidencias reales, prioridad, responsable y trazabilidad de atención.
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-extrabold text-slate-600">
              Actualizado: {lastUpdate || "—"}
            </span>
            <button
              type="button"
              onClick={() => void generateNow()}
              disabled={loading}
              className="rounded-xl bg-[#0A2E52] px-5 py-3 text-sm font-extrabold text-white hover:bg-[#123f6d] disabled:opacity-60"
            >
              {loading ? "Actualizando..." : "Actualizar alertas"}
            </button>
          </div>
        </header>


        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <SummaryCard label="Total" value={summary.total} />
          <SummaryCard label="Nuevas" value={summary.nuevas} />
          <SummaryCard label="Revisadas" value={summary.revisadas} />
          <SummaryCard label="Resueltas" value={summary.resueltas} />
          <SummaryCard label="Críticas" value={summary.criticas} />
          <SummaryCard label="Altas" value={summary.altas} />
          <SummaryCard label="Offline" value={summary.offline_pendientes} />
          <SummaryCard label="Activas visibles" value={activeCount} />
        </section>


        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterInput
              label="Buscar"
              value={filters.q}
              placeholder="Docente, código o mensaje"
              onChange={(value) => setFilters((current) => ({ ...current, q: value }))}
            />
            <FilterSelect
              label="Estado"
              value={filters.status}
              onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
              options={["NUEVA", "REVISADA", "RESUELTA", "DESCARTADA"]}
            />
            <FilterSelect
              label="Prioridad"
              value={filters.priority}
              onChange={(value) => setFilters((current) => ({ ...current, priority: value }))}
              options={["CRITICA", "ALTA", "MEDIA", "BAJA"]}
            />
            <FilterSelect
              label="Tipo"
              value={filters.type}
              onChange={(value) => setFilters((current) => ({ ...current, type: value }))}
              options={catalogs.types}
              format={typeLabel}
            />
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Docente</span>
              <select
                value={filters.teacherId}
                onChange={(event) => setFilters((current) => ({ ...current, teacherId: event.target.value }))}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
              >
                <option value="">Todos</option>
                {catalogs.teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.codigo} · {teacher.nombre}
                  </option>
                ))}
              </select>
            </label>
            <DateInput
              label="Desde"
              value={filters.from}
              onChange={(value) => setFilters((current) => ({ ...current, from: value }))}
            />
            <DateInput
              label="Hasta"
              value={filters.to}
              onChange={(value) => setFilters((current) => ({ ...current, to: value }))}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Limpiar filtros
              </button>
            </div>
          </div>


          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </section>


        <section className="space-y-4">
          {alerts.map((alert) => (
            <article key={alert.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${priorityClass(alert.priority)}`}>
                      {alert.priority}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${statusClass(alert.status)}`}>
                      {alert.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
                      {typeLabel(alert.type)}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(alert.createdAt).toLocaleString("es-PE")}
                    </span>
                  </div>


                  <h2 className="mt-4 text-lg font-extrabold text-slate-900">
                    {alert.teacherCode} · {alert.teacher}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{alert.message}</p>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Fuente: {alert.source} · {alert.department ?? "Sin departamento"}
                  </p>


                  {(alert.handledBy || alert.comment) && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <strong>Atención:</strong> {alert.handledBy ?? "Usuario administrativo"}
                      {alert.handledAt ? ` · ${new Date(alert.handledAt).toLocaleString("es-PE")}` : ""}
                      {alert.comment ? ` · ${alert.comment}` : ""}
                    </div>
                  )}
                </div>


                <div className="flex flex-wrap gap-2 xl:max-w-[330px] xl:justify-end">
                  {alert.status === "NUEVA" && (
                    <ActionButton
                      label="Marcar revisada"
                      disabled={updatingId === alert.id}
                      onClick={() => void changeStatus(alert, "REVISADA")}
                    />
                  )}
                  {alert.status !== "RESUELTA" && (
                    <ActionButton
                      label="Resolver"
                      disabled={updatingId === alert.id}
                      onClick={() => void changeStatus(alert, "RESUELTA")}
                      primary
                    />
                  )}
                  {alert.status !== "DESCARTADA" && (
                    <ActionButton
                      label="Descartar"
                      disabled={updatingId === alert.id}
                      onClick={() => void changeStatus(alert, "DESCARTADA")}
                    />
                  )}
                  {(alert.status === "RESUELTA" || alert.status === "DESCARTADA") && (
                    <ActionButton
                      label="Reabrir"
                      disabled={updatingId === alert.id}
                      onClick={() => void changeStatus(alert, "NUEVA")}
                    />
                  )}
                </div>
              </div>
            </article>
          ))}


          {!loading && alerts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="text-lg font-extrabold text-slate-700">No hay alertas con estos filtros.</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">El sistema seguirá revisando eventos cada minuto.</p>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}


function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-2xl font-extrabold text-[#0A2E52]">{value}</div>
      <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}


function FilterInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
      />
    </label>
  );
}


function FilterSelect({
  label,
  value,
  options,
  onChange,
  format = (item) => item,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  format?: (value: string) => string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>{format(option)}</option>
        ))}
      </select>
    </label>
  );
}


function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-600"
      />
    </label>
  );
}


function ActionButton({
  label,
  disabled,
  onClick,
  primary = false,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition disabled:opacity-50 ${
        primary
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}