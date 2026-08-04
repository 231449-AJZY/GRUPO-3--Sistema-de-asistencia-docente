"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

interface HorarioData {
  horario_id: number;
  curso: string;
  aula: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  semestre: string;
}

interface AsistenciaCurso {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default function AsistenciaCursosPage() {
  const [horarios, setHorarios] = useState<HorarioData[]>([]);
  const [cursosMarcaciones, setCursosMarcaciones] = useState<AsistenciaCurso[]>([]);
  const [userName, setUserName] = useState("Docente Universitario");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserName(`${parsedUser.nombres} ${parsedUser.apellidos}`);

        Promise.all([
          fetch(`/api/docentes/${parsedUser.id}/horarios`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/asistencia/docente/${parsedUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
        ])
          .then(([resHor, resAsist]) => Promise.all([resHor.json(), resAsist.json()]))
          .then(([dataHor, dataAsist]) => {
            setHorarios(dataHor.horarios || []);
            const marcCursos = dataAsist.cursos || [];
            marcCursos.sort((a: any, b: any) => {
              const dtA = `${a.fecha.split("T")[0]}T${a.hora_registro}`;
              const dtB = `${b.fecha.split("T")[0]}T${b.hora_registro}`;
              return dtB.localeCompare(dtA);
            });
            setCursosMarcaciones(marcCursos);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching data:", err);
            setLoading(false);
          });
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  function formatTimeShort(timeStr: string) {
    if (!timeStr) return "";
    return timeStr.slice(0, 5);
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  // --- Calculations ---
  const uniqueCourses = new Set(horarios.map(h => h.curso)).size;
  const totalSessions = horarios.length;
  const totalMarcacionesMes = cursosMarcaciones.length;
  const tardanzasMes = cursosMarcaciones.filter(m => m.estado === "TARDANZA").length;

  const todayDate = new Date();
  const dayName = DAYS[(todayDate.getDay() || 7) - 1].toLowerCase();
  const dateFormatted = `${dayName}, ${todayDate.getDate()} de ${MONTHS[todayDate.getMonth()]} de ${todayDate.getFullYear()}`;
  const jsDay = todayDate.getDay() || 7;

  const todayClasses = horarios.filter(h => h.dia_semana === jsDay).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio));

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

  const uniqueCoursesList = Array.from(new Set(horarios.map(h => h.curso)));

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando módulo de marcaciones...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header Back & Title */}
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-5">
        <Link href="/login/PanelDocente/asistencia" className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1.5 w-fit">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Volver a Mi asistencia
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Mi Asistencia</p>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Registro de asistencia a cursos
              </h1>
              <span className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-200 shadow-sm flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                 Validacion movil segura
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
              Revise sus sesiones programadas, el estado de cada marcacion y el historial academico sincronizado desde la aplicacion movil.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">
              Actualizar datos
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Cursos asignados</p>
              <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{String(uniqueCourses).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Cursos distintos en su horario activo.</p>
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
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Bloques academicos programados.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-purple-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Marcaciones del mes</p>
              <h3 className="text-3xl font-black text-purple-600 leading-none mb-1.5">{String(totalMarcacionesMes).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Asistencias de curso registradas.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Tardanzas del mes</p>
              <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{String(tardanzasMes).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Marcaciones posteriores al inicio.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clases de hoy & Proxima clase */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Programacion</p>
                <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Diaria</p>
              </div>
              <h2 className="text-xl font-black text-slate-900">Sesiones de hoy</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">{dateFormatted}</p>
            </div>
            <div className="bg-blue-50 text-blue-700 text-[11px] font-black px-3 py-1.5 rounded-full border border-blue-100">
              {todayClasses.length} sesion(es)
            </div>
          </div>
          <CardContent className="p-6 flex-1 bg-[#fafcfb]">
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-sm font-semibold text-slate-500">
                No tiene clases programadas para hoy.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {todayClasses.map((c, i) => (
                  <div key={i} className="bg-white border border-green-100 rounded-xl p-5 relative flex flex-col justify-between shadow-sm">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-xl"></div>
                    <div className="pl-2">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-green-700 tracking-wide uppercase mb-0.5">{c.curso.split(' ')[0]}</p>
                          <h4 className="text-base font-black text-slate-900 leading-tight pr-4">{c.curso}</h4>
                        </div>
                        <span className="bg-slate-50 text-slate-500 text-[9px] font-black px-2.5 py-1 rounded-full border border-slate-200 shrink-0 flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                           Pendiente
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Horario</p>
                          <p className="text-xs font-black text-slate-800">{formatTimeShort(c.hora_inicio)} - {formatTimeShort(c.hora_fin)}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Aula</p>
                          <p className="text-xs font-black text-slate-800">{c.aula}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Semestre</p>
                          <p className="text-xs font-black text-slate-800">{c.semestre}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                          <p className="text-[9px] font-extrabold text-slate-400 mb-0.5">Marcacion</p>
                          <p className="text-xs font-black text-slate-800">Pendiente</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full text-[11px] font-black h-9 border-slate-200 shadow-sm text-slate-700 flex items-center justify-center gap-2">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        Marcar desde la APP movil
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proxima sesion */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Siguiente</p>
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Actividad</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Proxima sesion</h2>
          </div>
          <CardContent className="p-6 flex flex-col items-center">
            {nextCourse ? (
              <>
                <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
                </div>
                <p className="text-[9px] font-bold text-blue-600 mb-1">{/* course ID could go here */}</p>
                <h3 className="text-base font-black text-slate-900 mb-5 text-center leading-tight">{nextCourse.curso}</h3>
                
                <div className="w-full bg-slate-50 border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="px-5 py-3 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Dia</span>
                    <span className="text-[11px] font-black text-slate-800">{DAYS[nextCourse.dia_semana - 1]}</span>
                  </div>
                  <div className="px-5 py-3 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Horario</span>
                    <span className="text-[11px] font-black text-slate-800">{formatTimeShort(nextCourse.hora_inicio)} - {formatTimeShort(nextCourse.hora_fin)}</span>
                  </div>
                  <div className="px-5 py-3 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Aula</span>
                    <span className="text-[11px] font-black text-slate-800">{nextCourse.aula}</span>
                  </div>
                  <div className="px-5 py-3 flex justify-between items-center">
                    <span className="text-[10px] font-extrabold text-slate-500">Docente</span>
                    <span className="text-[11px] font-black text-slate-800">{userName}</span>
                  </div>
                </div>

                <div className="mt-5 bg-green-50/50 border border-green-100 p-4 rounded-xl flex items-start gap-3 w-full">
                   <div className="mt-0.5 shrink-0">
                     <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-slate-900 mb-0.5">Marcacion protegida</p>
                     <p className="text-[9px] font-semibold text-slate-500 leading-snug">La APP movil y el backend verifican titularidad, fecha, horario, presencia y duplicados.</p>
                   </div>
                </div>
              </>
            ) : (
              <div className="text-sm font-semibold text-slate-500 py-10">No hay sesiones próximas.</div>
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
          <div className="px-6 pt-5 pb-3 bg-[#f8fcfd]">
            <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Colores por curso</p>
            <p className="text-[10px] font-medium text-slate-500 mb-3">Pulse un curso para mostrar únicamente sus horarios.</p>
            <div className="flex flex-wrap gap-2">
              {uniqueCoursesList.map((curso, i) => (
                <div key={i} className="flex items-center gap-2 border border-slate-300 rounded-full px-3 py-1 bg-white cursor-pointer hover:bg-slate-50 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                  <span className="text-[10px] font-bold text-slate-700">{curso}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Layout implementation */}
          <div className="p-6 overflow-x-auto bg-[#f8fcfd]">
            <div className="min-w-[800px] border border-black flex flex-col bg-white">
              <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] bg-black text-white text-xs font-bold">
                <div className="py-2.5 px-3 text-left text-[10px] font-extrabold">Hora</div>
                {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day) => (
                  <div key={day} className="py-2.5 text-center flex items-center justify-center gap-2 border-l border-white/20">
                    <span className="text-[11px]">{day}</span> <span className="bg-white text-black text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">1</span>
                  </div>
                ))}
              </div>
              <div className="relative grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] min-h-[350px]">
                <div className="col-span-6 row-span-full grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr] absolute inset-0 pointer-events-none">
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div className="border-r border-black/10"></div>
                  <div></div>
                </div>
                <div className="col-span-6 row-span-full absolute inset-0 pointer-events-none flex flex-col">
                  {[...Array(14)].map((_, i) => (
                    <div key={i} className="flex-1 border-b border-black/10 flex items-start">
                       <span className="text-[10px] font-bold text-slate-400 pl-2 pt-1">{String(7 + i).padStart(2,'0')}:00</span>
                    </div>
                  ))}
                </div>
                <div className="col-start-2 col-end-7 relative w-full h-full pointer-events-auto">
                  {horarios.map((h, i) => {
                    const dayColIndex = h.dia_semana - 1;
                    if (dayColIndex < 0 || dayColIndex > 4) return null;
                    const [sH, sM] = h.hora_inicio.split(':').map(Number);
                    const [eH, eM] = h.hora_fin.split(':').map(Number);
                    const topPct = ((sH + sM/60 - 7) / 14) * 100;
                    const heightPct = (((eH + eM/60) - (sH + sM/60)) / 14) * 100;

                    return (
                      <div key={i} className="absolute p-0.5 z-10" style={{ left: `${dayColIndex * 20}%`, width: '20%', top: `${topPct}%`, height: `${heightPct}%` }}>
                        <div className="bg-black text-white rounded-lg h-full p-2 flex flex-col justify-between overflow-hidden shadow-sm">
                          <div>
                            <p className="text-xs font-black leading-tight line-clamp-2">{h.curso}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold opacity-80">{h.aula}</p>
                            <p className="text-[8px] font-medium opacity-60 truncate">{userName}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-black text-[9px] text-white/50 p-2 text-left px-3 font-semibold">
                Cada curso mantiene el mismo color aunque sea impartido por diferentes docentes o en distintos días y aulas.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de marcaciones de cursos table */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Historial de marcaciones de cursos</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Ultimos registros academicos asociados a su cuenta docente.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-100">
            {cursosMarcaciones.length} registro(s)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Curso</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Aula</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Hora</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-right">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cursosMarcaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No hay marcaciones de curso registradas.
                  </td>
                </tr>
              ) : (
                cursosMarcaciones.slice(0, 10).map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{formatDate(m.fecha)}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{m.curso}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600 truncate max-w-[250px]">{m.aula}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-center">{formatTimeShort(m.hora_registro)}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-wide border ${m.estado === "TARDANZA" ? "bg-amber-50 text-amber-700 border-amber-200" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${m.estado === "TARDANZA" ? "bg-amber-500" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-500" : "bg-red-500"}`}></span>
                         {m.estado.charAt(0).toUpperCase() + m.estado.slice(1).toLowerCase()}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-500 text-right">Sistema institucional</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}
