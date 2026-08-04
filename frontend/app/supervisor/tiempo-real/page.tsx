"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ErrorState from "@/components/shared/ErrorState";
import LoadingState from "@/components/shared/LoadingState";
import PageHeader from "@/components/shared/PageHeader";
import Button from "@/components/ui/Button";
import {
  clearSession,
  getLegacyUser,
  getToken,
} from "@/lib/auth";

import styles from "./page.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const REFRESH_INTERVAL_MS = 10_000;

interface SessionUser {
  nombres?: string;
  apellidos?: string;
  nombre?: string;
  rol?: string;
}

interface SupervisorRecord {
  id: string;
  docente: string;
  codigo: string;
  departamento: string;
  tipo_objetivo: string;
  registro: string;
  curso_codigo?: string | null;
  aula?: string | null;
  hora_registro: string;
  estado: string;
  resultado: string;
  metodo: string;
  fuente?: string;
}

interface SupervisorStats {
  docentesMonitoreados: number;
  docentesPresentes: number;
  registrosValidados: number;
  puntuales: number;
  tardanzas: number;
  registrosCurso: number;
  ingresosInstitucionales: number;
  duplicadas: number;
  rechazadas: number;
}

interface MethodPoint {
  metodo: string;
  total: number;
}

interface DashboardResponse {
  generatedAt?: string;
  fecha?: string;
  stats: SupervisorStats;
  registrosHoy: SupervisorRecord[];
  metodos?: MethodPoint[];
  error?: string;
}

interface Filters {
  search: string;
  type: string;
  status: string;
  result: string;
  method: string;
}

class RequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const EMPTY_FILTERS: Filters = {
  search: "",
  type: "TODOS",
  status: "TODOS",
  result: "TODOS",
  method: "TODOS",
};

function normalize(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function searchable(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayUser(user: SessionUser | null): string {
  if (!user) return "Supervisor";
  return (
    `${user.nombres ?? ""} ${user.apellidos ?? ""}`.trim() ||
    String(user.nombre ?? "").trim() ||
    "Supervisor"
  );
}

function formatRefresh(value: Date | null): string {
  if (!value) return "Sin actualizar";
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  }).format(value);
}

function formatTime(value: string): string {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "—";
  const hour = Number(match[1]);
  const period = hour >= 12 ? "PM" : "AM";
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${period}`;
}

function statusLabel(value: string): string {
  const normalized = normalize(value);
  if (["PUNTUAL", "PRESENTE"].includes(normalized)) return "Presente";
  if (normalized === "TARDANZA") return "Tardanza";
  if (["AUSENTE", "INASISTENCIA", "FALTA"].includes(normalized)) return "Inasistencia";
  return normalized.replaceAll("_", " ") || "Sin estado";
}

function methodLabel(value: string): string {
  const normalized = normalize(value);
  if (normalized === "QR_DINAMICO") return "QR dinámico";
  if (normalized === "BIOMETRIA_MOVIL_BLE") return "Biometría + BLE";
  if (normalized === "BIOMETRIA_MOVIL") return "Biometría móvil";
  if (normalized === "OFFLINE_SINCRONIZADO") return "Offline sincronizado";
  if (normalized === "LECTOR_BIOMETRICO") return "Lector biométrico";
  return value || "Manual";
}

async function requestData(token: string): Promise<DashboardResponse> {
  const response = await fetch(`${API_URL}/dashboard/supervisor`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as DashboardResponse;
  if (!response.ok) {
    throw new RequestError(payload.error || "No se pudo actualizar el monitoreo.", response.status);
  }
  return payload;
}

function Pill({ value, kind }: { value: string; kind: "status" | "result" | "type" }) {
  const normalized = normalize(value);
  let tone = "neutral";
  if (kind === "status") {
    tone = ["PUNTUAL", "PRESENTE"].includes(normalized)
      ? "success"
      : normalized === "TARDANZA"
        ? "warning"
        : "danger";
  } else if (kind === "result") {
    tone = normalized === "REGISTRADA"
      ? "success"
      : normalized === "DUPLICADA"
        ? "warning"
        : normalized === "RECHAZADA"
          ? "danger"
          : "neutral";
  } else {
    tone = normalized === "CURSO" ? "blue" : "violet";
  }

  const label = kind === "status"
    ? statusLabel(value)
    : kind === "type"
      ? normalized === "CURSO" ? "Curso" : "Institucional"
      : normalized || "—";

  return <span className={`${styles.pill} ${styles[`pill${tone}`]}`}>{label}</span>;
}

export default function SupervisorRealtimePage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const load = useCallback(async (silent = false) => {
    const currentUser = getLegacyUser() as SessionUser | null;
    const token = getToken();

    if (!currentUser || !token || normalize(currentUser.rol) !== "SUPERVISOR") {
      clearSession();
      router.replace("/login");
      return;
    }

    setUser(currentUser);
    silent ? setRefreshing(true) : setLoading(true);
    setError("");

    try {
      setData(await requestData(token));
      setLastUpdated(new Date());
    } catch (loadError) {
      if (loadError instanceof RequestError && [401, 403].includes(loadError.status)) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el monitoreo.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const records = data?.registrosHoy ?? [];

  const methods = useMemo(
    () => Array.from(new Set(records.map((item) => item.metodo).filter(Boolean))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const search = searchable(filters.search);
    return records.filter((record) => {
      const matchesSearch = !search || [
        record.docente,
        record.codigo,
        record.departamento,
        record.registro,
        record.aula,
        record.metodo,
      ].some((value) => searchable(value).includes(search));
      const matchesType = filters.type === "TODOS" || normalize(record.tipo_objetivo) === filters.type;
      const matchesStatus = filters.status === "TODOS" || normalize(record.estado) === filters.status;
      const matchesResult = filters.result === "TODOS" || normalize(record.resultado) === filters.result;
      const matchesMethod = filters.method === "TODOS" || record.metodo === filters.method;
      return matchesSearch && matchesType && matchesStatus && matchesResult && matchesMethod;
    });
  }, [filters, records]);

  if (loading && !data) {
    return <LoadingState title="Abriendo monitoreo en tiempo real" description="Sincronizando asistencias de curso e ingresos institucionales." fullHeight />;
  }

  if (error && !data) {
    return <ErrorState title="No se pudo abrir el monitoreo" description={error} retryText="Reintentar" onRetry={() => void load()} fullHeight />;
  }

  const stats = data?.stats;

  return (
    <main className={styles.page}>
      <PageHeader
        eyebrow="Supervisión en vivo"
        title="Tiempo real"
        description={`Marcaciones unificadas de ${displayUser(user)}: cursos, ingresos institucionales, resultados y método de verificación.`}
        badge={<span className={styles.liveBadge}><span />Actualización cada 10 s</span>}
        actions={
          <div className={styles.headerActions}>
            <span className={styles.updateLabel}>Actualizado <strong>{formatRefresh(lastUpdated)}</strong></span>
            <Button variant="outline" onClick={() => void load(true)} disabled={refreshing}>
              {refreshing ? "Actualizando..." : "Actualizar ahora"}
            </Button>
          </div>
        }
      />

      {error ? <div className={styles.inlineWarning}>{error}</div> : null}

      <section className={styles.metricsGrid}>
        <div className={styles.metric}><span>Registros hoy</span><strong>{numberValue(stats?.registrosValidados)}</strong><small>Curso + institucional</small></div>
        <div className={styles.metric}><span>Docentes presentes</span><strong>{numberValue(stats?.docentesPresentes)}</strong><small>De {numberValue(stats?.docentesMonitoreados)} activos</small></div>
        <div className={styles.metric}><span>Asistencias de curso</span><strong>{numberValue(stats?.registrosCurso)}</strong><small>Con horario identificado</small></div>
        <div className={styles.metric}><span>Ingresos generales</span><strong>{numberValue(stats?.ingresosInstitucionales)}</strong><small>Sin clase elegible</small></div>
        <div className={styles.metric}><span>Duplicadas</span><strong>{numberValue(stats?.duplicadas)}</strong><small>Intentos repetidos</small></div>
        <div className={styles.metric}><span>Rechazadas</span><strong>{numberValue(stats?.rechazadas)}</strong><small>Validaciones no aprobadas</small></div>
      </section>

      <section className={styles.filterPanel}>
        <header>
          <div>
            <h2>Filtros de monitoreo</h2>
            <p>Busca por docente, código, curso, aula, departamento o método.</p>
          </div>
          <strong>{filtered.length} de {records.length}</strong>
        </header>
        <div className={styles.filterGrid}>
          <label className={styles.searchField}>
            <span>Buscar</span>
            <input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Pedro, DOC-0001, QR, aula..." />
          </label>
          <label><span>Tipo</span><select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}><option value="TODOS">Todos</option><option value="CURSO">Curso</option><option value="INGRESO_INSTITUCIONAL">Institucional</option></select></label>
          <label><span>Estado</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}><option value="TODOS">Todos</option><option value="PRESENTE">Presente</option><option value="PUNTUAL">Puntual</option><option value="TARDANZA">Tardanza</option><option value="AUSENTE">Ausente</option></select></label>
          <label><span>Resultado</span><select value={draft.result} onChange={(event) => setDraft((current) => ({ ...current, result: event.target.value }))}><option value="TODOS">Todos</option><option value="REGISTRADA">Registrada</option><option value="DUPLICADA">Duplicada</option><option value="RECHAZADA">Rechazada</option></select></label>
          <label><span>Método</span><select value={draft.method} onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}><option value="TODOS">Todos</option>{methods.map((method) => <option key={method} value={method}>{methodLabel(method)}</option>)}</select></label>
          <div className={styles.filterActions}>
            <button type="button" onClick={() => setFilters(draft)}>Aplicar</button>
            <button type="button" onClick={() => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); }}>Limpiar</button>
          </div>
        </div>
      </section>

      <section className={styles.tablePanel}>
        <header className={styles.tableHeader}>
          <div>
            <h2>Flujo de marcaciones</h2>
            <p>La información proviene del historial unificado del backend.</p>
          </div>
          <span className={styles.streamBadge}><span />En vivo</span>
        </header>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead><tr><th>Docente</th><th>Tipo</th><th>Registro</th><th>Hora</th><th>Estado</th><th>Resultado</th><th>Aula</th><th>Método</th></tr></thead>
            <tbody>
              {filtered.length ? filtered.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.docente}</strong><small>{record.codigo} · {record.departamento || "Sin departamento"}</small></td>
                  <td><Pill value={record.tipo_objetivo} kind="type" /></td>
                  <td><strong>{record.registro}</strong><small>{record.curso_codigo || (normalize(record.tipo_objetivo) === "CURSO" ? "Curso" : "Acceso institucional")}</small></td>
                  <td className={styles.timeCell}>{formatTime(record.hora_registro)}</td>
                  <td><Pill value={record.estado} kind="status" /></td>
                  <td><Pill value={record.resultado} kind="result" /></td>
                  <td>{record.aula || "—"}</td>
                  <td>{methodLabel(record.metodo)}</td>
                </tr>
              )) : <tr><td className={styles.emptyCell} colSpan={8}>No existen registros que coincidan con los filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.methodPanel}>
        <header><h2>Resumen por método</h2><p>Intentos recibidos hoy por canal de verificación.</p></header>
        <div>{(data?.metodos ?? []).map((item) => <article key={item.metodo}><span>{methodLabel(item.metodo)}</span><strong>{numberValue(item.total)}</strong></article>)}</div>
      </section>
    </main>
  );
}
