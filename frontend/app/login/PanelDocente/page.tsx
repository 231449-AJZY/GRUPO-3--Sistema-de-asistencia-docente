"use client";

import { useEffect, useState } from "react";
import Card, { CardContent, CardHeader } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  rol: string;
}

interface AsistenciaIngreso {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface AsistenciaCurso {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

interface AsistenciaData {
  ingresos: AsistenciaIngreso[];
  cursos: AsistenciaCurso[];
}

export default function DocenteDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (token && parsedUser.id) {
          fetch(`/api/asistencia/docente/${parsedUser.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              setAsistenciaData(data);
              setLoading(false);
            })
            .catch((err) => {
              console.error("Error fetching attendance data:", err);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Docente Universitario";

  // --- Data Processing ---
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIngreso = asistenciaData?.ingresos.find(
    (r) => r.fecha.split("T")[0] === todayStr
  );

  const isPresent = !!todayIngreso;
  const ingresoTime = todayIngreso ? todayIngreso.hora_registro.slice(0, 5) : "";
  const ingresoEstado = todayIngreso ? todayIngreso.estado : "PENDIENTE";

  // Tardanzas
  const tardanzasIngresos = asistenciaData?.ingresos.filter((r) => r.estado === "TARDANZA") || [];
  const tardanzasCursos = asistenciaData?.cursos.filter((r) => r.estado === "TARDANZA") || [];
  const totalTardanzas = tardanzasIngresos.length + tardanzasCursos.length;

  const todasLasTardanzas = [...tardanzasIngresos, ...tardanzasCursos].sort((a, b) => 
    b.fecha.localeCompare(a.fecha)
  );
  const ultimaTardanzaFecha = todasLasTardanzas[0] 
    ? formatDate(todasLasTardanzas[0].fecha) 
    : "—";

  // Inasistencias
  const ausenciasIngresos = asistenciaData?.ingresos.filter((r) => r.estado === "AUSENTE") || [];
  const ausenciasCursos = asistenciaData?.cursos.filter((r) => r.estado === "AUSENTE") || [];
  const totalAusencias = ausenciasIngresos.length + ausenciasCursos.length;

  const todasLasAusencias = [...ausenciasIngresos, ...ausenciasCursos].sort((a, b) => 
    b.fecha.localeCompare(a.fecha)
  );
  const ultimaAusenciaFecha = todasLasAusencias[0] 
    ? formatDate(todasLasAusencias[0].fecha) 
    : "—";

  // Consolidación de marcaciones para la tabla
  const marcaciones: Array<{
    fecha: string;
    hora: string;
    tipo: string;
    resultado: string;
    metodo: string;
  }> = [];

  if (asistenciaData) {
    asistenciaData.ingresos.forEach((r) => {
      marcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: "Ingreso institucional",
        resultado: r.estado,
        metodo: "Huella digital",
      });
    });
    asistenciaData.cursos.forEach((r) => {
      marcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: `Inicio de clase: ${r.curso}`,
        resultado: r.estado,
        metodo: "Huella digital",
      });
    });
  }

  // Ordenar cronológicamente descendente
  marcaciones.sort((a, b) => {
    const dateTimeA = `${a.fecha.split("T")[0]}T${a.hora}`;
    const dateTimeB = `${b.fecha.split("T")[0]}T${b.hora}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function formatNumber(num: number) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-unsaac-orange/30 border-t-unsaac-orange" />
        <p className="mt-4 text-sm font-bold text-unsaac-muted">Cargando información del docente...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-animated space-y-6">
      {/* Title Section */}
      <div>
        <h1 className="text-[34px] font-extrabold leading-tight text-unsaac-text">
          Panel principal del docente
        </h1>
        <p className="mt-1 text-base font-semibold text-unsaac-muted">
          Bienvenida, {docenteName} · Resumen de asistencia y actividad académica
        </p>
      </div>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        
        {/* Metric 1: Estado */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${isPresent ? "bg-green-50 text-green-600 border border-green-100" : "bg-amber-50 text-amber-500 border border-amber-100"}`}>
              <DashboardIcon name={isPresent ? "check-circle" : "clock"} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Estado de asistencia hoy
              </h3>
              <p className={`mt-1 text-2xl font-black leading-none ${isPresent ? "text-green-600" : "text-amber-500"}`}>
                {isPresent ? "Presente" : "Sin registro"}
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                {isPresent ? `Ingreso a las ${ingresoTime}` : "No se detecta marcación hoy"}
              </p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
             <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${ingresoEstado === "PUNTUAL" ? "bg-green-100 text-green-700" : ingresoEstado === "TARDANZA" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
               {ingresoEstado}
             </span>
          </div>
        </Card>

        {/* Metric 2: Próximo curso */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <DashboardIcon name="calendar" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Próximo curso asignado
              </h3>
              <p className="mt-1 text-2xl font-black leading-none text-blue-600 truncate">
                Base de Datos II
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted truncate">
                Aula LAB-02 · 10:00 a 12:00
              </p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
             <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase bg-blue-100 text-blue-700">
               Hoy · Ingeniería de Sistemas
             </span>
          </div>
        </Card>

        {/* Metric 3: Tardanzas */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 border border-amber-100">
              <DashboardIcon name="clock-alert" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Tardanzas acumuladas
              </h3>
              <p className="mt-1 text-3xl font-black leading-none text-amber-500">
                {formatNumber(totalTardanzas)}
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                Total en el período actual
              </p>
            </div>
          </div>
          <div className="mt-4 -mx-6 -mb-6">
            <MiniTrend values={[1, 2, 1, 0, totalTardanzas]} colorHex="#F59E0B" />
          </div>
        </Card>

        {/* Metric 4: Inasistencias */}
        <Card className="overflow-hidden flex flex-col justify-between h-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-100">
              <DashboardIcon name="alert-triangle" className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-extrabold text-unsaac-muted truncate">
                Inasistencias acumuladas
              </h3>
              <p className="mt-1 text-3xl font-black leading-none text-red-600">
                {formatNumber(totalAusencias)}
              </p>
              <p className="mt-1 text-xs font-bold text-unsaac-muted">
                Sin justificar en el sistema
              </p>
            </div>
          </div>
          <div className="mt-4 -mx-6 -mb-6">
            <MiniTrend values={[0, 0, 1, 0, totalAusencias]} colorHex="#DC2626" />
          </div>
        </Card>

      </section>

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[2fr_1fr]">
        
        {/* Últimas marcaciones */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader
            title="Últimas marcaciones biométricas"
            description="Registro de ingreso institucional y asistencias a cursos"
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-y border-unsaac-border bg-slate-50/50">
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Fecha</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Hora</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Tipo de marcación</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted">Resultado</th>
                  <th className="px-5 py-3.5 font-extrabold text-unsaac-muted text-right">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-unsaac-border">
                {marcaciones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm font-semibold text-unsaac-muted">
                      No hay marcaciones registradas para este docente.
                    </td>
                  </tr>
                ) : (
                  marcaciones.slice(0, 7).map((m, index) => (
                    <tr key={index} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-5 py-3.5 font-extrabold text-unsaac-text whitespace-nowrap">
                        {formatDate(m.fecha)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-unsaac-muted">
                        {m.hora}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-unsaac-text">
                        {m.tipo}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            m.resultado === "PUNTUAL" || m.resultado === "PRESENTE"
                              ? "success"
                              : m.resultado === "TARDANZA"
                              ? "warning"
                              : m.resultado === "AUSENTE"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {m.resultado}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-unsaac-muted text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <DashboardIcon name="fingerprint" className="h-4 w-4 text-unsaac-blue" />
                          {m.metodo}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Resumen & Actividad */}
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col">
            <CardHeader
              title="Próxima actividad"
              description="Siguiente sesión de hoy"
            />
            <CardContent className="pt-2 flex flex-col gap-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <h4 className="text-sm font-black text-blue-900">Base de Datos II</h4>
                <p className="text-xs font-semibold text-blue-700 mt-1">Ingeniería de Sistemas · Ciclo VII</p>
                
                <div className="mt-3 flex items-center justify-between text-xs font-bold">
                   <span className="text-blue-800">Aula: <span className="text-blue-600">LAB-02</span></span>
                   <span className="text-blue-800">Hora: <span className="text-blue-600">10:00 - 12:00</span></span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center gap-2 mb-1">
                   <DashboardIcon name="alert-triangle" className="h-4 w-4 text-amber-600" />
                   <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">Observación</h4>
                </div>
                <p className="text-xs font-semibold text-amber-800">
                  Llevar lista de prácticas y verificar marcación de ingreso al laboratorio antes de iniciar clase.
                </p>
              </div>

              <Button variant="secondary" className="w-full text-sm font-extrabold justify-center mt-2">
                Ver horario completo
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col flex-1">
            <CardHeader title="Resumen de la semana" />
            <CardContent className="pt-2">
              <div className="grid grid-cols-2 gap-3 mb-4">
                 <div className="rounded-xl border border-unsaac-border p-3 text-center bg-slate-50">
                    <p className="text-[10px] font-black uppercase text-unsaac-muted tracking-wide mb-1">Clases programadas</p>
                    <p className="text-2xl font-black text-unsaac-blue">05</p>
                 </div>
                 <div className="rounded-xl border border-unsaac-border p-3 text-center bg-slate-50">
                    <p className="text-[10px] font-black uppercase text-unsaac-muted tracking-wide mb-1">Asistencias exitosas</p>
                    <p className="text-2xl font-black text-unsaac-green">{formatNumber(asistenciaData?.ingresos.length || 0)}</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
  if (name === "check-circle") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  if (name === "calendar") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  }
  if (name === "clock-alert") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
        <line x1="12" y1="2" x2="12" y2="4" />
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
  if (name === "fingerprint") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12C2 17.5 6.5 22 12 22s10-4.5 10-10S17.5 2 12 2a10 10 0 0 0-7.3 3.1" />
        <path d="M5.5 8a8.5 8.5 0 0 1 13 0" />
        <path d="M8 12a4.5 4.5 0 0 1 8 0" />
        <path d="M10.5 15a1.5 1.5 0 0 1 3 0" />
      </svg>
    );
  }
  return null;
}
