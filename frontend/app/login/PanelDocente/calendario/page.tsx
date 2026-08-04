"use client";

import { useEffect, useState, useMemo } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Evento {
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: string;
  color_hex: string;
}

interface Asistencia {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

interface Horario {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  curso: string;
  aula: string;
}

interface Semestre {
  codigo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

interface CalendarioData {
  semestreActivo: Semestre | null;
  asistencias: Asistencia[];
  horarios: Horario[];
  eventos: Evento[];
}

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function CalendarioPage() {
  const [data, setData] = useState<CalendarioData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Dynamic Dates
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1); // 1-indexed for backend API

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const user = JSON.parse(storedUser);
        fetch(`/api/docentes/${user.id}/calendario?year=${currentYear}&month=${currentMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((d) => {
            // Se asume que los eventos llegarán de la API cuando esté implementada.
            setData(d);
            setLoading(false);
          })
          .catch((err) => {
            console.error("Error fetching calendario:", err);
            setLoading(false);
          });
      } catch (e) {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('es-ES', { month: 'long' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  // Generate Calendar Grid
  const calendarDays = useMemo(() => {
    // Basic calendar logic (simplified for May 2025 where May 1 is Thursday)
    // To keep it standard, we find the first day of the month
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    
    // JS getDay() is 0=Sun, 1=Mon...6=Sat. 
    // We want 1=Mon...7=Sun
    let startDayOfWeek = firstDay.getDay() || 7;
    
    const days = [];
    
    // Previous month padding
    const prevMonthDays = startDayOfWeek - 1;
    for (let i = prevMonthDays; i > 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, 1 - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, d),
        isCurrentMonth: true,
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(currentYear, currentMonth, d),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  if (loading || !data) {
    return <div className="p-8 text-center text-unsaac-muted animate-pulse">Cargando calendario...</div>;
  }

  // Helper to find what to render on a specific day
  const getDayContent = (dateObj: Date, isCurrent: boolean) => {
    if (!isCurrent) {
       return { type: 'empty', label: dateObj.getDate() > 15 ? 'Mes anterior' : 'Mes siguiente' };
    }

    const dateStr = dateObj.toISOString().split('T')[0];
    const jsDayOfWeek = dateObj.getDay() || 7; // 1=Mon..7=Sun
    
    // 1. Check Feriados / Eventos
    const event = data.eventos.find(e => e.fecha.startsWith(dateStr));
    if (event && event.tipo === 'FERIADO') {
      return { type: 'feriado', label: 'Feriado', title: event.titulo };
    }

    // 2. Check Past Attendance
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr <= todayStr) {
      const isWeekend = jsDayOfWeek === 6 || jsDayOfWeek === 7;
      if (isWeekend) return { type: 'empty', label: 'Fin de semana' };

      // Look up attendance logs for this day
      const logs = data.asistencias.filter(a => a.fecha.startsWith(dateStr));
      if (logs.length > 0) {
        // Find worst status (Inasistencia > Tardanza > Asistencia)
        const hasAbsence = logs.some(l => l.estado === 'AUSENTE');
        const hasLate = logs.some(l => l.estado === 'TARDANZA');
        
        let type = 'asistencia';
        let label = 'Asistencia';
        if (hasAbsence) { type = 'inasistencia'; label = 'Inasistencia'; }
        else if (hasLate) { type = 'tardanza'; label = 'Tardanza'; }
        
        return { 
          type, label, 
          courses: logs.map(l => `${l.hora_registro.slice(0,5)} ${l.curso.split(' ').slice(0,2).join(' ')}`) 
        };
      }
      
      return { type: 'empty', label: 'Sin clases' };
    }

    // 3. Check Future Scheduled Classes
    const scheduled = data.horarios.filter(h => h.dia_semana === jsDayOfWeek);
    if (scheduled.length > 0) {
      return {
        type: 'programada', label: 'Clase programada',
        courses: scheduled.map(h => `${h.hora_inicio.slice(0,5)} ${h.curso.split(' ').slice(0,2).join(' ')}`)
      };
    }

    const isWeekend = jsDayOfWeek === 6 || jsDayOfWeek === 7;
    return { type: 'empty', label: isWeekend ? 'Fin de semana' : 'Sin clases' };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-unsaac-text">Calendario académico</h1>
        <p className="mt-1 text-sm font-semibold text-unsaac-muted">
          Visualización mensual de clases programadas, feriados y eventos relevantes del periodo docente
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Main Calendar View */}
        <div className="flex-1 w-full space-y-6">
          <Card>
            <CardContent className="p-6">
              
              {/* Calendar Controls */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-unsaac-text">{capitalizedMonthName} {currentYear}</h2>
                  <p className="text-sm font-medium text-unsaac-muted">
                    Calendario mensual del docente · Departamento de Ingeniería Informática y de Sistemas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <button className="px-4 py-2 hover:bg-slate-50 border-r border-slate-200 transition-colors">
                      &lt;
                    </button>
                    <button className="px-4 py-2 hover:bg-slate-50 transition-colors">
                      &gt;
                    </button>
                  </div>
                  <Button variant="primary" className="bg-orange-500 hover:bg-orange-600 border-none font-extrabold px-6 shadow-sm">
                    Hoy
                  </Button>
                </div>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center py-2 text-[13px] font-black text-slate-700 bg-slate-50 rounded-lg">
                    {day}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((dayObj, i) => {
                  const content = getDayContent(dayObj.date, dayObj.isCurrentMonth);
                  
                  let bgStyle = "bg-white border-slate-100";
                  let badgeStyle = "";
                  let todayRing = "";

                  const todayStr = new Date().toISOString().split('T')[0];
                  const isToday = dayObj.date.toISOString().split('T')[0] === todayStr; 
                  if (isToday) todayRing = "ring-2 ring-orange-500 ring-offset-2";

                  if (!dayObj.isCurrentMonth) {
                    bgStyle = "bg-slate-50 border-transparent opacity-60";
                  } else if (content.type === 'feriado') {
                    bgStyle = "bg-amber-50/50 border-amber-100";
                    badgeStyle = "text-amber-700 bg-amber-100";
                  } else if (content.type === 'asistencia') {
                    bgStyle = "bg-green-50/40 border-green-100";
                    badgeStyle = "text-green-700";
                  } else if (content.type === 'tardanza') {
                    bgStyle = "bg-orange-50/40 border-orange-100";
                    badgeStyle = "text-orange-700";
                  } else if (content.type === 'inasistencia') {
                    bgStyle = "bg-red-50/40 border-red-100";
                    badgeStyle = "text-red-700 bg-red-100 rounded-full px-2 py-0.5 text-[10px]";
                  } else if (content.type === 'programada') {
                    bgStyle = "bg-blue-50/40 border-blue-100";
                    badgeStyle = "text-blue-700";
                  }

                  return (
                    <div key={i} className={`min-h-[120px] rounded-xl border p-3 flex flex-col transition-all ${bgStyle} ${todayRing}`}>
                      <span className={`text-sm font-black mb-1.5 ${dayObj.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}`}>
                        {dayObj.date.getDate()}
                      </span>
                      
                      {content.type === 'empty' ? (
                        <div className="text-xs font-semibold text-slate-400 mt-1">{content.label}</div>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[11px] font-extrabold ${badgeStyle}`}>
                            {content.label}
                          </span>
                          
                          {content.title && (
                            <div className="text-xs font-bold text-amber-600 bg-amber-200/50 px-1.5 py-0.5 rounded mt-0.5">
                              {content.title}
                            </div>
                          )}

                          {content.courses && content.courses.map((c, idx) => (
                            <div key={idx} className="text-[11px] font-semibold text-slate-600 truncate w-full">
                              {c}
                            </div>
                          ))}

                          {isToday && <span className="text-[10px] font-black text-orange-500 mt-1">Hoy</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-8 flex flex-wrap items-center gap-6 border-t border-slate-100 pt-6">
                <span className="text-sm font-extrabold text-slate-800">Leyenda</span>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200"></div><span className="text-xs font-bold text-slate-500">Clase programada</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200"></div><span className="text-xs font-bold text-slate-500">Feriado</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-100 border border-green-200"></div><span className="text-xs font-bold text-slate-500">Asistencia registrada</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-200"></div><span className="text-xs font-bold text-slate-500">Tardanza</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div><span className="text-xs font-bold text-slate-500">Inasistencia</span></div>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="w-full xl:w-[320px] shrink-0 space-y-6">
          
          {/* Active Period */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-extrabold text-unsaac-text mb-1">Periodo académico activo</h3>
              <p className="text-xs font-medium text-unsaac-muted mb-4">Semestre {data.semestreActivo?.codigo || "2025-I"} · Facultad de Ingeniería</p>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-4">
                <h4 className="text-[13px] font-extrabold text-blue-800 mb-2">Vigencia del periodo</h4>
                <p className="text-xs font-medium text-slate-600 mb-1">Inicio: {data.semestreActivo?.fecha_inicio ? new Date(data.semestreActivo.fecha_inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : "17 de marzo de 2025"}</p>
                <p className="text-xs font-medium text-slate-600">Fin: {data.semestreActivo?.fecha_fin ? new Date(data.semestreActivo.fecha_fin).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : "25 de julio de 2025"}</p>
              </div>

              <div className="flex justify-between items-center px-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  En desarrollo
                </span>
                <span className="text-xs font-extrabold text-blue-600 bg-white border border-blue-100 px-3 py-1 rounded-full shadow-sm">
                  Semana 10 de 18
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-lg font-extrabold text-unsaac-text mb-1">Eventos próximos</h3>
              <p className="text-xs font-medium text-unsaac-muted mb-5">Actividades programadas para las siguientes semanas</p>
              
              <div className="space-y-6">
                {data.eventos.map((ev, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {/* Timeline dot and line */}
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full relative z-10" style={{ backgroundColor: ev.color_hex, boxShadow: `0 0 0 4px white, 0 0 0 5px ${ev.color_hex}33` }}></div>
                      {i !== data.eventos.length - 1 && <div className="w-px h-full bg-slate-100 absolute top-3 left-1.5"></div>}
                    </div>
                    <div className="pb-2">
                      <div className="text-[13.5px] font-extrabold text-slate-800 leading-tight">{ev.titulo}</div>
                      <div className="text-[11px] font-bold text-slate-500 mt-1">
                        {new Date(ev.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} · {ev.tipo}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5 leading-relaxed">
                        {ev.descripcion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3 pt-4 border-t border-slate-100">
                <Button variant="primary" className="flex-1 font-bold text-sm bg-orange-500 hover:bg-orange-600 border-none shadow-sm">
                  Exportar calendario
                </Button>
                <Button variant="outline" className="flex-1 font-bold text-sm shadow-sm">
                  Ver agenda
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
