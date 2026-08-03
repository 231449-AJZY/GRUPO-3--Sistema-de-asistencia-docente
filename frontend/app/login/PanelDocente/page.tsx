"use client";

import { useEffect, useState, useMemo } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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

interface HorarioData {
  horario_id: number;
  curso: string;
  aula: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function DocenteDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaData | null>(null);
  const [horariosData, setHorariosData] = useState<HorarioData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        Promise.all([
          fetch(`/api/asistencia/docente/${parsedUser.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/docentes/${parsedUser.id}/horarios`, { headers: { Authorization: `Bearer ${token}` } })
        ])
          .then(([resAsist, resHor]) => Promise.all([resAsist.json(), resHor.json()]))
          .then(([dataAsist, dataHor]) => {
            setAsistenciaData(dataAsist);
            setHorariosData(dataHor.horarios || []);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching dashboard data:", err);
            setLoading(false);
          });
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Docente";

  // --- Data Processing for Cards ---
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIngreso = asistenciaData?.ingresos.find((r) => r.fecha.split("T")[0] === todayStr);

  const isPresent = !!todayIngreso;
  const ingresoEstado = todayIngreso ? todayIngreso.estado : "PENDIENTE";

  // Tardanzas del mes
  const currentMonthIdx = new Date().getMonth();
  const tardanzasIngresos = asistenciaData?.ingresos.filter((r) => r.estado === "TARDANZA" && new Date(r.fecha).getMonth() === currentMonthIdx) || [];
  const tardanzasCursos = asistenciaData?.cursos.filter((r) => r.estado === "TARDANZA" && new Date(r.fecha).getMonth() === currentMonthIdx) || [];
  const totalTardanzasMes = tardanzasIngresos.length + tardanzasCursos.length;
  
  const todasLasTardanzas = [...tardanzasIngresos, ...tardanzasCursos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const ultimaTardanzaFecha = todasLasTardanzas[0] ? new Date(todasLasTardanzas[0].fecha).toLocaleDateString('es-ES') : "Sin registros";

  // Inasistencias del mes
  const ausenciasIngresos = asistenciaData?.ingresos.filter((r) => r.estado === "AUSENTE" && new Date(r.fecha).getMonth() === currentMonthIdx) || [];
  const ausenciasCursos = asistenciaData?.cursos.filter((r) => r.estado === "AUSENTE" && new Date(r.fecha).getMonth() === currentMonthIdx) || [];
  const totalAusenciasMes = ausenciasIngresos.length + ausenciasCursos.length;

  const todasLasAusencias = [...ausenciasIngresos, ...ausenciasCursos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const ultimaAusenciaFecha = todasLasAusencias[0] ? new Date(todasLasAusencias[0].fecha).toLocaleDateString('es-ES') : "Sin registros";

  // Próximo curso
  const jsDay = new Date().getDay() || 7; // 1-7
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  
  // Try to find a course today that hasn't finished yet
  let nextCourse = horariosData.filter(h => h.dia_semana === jsDay && parseInt(h.hora_fin.split(':')[0]) + parseInt(h.hora_fin.split(':')[1])/60 > currentHour)
                               .sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
  
  // If none today, find the first one in the week
  if (!nextCourse && horariosData.length > 0) {
    let searchDay = jsDay + 1;
    while (!nextCourse && searchDay !== jsDay) {
      if (searchDay > 7) searchDay = 1;
      nextCourse = horariosData.filter(h => h.dia_semana === searchDay).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
      searchDay++;
    }
  }

  // Calculate Time to next course
  let timeToNextCourse = "En -- h -- min";
  if (nextCourse) {
    const [h, m] = nextCourse.hora_inicio.split(':').map(Number);
    let targetDay = nextCourse.dia_semana;
    let daysDiff = targetDay - jsDay;
    if (daysDiff < 0) daysDiff += 7;
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysDiff);
    targetDate.setHours(h, m, 0, 0);

    if (daysDiff === 0 && (h + m/60) < currentHour) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    const diffMs = targetDate.getTime() - new Date().getTime();
    if (diffMs > 0) {
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      timeToNextCourse = `En ${diffHrs} h ${diffMins} min`;
    } else {
      timeToNextCourse = "En curso";
    }
  }

  // Resumen de la semana
  const clasesProgramadas = horariosData.length;
  // This week's registered classes (approximated for demo)
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - jsDay + 1);
  const clasesRegistradas = (asistenciaData?.cursos || []).filter(c => new Date(c.fecha) >= thisWeekStart).length;

  // Colors for unique courses in calendar
  const uniqueCoursesList = Array.from(new Set(horariosData.map(h => h.curso)));
  const courseColors: Record<string, string> = {};
  const colorPalette = ["#000000", "#1e293b", "#334155", "#0f172a", "#1e1e1e"]; // Monochromatic dark scheme based on screenshot
  uniqueCoursesList.forEach((curso, idx) => {
    courseColors[curso] = colorPalette[idx % colorPalette.length];
  });

  // Consolidación de marcaciones para la tabla
  const marcaciones: Array<{
    fecha: string;
    hora: string;
    tipo: string;
    detalle: string;
    resultado: string;
    metodo: string;
  }> = [];

  if (asistenciaData) {
    asistenciaData.ingresos.forEach((r) => {
      marcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: "Ingreso institucional",
        detalle: "", // Esperando a la API
        resultado: r.estado,
        metodo: "Sistema",
      });
    });
    asistenciaData.cursos.forEach((r) => {
      marcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: "Asistencia de curso",
        detalle: `${r.curso} - ${r.aula}`,
        resultado: r.estado,
        metodo: "Sistema",
      });
    });
  }

  marcaciones.sort((a, b) => {
    const dateTimeA = `${a.fecha.split("T")[0]}T${a.hora}`;
    const dateTimeB = `${b.fecha.split("T")[0]}T${b.hora}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  // Formatter helpers
  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  function formatTimeShort(timeStr: string) {
    if (!timeStr) return "";
    return timeStr.slice(0, 5);
  }

  if (loading) {
    return <div className="p-8 text-center text-unsaac-muted animate-pulse">Cargando dashboard...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Dashboard del docente
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-slate-500">
            Bienvenido, {docenteName} · Resumen de asistencia y actividad académica.
          </p>
        </div>
        <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700">
          Actualizar datos
        </Button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Card 1: Estado Asistencia */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-1">Estado de asistencia del día</p>
                <h3 className={`text-[28px] font-black leading-none tracking-tight ${isPresent ? 'text-green-600' : 'text-green-600'}`}>
                  {isPresent ? 'Presente' : 'Pendiente'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-2 leading-snug w-[80%]">
                  {isPresent ? 'Marcación institucional registrada correctamente' : 'Aún no existe ingreso institucional registrado'}
                </p>
              </div>
              <div className="h-10 w-10 shrink-0 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="inline-flex bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                {ingresoEstado.charAt(0).toUpperCase() + ingresoEstado.slice(1).toLowerCase()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Próximo curso */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-2">
                <p className="text-[11px] font-extrabold text-slate-800 mb-1">Próximo curso asignado</p>
                <h3 className="text-base font-black text-slate-900 leading-tight mb-1 truncate" title={nextCourse?.curso || 'Ninguno'}>
                  {nextCourse?.curso || 'Sin cursos programados'}
                </h3>
                {nextCourse ? (
                  <>
                    <p className="text-[11px] font-bold text-slate-500">{nextCourse.aula} - {formatTimeShort(nextCourse.hora_inicio)} a {formatTimeShort(nextCourse.hora_fin)}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{DAYS[nextCourse.dia_semana-1]} - 2026-II</p>
                  </>
                ) : (
                  <p className="text-[11px] font-bold text-slate-500">No hay más cursos esta semana</p>
                )}
              </div>
              <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Tardanzas */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-1">Tardanzas del mes</p>
                <h3 className="text-[32px] font-black text-amber-500 leading-none">
                  {String(totalTardanzasMes).padStart(2, '0')}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-2 leading-snug w-[85%]">
                  Ingresos institucionales y sesiones de curso
                </p>
              </div>
              <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[9px] font-bold text-slate-400">Última tardanza: {ultimaTardanzaFecha}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Inasistencias */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-1">Inasistencias del mes</p>
                <h3 className="text-[32px] font-black text-red-600 leading-none">
                  {String(totalAusenciasMes).padStart(2, '0')}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 mt-2 leading-snug w-[85%]">
                  Registros de ausencia en el periodo actual
                </p>
              </div>
              <div className="h-10 w-10 shrink-0 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[9px] font-bold text-slate-400">Última ausencia: {ultimaAusenciaFecha}</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Calendario Semanal Visual */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          {/* Header of Calendar */}
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Calendario semanal visual</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Vista por horas, cursos, docentes y aulas del periodo académico seleccionado.</p>
            </div>
            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              {clasesProgramadas} clase(s)
            </div>
          </div>
          
          {/* Calendar Toolbar */}
          <div className="bg-black p-4 flex flex-wrap gap-3 items-center">
            <select className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-md px-3 py-2 flex-1 min-w-[200px] outline-none">
              <option>Todos los cursos</option>
            </select>
            <select className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-md px-3 py-2 flex-1 min-w-[200px] outline-none">
              <option>Todos los docentes</option>
            </select>
            <select className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-md px-3 py-2 flex-1 min-w-[150px] outline-none">
              <option>Todas las aulas</option>
            </select>
            <div className="flex bg-white rounded-md overflow-hidden border border-slate-300 ml-auto">
              <button className="bg-blue-600 text-white text-xs font-bold px-3 py-2">Calendario</button>
              <button className="bg-white text-slate-600 text-xs font-bold px-3 py-2 border-l border-slate-200">Tarjetas</button>
            </div>
            <button className="bg-white text-slate-800 text-xs font-bold px-4 py-2 rounded-md border border-slate-300 hover:bg-slate-50">Limpiar</button>
          </div>

          {/* Legend */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Colores por curso</p>
            <p className="text-[10px] font-medium text-slate-500 mb-3">Pulse un curso para mostrar únicamente sus horarios.</p>
            <div className="flex flex-wrap gap-2">
              {uniqueCoursesList.map((curso, i) => (
                <div key={i} className="flex items-center gap-2 border border-slate-300 rounded-full px-3 py-1 bg-white cursor-pointer hover:bg-slate-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
                  <span className="text-[10px] font-bold text-slate-700">{curso}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Layout implementation */}
          <div className="p-6 overflow-x-auto">
            <div className="min-w-[800px] border border-black flex flex-col bg-white">
              
              {/* Grid Header */}
              <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] bg-black text-white text-xs font-bold">
                <div className="py-2.5 px-3 text-left">Hora</div>
                {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day, i) => (
                  <div key={day} className="py-2.5 text-center flex items-center justify-center gap-2 border-l border-white/20">
                    {day} <span className="bg-white text-black text-[10px] rounded-full w-4 h-4 flex items-center justify-center leading-none">1</span>
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="relative grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] min-h-[400px]">
                {/* Background Grid Lines */}
                <div className="col-span-6 row-span-full grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] absolute inset-0 pointer-events-none">
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div></div>
                </div>
                
                {/* Horizontal Hour Lines (7am to 9pm) */}
                <div className="col-span-6 row-span-full absolute inset-0 pointer-events-none flex flex-col">
                  {[...Array(14)].map((_, i) => (
                    <div key={i} className="flex-1 border-b border-black/10 flex items-start">
                       <span className="text-[10px] font-bold text-slate-400 pl-2 pt-1">
                         {String(7 + i).padStart(2,'0')}:00
                       </span>
                    </div>
                  ))}
                </div>

                {/* Plotting Courses */}
                {/* 
                   We will map hours 07:00 to 21:00 to 0-100% height.
                   Total hours = 14.
                   Top = (start_hour - 7) / 14 * 100%
                   Height = duration / 14 * 100%
                */}
                <div className="col-start-2 col-end-7 relative w-full h-full pointer-events-auto">
                  {horariosData.map((h, i) => {
                    const dayColIndex = h.dia_semana - 1; // 0=Mon, 1=Tue...
                    if (dayColIndex < 0 || dayColIndex > 4) return null; // Only render Mon-Fri for this view

                    const [sH, sM] = h.hora_inicio.split(':').map(Number);
                    const [eH, eM] = h.hora_fin.split(':').map(Number);
                    
                    const topPct = ((sH + sM/60 - 7) / 14) * 100;
                    const duration = (eH + eM/60) - (sH + sM/60);
                    const heightPct = (duration / 14) * 100;

                    return (
                      <div 
                        key={i} 
                        className="absolute p-0.5 z-10"
                        style={{ 
                          left: `${(dayColIndex) * 20}%`, 
                          width: '20%', 
                          top: `${topPct}%`, 
                          height: `${heightPct}%` 
                        }}
                      >
                        <div className="bg-black text-white rounded-lg h-full p-2 flex flex-col justify-between overflow-hidden shadow-sm">
                          <div>
                            <p className="text-[10px] font-bold opacity-80 leading-tight truncate">{formatTimeShort(h.hora_inicio)} - {formatTimeShort(h.hora_fin)}</p>
                            <p className="text-xs font-black leading-tight mt-0.5 line-clamp-2">{h.curso}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold opacity-80">{h.aula}</p>
                            <p className="text-[9px] font-medium opacity-60 truncate">{docenteName}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Footer */}
              <div className="bg-black text-[9px] text-white/50 p-2 text-left px-3 font-semibold">
                Cada curso mantiene el mismo color aunque sea impartido por diferentes docentes o en distintos días y aulas.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Layout Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        
        <div className="space-y-6 flex flex-col">
          {/* Próxima actividad académica */}
          <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-[15px] font-extrabold text-slate-800">Próxima actividad académica</h3>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Detalles de la siguiente sesion programada.</p>
            </div>
            <CardContent className="p-5 flex flex-col gap-4">
              {nextCourse ? (
                <>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col gap-4 relative">
                    <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 font-bold text-[10px] px-2.5 py-1 rounded-full">
                      {timeToNextCourse}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{nextCourse.curso}</h4>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">{(nextCourse as any).departamento || ""}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Aula</p>
                        <p className="text-xs font-black text-slate-700">{nextCourse.aula}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Horario</p>
                        <p className="text-xs font-black text-slate-700">{formatTimeShort(nextCourse.hora_inicio)} - {formatTimeShort(nextCourse.hora_fin)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Día</p>
                        <p className="text-xs font-black text-slate-700">{DAYS[nextCourse.dia_semana-1]}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-800 mb-1">Recordatorio</p>
                    <p className="text-[10px] font-semibold text-slate-500">Verifique su marcacion de ingreso antes de iniciar la sesion y confirme que el dispositivo movil se encuentre sincronizado.</p>
                  </div>
                  <Button variant="primary" className="w-full bg-orange-500 hover:bg-orange-600 text-white border-none font-black text-xs py-2 shadow-sm rounded-lg">
                    Ver horario y asistencia
                  </Button>
                </>
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm font-semibold bg-slate-50 rounded-xl border border-slate-100">
                  No hay próximas actividades académicas programadas para mostrar.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas marcaciones */}
          <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex-1">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-[15px] font-extrabold text-slate-800">Ultimas marcaciones</h3>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Ingreso institucional y asistencias de curso registradas recientemente.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-extrabold text-slate-800">Fecha</th>
                    <th className="px-5 py-3 font-extrabold text-slate-800">Hora</th>
                    <th className="px-5 py-3 font-extrabold text-slate-800">Tipo de marcacion</th>
                    <th className="px-5 py-3 font-extrabold text-slate-800">Detalle</th>
                    <th className="px-5 py-3 font-extrabold text-slate-800 text-center">Resultado</th>
                    <th className="px-5 py-3 font-extrabold text-slate-800 text-right">Metodo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marcaciones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-semibold">No hay marcaciones recientes</td>
                    </tr>
                  ) : (
                    marcaciones.slice(0, 4).map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4 font-bold text-slate-700">{formatDate(m.fecha)}</td>
                        <td className="px-5 py-4 font-black text-slate-700">{formatTimeShort(m.hora)}</td>
                        <td className="px-5 py-4 font-bold text-slate-700">{m.tipo}</td>
                        <td className="px-5 py-4 font-semibold text-slate-500 truncate max-w-[200px]">{m.detalle}</td>
                        <td className="px-5 py-4 text-center">
                           <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black tracking-wide ${m.resultado === "TARDANZA" ? "bg-amber-100 text-amber-700" : m.resultado === "PRESENTE" || m.resultado === "PUNTUAL" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                             {m.resultado.charAt(0).toUpperCase() + m.resultado.slice(1).toLowerCase()}
                           </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-500 text-right">{m.metodo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Resumen de la semana */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden h-fit">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-[15px] font-extrabold text-slate-800">Resumen de la semana</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Indicadores rapidos de cumplimiento y programacion.</p>
          </div>
          <CardContent className="p-5 flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[10px] font-extrabold text-slate-700 mb-2">Clases programadas</p>
                <p className="text-3xl font-black text-blue-600">{clasesProgramadas}</p>
              </div>
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4">
                <p className="text-[10px] font-extrabold text-slate-700 mb-2">Clases registradas</p>
                <p className="text-3xl font-black text-green-600">{clasesRegistradas}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mt-2">
              <p className="text-[10px] font-bold text-slate-800 mb-1">Recordatorio academico</p>
              {nextCourse ? (
                 <p className="text-[10px] font-semibold text-slate-500 leading-snug">
                   {DAYS[nextCourse.dia_semana-1]} tiene {nextCourse.curso} a las {formatTimeShort(nextCourse.hora_inicio)} en {nextCourse.aula}. Revise sus horarios y mantenga la aplicacion movil sincronizada.
                 </p>
              ) : (
                 <p className="text-[10px] font-semibold text-slate-500 leading-snug">
                   No hay clases próximas programadas.
                 </p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
