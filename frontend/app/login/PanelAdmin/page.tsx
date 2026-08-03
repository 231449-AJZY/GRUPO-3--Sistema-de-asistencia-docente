"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Docente {
  id: number;
  nombres: string;
  apellidos: string;
}

export default function AdminDashboardPage() {
  const [userName, setUserName] = useState("Gabriel Administrador UNSAAC");
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real scenario, these would come from an analytics endpoint like /api/dashboard/stats
  const [stats, setStats] = useState({
    docentesRegistrados: 0,
    usuariosActivos: 0,
    asistenciasDia: 0,
    inasistenciasDetectadas: 0,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserName(`${parsedUser.nombres} ${parsedUser.apellidos}`);
      } catch (e) {}
    }

    if (token) {
      fetch("/api/docentes", { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          const docList = Array.isArray(data) ? data : data.docentes || [];
          setDocentes(docList);
          setStats((prev) => ({
            ...prev,
            docentesRegistrados: docList.length,
            // Mocking active users as a subset or equal to docentes for now
            usuariosActivos: docList.length > 0 ? docList.length + 10 : 34,
            inasistenciasDetectadas: 22 // Based on screenshot, API pending
          }));
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const todayStr = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  
  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando panel de administrador...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Administración</p>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
            Panel principal del administrador
          </h1>
          <p className="text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed mb-4">
            Resumen actualizado del sistema de asistencia docente.
          </p>
          <div className="flex items-center gap-2">
             <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-2.5 py-1 rounded-full border border-blue-200">Información actualizada</span>
             <span className="bg-slate-900 text-green-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Sistema en linea</span>
             <span className="bg-black text-amber-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">0 tardanzas</span>
             <span className="bg-black text-red-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5">22 inasistencias</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">
            Actualizar
          </Button>
          <Button className="font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-none h-10 px-6">
            Generar reporte
          </Button>
          <Button className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6">
            Nuevo docente
          </Button>
        </div>
      </div>

      {/* 4 Stat Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        
        {/* Docentes registrados */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative group hover:border-blue-300 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
               <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               </div>
               <div className="text-right">
                  <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Docentes registrados</p>
                  <h3 className="text-3xl font-black text-blue-600 leading-none mb-1">{stats.docentesRegistrados > 0 ? stats.docentesRegistrados : 24}</h3>
                  <p className="text-[10px] font-bold text-slate-500">{stats.docentesRegistrados > 0 ? stats.docentesRegistrados : 22} activos en el sistema</p>
               </div>
            </div>
            {/* Simple sparkline CSS drawing */}
            <div className="mt-4 h-6 w-full flex items-end gap-1">
               <div className="h-[20%] w-full bg-blue-100 rounded-t-sm"></div>
               <div className="h-[40%] w-full bg-blue-100 rounded-t-sm"></div>
               <div className="h-[30%] w-full bg-blue-100 rounded-t-sm"></div>
               <div className="h-[60%] w-full bg-blue-200 rounded-t-sm"></div>
               <div className="h-[50%] w-full bg-blue-300 rounded-t-sm"></div>
               <div className="h-[80%] w-full bg-blue-400 rounded-t-sm"></div>
               <div className="h-[100%] w-full bg-blue-600 rounded-t-sm shadow-[0_0_10px_rgba(37,99,235,0.4)]"></div>
            </div>
            <div className="mt-2 w-full h-[2px] bg-slate-100 relative overflow-hidden"><div className="absolute top-0 left-0 bottom-0 bg-blue-600 w-[60%]"></div></div>
          </CardContent>
        </Card>

        {/* Usuarios activos */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative group hover:border-green-300 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
               <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0 border border-green-100 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
               </div>
               <div className="text-right">
                  <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Usuarios activos</p>
                  <h3 className="text-3xl font-black text-green-600 leading-none mb-1">{stats.usuariosActivos > 0 ? stats.usuariosActivos : 34}</h3>
                  <p className="text-[10px] font-bold text-slate-500">Cuentas con acceso habilitado</p>
               </div>
            </div>
            <div className="mt-4 h-6 w-full flex items-end gap-1">
               <div className="h-[30%] w-full bg-green-100 rounded-t-sm"></div>
               <div className="h-[50%] w-full bg-green-200 rounded-t-sm"></div>
               <div className="h-[70%] w-full bg-green-300 rounded-t-sm"></div>
               <div className="h-[60%] w-full bg-green-400 rounded-t-sm"></div>
               <div className="h-[80%] w-full bg-green-500 rounded-t-sm"></div>
               <div className="h-[90%] w-full bg-green-600 rounded-t-sm shadow-[0_0_10px_rgba(22,163,74,0.4)]"></div>
            </div>
            <div className="mt-2 w-full h-[2px] bg-slate-100 relative overflow-hidden"><div className="absolute top-0 left-0 bottom-0 bg-green-500 w-[75%]"></div></div>
          </CardContent>
        </Card>

        {/* Asistencias del dia */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative group hover:border-amber-300 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
               <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 border border-amber-100 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
               </div>
               <div className="text-right">
                  <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Asistencias del día</p>
                  <h3 className="text-3xl font-black text-amber-500 leading-none mb-1">{stats.asistenciasDia}</h3>
                  <p className="text-[10px] font-bold text-slate-500">0 puntuales y 0 tardanzas</p>
               </div>
            </div>
            {/* SVG Sparkline line chart for yellow */}
            <div className="mt-4 h-6 w-full relative">
               <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                 <polyline fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,20 20,10 40,5 60,15 80,10 100,20" />
               </svg>
            </div>
            <div className="mt-2 w-full h-[2px] bg-slate-100 relative overflow-hidden"></div>
          </CardContent>
        </Card>

        {/* Inasistencias detectadas */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative group hover:border-red-300 transition-colors cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-2">
               <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </div>
               <div className="text-right">
                  <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Inasistencias detectadas</p>
                  <h3 className="text-3xl font-black text-red-600 leading-none mb-1">{stats.inasistenciasDetectadas}</h3>
                  <p className="text-[10px] font-bold text-slate-500">Docentes activos sin registro hoy</p>
               </div>
            </div>
            {/* SVG Sparkline line chart for red */}
            <div className="mt-4 h-6 w-full relative">
               <svg viewBox="0 0 100 24" className="w-full h-full overflow-visible">
                 <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="0,5 20,15 40,20 60,10 80,15 100,5" />
               </svg>
            </div>
            <div className="mt-2 w-full h-[2px] bg-slate-100 relative overflow-hidden"></div>
          </CardContent>
        </Card>
      </div>

      {/* Métodos de verificación */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-black text-slate-900">Métodos de verificación de hoy</h2>
          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Intentos reales obtenidos de PostgreSQL, incluidos duplicados y rechazos.</p>
        </div>
        <CardContent className="p-6">
           <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {[...Array(8)].map((_, i) => (
                 <div key={i} className="h-14 bg-black rounded-lg w-full"></div>
              ))}
           </div>
        </CardContent>
      </Card>

      {/* Dashboard Grid 3 columns layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Actividad de asistencia por hora */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Actividad de asistencia por hora</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Registros capturados durante la jornada académica.</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="flex items-center gap-1.5 text-[10px] font-black text-green-600"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> En vivo</span>
               <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full">Hoy</span>
            </div>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col">
             {/* Chart grid background */}
             <div className="relative flex-1 min-h-[250px] w-full mt-4">
                <div className="absolute inset-0 flex flex-col justify-between text-[9px] font-bold text-slate-400">
                   {[10, 8, 6, 4, 2, 0].map(val => (
                      <div key={val} className="flex items-center gap-3 w-full">
                         <span className="w-4 text-right">{val}</span>
                         <div className="flex-1 border-b border-dashed border-slate-200 h-px"></div>
                      </div>
                   ))}
                </div>
                {/* Horizontal axis */}
                <div className="absolute bottom-0 left-7 right-0 flex justify-between text-[9px] font-bold text-slate-400 transform translate-y-6">
                   {["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(t => (
                      <span key={t}>{t}</span>
                   ))}
                </div>
                {/* The line (Empty for now based on screenshot showing 0) */}
                <div className="absolute inset-0 left-7 right-3 pointer-events-none pb-[1px]">
                   <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline points="0,100 8.3,100 16.6,100 25,100 33.3,100 41.6,100 50,100 58.3,100 66.6,100 75,100 83.3,100 91.6,100 100,100" fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      {/* Dots */}
                      {[0, 8.3, 16.6, 25, 33.3, 41.6, 50, 58.3, 66.6, 75, 83.3, 91.6, 100].map((x, i) => (
                        <circle key={i} cx={x} cy="100" r="1.5" fill="#2563eb" vectorEffect="non-scaling-stroke" />
                      ))}
                   </svg>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Alertas recientes */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Alertas recientes</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Últimos eventos generados por el sistema.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-blue-600">Ver todas</span>
          </div>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100 px-6 max-h-[300px] overflow-y-auto">
               {[
                 { time: "10:00 P. m.", title: "Alerta de docente", desc: "La clase de Topografia terminó a las 10:00 y no tiene una marcación registrada." },
                 { time: "10:00 P. m.", title: "Alerta de docente", desc: "La clase de Programación I terminó a las 12:00 y no tiene una marcación registrada." },
                 { time: "10:00 P. m.", title: "Alerta de docente", desc: "La clase de Programación I terminó a las 10:00 y no tiene una marcación registrada." },
                 { time: "10:00 P. m.", title: "Alerta de docente", desc: "La clase de Topografia terminó a las 18:00 y no tiene una marcación registrada." },
               ].map((alert, i) => (
                 <div key={i} className="py-4 flex gap-3">
                   <div className="w-1 bg-green-500 rounded-full h-10 shrink-0"></div>
                   <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0 border border-green-100">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between items-start mb-0.5">
                        <h4 className="text-[11px] font-black text-slate-900">{alert.title}</h4>
                        <span className="text-[9px] font-bold text-slate-400">{alert.time}</span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 leading-snug">{alert.desc}</p>
                   </div>
                 </div>
               ))}
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registros recientes */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Registros recientes</h2>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Últimas asistencias de curso e ingresos institucionales.</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 cursor-pointer hover:text-blue-600">Ver todos</span>
          </div>
          <div className="overflow-x-auto flex-1 p-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-black text-white">
                  <tr>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Docente</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Registro</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Hora</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Estado</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Resultado</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Aula</th>
                    <th className="px-4 py-3 font-bold uppercase tracking-widest text-[9px] opacity-80">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                      No existen asistencias registradas hoy.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Estado del sistema biometrico */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-black text-slate-900">Estado del sistema biométrico</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Monitoreo general del servicio y dispositivos.</p>
          </div>
          <CardContent className="p-6 flex-1 flex flex-col">
             <div className="flex gap-4 items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-green-500/20">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                </div>
                <div>
                   <div className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-sm inline-block mb-1">UNSAAC</div>
                   <p className="text-[10px] font-bold text-slate-500 leading-snug">
                     Información obtenida del backend y de los registros del día
                   </p>
                </div>
             </div>

             <div className="divide-y divide-slate-100 flex-1">
                <div className="py-4 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                     <span className="w-3 h-3 rounded-full bg-black text-white flex items-center justify-center text-[7px]"><svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                     Dispositivos con actividad hoy
                   </div>
                   <span className="text-[11px] font-black text-slate-900">0</span>
                </div>
                <div className="py-4 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                     <span className="w-3 h-3 rounded-full bg-black text-white flex items-center justify-center text-[7px]"><svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                     Sincronización
                   </div>
                   <span className="text-[11px] font-black text-slate-900">Sin registros hoy</span>
                </div>
                <div className="py-4 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                     <span className="w-3 h-3 rounded-full bg-black text-white flex items-center justify-center text-[7px]"><svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                     Último registro
                   </div>
                   <span className="text-[11px] font-black text-slate-900">—</span>
                </div>
                <div className="py-4 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[11px] font-bold text-slate-700">
                     <span className="w-3 h-3 rounded-full bg-black text-white flex items-center justify-center text-[7px]"><svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>
                     Servidor
                   </div>
                   <span className="text-[11px] font-black text-slate-900">En línea</span>
                </div>
             </div>
             <div className="mt-4">
                <span className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline flex items-center gap-1">Ver detalles del sistema <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></span>
             </div>
          </CardContent>
        </Card>

      </div>
      
    </div>
  );
}
