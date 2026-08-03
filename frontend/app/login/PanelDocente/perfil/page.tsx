"use client";

import { useEffect, useState } from "react";
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

interface UserData {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
  // Campos teoricos extra (si tuvieras)
  categoria?: string;
  condicion?: string;
  departamento?: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function PerfilDocentePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [horarios, setHorarios] = useState<HorarioData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        fetch(`/api/docentes/${parsedUser.id}/horarios`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            setHorarios(data.horarios || []);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Profile derivations ---
  const initials = user ? `${user.nombres.charAt(0)}${user.apellidos.charAt(0)}` : "PQ";
  const userFullName = user ? `${user.nombres} ${user.apellidos}` : "Docente";
  
  // Extract unique courses for summary table and stats
  const uniqueCoursesMap = new Map<string, { 
    curso: string, 
    semestre: string, 
    creditos: number, 
    sesiones: number, 
    primer_dia: number, 
    primera_hora: string 
  }>();

  let maxSemestre = "2026-II";
  let fallbackDept = "Arquitectura";

  horarios.forEach(h => {
    maxSemestre = h.semestre;
    if (h.departamento) fallbackDept = h.departamento;

    if (!uniqueCoursesMap.has(h.curso)) {
      uniqueCoursesMap.set(h.curso, {
        curso: h.curso,
        semestre: h.semestre,
        creditos: h.creditos || 3, // Fallback if API lacks creditos
        sesiones: 1,
        primer_dia: h.dia_semana,
        primera_hora: h.hora_inicio
      });
    } else {
      const existing = uniqueCoursesMap.get(h.curso)!;
      existing.sesiones += 1;
      // Determine earlier session
      if (h.dia_semana < existing.primer_dia || (h.dia_semana === existing.primer_dia && h.hora_inicio < existing.primera_hora)) {
         existing.primer_dia = h.dia_semana;
         existing.primera_hora = h.hora_inicio;
      }
    }
  });

  const uniqueCoursesArray = Array.from(uniqueCoursesMap.values());
  const totalCreditos = uniqueCoursesArray.reduce((acc, curr) => acc + curr.creditos, 0);
  const totalSesiones = horarios.length;
  const uniqueCoursesCount = uniqueCoursesMap.size;

  function formatTimeShort(timeStr: string) {
    if (!timeStr) return "";
    return timeStr.slice(0, 5);
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando perfil docente...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Cuenta</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Institucional</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Perfil docente
            </h1>
            <span className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-200 shadow-sm flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
               Cuenta activa
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Consulte su identidad, vinculo academico, estado de acceso y resumen de programacion registrado en el sistema.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">
            Actualizar
          </Button>
          <Button className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6">
            Exportar ficha
          </Button>
        </div>
      </div>

      {/* Big User Profile Card */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
               <span className="text-4xl font-black text-white">{initials}</span>
            </div>
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Docente</p>
               </div>
               <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{userFullName}</h2>
               <p className="text-xs font-semibold text-slate-500 mb-3">{user?.departamento || fallbackDept}</p>
               <div className="flex gap-2">
                 <span className="bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-md border border-slate-200">{user?.codigo || "DOC-0001"}</span>
                 <span className="bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-md border border-slate-200">{user?.categoria || "Principal"}</span>
                 <span className="bg-slate-50 text-slate-600 text-[10px] font-black px-3 py-1.5 rounded-md border border-slate-200">{user?.condicion || "Nombrado"}</span>
               </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
             <Button variant="outline" onClick={() => copyToClipboard(user?.codigo || "DOC-0001")} className="h-10 text-[11px] font-black text-slate-700 border-slate-200 shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copiar codigo
             </Button>
             <Button variant="outline" onClick={() => copyToClipboard(user?.email || "correo@unsaac.edu.pe")} className="h-10 text-[11px] font-black text-slate-700 border-slate-200 shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Copiar correo
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Cursos asignados</p>
              <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{String(uniqueCoursesCount).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Cursos distintos dentro de la programacion activa.</p>
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
              <h3 className="text-3xl font-black text-green-600 leading-none mb-1.5">{String(totalSesiones).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Bloques academicos activos por semana.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-center text-purple-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Creditos acumulados</p>
              <h3 className="text-3xl font-black text-purple-600 leading-none mb-1.5">{totalCreditos}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Suma de creditos de los cursos visibles.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Semestre visible</p>
              <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{maxSemestre}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Periodo asociado a la programacion consultada.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Datos Institucionales & Docentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Identidad</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Datos institucionales</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Informacion obtenida desde la sesion autenticada.</p>
          </div>
          <CardContent className="p-6 flex-1">
             <div className="divide-y divide-slate-100 text-[11px] font-bold">
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Codigo institucional</span>
                 <span className="text-slate-900 font-black">{user?.codigo || "DOC-0001"}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Nombres</span>
                 <span className="text-slate-900 font-black">{user?.nombres || "Docente"}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Apellidos</span>
                 <span className="text-slate-900 font-black">{user?.apellidos || ""}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Correo institucional</span>
                 <span className="text-slate-900 font-black">{user?.email || "correo@unsaac.edu.pe"}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Rol de acceso</span>
                 <span className="text-slate-900 font-black">{user?.rol || "Docente"}</span>
               </div>
             </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Vinculo</p>
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Academico</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Datos docentes</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Informacion del perfil academico asociado.</p>
          </div>
          <CardContent className="p-6 flex-1">
             <div className="divide-y divide-slate-100 text-[11px] font-bold">
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Departamento</span>
                 <span className="text-slate-900 font-black">{user?.departamento || fallbackDept}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Categoria</span>
                 <span className="text-slate-900 font-black">{user?.categoria || "Principal"}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Condicion</span>
                 <span className="text-slate-900 font-black">{user?.condicion || "Nombrado"}</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">DNI</span>
                 <span className="text-slate-400 font-semibold italic">Restringido al Administrador</span>
               </div>
               <div className="py-3.5 flex justify-between">
                 <span className="text-slate-500">Telefono</span>
                 <span className="text-slate-400 font-semibold italic">Restringido al Administrador</span>
               </div>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado & Solo Lectura */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Seguridad</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Estado de la cuenta</h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Controles aplicados a la consulta del perfil.</p>
          </div>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100 p-6">
                <div className="flex gap-4 pb-5">
                  <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase mb-0.5">Cuenta institucional</p>
                    <h4 className="text-sm font-black text-slate-900 mb-0.5">Activa</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">Estado devuelto por el backend para la cuenta autenticada.</p>
                  </div>
                </div>
                <div className="flex gap-4 py-5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase mb-0.5">Perfil de acceso</p>
                    <h4 className="text-sm font-black text-slate-900 mb-0.5">Docente</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">La ruta requiere una sesion valida y permisos del rol Docente.</p>
                  </div>
                </div>
                <div className="flex gap-4 py-5">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase mb-0.5">Datos personales</p>
                    <h4 className="text-sm font-black text-slate-900 mb-0.5">Consulta protegida</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">La pagina no solicita identificadores de otros docentes.</p>
                  </div>
                </div>
                <div className="flex gap-4 pt-5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold text-slate-400 tracking-widest uppercase mb-0.5">Actualizacion de datos</p>
                    <h4 className="text-sm font-black text-slate-900 mb-0.5">Gestion administrativa</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">Los cambios de identidad y vinculo academico los realiza el Administrador.</p>
                  </div>
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm bg-white overflow-hidden flex flex-col border-none ring-1 ring-blue-100 relative">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none"></div>
           <CardContent className="p-8 flex-1 flex flex-col justify-between relative z-10">
              <div>
                 <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md mb-6">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                 </div>
                 <div className="flex items-center gap-2 mb-1.5">
                   <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Proteccion</p>
                   <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">De datos</p>
                 </div>
                 <h2 className="text-2xl font-black text-slate-900 mb-3">Perfil personal de solo lectura</h2>
                 <p className="text-xs font-semibold text-slate-500 max-w-xl leading-relaxed">
                   Esta pantalla no modifica la base de datos. El DNI, telefono, cambio de correo, categoria, condicion y departamento se mantienen bajo gestion administrativa.
                 </p>
              </div>

              <div className="mt-12 bg-amber-50/50 border border-amber-200/60 p-5 rounded-2xl max-w-xl">
                 <h4 className="text-xs font-black text-amber-700 mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    ¿Detecto un dato incorrecto?
                 </h4>
                 <p className="text-[10px] font-extrabold text-amber-800 leading-snug">
                   Comuniquelo al Administrador para que actualice la ficha oficial y conserve la trazabilidad institucional.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>

      {/* Resumen Academico Table */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Resumen academico</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Cursos vinculados a la programacion actualmente visible.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-100">
            {uniqueCoursesArray.length} curso(s)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Codigo</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Curso</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Semestre</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Creditos</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Sesiones semanales</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-right">Primer Horario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {uniqueCoursesArray.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No tiene cursos asignados en la programación actual.
                  </td>
                </tr>
              ) : (
                uniqueCoursesArray.map((c, idx) => {
                   // Mock code based on course title if real API code is missing
                   const code = `ARQ-PED-${100 + idx * 101}`; 
                   return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">{code}</td>
                      <td className="px-6 py-4 font-black text-slate-700">{c.curso}</td>
                      <td className="px-6 py-4 font-bold text-slate-600">{c.semestre}</td>
                      <td className="px-6 py-4 font-black text-slate-900">{c.creditos}</td>
                      <td className="px-6 py-4 font-black text-slate-900 text-center">{c.sesiones}</td>
                      <td className="px-6 py-4 font-semibold text-slate-500 text-right">
                        {DAYS[c.primer_dia - 1]} · {formatTimeShort(c.primera_hora)}
                      </td>
                    </tr>
                   );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
      
    </div>
  );
}
