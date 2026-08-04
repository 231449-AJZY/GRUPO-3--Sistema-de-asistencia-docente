"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}

interface DocenteStats {
  total: string;
  activos: string;
  inactivos: string;
}

interface AsistenciaHoyStats {
  puntuales: string;
  tardanzas: string;
  total_registros: string;
}

interface StatsData {
  docentes: DocenteStats;
  asistenciaHoy: AsistenciaHoyStats;
}

interface RegistroHoy {
  nombres: string;
  apellidos: string;
  codigo: string;
  departamento: string;
  hora_registro: string;
  estado: string;
}

interface AsistenciaHoyData {
  fecha: string;
  registros: RegistroHoy[];
}

export default function SupervisorDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [asistenciaHoy, setAsistenciaHoy] = useState<AsistenciaHoyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }

    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      
      Promise.all([
        fetch("/api/docentes/stats", { headers }).then((res) => res.json()),
        fetch("/api/asistencia/hoy", { headers }).then((res) => res.json()),
      ])
        .then(([statsData, hoyData]) => {
          setStats(statsData);
          setAsistenciaHoy(hoyData);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching supervisor data:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // --- Real-time data processing ---
  const totalDocentes = stats?.docentes ? parseInt(stats.docentes.total) : 0;
  const totalActivos = stats?.docentes ? parseInt(stats.docentes.activos) : 0;
  
  const totalMarcacionesHoy = asistenciaHoy?.registros.length || 0;
  const totalPuntualesHoy = asistenciaHoy?.registros.filter((r) => r.estado === "PUNTUAL").length || 0;
  const totalTardanzasHoy = asistenciaHoy?.registros.filter((r) => r.estado === "TARDANZA").length || 0;
  
  const inasistenciasHoy = Math.max(0, totalActivos - totalMarcacionesHoy);
  const percentAsistencia = totalActivos > 0 ? Math.round((totalMarcacionesHoy / totalActivos) * 100) : 0;

  // --- Chart processing ---
  const chartHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const hourlyCounts = chartHours.map((h) => {
    const prefix = `${String(h).padStart(2, "0")}:`;
    return asistenciaHoy?.registros.filter((r) => r.hora_registro.startsWith(prefix)).length || 0;
  });

  const maxCount = Math.max(...hourlyCounts, 5); // Avoid division by zero and give head room
  
  const chartPoints = chartHours.map((h, i) => {
    const x = 50 + (i * (800 / (chartHours.length - 1)));
    const y = 190 - (hourlyCounts[i] * (150 / maxCount));
    return { x, y, hour: `${String(h).padStart(2, "0")}:00`, count: hourlyCounts[i] };
  });

  let linePath = "";
  let areaPath = "";
  if (chartPoints.length > 0) {
    linePath = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
    areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x},190 L ${chartPoints[0].x},190 Z`;
  }

  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    return timeStr.slice(0, 8); // Mostrar HH:MM:SS
  }

  function formatNumber(num: number) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-unsaac-orange/30 border-t-unsaac-orange" />
        <p className="mt-4 text-sm font-bold text-unsaac-muted">Cargando información del supervisor...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-animated space-y-6">
      {/* Title Section */}
      <div>
        <h1 className="text-[34px] font-extrabold leading-tight text-unsaac-text">
          Panel principal del supervisor
        </h1>
        <p className="mt-1 text-base font-semibold text-unsaac-muted">
          Monitoreo en tiempo real de asistencia, alertas e incidencias del sistema
        </p>
      </div>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        
        {/* Metric 1: Marcaciones */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <DashboardIcon name="fingerprint" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Marcaciones de hoy
              </h3>
              <p className="mt-1 text-3xl font-black leading-none text-blue-600">
                {formatNumber(totalMarcacionesHoy)}
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                Puntuales: {totalPuntualesHoy} · Tardanzas: {totalTardanzasHoy}
              </p>
            </div>
          </div>
          <div className="mt-4 -mx-6 -mb-6">
            <MiniTrend values={[10, 25, 45, totalMarcacionesHoy > 0 ? totalMarcacionesHoy : 10]} colorHex="#2563EB" />
          </div>
        </Card>

        {/* Metric 2: Activos */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-50 text-green-600 border border-green-100">
              <DashboardIcon name="users" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Docentes activos
              </h3>
              <p className="mt-1 text-3xl font-black leading-none text-green-600">
                {formatNumber(totalActivos)}
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                De un total de {totalDocentes} registrados
              </p>
            </div>
          </div>
          <div className="mt-4 -mx-6 -mb-6">
            <MiniTrend values={[totalActivos - 5, totalActivos - 2, totalActivos]} colorHex="#16A34A" />
          </div>
        </Card>

        {/* Metric 3: Inasistencias */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
              <DashboardIcon name="alert-triangle" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Inasistencias hoy
              </h3>
              <p className="mt-1 text-3xl font-black leading-none text-red-600">
                {formatNumber(inasistenciasHoy)}
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                Docentes sin registrar asistencia
              </p>
            </div>
          </div>
          <div className="mt-4 -mx-6 -mb-6">
            <MiniTrend values={[inasistenciasHoy > 5 ? inasistenciasHoy - 2 : 0, inasistenciasHoy]} colorHex="#DC2626" />
          </div>
        </Card>

        {/* Metric 4: Nivel Asistencia */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 border border-amber-100">
              <DashboardIcon name="activity" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Nivel de asistencia
              </h3>
              <p className="mt-1 text-3xl font-black leading-none text-amber-500">
                {percentAsistencia}%
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                Ratio de cumplimiento de hoy
              </p>
            </div>
          </div>
          <div className="mt-4 -mx-6 -mb-6">
            <div className="h-10 w-full px-6 flex items-end pb-2">
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${percentAsistencia}%` }}></div>
              </div>
            </div>
          </div>
        </Card>

      </section>

      {/* Main Grid: Chart and Table */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        
        {/* Hourly Chart */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader
            title="Marcaciones biométricas por hora"
            description="Distribución de ingresos en el día"
          />
          <CardContent className="pt-2">
            <svg viewBox="0 0 880 230" className="h-[260px] w-full" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              {[0, maxCount * 0.25, maxCount * 0.5, maxCount * 0.75, maxCount].map((value) => {
                const y = 190 - (value / maxCount) * 150;
                return (
                  <g key={value}>
                    <line x1="45" y1={y} x2="855" y2={y} stroke="#E2E8F0" strokeWidth="1" />
                    <text x="30" y={y + 4} textAnchor="end" className="fill-unsaac-muted text-[11px] font-bold">
                      {Math.round(value)}
                    </text>
                  </g>
                );
              })}

              {/* Area under curve */}
              {areaPath && <polygon points={areaPath} fill="#2563EB" opacity="0.08" />}

              {/* Connection line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data Points */}
              {chartPoints.map((p, index) => (
                <g key={index}>
                  <circle cx={p.x} cy={p.y} r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text x={p.x} y="215" textAnchor="middle" className="fill-unsaac-muted text-[11px] font-bold">
                    {p.hour}
                  </text>
                </g>
              ))}
            </svg>
          </CardContent>
        </Card>

        {/* Recent Registrations Table */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader
            title="Registros en tiempo real"
            description="Últimos docentes en marcar asistencia"
            action={
              <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                En vivo
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-y border-unsaac-border bg-slate-50/50">
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Docente</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Hora</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Estado</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted text-right">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-unsaac-border">
                {!asistenciaHoy?.registros || asistenciaHoy.registros.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm font-semibold text-unsaac-muted">
                      No hay marcaciones registradas para el día de hoy.
                    </td>
                  </tr>
                ) : (
                  asistenciaHoy.registros.slice(0, 6).map((r, index) => (
                    <tr key={index} className="transition-colors hover:bg-slate-50/50 group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-extrabold text-slate-600">
                            {r.nombres.charAt(0)}{r.apellidos.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-unsaac-text leading-tight group-hover:text-unsaac-blue transition-colors">
                              {r.nombres} {r.apellidos}
                            </p>
                            <p className="text-[10px] font-bold text-unsaac-muted mt-0.5">
                              {r.departamento}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-unsaac-muted">
                        {formatTime(r.hora_registro)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            r.estado === "PUNTUAL" || r.estado === "PRESENTE"
                              ? "success"
                              : r.estado === "TARDANZA"
                              ? "warning"
                              : r.estado === "AUSENTE"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {r.estado}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-unsaac-muted text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DashboardIcon name="fingerprint" className="h-4 w-4 text-unsaac-blue" />
                          Biométrico
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </section>
    </div>
  );
}

function MiniTrend({ values, colorHex }: { values: number[]; colorHex: string }) {
  const max = Math.max(...values, 5);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const points = values
    .map((value, index) => {
      const x = index * (280 / (values.length - 1));
      const y = 30 - ((value - min) / range) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-10 w-full" viewBox="0 0 280 32" fill="none" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={colorHex}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardIcon({ name, className }: { name: string; className?: string }) {
  if (name === "fingerprint") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12C2 17.5 6.5 22 12 22s10-4.5 10-10S17.5 2 12 2a10 10 0 0 0-7.3 3.1" />
        <path d="M5.5 8a8.5 8.5 0 0 1 13 0" />
        <path d="M8 12a4.5 4.5 0 0 1 8 0" />
        <path d="M10.5 15a1.5 1.5 0 0 1 3 0" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === "alert-triangle") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (name === "activity") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    );
  }
  return null;
}
