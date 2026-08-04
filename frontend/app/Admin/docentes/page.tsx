"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_ADMIN } from "@/lib/constants";

interface Docente {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  dni?: string;
  email?: string;
  departamento?: string;
  categoria?: string;
  condicion?: string;
  estado?: string;
}

export default function GestionDocentesPage() {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos los departamentos");
  const [filterEstado, setFilterEstado] = useState("Todos los estados");

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    // In a real scenario, API should handle authorization headers
    fetch("/api/docentes", {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => res.json())
      .then((data) => {
        const docList = Array.isArray(data) ? data : data.docentes || [];
        // Sort alphabetically by last name for better UX
        docList.sort((a: Docente, b: Docente) => a.apellidos.localeCompare(b.apellidos));
        setDocentes(docList);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching docentes:", err);
        setLoading(false);
      });
  }, []);

  // Compute unique departments for filter dropdown
  const uniqueDeptos = Array.from(new Set(docentes.map(d => d.departamento).filter(Boolean))) as string[];
  const uniqueEstados = Array.from(new Set(docentes.map(d => d.estado || "Activo"))) as string[];

  // Filter logic
  const filteredDocentes = docentes.filter(d => {
    const matchesSearch = 
      (d.nombres + " " + d.apellidos).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.codigo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.dni || "").includes(searchQuery) ||
      (d.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepto = filterDepto === "Todos los departamentos" || d.departamento === filterDepto;
    const matchesEstado = filterEstado === "Todos los estados" || (d.estado || "Activo") === filterEstado;

    return matchesSearch && matchesDepto && matchesEstado;
  });

  // KPI Calculations
  const totalRegistrados = docentes.length;
  const activos = docentes.filter(d => (d.estado || "Activo") === "Activo").length;
  // Biometria and Pendientes are placeholders since API doesn't provide biometry status yet
  const biometriaRegistrada = 0; 
  const pendientes = totalRegistrados - biometriaRegistrada;

  const handleDelete = (index: number) => {
    const updated = [...docentes];
    updated.splice(index, 1);
    setDocentes(updated);
    toast.success("Docente eliminado del sistema correctamente.");
  };

  const handleDeactivate = (index: number) => {
    const updated = [...docentes];
    updated[index] = { ...updated[index], estado: "Inactivo" };
    setDocentes(updated);
    toast.warning("La cuenta del docente ha sido desactivada.");
  };

  const handleSave = () => {
    setIsModalOpen(false);
    toast.success("Nuevo docente registrado exitosamente.");
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando padrón docente...</div>;
  }

  return (
    <DashboardLayout user={MOCK_ADMIN} active="docentes">
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Administración</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Académica</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Gestión de docentes
            </h1>
            <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
               Datos del servidor
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Administre el registro, actualización, estado y control biométrico de los docentes institucionales.
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Nuevo docente
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Docentes registrados</p>
                <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{totalRegistrados}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Total del padrón docente</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Docentes activos</p>
                <h3 className="text-3xl font-black text-green-500 leading-none mb-1.5">{activos}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-green-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Disponibles para asistencia</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Biometría registrada</p>
                <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{biometriaRegistrada}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-amber-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Docentes con huella activa</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500"></div>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Pendientes</p>
                <h3 className="text-3xl font-black text-red-500 leading-none mb-1.5">{pendientes}</h3>
              </div>
              <div className="w-8 h-8 rounded-lg bg-black text-red-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-500 leading-snug">Requieren regularización</p>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-500"></div>
        </Card>
      </div>

      {/* Filtros de Busqueda */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Búsqueda y filtros</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Localice docentes por nombre, código, DNI, correo, departamento o estado.</p>
          </div>
          <div className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm">
            {filteredDocentes.length} resultado(s)
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
             <div className="flex-1 relative">
                <svg className="w-4 h-4 absolute left-3 top-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input 
                  type="text" 
                  placeholder="Buscar por nombre, DNI, correo o código" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" 
                />
             </div>
             <div className="w-full md:w-64">
                <select 
                  value={filterDepto}
                  onChange={(e) => setFilterDepto(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                >
                  <option>Todos los departamentos</option>
                  {uniqueDeptos.map(d => <option key={d}>{d}</option>)}
                </select>
             </div>
             <div className="w-full md:w-48">
                <select 
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm"
                >
                  <option>Todos los estados</option>
                  {uniqueEstados.map(e => <option key={e}>{e}</option>)}
                </select>
             </div>
             <Button 
                variant="outline" 
                onClick={() => { setSearchQuery(""); setFilterDepto("Todos los departamentos"); setFilterEstado("Todos los estados"); }}
                className="text-xs font-bold px-5 h-10 border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 shrink-0"
             >
                Limpiar
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listado de Docentes Table */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900">Listado de docentes</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{totalRegistrados} docente(s) registrados en el servidor.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="h-9 px-4 text-[10px] font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Registrar docente
          </Button>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[11px]">
            {/* Solid black header mimicking the screenshot redaction/style */}
            <thead className="bg-black">
              <tr>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocentes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No se encontraron docentes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredDocentes.map((d, idx) => {
                  const initials = `${d.nombres.charAt(0)}${d.apellidos.charAt(0)}`;
                  const code = d.codigo || `DOC-DEMO-00${idx + 1}`;
                  const email = d.email || `docente${idx + 1}@demo.unsaac.edu.pe`;
                  const dni = d.dni || `9100000${idx + 1}`;
                  const isActivo = (d.estado || "Activo") === "Activo";
                  
                  return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {/* Codigo */}
                    <td className="px-6 py-4 font-black text-blue-600 hover:underline cursor-pointer">
                      {code}<br/>{code}
                    </td>
                    
                    {/* Avatar & Persona */}
                    <td className="px-6 py-4 flex items-center gap-3 min-w-[250px]">
                       <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                         {initials}
                       </div>
                       <div>
                         <h4 className="text-xs font-black text-slate-900">{d.nombres} {d.apellidos}</h4>
                         <p className="text-[10px] font-semibold text-slate-500">{email}</p>
                         <p className="text-[10px] font-bold text-slate-800">{dni}</p>
                       </div>
                    </td>
                    
                    {/* DNI Extra column (based on screenshot alignment) */}
                    <td className="px-6 py-4 font-black text-slate-900">
                      {dni}
                    </td>

                    {/* Departamento & Categoria */}
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {d.departamento || "No asignado"}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {d.categoria || "Auxiliar"}
                    </td>

                    {/* Black pills placeholders for biometric / status indicators */}
                    <td className="px-6 py-4 flex items-center gap-2 mt-2">
                       <div className="h-6 w-12 bg-black rounded-full flex items-center justify-center text-[8px] font-bold text-white px-2 cursor-pointer hover:bg-slate-800 transition-colors">
                         Huella
                       </div>
                       <div className="h-6 w-12 bg-black rounded-full flex items-center justify-center text-[8px] font-bold text-white px-2 cursor-pointer hover:bg-slate-800 transition-colors">
                         {isActivo ? 'Activo' : 'Baja'}
                       </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-2">
                          <button onClick={() => toast.info("Visualizando perfil del docente")} className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[9px] font-black text-slate-500 hover:bg-slate-100 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Ver
                          </button>
                          <button onClick={() => toast.info("Editando datos del docente")} className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[9px] font-black text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            Editar
                          </button>
                          <button onClick={() => handleDeactivate(idx)} className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[9px] font-black text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Desactivar
                          </button>
                          <button onClick={() => handleDelete(idx)} className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[9px] font-black text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Eliminar
                          </button>
                       </div>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white p-6 shadow-2xl rounded-2xl border-none">
            <h2 className="text-xl font-black text-slate-900 mb-2">Registrar nuevo docente</h2>
            <p className="text-[11px] font-semibold text-slate-500 mb-6">Llene los datos básicos para inscribir a un nuevo docente en el padrón institucional.</p>
            <div className="space-y-4">
              <input type="text" placeholder="Código institucional" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
              <input type="text" placeholder="Nombres" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
              <input type="text" placeholder="Apellidos" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" />
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" className="text-xs font-bold shadow-sm" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm" onClick={handleSave}>Guardar registro</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}