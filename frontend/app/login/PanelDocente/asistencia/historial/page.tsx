"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

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

interface ConsolidatedMarcacion {
  fecha: string;
  hora: string;
  tipo: string;
  curso: string;
  aula: string;
  estado: string;
  detalle: string;
}

export default function HistorialAsistenciaPage() {
  const [userName, setUserName] = useState("Docente Universitario");
  const [marcaciones, setMarcaciones] = useState<ConsolidatedMarcacion[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterDesde, setFilterDesde] = useState("2026-07-01");
  const [filterHasta, setFilterHasta] = useState("2026-07-27");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterCurso, setFilterCurso] = useState("Todos los cursos");

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserName(`${parsedUser.nombres} ${parsedUser.apellidos}`);

        fetch(`/api/asistencia/docente/${parsedUser.id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((resAsist) => resAsist.json())
          .then((dataAsist) => {
            const ingresos: AsistenciaIngreso[] = dataAsist.ingresos || [];
            const cursos: AsistenciaCurso[] = dataAsist.cursos || [];
            
            const arr: ConsolidatedMarcacion[] = [];
            ingresos.forEach((r) => {
              arr.push({
                fecha: r.fecha.split("T")[0],
                hora: r.hora_registro,
                tipo: "Institucional",
                curso: "Ingreso institucional",
                aula: "-",
                estado: r.estado,
                detalle: "Acceso general a la universidad",
              });
            });
            cursos.forEach((r) => {
              arr.push({
                fecha: r.fecha.split("T")[0],
                hora: r.hora_registro,
                tipo: "Curso",
                curso: r.curso,
                aula: r.aula,
                estado: r.estado,
                detalle: "Marcacion de sesion academica",
              });
            });

            arr.sort((a, b) => {
              const dtA = `${a.fecha}T${a.hora}`;
              const dtB = `${b.fecha}T${b.hora}`;
              return dtB.localeCompare(dtA);
            });

            setMarcaciones(arr);
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
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  // --- Derived filtering ---
  const filteredMarcaciones = marcaciones.filter((m) => {
    // Note: Basic exact string checks for demo. Real apps parse dates.
    if (filterDesde && m.fecha < filterDesde) return false;
    if (filterHasta && m.fecha > filterHasta) return false;
    if (filterTipo !== "Todos" && m.tipo !== filterTipo) return false;
    if (filterEstado !== "Todos") {
       if (filterEstado === "Presente/Puntual" && !(m.estado === "PRESENTE" || m.estado === "PUNTUAL")) return false;
       if (filterEstado === "Tardanza" && m.estado !== "TARDANZA") return false;
       if (filterEstado === "Falta" && m.estado !== "FALTA") return false;
    }
    if (filterCurso !== "Todos los cursos" && m.curso !== filterCurso) return false;
    return true;
  });

  const uniqueCourseNames = Array.from(new Set(marcaciones.filter(m => m.tipo === "Curso").map(m => m.curso)));

  const registrosFiltrados = filteredMarcaciones.length;
  const puntuales = filteredMarcaciones.filter(m => m.estado === "PRESENTE" || m.estado === "PUNTUAL").length;
  const tardanzas = filteredMarcaciones.filter(m => m.estado === "TARDANZA").length;
  const inasistencias = filteredMarcaciones.filter(m => m.estado === "FALTA").length;
  const cumplimiento = registrosFiltrados > 0 ? Math.round((puntuales / registrosFiltrados) * 100) : 0;

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando historial...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      
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
                Historial de asistencia
              </h1>
              <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-purple-200 shadow-sm flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                 Historial personal
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
              Consulta consolidada de ingresos institucionales y sesiones academicas de {userName}.
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
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Registros filtrados</p>
              <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{String(registrosFiltrados).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Ingresos y sesiones en el periodo seleccionado.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Puntuales / presentes</p>
              <h3 className="text-3xl font-black text-green-600 leading-none mb-1.5">{String(puntuales).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Cumplimiento calculado: {cumplimiento}%.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Tardanzas</p>
              <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{String(tardanzas).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Registros clasificados fuera de la hora esperada.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center text-red-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Inasistencias</p>
              <h3 className="text-3xl font-black text-red-600 leading-none mb-1.5">{String(inasistencias).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Ausencias incluidas en la respuesta del servidor.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Progress Bar */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Filtros del historial</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Ajuste el periodo y el tipo de registro para revisar resultados especificos.</p>
          </div>
          <Button variant="outline" className="text-xs font-bold px-4 h-9 border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600">
            Limpiar filtros
          </Button>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Desde</label>
              <input type="date" value={filterDesde} onChange={e => setFilterDesde(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Hasta</label>
              <input type="date" value={filterHasta} onChange={e => setFilterHasta(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Tipo de registro</label>
              <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                <option>Todos</option>
                <option>Institucional</option>
                <option>Curso</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Estado</label>
              <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                <option>Todos</option>
                <option>Presente/Puntual</option>
                <option>Tardanza</option>
                <option>Falta</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2 space-y-1">
              <label className="text-[10px] font-extrabold text-slate-800 ml-1">Curso</label>
              <select value={filterCurso} onChange={e => setFilterCurso(e.target.value)} className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                <option>Todos los cursos</option>
                {uniqueCourseNames.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-6">
             <div>
                <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase mb-1">Cumplimiento</p>
                <p className="text-xl font-black text-green-600 leading-none">{cumplimiento}%</p>
             </div>
             <div className="flex-1 max-w-md h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${cumplimiento}%` }}></div>
             </div>
             <p className="text-[10px] font-bold text-slate-500 flex-1">
                El backend devuelve hasta 30 ingresos y 30 marcaciones de cursos recientes para la cuenta autenticada.
             </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Registros encontrados</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Resultado consolidado segun los filtros aplicados.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-100">
            {registrosFiltrados} registro(s)
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Hora</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Tipo</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Curso / Dependencia</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Aula</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {registrosFiltrados === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No se encontraron registros que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredMarcaciones.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{formatDate(m.fecha)}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-center">{formatTimeShort(m.hora)}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black tracking-wide border ${m.tipo === "Institucional" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}`}>
                         {m.tipo}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900 max-w-[200px] truncate">{m.curso}</td>
                    <td className="px-6 py-4 font-bold text-slate-600">{m.aula}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-wide border ${m.estado === "TARDANZA" ? "bg-amber-50 text-amber-700 border-amber-200" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${m.estado === "TARDANZA" ? "bg-amber-500" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-500" : "bg-red-500"}`}></span>
                         {m.estado.charAt(0).toUpperCase() + m.estado.slice(1).toLowerCase()}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-500 text-right">{m.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
          <p className="text-[10px] font-semibold text-slate-500">Mostrando 1 - {registrosFiltrados} de {registrosFiltrados}</p>
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
