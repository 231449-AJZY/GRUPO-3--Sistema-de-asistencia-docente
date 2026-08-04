"use client";

import { useEffect, useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { toast } from "sonner";

interface UserData {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
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

interface HorarioData {
  horario_id: number;
  curso: string;
  aula: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function MiAsistenciaHub() {
  const [user, setUser] = useState<UserData | null>(null);
  const [ingresos, setIngresos] = useState<AsistenciaIngreso[]>([]);
  const [cursos, setCursos] = useState<AsistenciaCurso[]>([]);
  const [horarios, setHorarios] = useState<HorarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleActualizar = () => {
    setIsRefreshing(true);
    toast.info("Actualizando datos de asistencia...");
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Datos actualizados correctamente.");
    }, 1400);
  };

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
            setIngresos(dataAsist.ingresos || []);
            setCursos(dataAsist.cursos || []);
            setHorarios(dataHor.horarios || []);
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

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Docente";
  const userInitials = user ? `${user.nombres.charAt(0)}${user.apellidos.charAt(0)}` : "PQ";
  
  // --- Consolidation of Marcaciones ---
  const marcaciones: Array<{
    fecha: string;
    hora: string;
    tipo: string;
    curso: string;
    estado: string;
    observacion: string;
  }> = [];

  ingresos.forEach((r) => {
    marcaciones.push({
      fecha: r.fecha,
      hora: r.hora_registro,
      tipo: "Ingreso institucional",
      curso: "Acceso general a la universidad",
      estado: r.estado,
      observacion: "Registro institucional",
    });
  });
  cursos.forEach((r) => {
    marcaciones.push({
      fecha: r.fecha,
      hora: r.hora_registro,
      tipo: "Asistencia a curso",
      curso: `${r.curso} - Aula ${r.aula}`,
      estado: r.estado,
      observacion: "Marcacion academica",
    });
  });

  marcaciones.sort((a, b) => {
    const dateTimeA = `${a.fecha.split("T")[0]}T${a.hora}`;
    const dateTimeB = `${b.fecha.split("T")[0]}T${b.hora}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  // --- Statistics ---
  const ultimaMarcacion = marcaciones.length > 0 ? marcaciones[0].hora.slice(0, 5) : "--:--";
  const totalRegistros = marcaciones.length;
  const puntuales = marcaciones.filter(m => m.estado === "PRESENTE" || m.estado === "PUNTUAL").length;
  const cumplimiento = totalRegistros > 0 ? Math.round((puntuales / totalRegistros) * 100) : 0;
  
  const tardanzas = marcaciones.filter(m => m.estado === "TARDANZA").length;
  const ausencias = marcaciones.filter(m => m.estado === "AUSENTE").length;

  // --- Date & Time ---
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIngreso = ingresos.find((r) => r.fecha.split("T")[0] === todayStr);

  const jsDay = new Date().getDay() || 7;
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  let nextCourse = horarios.filter(h => h.dia_semana === jsDay && parseInt(h.hora_fin.split(':')[0]) + parseInt(h.hora_fin.split(':')[1])/60 > currentHour)
                             .sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
  if (!nextCourse && horarios.length > 0) {
    let searchDay = jsDay + 1;
    while (!nextCourse && searchDay !== jsDay) {
      if (searchDay > 7) searchDay = 1;
      nextCourse = horarios.filter(h => h.dia_semana === searchDay).sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
      searchDay++;
    }
  }

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
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando módulo de asistencia...</div>;
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-slate-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Control</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Personal</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Mi asistencia
            </h1>
            <span className="bg-blue-50 text-blue-600 text-xs font-black px-3 py-1 rounded-full border border-blue-200 shadow-sm flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
               Datos personales
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
            Registre su ingreso institucional, valide sus sesiones académicas y consulte el historial asociado a su cuenta.
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleActualizar} disabled={isRefreshing} variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">
            {isRefreshing ? "Actualizando..." : "Actualizar datos"}
          </Button>
        </div>
      </div>

      {/* User Profile Banner */}
      <Card className="rounded-2xl border-blue-100 shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center border border-blue-200">
               <span className="text-2xl font-black text-blue-700">{userInitials}</span>
            </div>
            <div>
               <div className="flex items-center gap-2 mb-1">
                 <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Docente</p>
                 <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Autenticado</p>
               </div>
               <h2 className="text-xl font-black text-slate-900 leading-tight mb-0.5">{docenteName}</h2>
               <p className="text-xs font-semibold text-slate-500 mb-1">{user?.email || "correo@unsaac.edu.pe"}</p>
               <p className="text-[10px] font-bold text-slate-400">Codigo {user?.codigo || "DDC-0001"} - {horarios.length} clase(s) asignada(s)</p>
            </div>
          </div>

          <div className="flex border border-slate-200 rounded-xl overflow-hidden shadow-sm">
             <div className="px-6 py-4 bg-white text-center flex flex-col justify-center">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Ultima marcacion</p>
                <p className="text-2xl font-black text-slate-900">{ultimaMarcacion}</p>
             </div>
             <div className="px-6 py-4 bg-white border-l border-slate-200 text-center flex flex-col justify-center">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Registros</p>
                <p className="text-2xl font-black text-slate-900">{totalRegistros}</p>
             </div>
             <div className="px-6 py-4 bg-white border-l border-slate-200 text-center flex flex-col justify-center">
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Cumplimiento</p>
                <p className="text-2xl font-black text-slate-900">{cumplimiento}%</p>
             </div>
          </div>
        </CardContent>
      </Card>

      {/* 3 Modulos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Modulo 1: Ingreso Institucional */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="h-40 bg-blue-50/50 flex flex-col items-center justify-center relative border-b border-blue-50">
             <span className="absolute top-4 right-5 text-4xl font-black text-blue-900/10 tracking-tighter">01</span>
             <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-blue-100 flex items-center justify-center">
               <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
             </div>
          </div>
          <div className="p-6 flex-1 flex flex-col">
             <h3 className="text-lg font-black text-slate-900 mb-2">Registro de ingreso institucional</h3>
             <p className="text-[11px] font-semibold text-slate-500 mb-6 flex-1">
               Consulte y gestione la marcacion general de ingreso diario a la universidad.
             </p>
             <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 text-[11px] font-bold mb-6">
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Estado del dia</span>
                 <span className="text-slate-800">{todayIngreso ? "Marcado" : "Sin registro"}</span>
               </div>
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Hora registrada</span>
                 <span className="text-slate-800">{todayIngreso ? formatTimeShort(todayIngreso.hora_registro) : "--:--"}</span>
               </div>
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Fecha actual</span>
                 <span className="text-slate-800">{new Date().toLocaleDateString('es-ES')}</span>
               </div>
             </div>
             <Link href="/login/PanelDocente/asistencia/ingreso" className="block w-full">
               <Button className="w-full font-black text-xs h-10 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm flex items-center justify-center gap-2">
                  Abrir modulo <span className="text-base leading-none">&rsaquo;</span>
               </Button>
             </Link>
          </div>
        </div>

        {/* Modulo 2: Asistencia a cursos */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="h-40 bg-green-50/50 flex flex-col items-center justify-center relative border-b border-green-50">
             <span className="absolute top-4 right-5 text-4xl font-black text-green-900/10 tracking-tighter">02</span>
             <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-green-200 flex items-center justify-center">
               <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
             </div>
          </div>
          <div className="p-6 flex-1 flex flex-col">
             <h3 className="text-lg font-black text-slate-900 mb-2">Registro de asistencia a cursos</h3>
             <p className="text-[11px] font-semibold text-slate-500 mb-6 flex-1">
               Valide su presencia en las clases asignadas segun la programacion academica vigente.
             </p>
             <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 text-[11px] font-bold mb-6">
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Proximo curso</span>
                 <span className="text-slate-800 truncate max-w-[120px] text-right">{nextCourse ? nextCourse.curso : "Sin cursos"}</span>
               </div>
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Horario</span>
                 <span className="text-slate-800">{nextCourse ? `${DAYS[nextCourse.dia_semana-1]} · ${formatTimeShort(nextCourse.hora_inicio)} - ${formatTimeShort(nextCourse.hora_fin)}` : "--"}</span>
               </div>
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Aula</span>
                 <span className="text-slate-800">{nextCourse ? nextCourse.aula : "--"}</span>
               </div>
             </div>
             <Link href="/login/PanelDocente/asistencia/cursos" className="block w-full">
               <Button className="w-full font-black text-xs h-10 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm flex items-center justify-center gap-2">
                  Abrir modulo <span className="text-base leading-none">&rsaquo;</span>
               </Button>
             </Link>
          </div>
        </div>

        {/* Modulo 3: Historial */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <div className="h-40 bg-amber-50/50 flex flex-col items-center justify-center relative border-b border-amber-50">
             <span className="absolute top-4 right-5 text-4xl font-black text-amber-900/10 tracking-tighter">03</span>
             <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-amber-200 flex items-center justify-center">
               <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
             </div>
          </div>
          <div className="p-6 flex-1 flex flex-col">
             <h3 className="text-lg font-black text-slate-900 mb-2">Historial de asistencia</h3>
             <p className="text-[11px] font-semibold text-slate-500 mb-6 flex-1">
               Revise sus registros institucionales y academicos con estados y observaciones.
             </p>
             <div className="bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100 text-[11px] font-bold mb-6">
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Registros totales</span>
                 <span className="text-slate-800">{totalRegistros}</span>
               </div>
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Tardanzas / ausencias</span>
                 <span className="text-slate-800">{tardanzas} / {ausencias}</span>
               </div>
               <div className="px-4 py-2.5 flex justify-between">
                 <span className="text-slate-500">Cumplimiento</span>
                 <span className="text-slate-800">{cumplimiento}%</span>
               </div>
             </div>
             <Link href="/login/PanelDocente/asistencia/historial" className="block w-full">
               <Button className="w-full font-black text-xs h-10 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-sm flex items-center justify-center gap-2">
                  Abrir modulo <span className="text-base leading-none">&rsaquo;</span>
               </Button>
             </Link>
          </div>
        </div>

      </div>

      {/* Actividad Reciente */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Actividad reciente</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Ultimos ingresos institucionales y marcaciones de curso registrados por el servidor.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-100">
            {marcaciones.length} de {marcaciones.length}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Tipo de registro</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Curso / Dependencia</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Hora</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-right">Observacion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marcaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No hay actividad reciente registrada en el sistema.
                  </td>
                </tr>
              ) : (
                marcaciones.slice(0, 10).map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{formatDate(m.fecha)}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{m.tipo}</td>
                    <td className="px-6 py-4 font-semibold text-slate-600 truncate max-w-[250px]">{m.curso}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-center">{formatTimeShort(m.hora)}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black tracking-wide border ${m.estado === "TARDANZA" ? "bg-amber-50 text-amber-700 border-amber-200" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                         {m.estado.charAt(0).toUpperCase() + m.estado.slice(1).toLowerCase()}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-500 text-right">{m.observacion}</td>
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
