"use client";

import { useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_ADMIN } from "@/lib/constants";

// Dummy data based on the screenshot
const INITIAL_HORARIOS = [
  { id: 1, curso: "Anatomía Humana", codigo: "MED101-DEMO", creditos: 3, depto: "Medicina Humana", docente: "Sofía Castro Ramos", docCod: "DOC-DEMO-016", sem: "2026-II", dia: "Lunes", inicio: "08:00", fin: "10:00", aula: "DMH-A16", estado: "Activo" },
  { id: 2, curso: "Didáctica General", codigo: "EDU101-DEMO", creditos: 3, depto: "Educación", docente: "Sebastián Núñez Puma", docCod: "DOC-DEMO-011", sem: "2026-II", dia: "Lunes", inicio: "08:00", fin: "10:00", aula: "EDU-A01", estado: "Activo" },
  { id: 3, curso: "Programación I", codigo: "SIS101-DEMO", creditos: 3, depto: "Ingeniería de Sistemas", docente: "Lucía Valverde Quispe", docCod: "DOC-DEMO-001", sem: "2026-II", dia: "Lunes", inicio: "08:00", fin: "10:00", aula: "LAB-SIS", estado: "Activo" },
  { id: 4, curso: "Representación Arquitectónica", codigo: "ARQ-PED-202", creditos: 3, depto: "Arquitectura", docente: "Pedro Quispe Mamani", docCod: "DOC-0001", sem: "2026-II", dia: "Lunes", inicio: "08:00", fin: "09:30", aula: "TALLER-2", estado: "Activo" },
  { id: 5, curso: "Topografía", codigo: "CIV101-DEMO", creditos: 3, depto: "Ingeniería Civil", docente: "Bruno Vargas Palomino", docCod: "DOC-DEMO-006", sem: "2026-II", dia: "Lunes", inicio: "08:00", fin: "10:00", aula: "GAB-CIV", estado: "Activo" },
  { id: 6, curso: "Anatomía Dental", codigo: "ODO101-DEMO", creditos: 3, depto: "Odontología", docente: "Mauricio Vega Quispe", docCod: "DOC-DEMO-017", sem: "2026-II", dia: "Lunes", inicio: "10:00", fin: "12:00", aula: "CLI-ODO", estado: "Activo" },
  { id: 7, curso: "Contabilidad General", codigo: "CON101-DEMO", creditos: 3, depto: "Contabilidad", docente: "Rodrigo Aguilar Sucso", docCod: "DOC-DEMO-019", sem: "2026-II", dia: "Lunes", inicio: "14:00", fin: "16:00", aula: "AULA-CON", estado: "Activo" },
  { id: 8, curso: "Análisis Estructural", codigo: "CIV303-DEMO", creditos: 3, depto: "Ingeniería Civil", docente: "Pedro Quispe Mamani", docCod: "DOC-0001", sem: "2026-II", dia: "Miércoles", inicio: "14:00", fin: "16:00", aula: "AULA-CIV", estado: "Inactivo" },
  { id: 9, curso: "Taller de Diseño Arquitectónico I", codigo: "ARQ-PED-101", creditos: 4, depto: "Arquitectura", docente: "Pedro Quispe Mamani", docCod: "DOC-0001", sem: "2026-II", dia: "Miércoles", inicio: "14:44", fin: "16:14", aula: "TALLER-1", estado: "Inactivo" }
];

const CURSOS_PILLS = [
  "CIV303-DEMO Análisis Estructural", "ODO101-DEMO Anatomía Dental", "MED101-DEMO Anatomía Humana", "CON303-DEMO Auditoría", "SIS202-DEMO Bases de Datos", "CON101-DEMO Contabilidad General",
  "AGI404-DEMO Control de Calidad", "ARQ101-DEMO Dibujo Arquitectónico", "EDU101-DEMO Didáctica General", "ARQ202-DEMO Diseño Arquitectónico", "EDU303-DEMO Evaluación del Aprendizaje",
  "CON404-DEMO Finanzas Empresariales", "MED202-DEMO Fisiología", "EDU404-DEMO Gestión Educativa", "CIV404-DEMO Hidráulica", "ARQ-PED-505 Historia de la Arquitectura Peruana",
  "SIS303-DEMO Ingeniería de Software", "ODO202-DEMO Materiales Dentales", "CIV202-DEMO Mecánica de Suelos", "MED404-DEMO Medicina Interna", "ODO404-DEMO Odontología Restauradora",
  "AGI202-DEMO Operaciones Unitarias", "MED303-DEMO Patología General", "ODO303-DEMO Periodoncia", "SIS101-DEMO Programación I", "EDU202-DEMO Psicología Educativa",
  "AGI101-DEMO Química de Alimentos", "SIS404-DEMO Redes y Comunicaciones", "ARQ-PED-202 Representación Arquitectónica", "ARQ-PED-101 Taller de Diseño Arquitectónico I", "AGI303-DEMO Tecnología de Alimentos",
  "ARQ404-DEMO Tecnología de la Construcción", "ARQ-PED-404 Tecnología de la Construcción", "CIV101-DEMO Topografía", "CON202-DEMO Tributación", "ARQ303-DEMO Urbanismo", "ARQ-PED-303 Urbanismo y Territorio"
];

const HORAS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

export default function GestionHorariosPage() {
  const [viewMode, setViewMode] = useState<"calendario" | "tarjetas">("tarjetas"); // Default a tarjetas para interactuar
  const [horarios, setHorarios] = useState(INITIAL_HORARIOS);
  const [showModal, setShowModal] = useState(false);
  
  const [newCurso, setNewCurso] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleState = (id: number, currentState: string) => {
     const newState = currentState === "Activo" ? "Inactivo" : "Activo";
     setHorarios(prev => prev.map(h => h.id === id ? { ...h, estado: newState } : h));
     if (newState === "Activo") toast.success("Horario académico reactivado.");
     else toast.warning("Horario académico suspendido.");
  };

  const handleDelete = (id: number) => {
     setHorarios(prev => prev.filter(h => h.id !== id));
     toast.error("Horario eliminado permanentemente.");
  };

  const handleSave = () => {
     if (!newCurso) return toast.warning("Debe especificar el curso.");
     setIsSaving(true);
     setTimeout(() => {
        setIsSaving(false);
        setShowModal(false);
        toast.success("Nuevo bloque de horario programado exitosamente.");
     }, 1000);
  };

  return (
    <DashboardLayout user={MOCK_ADMIN} active="horarios">
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Gestión</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Académica</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Horarios académicos</h1>
            <div className="bg-black w-24 h-6 rounded-full"></div>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Administre la asignación institucional de docentes, cursos, aulas y bloques de clase por semestre.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowModal(true)} className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6">
            Nuevo horario
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-blue-600 rounded-2xl p-4 shadow-md shadow-blue-600/20 cursor-pointer">
            <h3 className="text-[13px] font-black text-white">Horarios</h3>
            <p className="text-[10px] font-bold text-blue-100 mt-0.5">Programación semanal</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 cursor-pointer transition-colors">
            <h3 className="text-[13px] font-black text-slate-900">Cursos</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Catálogo académico</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 cursor-pointer transition-colors">
            <h3 className="text-[13px] font-black text-slate-900">Semestres</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Periodos institucionales</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 cursor-pointer transition-colors">
            <h3 className="text-[13px] font-black text-slate-900">Departamentos</h3>
            <p className="text-[10px] font-bold text-slate-500 mt-0.5">Unidades académicas</p>
         </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">Horarios registrados</p>
                <h3 className="text-4xl font-black text-slate-900 leading-none mb-1.5 mt-2">92</h3>
              </div>
              <div className="w-16 h-5 bg-black rounded-full shrink-0 mt-1"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">En el semestre seleccionado</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-4xl font-black text-slate-900 leading-none mb-1.5 mt-6">21</h3>
              </div>
              <div className="w-16 h-5 bg-black rounded-full shrink-0 mt-1"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Con carga académica</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-4xl font-black text-slate-900 leading-none mb-1.5 mt-6">37</h3>
              </div>
              <div className="w-16 h-5 bg-black rounded-full shrink-0 mt-1"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">86 bloques activos</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-4xl font-black text-slate-900 leading-none mb-1.5 mt-6">0</h3>
              </div>
              <div className="w-16 h-5 bg-black rounded-full shrink-0 mt-1"></div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Cruces de docente o aula</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros Académicos */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Filtros académicos</h2>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Consulte la programación por carrera, semestre, día, estado o término de búsqueda.</p>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-3">
             <div className="flex-[2]">
                <input type="text" placeholder="Curso, docente, código o aula" className="w-full h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm" />
             </div>
             <div className="flex-1">
                <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm"><option>2026-II - Activo</option></select>
             </div>
             <div className="flex-1">
                <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm"><option>Todas las carreras</option></select>
             </div>
             <div className="flex-1">
                <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm"><option>Todos los días</option></select>
             </div>
             <div className="flex-1">
                <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm"><option>Todos los estados</option></select>
             </div>
             <Button variant="outline" className="text-xs font-bold px-6 h-10 border-slate-200 shadow-sm text-slate-600 shrink-0">Limpiar</Button>
          </div>
        </CardContent>
      </Card>

      {/* Main View Switcher & Toolbar */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
         <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <div>
               <h2 className="text-lg font-black text-slate-900">
                  {viewMode === "calendario" ? "Calendario semanal visual" : "Horarios académicos"}
               </h2>
               <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {viewMode === "calendario" ? "Vista por horas, cursos, docentes y aulas del periodo académico seleccionado." : "Asignaciones de docentes, cursos, aulas y periodos."}
               </p>
            </div>
            <div className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
               86 clase(s)
            </div>
         </div>
         <div className="p-4 bg-black flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex gap-3 flex-1 w-full">
               <select className="flex-1 h-10 px-3 bg-white rounded-xl text-xs font-bold text-slate-900 outline-none"><option>Todos los cursos</option></select>
               <select className="flex-1 h-10 px-3 bg-white rounded-xl text-xs font-bold text-slate-900 outline-none"><option>Todos los docentes</option></select>
               <select className="flex-1 h-10 px-3 bg-white rounded-xl text-xs font-bold text-slate-900 outline-none"><option>Todas las aulas</option></select>
            </div>
            <div className="flex gap-2 shrink-0 bg-white p-1 rounded-xl">
               <button 
                  onClick={() => setViewMode("calendario")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${viewMode === "calendario" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
               >
                  Calendario
               </button>
               <button 
                  onClick={() => setViewMode("tarjetas")}
                  className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${viewMode === "tarjetas" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}
               >
                  Tarjetas
               </button>
            </div>
            <Button variant="outline" className="text-xs font-black px-4 h-9 border-none bg-white shadow-sm text-slate-900 shrink-0">Limpiar</Button>
         </div>

         {viewMode === "calendario" && (
            <div className="p-6">
               {/* Colores por curso pills */}
               <div className="mb-6">
                  <h4 className="text-[11px] font-black text-slate-900 mb-0.5">Colores por curso</h4>
                  <p className="text-[9px] font-semibold text-slate-500 mb-3">Pulse un curso para mostrar únicamente sus horarios.</p>
                  <div className="flex flex-wrap gap-2">
                     {CURSOS_PILLS.map((pill, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer shadow-sm">
                           <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                           <span className="text-[8px] font-black text-slate-700">{pill}</span>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Calendario Grid Mockup */}
               <div className="overflow-x-auto">
                  <div className="min-w-[800px] border border-slate-200 rounded-xl overflow-hidden bg-white">
                     {/* Header */}
                     <div className="grid grid-cols-6 border-b border-slate-200 bg-blue-50/50">
                        <div className="p-3 border-r border-slate-200 font-black text-[11px] text-slate-900">Hora</div>
                        {["Lun", "Mar", "Mié", "Jue", "Vie"].map((d, i) => (
                           <div key={d} className="p-3 border-r border-slate-200 text-center flex items-center justify-center gap-1">
                              <span className="font-black text-[11px] text-slate-900">{d}</span>
                              <span className="bg-white text-blue-600 font-bold text-[9px] px-1.5 rounded shadow-sm border border-slate-100">{18 + i}</span>
                           </div>
                        ))}
                     </div>
                     {/* Body rows */}
                     {HORAS.map(h => (
                        <div key={h} className="grid grid-cols-6 border-b border-slate-100 min-h-[60px]">
                           <div className="p-3 border-r border-slate-200 font-black text-[10px] text-slate-900 flex items-center">{h}</div>
                           {[1,2,3,4,5].map(day => {
                              // Simulate some random blocks filling up the calendar as in the screenshot
                              const hasBlock = (parseInt(h) % 2 === 0 && day % 2 !== 0) || (parseInt(h) > 13 && day > 2);
                              return (
                                 <div key={day} className="border-r border-slate-100 p-1 relative">
                                    {hasBlock && (
                                       <div className="absolute inset-1 bg-black rounded-lg opacity-90 p-2 flex flex-col overflow-hidden text-white cursor-pointer hover:opacity-100">
                                          <span className="text-[8px] font-bold opacity-0">Block</span>
                                       </div>
                                    )}
                                 </div>
                              )
                           })}
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {viewMode === "tarjetas" && (
            <div className="p-6">
               <div className="border border-slate-200 rounded-xl overflow-hidden bg-white divide-y divide-slate-100">
                  {horarios.length === 0 ? (
                     <div className="p-8 text-center text-slate-500 font-bold text-xs">No hay horarios registrados.</div>
                  ) : (
                     horarios.map((horario, idx) => (
                        <div key={idx} className={`p-4 grid grid-cols-1 md:grid-cols-6 gap-4 items-center transition-colors ${horario.estado === "Inactivo" ? "bg-slate-50 opacity-60" : "hover:bg-slate-50"}`}>
                           <div className="col-span-1">
                              <h4 className="text-[11px] font-black text-slate-900 mb-0.5">{horario.curso}</h4>
                              <p className="text-[9px] font-black text-blue-600 mb-0.5">{horario.codigo}</p>
                              <p className="text-[9px] font-semibold text-slate-500">{horario.creditos} créditos</p>
                           </div>
                           <div className="col-span-1">
                              <h4 className="text-[10px] font-black text-slate-900 mb-0.5">{horario.depto}</h4>
                              <p className="text-[9px] font-semibold text-slate-500">Carrera académica</p>
                           </div>
                           <div className="col-span-1">
                              <h4 className="text-[10px] font-black text-slate-900 mb-0.5">{horario.docente}</h4>
                              <p className="text-[9px] font-black text-blue-600">{horario.docCod}</p>
                           </div>
                           <div className="col-span-1 flex items-center justify-between px-4">
                              <div className="bg-black text-white text-[9px] font-black px-3 py-1 rounded-full">{horario.sem}</div>
                              <div className="text-[11px] font-black text-slate-900">{horario.dia}</div>
                           </div>
                           <div className="col-span-1">
                              <h4 className="text-[10px] font-black text-slate-900 mb-0.5">{horario.inicio}</h4>
                              <p className="text-[9px] font-semibold text-slate-500">hasta {horario.fin}</p>
                           </div>
                           <div className="col-span-1 flex items-center justify-end gap-3">
                              <Button variant="outline" className="h-7 px-3 text-[9px] font-black border-slate-200 text-slate-700 shadow-sm" onClick={() => toast.info("Edición en construcción.")}>Editar</Button>
                              {horario.estado === "Activo" ? (
                                 <Button onClick={() => handleToggleState(horario.id, horario.estado)} className="h-7 px-3 text-[9px] font-black bg-amber-500 text-white shadow-sm hover:bg-amber-600 border-none">Desactivar</Button>
                              ) : (
                                 <Button onClick={() => handleToggleState(horario.id, horario.estado)} className="h-7 px-3 text-[9px] font-black bg-green-600 text-white shadow-sm hover:bg-green-700 border-none">Activar</Button>
                              )}
                              {horario.estado === "Inactivo" && (
                                 <Button onClick={() => handleDelete(horario.id)} className="h-7 px-3 text-[9px] font-black bg-red-600 text-white shadow-sm hover:bg-red-700 border-none">Eliminar</Button>
                              )}
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>
         )}
      </Card>
      
      {/* MODAL NUEVO HORARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl bg-white shadow-2xl rounded-2xl overflow-hidden border-none animate-in fade-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h2 className="text-lg font-black text-slate-900">Programar horario</h2>
                   <p className="text-[11px] font-bold text-slate-500 mt-1">Asigne un curso, docente, aula y bloque horario.</p>
                </div>
                <div className="w-16 h-4 bg-black rounded-full"></div>
             </div>
             
             <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-800 ml-1 uppercase tracking-widest">Curso</label>
                      <input 
                         type="text" 
                         value={newCurso} 
                         onChange={(e) => setNewCurso(e.target.value)} 
                         placeholder="Buscar curso por código o nombre..." 
                         className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-800 ml-1 uppercase tracking-widest">Docente</label>
                      <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm focus:border-blue-500">
                         <option>Seleccione un docente</option>
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-800 ml-1 uppercase tracking-widest">Día</label>
                      <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm">
                         <option>Lunes</option>
                         <option>Martes</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-800 ml-1 uppercase tracking-widest">Inicio</label>
                      <input type="time" className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-800 ml-1 uppercase tracking-widest">Fin</label>
                      <input type="time" className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm" />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-extrabold text-slate-800 ml-1 uppercase tracking-widest">Aula / Laboratorio</label>
                   <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-sm">
                      <option>Seleccione un aula</option>
                   </select>
                </div>
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)} className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-100 text-slate-700 h-10 px-6">
                   Cancelar
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-none h-10 px-8">
                   {isSaving ? "Guardando..." : "Programar"}
                </Button>
             </div>
          </Card>
        </div>
      )}

    </div>
    </DashboardLayout>
  );
}
