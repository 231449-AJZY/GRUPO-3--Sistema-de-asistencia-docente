"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ConsolidatedInasistencia {
  fecha: string;
  hora: string;
  tipo: string;
  curso: string;
  aula: string;
  estado: string;
  fuente: string;
}

const DAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default function ConsultaInasistenciasPage() {
  const [userName, setUserName] = useState("Docente Universitario");
  const [inasistencias, setInasistencias] = useState<ConsolidatedInasistencia[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterDesde, setFilterDesde] = useState("");
  const [filterHasta, setFilterHasta] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todas");
  const [filterCurso, setFilterCurso] = useState("Todos los cursos");

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserName(`${parsedUser.nombres} ${parsedUser.apellidos}`);

        fetch(`/api/asistencia/docente/${parsedUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((res) => res.json())
          .then((data) => {
            const arr: ConsolidatedInasistencia[] = [];
            
            if (Array.isArray(data.ingresos)) {
              data.ingresos.forEach((r: any) => {
                if (r.estado === "FALTA" || r.estado === "AUSENTE") {
                  arr.push({
                    fecha: r.fecha.split("T")[0],
                    hora: r.hora_registro || "--:--",
                    tipo: "Institucional",
                    curso: "Ingreso institucional",
                    aula: "-",
                    estado: "Ausente",
                    fuente: "Control de ingreso"
                  });
                }
              });
            }

            if (Array.isArray(data.cursos)) {
              data.cursos.forEach((r: any) => {
                if (r.estado === "FALTA" || r.estado === "AUSENTE") {
                  arr.push({
                    fecha: r.fecha.split("T")[0],
                    hora: r.hora_registro || "--:--",
                    tipo: "Curso",
                    curso: r.curso,
                    aula: r.aula,
                    estado: "Ausente",
                    fuente: "Asistencia a curso"
                  });
                }
              });
            }

            arr.sort((a, b) => {
              const dtA = `${a.fecha}T${a.hora}`;
              const dtB = `${b.fecha}T${b.hora}`;
              return dtB.localeCompare(dtA); // desc
            });

            setInasistencias(arr);
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
    if (!timeStr || timeStr === "--:--") return "--:--";
    return timeStr.slice(0, 5);
  }

  function formatDateLong(dateStr: string, timeStr: string) {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T12:00:00`);
    const day = DAYS_ES[d.getDay()];
    return `${day}, ${d.getDate()} de ${MONTHS_ES[d.getMonth()]} de ${d.getFullYear()} - ${formatTimeShort(timeStr)}`;
  }

  // --- Filtering ---
  const filteredInasistencias = inasistencias.filter((m) => {
    if (filterDesde && m.fecha < filterDesde) return false;
    if (filterHasta && m.fecha > filterHasta) return false;
    if (filterTipo !== "Todas" && m.tipo !== filterTipo) return false;
    if (filterCurso !== "Todos los cursos" && m.curso !== filterCurso) return false;
    return true;
  });

  const uniqueCourseNames = Array.from(new Set(inasistencias.filter(m => m.tipo === "Curso").map(m => m.curso)));

  // --- Stats Calculations ---
  const countInstitucional = filteredInasistencias.filter(m => m.tipo === "Institucional").length;
  const countCursos = filteredInasistencias.filter(m => m.tipo === "Curso").length;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const inasistenciasEsteMes = inasistencias.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  // Most frequent course
  const courseFreq: Record<string, number> = {};
  filteredInasistencias.filter(m => m.tipo === "Curso").forEach(m => {
    courseFreq[m.curso] = (courseFreq[m.curso] || 0) + 1;
  });
  let mostFrequentCourse = "Sin ausencias de cursos";
  let maxCourseFreq = 0;
  Object.keys(courseFreq).forEach(c => {
    if (courseFreq[c] > maxCourseFreq) {
      maxCourseFreq = courseFreq[c];
      mostFrequentCourse = `${c} - ${maxCourseFreq}`;
    }
  });

  const tipoPredominante = countInstitucional > countCursos ? "Ingreso institucional" : countInstitucional < countCursos ? "Asistencia a cursos" : countInstitucional === 0 ? "Sin datos" : "Equilibrado";
  const lastInasistencia = filteredInasistencias.length > 0 ? formatDateLong(filteredInasistencias[0].fecha, filteredInasistencias[0].hora) : "Sin registros";

  // Frequency by day
  const freqByDay = [0, 0, 0, 0, 0, 0, 0];
  const uiDaysOrder = [1, 2, 3, 4, 5, 6, 0]; // Lun(1), Mar(2), Mie(3), Jue(4), Vie(5), Sab(6), Dom(0)
  const freqUiByDay = [0, 0, 0, 0, 0, 0, 0];

  filteredInasistencias.forEach(m => {
    const d = new Date(`${m.fecha}T12:00:00`);
    const day = d.getDay();
    const uiIndex = uiDaysOrder.indexOf(day);
    if(uiIndex !== -1) freqUiByDay[uiIndex]++;
  });

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando inasistencias...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Control</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Personal</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Consulta de inasistencias
            </h1>
            <span className="bg-red-50 text-red-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-red-200 shadow-sm flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
               Solo lectura
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Revise los registros de {userName} que el servidor clasifico expresamente como ausencia institucional o academica.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">
            Actualizar
          </Button>
          <Button className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6">
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Inasistencias filtradas</p>
              <h3 className="text-3xl font-black text-red-500 leading-none mb-1.5">{String(filteredInasistencias.length).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Total visible segun los filtros aplicados.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Ingreso institucional</p>
              <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{String(countInstitucional).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Ausencias registradas en el control de ingreso.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-purple-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Asistencia a cursos</p>
              <h3 className="text-3xl font-black text-purple-600 leading-none mb-1.5">{String(countCursos).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Sesiones academicas clasificadas como ausencia.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Inasistencias este mes</p>
              <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{String(inasistenciasEsteMes).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Conteo mensual dentro de la respuesta disponible.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Filtros de consulta</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Delimite el periodo, el tipo de ausencia y el curso.</p>
          </div>
          <Button variant="outline" className="text-xs font-bold px-4 h-9 border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600">
            Limpiar filtros
          </Button>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Desde</label>
              <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Hasta</label>
              <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Tipo de inasistencia</label>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                <option>Todas</option>
                <option>Institucional</option>
                <option>Curso</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Curso</label>
              <select value={filterCurso} onChange={e => setFilterCurso(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                <option>Todos los cursos</option>
                {uniqueCourseNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-red-50/50 border border-red-200/60 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-red-500">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-[10px] font-bold text-red-900 leading-relaxed max-w-4xl">
                 Esta pantalla solo muestra registros cuyo estado recibido es AUSENTE. No convierte automaticamente una falta de marcacion en inasistencia y no incluye justificaciones, observaciones ni documentos.
              </p>
            </div>
            <Button variant="outline" className="text-[10px] font-black h-8 text-blue-600 border-blue-200 bg-white shadow-sm shrink-0">
               Ver historial completo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Middle Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Inasistencias por mes */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Tendencia</p>
              <p className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Temporal</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Inasistencias por mes</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Distribucion calculada sobre los registros filtrados disponibles.</p>
          </div>
          <CardContent className="p-8 flex-1 flex flex-col items-center justify-end h-64">
            {filteredInasistencias.length === 0 ? (
              <div className="flex items-end h-full gap-4 w-full px-4 justify-center">
                 <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-red-600 mb-2">0</span>
                  <div className="w-12 bg-red-100 rounded-t-lg" style={{ height: '140px' }}></div>
                  <span className="text-[10px] font-extrabold text-slate-400 mt-2">Mes actual</span>
                </div>
              </div>
            ) : (
              <div className="flex items-end h-full gap-4 w-full px-4 justify-center">
                <div className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-red-600 mb-2">{filteredInasistencias.length}</span>
                  <div className="w-12 bg-red-500 rounded-t-lg" style={{ height: '140px' }}></div>
                  <span className="text-[10px] font-extrabold text-slate-400 mt-2">Mes actual</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Indicadores destacados */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Resumen</p>
              <p className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Del filtro</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Indicadores destacados</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Lectura automatica de los datos visibles.</p>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col justify-between">
             <div className="mb-6">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Ultima inasistencia</p>
                <h4 className="text-sm font-black text-slate-900">{lastInasistencia}</h4>
             </div>
             <div className="mb-6">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Curso con mayor frecuencia</p>
                <h4 className="text-sm font-black text-slate-900">{mostFrequentCourse}</h4>
             </div>
             <div className="mb-6">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Tipo predominante</p>
                <h4 className="text-sm font-black text-slate-900">{tipoPredominante}</h4>
             </div>
             <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Registros disponibles</p>
                <h4 className="text-sm font-black text-slate-900">{inasistencias.length} ausencia(s) devuelta(s) por el servidor</h4>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Frecuencia por dia */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Distribucion</p>
            <p className="text-[9px] font-extrabold text-red-600 uppercase tracking-widest">Semanal</p>
          </div>
          <h2 className="text-xl font-black text-slate-900">Frecuencia por dia</h2>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Comparacion de inasistencias filtradas segun el dia de la semana.</p>
        </div>
        <CardContent className="p-8">
           <div className="grid grid-cols-7 gap-4">
              {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((d, i) => (
                <div key={d} className="flex flex-col items-center justify-end">
                   <span className="text-[10px] font-extrabold text-slate-400 mb-3">{d}</span>
                   <div className="w-full bg-slate-100 rounded-full h-2 mb-3 relative overflow-hidden">
                      <div className="absolute top-0 left-0 bottom-0 bg-red-500 rounded-full" style={{ width: freqUiByDay[i] > 0 ? '100%' : '5%' }}></div>
                   </div>
                   <span className="text-xl font-black text-slate-900">{freqUiByDay[i]}</span>
                </div>
              ))}
           </div>
        </CardContent>
      </Card>

      {/* Table Detalle de inasistencias */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Detalle de inasistencias</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Registros ordenados desde la ausencia mas reciente.</p>
          </div>
          <div className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
            {filteredInasistencias.length} registro(s)
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Hora informada</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Tipo</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Curso / Dependencia</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Aula</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-right">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInasistencias.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No existen inasistencias que coincidan con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredInasistencias.map((m, idx) => {
                  const parts = m.fecha.split("-");
                  const displayDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : m.fecha;
                  
                  return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{displayDate}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-center">{formatTimeShort(m.hora)}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black tracking-wide border ${m.tipo === "Institucional" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                         {m.tipo}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 max-w-[200px] truncate">{m.curso}</td>
                    <td className="px-6 py-4 font-bold text-slate-600">{m.aula}</td>
                    <td className="px-6 py-4 text-center">
                       <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-wide border bg-red-50 text-red-700 border-red-200">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                         Ausente
                       </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-500 text-right">{m.fuente}</td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
          <p className="text-[10px] font-semibold text-slate-500">Mostrando {filteredInasistencias.length > 0 ? 1 : 0} - {filteredInasistencias.length} de {filteredInasistencias.length}</p>
          <div className="flex items-center gap-1">
             <Button variant="outline" className="h-8 px-3 text-[10px] font-bold border-slate-200 text-slate-800 shadow-sm" disabled>Anterior</Button>
             <span className="text-[10px] font-bold text-slate-500 px-2">Pagina 1 de 1</span>
             <Button variant="outline" className="h-8 px-3 text-[10px] font-bold border-slate-200 text-slate-800 shadow-sm" disabled>Siguiente</Button>
          </div>
        </div>
      </Card>
      
    </div>
  );
}
