"use client";

import { useEffect, useState, useMemo } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface HorarioData {
  horario_id: number;
  curso: string;
  creditos: number;
  departamento: string;
  semestre: string;
  aula: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default function MisHorariosPage() {
  const [horarios, setHorarios] = useState<HorarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Docente Universitario");

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(`${user.nombres} ${user.apellidos}`);
        fetch(`/api/docentes/${user.id}/horarios`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.horarios) {
              setHorarios(data.horarios);
            }
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching horarios:", err);
            setLoading(false);
          });
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Formatters
  function formatTimeShort(timeStr: string) {
    if (!timeStr) return "";
    return timeStr.slice(0, 5);
  }

  function getDurationObj(start: string, end: string) {
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return { hrs, mins, totalMins: diff };
  }

  function formatDurationText(start: string, end: string) {
    const { hrs, mins } = getDurationObj(start, end);
    if (hrs > 0 && mins > 0) return `${hrs} h ${mins} min`;
    if (hrs > 0) return `${hrs} h`;
    return `${mins} min`;
  }

  // --- Statistics Calculations ---
  const semestreBadge = horarios.length > 0 ? horarios[0].semestre : "2026-II";
  const uniqueCourses = new Set(horarios.map((h) => h.curso)).size;
  const totalSessions = horarios.length;
  const uniqueRooms = new Set(horarios.map((h) => h.aula)).size;
  
  let totalMinsWeek = 0;
  horarios.forEach(h => {
    totalMinsWeek += getDurationObj(h.hora_inicio, h.hora_fin).totalMins;
  });
  const totalWeeklyHrs = Math.floor(totalMinsWeek / 60);
  const totalWeeklyMins = totalMinsWeek % 60;

  // --- Today's Date ---
  const todayDate = new Date();
  const dayName = DAYS[(todayDate.getDay() || 7) - 1].toLowerCase();
  const dateFormatted = `${dayName}, ${todayDate.getDate()} de ${MONTHS[todayDate.getMonth()]} de ${todayDate.getFullYear()}`;
  const jsDay = todayDate.getDay() || 7;

  // --- Clases de Hoy ---
  const todayClasses = horarios.filter(h => h.dia_semana === jsDay).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio));

  // --- Próxima clase ---
  const currentHour = todayDate.getHours() + todayDate.getMinutes() / 60;
  let nextCourse = todayClasses.find(h => (parseInt(h.hora_fin.split(':')[0]) + parseInt(h.hora_fin.split(':')[1])/60) > currentHour);
  if (!nextCourse && horarios.length > 0) {
    let searchDay = jsDay + 1;
    while (!nextCourse && searchDay !== jsDay) {
      if (searchDay > 7) searchDay = 1;
      nextCourse = horarios.filter(h => h.dia_semana === searchDay).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
      searchDay++;
    }
  }

  // --- Calendar Course Colors ---
  const uniqueCoursesList = Array.from(new Set(horarios.map(h => h.curso)));
  const colorPalette = ["#000000", "#1e293b", "#334155", "#0f172a", "#1e1e1e"]; 
  const courseBorders = ["border-green-600", "border-purple-600", "border-blue-600", "border-orange-500", "border-red-600", "border-teal-600"];

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando programación académica...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Programacion</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Personal</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Mis horarios
            </h1>
            <span className="bg-blue-50 text-blue-600 text-xs font-black px-2.5 py-1 rounded-full border border-blue-200 shadow-sm">{semestreBadge}</span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Programacion academica vigente de {userName}. Consulte cursos, aulas, duraciones y distribucion semanal.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10">
            Actualizar
          </Button>
          <Button className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-5">
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Cursos asignados</p>
              <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{String(uniqueCourses).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Cursos distintos dentro del horario activo.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Sesiones semanales</p>
              <h3 className="text-3xl font-black text-green-600 leading-none mb-1.5">{String(totalSessions).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Bloques academicos programados por semana.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-purple-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Carga semanal</p>
              <h3 className="text-3xl font-black text-purple-600 leading-none mb-1.5">
                {totalWeeklyHrs} h {totalWeeklyMins > 0 ? `${totalWeeklyMins} min` : ''}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Duracion acumulada de todas las sesiones.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Aulas asignadas</p>
              <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{String(uniqueRooms).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Espacios distintos incluidos en la programacion.</p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Clases de hoy & Proxima clase */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        
        {/* Clases de hoy */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Agenda</p>
                <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Diaria</p>
              </div>
              <h2 className="text-xl font-black text-slate-900">Clases de hoy</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">{dateFormatted}</p>
            </div>
            <div className="bg-blue-50 text-blue-700 text-[11px] font-black px-3 py-1.5 rounded-full border border-blue-100">
              {todayClasses.length} clase(s)
            </div>
          </div>
          <CardContent className="p-6">
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-sm font-semibold text-slate-500">
                No tiene clases programadas para hoy.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayClasses.map((c, i) => (
                  <div key={i} className="bg-[#f5fdf9] border border-green-100 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-green-700 tracking-wide uppercase mb-0.5">{/* Optional course code could go here */}</p>
                        <h4 className="text-base font-black text-slate-900 leading-tight pr-4">{c.curso}</h4>
                      </div>
                      <span className="bg-green-50 text-green-700 text-[10px] font-black px-3 py-1 rounded-full border border-green-200 shrink-0">Activo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-green-50 rounded-lg p-2.5">
                        <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Horario</p>
                        <p className="text-xs font-black text-slate-800">{formatTimeShort(c.hora_inicio)} - {formatTimeShort(c.hora_fin)}</p>
                      </div>
                      <div className="bg-white border border-green-50 rounded-lg p-2.5">
                        <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Aula</p>
                        <p className="text-xs font-black text-slate-800">{c.aula}</p>
                      </div>
                      <div className="bg-white border border-green-50 rounded-lg p-2.5">
                        <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Duracion</p>
                        <p className="text-xs font-black text-slate-800">{formatDurationText(c.hora_inicio, c.hora_fin)}</p>
                      </div>
                      <div className="bg-white border border-green-50 rounded-lg p-2.5">
                        <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Semestre</p>
                        <p className="text-xs font-black text-slate-800">{c.semestre}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proxima clase */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Siguiente</p>
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Actividad</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Proxima clase</h2>
          </div>
          <CardContent className="p-6 flex flex-col items-center">
            {nextCourse ? (
              <>
                <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-6 text-center">{nextCourse.curso}</h3>
                
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="px-5 py-3.5 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Dia</span>
                    <span className="text-xs font-black text-slate-800">{DAYS[nextCourse.dia_semana - 1]}</span>
                  </div>
                  <div className="px-5 py-3.5 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Horario</span>
                    <span className="text-xs font-black text-slate-800">{formatTimeShort(nextCourse.hora_inicio)} - {formatTimeShort(nextCourse.hora_fin)}</span>
                  </div>
                  <div className="px-5 py-3.5 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Aula</span>
                    <span className="text-xs font-black text-slate-800">{nextCourse.aula}</span>
                  </div>
                  <div className="px-5 py-3.5 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Semestre</span>
                    <span className="text-xs font-black text-slate-800">{nextCourse.semestre}</span>
                  </div>
                </div>

                <p className="mt-5 text-[9px] font-bold text-slate-400 text-center px-4 leading-relaxed">
                  La programacion es de solo lectura y es administrada por el sistema academico.
                </p>
              </>
            ) : (
              <div className="text-sm font-semibold text-slate-500 py-10">No hay clases próximas.</div>
            )}
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
              {totalSessions} clase(s)
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
                {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day) => (
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
                <div className="col-start-2 col-end-7 relative w-full h-full pointer-events-auto">
                  {horarios.map((h, i) => {
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
                            <p className="text-[9px] font-medium opacity-60 truncate">{userName}</p>
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

      {/* Detalle de programacion (Lista vertical por dias) */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Detalle de programacion</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Resumen ordenado por dia y hora de inicio.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">
            {totalSessions} sesion(es)
          </div>
        </div>
        <CardContent className="p-6">
          <div className="space-y-8">
            {[1,2,3,4,5].map((dIndex) => {
              const dayHorarios = horarios.filter(h => h.dia_semana === dIndex).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio));
              const borderClass = courseBorders[(dIndex - 1) % courseBorders.length];
              
              if (dayHorarios.length === 0) return null;

              return (
                <div key={dIndex} className="pb-4 border-b border-slate-100 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-slate-800">{DAYS[dIndex-1]}</h3>
                    <span className="text-[10px] font-extrabold text-slate-400">{dayHorarios.length} clase(s)</span>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {dayHorarios.map((c, i) => (
                      <div key={i} className="bg-[#f8fafc] border border-slate-100 rounded-xl p-5 relative overflow-hidden pl-6">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-white border-l-4 ${borderClass}`}></div>
                        
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="text-base font-black text-slate-900 leading-tight pr-4">{c.curso}</h4>
                          </div>
                          <span className="bg-green-50 text-green-700 text-[10px] font-black px-3 py-1 rounded-full border border-green-200 shrink-0">Activo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                            <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Horario</p>
                            <p className="text-xs font-black text-slate-800">{formatTimeShort(c.hora_inicio)} - {formatTimeShort(c.hora_fin)}</p>
                          </div>
                          <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                            <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Aula</p>
                            <p className="text-xs font-black text-slate-800">{c.aula}</p>
                          </div>
                          <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                            <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Duracion</p>
                            <p className="text-xs font-black text-slate-800">{formatDurationText(c.hora_inicio, c.hora_fin)}</p>
                          </div>
                          <div className="bg-white border border-slate-100 rounded-lg p-2.5">
                            <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Semestre</p>
                            <p className="text-xs font-black text-slate-800">{c.semestre}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
