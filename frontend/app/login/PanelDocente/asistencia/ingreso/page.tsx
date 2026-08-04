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

export default function AsistenciaIngresoPage() {
  const [ingresos, setIngresos] = useState<AsistenciaIngreso[]>([]);
  const [userName, setUserName] = useState("Docente Universitario");
  const [loading, setLoading] = useState(true);

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
            const arr = dataAsist.ingresos || [];
            // Sort by most recent
            arr.sort((a: any, b: any) => {
              const dtA = `${a.fecha.split("T")[0]}T${a.hora_registro}`;
              const dtB = `${b.fecha.split("T")[0]}T${b.hora_registro}`;
              return dtB.localeCompare(dtA);
            });
            setIngresos(arr);
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
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIngreso = ingresos.find(r => r.fecha.split("T")[0] === todayStr);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const ingresosDelMes = ingresos.filter(r => {
    const d = new Date(r.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const puntualesDelMes = ingresosDelMes.filter(r => r.estado === "PRESENTE" || r.estado === "PUNTUAL").length;
  const tardanzasDelMes = ingresosDelMes.filter(r => r.estado === "TARDANZA").length;

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse font-semibold">Cargando ingreso institucional...</div>;
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
                Registro de ingreso institucional
              </h1>
              <span className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-200 shadow-sm flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                 Marcacion desde app movil
              </span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">
              Consulte el estado de su ingreso diario y las marcaciones institucionales sincronizadas desde la aplicacion movil.
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
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Estado del dia</p>
              <h3 className="text-2xl font-black text-blue-600 leading-none mb-1.5">{todayIngreso ? "Marcado" : "Sin registro"}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">
                {todayIngreso ? "Ingreso institucional sincronizado con exito." : "Aun no existe una marcacion sincronizada hoy."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Hora registrada</p>
              <h3 className="text-3xl font-black text-blue-600 leading-none mb-1.5">{todayIngreso ? formatTimeShort(todayIngreso.hora_registro) : "--:--"}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Hora guardada en el registro institucional.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-green-50 rounded-xl border border-green-100 flex items-center justify-center text-green-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Ingresos del mes</p>
              <h3 className="text-3xl font-black text-green-600 leading-none mb-1.5">{String(ingresosDelMes.length).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">{puntualesDelMes} registro(s) puntual(es).</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 shrink-0 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-center text-amber-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <p className="text-[11px] font-extrabold text-slate-800 mb-0.5">Tardanzas del mes</p>
              <h3 className="text-3xl font-black text-amber-500 leading-none mb-1.5">{String(tardanzasDelMes).padStart(2,'0')}</h3>
              <p className="text-[10px] font-bold text-slate-500 leading-snug">Registros clasificados como tardanza.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Validacion & Flujo */}
      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        
        {/* Validacion de ingreso */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-200 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Estado</p>
                <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Actual</p>
              </div>
              <h2 className="text-xl font-black text-slate-900">Validacion de ingreso</h2>
              <p className="text-xs font-semibold text-slate-500 mt-1">La web consulta el resultado; la captura biometrica se realiza de forma segura en la aplicacion movil.</p>
            </div>
            <div className={`text-[10px] font-black px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${todayIngreso ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${todayIngreso ? "bg-green-500" : "bg-slate-400"}`}></span>
              {todayIngreso ? "Completado" : "Sin registro"}
            </div>
          </div>
          <CardContent className="p-10 flex-1 flex flex-col items-center justify-center">
            
            <div className="relative mb-8">
               <div className="w-32 h-32 rounded-full border border-blue-100 bg-blue-50/50 flex items-center justify-center relative">
                 <div className="w-24 h-24 rounded-full border border-blue-100 bg-blue-50 flex items-center justify-center z-10">
                   <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                     {todayIngreso ? (
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                     ) : (
                       <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                     )}
                   </div>
                 </div>
               </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-3 text-center">
              {todayIngreso ? "Ingreso institucional completado" : "Ingreso pendiente de sincronizacion"}
            </h3>
            <p className="text-xs font-semibold text-slate-500 text-center max-w-md leading-relaxed mb-8">
              {todayIngreso 
                ? `${userName}, su ingreso institucional para el dia de hoy fue registrado exitosamente a las ${formatTimeShort(todayIngreso.hora_registro)}.`
                : `${userName}, todavia no aparece un ingreso institucional para hoy. Realice la marcacion desde la aplicacion movil autorizada.`}
            </p>

            <div className="bg-blue-50/50 border border-blue-100 py-3 px-6 rounded-xl flex items-start gap-4">
               <div className="mt-0.5 shrink-0 text-blue-600">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-900 mb-0.5">Consulta protegida</p>
                 <p className="text-[9px] font-semibold text-slate-500 leading-snug">Esta pantalla no crea ni altera marcaciones.</p>
               </div>
            </div>

          </CardContent>
        </Card>

        {/* Flujo de marcacion */}
        <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Proceso</p>
              <p className="text-[9px] font-extrabold text-blue-600 uppercase tracking-widest">Seguro</p>
            </div>
            <h2 className="text-xl font-black text-slate-900">Flujo de marcacion</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1">Etapas requeridas para que un ingreso aparezca como registrado.</p>
          </div>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100 px-6">
                
                <div className="flex gap-4 py-6">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0">01</div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 mb-1">Dispositivo autorizado</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">La aplicacion comprueba que el telefono este vinculado a la cuenta docente.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 py-6">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0">02</div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 mb-1">Validacion biometrica</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">La identidad se valida localmente mediante la biometria protegida del dispositivo.</p>
                  </div>
                </div>

                <div className="flex gap-4 py-6">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0">03</div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 mb-1">Presencia institucional</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">Cuando corresponde, se valida la proximidad institucional configurada.</p>
                  </div>
                </div>

                <div className="flex gap-4 py-6">
                  <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0">04</div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 mb-1">Firma y sincronizacion</h4>
                    <p className="text-[10px] font-medium text-slate-500 leading-snug">La marcacion firmada se transmite al backend y luego aparece en este historial.</p>
                  </div>
                </div>

             </div>

             <div className="p-6 bg-amber-50/30 border-t border-slate-100 flex gap-4">
                <div className="text-orange-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 mb-0.5">Use la aplicacion movil</h4>
                  <p className="text-[10px] font-medium text-slate-600 leading-snug">La web funciona como consulta y seguimiento del registro confirmado.</p>
                </div>
             </div>
          </CardContent>
        </Card>

      </div>

      {/* Historial de ingresos table */}
      <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Historial de ingresos</h2>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Ultimos registros institucionales devueltos por el servidor para su cuenta.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1.5 rounded-full border border-blue-100">
            {ingresos.length} registro(s)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Hora</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest text-center">Estado</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 font-extrabold text-slate-500 uppercase tracking-widest">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ingresos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500 font-semibold text-sm">
                    No hay ingresos institucionales registrados.
                  </td>
                </tr>
              ) : (
                ingresos.slice(0, 10).map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{formatDate(m.fecha)}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-center">{formatTimeShort(m.hora_registro)}</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-wide border ${m.estado === "TARDANZA" ? "bg-amber-50 text-amber-700 border-amber-200" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${m.estado === "TARDANZA" ? "bg-amber-500" : m.estado === "PRESENTE" || m.estado === "PUNTUAL" ? "bg-green-500" : "bg-red-500"}`}></span>
                         {m.estado === "PUNTUAL" || m.estado === "PRESENTE" ? "Puntual" : m.estado.charAt(0).toUpperCase() + m.estado.slice(1).toLowerCase()}
                       </span>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-700">Ingreso institucional</td>
                    <td className="px-6 py-4 font-semibold text-slate-500">Sistema institucional</td>
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
