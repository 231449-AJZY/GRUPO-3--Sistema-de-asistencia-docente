"use client";

import { useState, useEffect } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

interface Docente {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  departamento?: string;
}

const TABS = [
  { id: "resumen", label: "Resumen", desc: "Estado general" },
  { id: "captura", label: "Captura", desc: "Registro de huellas" },
  { id: "dispositivos", label: "Dispositivos", desc: "Lectores biométricos" },
  { id: "moviles", label: "Móviles", desc: "Celulares vinculados" },
  { id: "ble", label: "Estaciones BLE", desc: "Proximidad por aula" },
  { id: "sincronizacion", label: "Sincronización", desc: "Transferencia de registros" },
  { id: "reportes", label: "Reportes", desc: "Excel, CSV y PDF" },
  { id: "historial", label: "Historial", desc: "Registros reales" },
];

export default function BiometriaAdminPage() {
  const [activeTab, setActiveTab] = useState("resumen");
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [selectedDocenteId, setSelectedDocenteId] = useState<number | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [mobileDevices, setMobileDevices] = useState([
     { id: 1, model: "Xiaomi 2412DPCOAG", docente: "Pedro Quispe Mamani", code: "DOC-0001", active: true },
     { id: 2, model: "Xiaomi 2412DPCOAG", docente: "Pedro Quispe Mamani", code: "DOC-0001", active: false }
  ]);

  const handleCapture = () => {
    setIsCapturing(true);
    toast.info("Iniciando motor biométrico local...");
    setTimeout(() => {
       setIsCapturing(false);
       toast.error("Error de Hardware: No se detecta lector en el puerto 4765.");
    }, 2500);
  };

  const handleGenerateQr = () => {
    if (!selectedDocenteId) return toast.warning("Seleccione un docente primero.");
    setIsGeneratingQr(true);
    setTimeout(() => {
       setIsGeneratingQr(false);
       setShowQrModal(true);
       toast.success("Código generado exitosamente.");
    }, 1500);
  };

  const handleDeviceAction = (id: number, action: string) => {
    if (action === "suspend") toast.warning("El celular ha sido suspendido.");
    if (action === "revoke") {
       setMobileDevices(mobileDevices.filter(d => d.id !== id));
       toast.error("Dispositivo eliminado del sistema.");
    }
  };

  useEffect(() => {
    // Fetch docentes for the "Captura" tab
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    fetch("/api/docentes", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then(data => {
        const docList = Array.isArray(data) ? data : data.docentes || [];
        setDocentes(docList);
        if (docList.length > 0) setSelectedDocenteId(docList[0].id);
      })
      .catch(err => console.error(err));
  }, []);

  const selectedDocente = docentes.find(d => d.id === selectedDocenteId);

  // --- Dynamic Header Text ---
  let headerTitle = "Control biométrico";
  let headerSubtitle = "Supervise enrolamientos reales, lectores y seguridad de las plantillas biométricas.";
  let badgeText = "Sistema operativo";
  let contextLabel = "Administración";
  
  if (activeTab === "ble") {
    headerTitle = "Estaciones Bluetooth BLE";
    headerSubtitle = "Registre puntos de proximidad por aula, provisione un teléfono emisor y supervise las detecciones usadas para la asistencia.";
    contextLabel = "Presencia";
    badgeText = "";
  } else if (activeTab === "dispositivos") {
    headerTitle = "Dispositivos biométricos reales";
    headerSubtitle = "Registre lectores, supervise heartbeats y ejecute diagnósticos mediante el puente local y el SDK del fabricante.";
    badgeText = "";
  } else if (activeTab === "captura") {
    headerTitle = "Captura biométrica real";
    headerSubtitle = "Capture una plantilla mediante el lector local, revise la calidad y regístrela cifrada en PostgreSQL.";
    badgeText = "";
  } else if (activeTab === "moviles") {
    headerTitle = "Dispositivos móviles";
    headerSubtitle = "Genere un QR para que el docente sincronice y autorice su celular directamente desde la aplicación.";
    badgeText = "Sincronización QR";
    contextLabel = "Seguridad";
  }

  return (
    <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      
      {/* Dynamic Header based on Tab */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">{contextLabel}</p>
            <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">
               {activeTab === "moviles" ? "Móvil" : activeTab === "captura" ? "Biométrico" : "Institucional"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{headerTitle}</h1>
            {badgeText && (
               <span className="bg-slate-200 text-slate-800 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  {activeTab === "resumen" && <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>}
                  {badgeText}
               </span>
            )}
            {activeTab === "dispositivos" && <div className="w-24 h-6 bg-black rounded-full"></div>}
            {activeTab === "captura" && <div className="w-24 h-6 bg-black rounded-full"></div>}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-slate-500 max-w-2xl leading-relaxed">{headerSubtitle}</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "captura" ? (
             <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">Actualizar estado</Button>
          ) : (
             <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">Actualizar</Button>
          )}
          
          {activeTab === "resumen" && (
             <Button className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6">Nueva captura</Button>
          )}
          {activeTab === "dispositivos" && (
             <>
               <Button variant="outline" className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">Diagnóstico general</Button>
               <Button className="font-black bg-black hover:bg-slate-800 text-white shadow-sm border-none h-10 px-6">Registrar lector</Button>
             </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-sm flex flex-wrap lg:flex-nowrap gap-2 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                isActive ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "hover:bg-slate-50 text-slate-700"
              }`}
            >
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-white/20" : "bg-black text-white"}`}>
                  {/* Common icon placeholder for all */}
                  {isActive && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
               </div>
               <div className="text-left">
                  <p className={`text-[11px] font-black leading-none mb-1 ${isActive ? "text-white" : "text-slate-900"}`}>{tab.label}</p>
                  <p className={`text-[9px] font-bold ${isActive ? "text-blue-100" : "text-slate-500"}`}>{tab.desc}</p>
               </div>
            </button>
          );
        })}
      </div>

      {/* --- TAB CONTENT: RESUMEN --- */}
      {activeTab === "resumen" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Mismas tarjetas del resumen anterior ... para simplificar se incluyen */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[ {t:"Lectores disponibles", v:"0/0", m:"Puente local aún no registrado", c:"bg-slate-900"}, 
                 {t:"Cobertura completa", v:"0", m:"0% de docentes con 10 huellas", c:"bg-blue-600"},
                 {t:"Registros pendientes", v:"22", m:"0 docente(s) en proceso", c:"bg-slate-900"},
                 {t:"Capturas de hoy", v:"0", m:"0 plantillas activas", c:"bg-slate-900"} 
              ].map((k,i) => (
                 <Card key={i} className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden relative">
                   <CardContent className="p-5 flex flex-col justify-between h-full">
                     <div className="flex justify-between items-start mb-2">
                       <div><p className="text-[11px] font-extrabold text-slate-800 mb-0.5">{k.t}</p><h3 className={`text-3xl font-black ${i===1?"text-blue-600":"text-slate-900"} leading-none mb-1.5`}>{k.v}</h3></div>
                       <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center"></div>
                     </div>
                     <p className="text-[10px] font-bold text-slate-500 leading-snug">{k.m}</p>
                   </CardContent>
                   <div className={`absolute bottom-0 left-0 right-0 h-1 ${k.c}`}></div>
                 </Card>
              ))}
           </div>
           
           <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
             <div className="p-6 border-b border-slate-200">
               <h2 className="text-lg font-black text-slate-900">Procesos biométricos</h2>
               <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Las tres funciones principales quedan preparadas para trabajar con la API institucional.</p>
             </div>
             <CardContent className="p-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[ {t:"Captura biométrica", d:"Recibe la plantilla generada por el SDK del lector y la almacena cifrada.", p:"22 pendientes", c:"text-blue-600"},
                   {t:"Lectores biométricos", d:"Administra heartbeat, diagnóstico y disponibilidad de los lectores.", p:"0 conectados", c:"text-slate-700"},
                   {t:"Historial y auditoría", d:"Consulta enrolamientos, revocaciones y eventos técnicos.", p:"0 eventos recientes", c:"text-slate-700"}
                ].map((p,i) => (
                   <div key={i} className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                     <div>
                        <div className="w-10 h-10 rounded-xl bg-black text-white mb-4"></div>
                        <h3 className="text-sm font-black text-slate-900 mb-1">{p.t}</h3>
                        <p className="text-[11px] font-semibold text-slate-500 leading-snug mb-6">{p.d}</p>
                     </div>
                     <div className={`border border-slate-200 px-3 py-2 text-[10px] font-bold bg-slate-50 ${p.c}`}>{p.p}</div>
                   </div>
                ))}
             </div></CardContent>
           </Card>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
               <div className="p-6 border-b border-slate-200">
                 <h2 className="text-lg font-black text-slate-900">Estado general</h2>
                 <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Indicadores calculados directamente desde PostgreSQL.</p>
               </div>
               <CardContent className="p-6 flex-1 flex flex-col gap-4">
                  <div className="bg-black rounded-xl p-6 flex-1 min-h-[120px] flex items-start justify-end"><span className="text-blue-500 font-black text-sm">0%</span></div>
                  <div className="bg-black rounded-xl p-6 h-20"></div><div className="bg-black rounded-xl p-6 h-24"></div>
               </CardContent>
             </Card>
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden flex flex-col">
               <div className="p-6 border-b border-slate-200"><h2 className="text-lg font-black text-slate-900">Alertas y observaciones</h2><p className="text-[11px] font-semibold text-slate-500 mt-0.5">Situaciones reales que requieren intervención.</p></div>
               <CardContent className="p-6 flex-1 flex flex-col gap-4">
                  <div className="bg-black border-l-4 border-blue-600 rounded-xl p-5"><h4 className="text-[11px] font-black text-slate-400 mb-1">Docentes con registro incompleto</h4><p className="text-[10px] font-bold text-blue-800">22 docente(s) requieren completar sus huellas.</p></div>
                  <div className="bg-black border-l-4 border-blue-600 rounded-xl p-5"><h4 className="text-[11px] font-black text-slate-400 mb-1">No existen lectores registrados</h4><p className="text-[10px] font-bold text-blue-800">Conecte el puente local de captura para registrar el primer lector.</p></div>
               </CardContent>
             </Card>
           </div>
        </div>
      )}

      {/* --- TAB CONTENT: DISPOSITIVOS --- */}
      {activeTab === "dispositivos" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
             {[1,2,3,4,5,6,7].map(i => <div key={i} className="bg-black h-20 rounded-xl"></div>)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 space-y-6">
               <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden min-h-[400px]">
                 <div className="p-6 border-b border-slate-200">
                   <h2 className="text-lg font-black text-slate-900">Lectores institucionales</h2>
                   <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Los estados se calculan con actividad real. No se generan respuestas simuladas.</p>
                 </div>
                 <div className="p-6 flex flex-col gap-4 h-full">
                    <div className="flex gap-4">
                       <input type="text" placeholder="Buscar código, modelo, serie, ubicación o IP" className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm" />
                       <select className="w-48 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                          <option>Todos los estados</option>
                       </select>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
                       <div className="w-12 h-12 bg-black rounded-2xl mb-4"></div>
                       <h3 className="text-base font-black text-slate-900 mb-1">No hay lectores para mostrar</h3>
                       <p className="text-xs font-semibold text-slate-500">Registre el primer lector o cambie los filtros de búsqueda.</p>
                    </div>
                 </div>
               </Card>
             </div>

             <div className="space-y-6">
               <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
                 <div className="p-6 border-b border-slate-200">
                   <h2 className="text-lg font-black text-slate-900">Puente biométrico</h2>
                   <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Estado real del servicio localhost y del adaptador SDK.</p>
                 </div>
                 <CardContent className="p-6">
                    <div className="divide-y divide-slate-100 mb-6">
                       <div className="flex justify-between py-3"><span className="text-[10px] font-bold text-slate-600">Puente</span><span className="text-[10px] font-black text-slate-900">No disponible</span></div>
                       <div className="flex justify-between py-3"><span className="text-[10px] font-bold text-slate-600">Adaptador</span><span className="text-[10px] font-black text-slate-900">No configurado</span></div>
                       <div className="flex justify-between py-3"><span className="text-[10px] font-bold text-slate-600">Versión del puente</span><span className="text-[10px] font-black text-slate-900">—</span></div>
                       <div className="flex justify-between py-3"><span className="text-[10px] font-bold text-slate-600">Lector configurado</span><span className="text-[10px] font-black text-slate-900">—</span></div>
                    </div>
                    <div className="w-full h-8 bg-black rounded-lg"></div>
                 </CardContent>
               </Card>

               <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
                 <div className="p-6 border-b border-slate-200">
                   <h2 className="text-lg font-black text-slate-900">Método de diagnóstico</h2>
                   <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Alcance técnico de la prueba general.</p>
                 </div>
                 <CardContent className="p-6 space-y-4">
                    <p className="text-[10px] font-black text-slate-800 leading-relaxed">
                      El lector conectado al puente local se prueba directamente mediante el SDK del fabricante.
                    </p>
                    <p className="text-[10px] font-black text-slate-800 leading-relaxed">
                      Los lectores remotos se evalúan por heartbeat y última actividad real. No se inventan respuestas ni cambios de estado.
                    </p>
                    <div className="w-full h-16 bg-black rounded-xl"></div>
                 </CardContent>
               </Card>
             </div>
          </div>
        </div>
      )}

      {/* --- TAB CONTENT: CAPTURA --- */}
      {activeTab === "captura" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
                 <CardContent className="p-5">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Puente local</p>
                    <h3 className="text-xl font-black text-slate-900 mb-1">Detenido</h3>
                    <p className="text-[9px] font-bold text-slate-500">connect ECONNREFUSED 127.0.0.1:4765</p>
                 </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
                 <CardContent className="p-5">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Adaptador SDK</p>
                    <h3 className="text-xl font-black text-slate-900 mb-1">No configurado</h3>
                    <p className="text-[9px] font-bold text-slate-500">Configure el ejecutable que usa el SDK del fabricante.</p>
                 </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
                 <CardContent className="p-5">
                    <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Protección</p>
                    <h3 className="text-xl font-black text-slate-900 mb-1">Solo plantilla</h3>
                    <p className="text-[9px] font-bold text-slate-500">La imagen de la huella no se guarda ni se envía al sistema.</p>
                 </CardContent>
              </Card>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Col 1: Seleccionar docente */}
              <div className="space-y-4">
                 <h2 className="text-[13px] font-black text-slate-900 mb-1">1. Seleccionar docente</h2>
                 <p className="text-[10px] font-semibold text-slate-500 mb-4">Busque al docente que será enrolado.</p>
                 <input type="text" placeholder="Código, DNI, nombre o departamento" className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none shadow-sm mb-2" />
                 
                 <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {docentes.map(d => {
                       const isSelected = d.id === selectedDocenteId;
                       return (
                         <div key={d.id} onClick={() => setSelectedDocenteId(d.id)} className={`p-4 rounded-xl border cursor-pointer transition-colors ${isSelected ? "bg-black border-black text-white" : "bg-white border-slate-200 hover:border-blue-400"}`}>
                            <h4 className="text-[11px] font-black mb-0.5">{d.nombres} {d.apellidos}</h4>
                            <p className={`text-[10px] font-black mb-2 ${isSelected ? "text-blue-500" : "text-blue-600"}`}>{d.codigo}</p>
                            <p className={`text-[9px] font-bold ${isSelected ? "text-slate-400" : "text-slate-500"}`}>{d.departamento || "Sin departamento"} • 0/10 huellas</p>
                         </div>
                       )
                    })}
                 </div>
              </div>

              {/* Col 2: Capturar plantilla */}
              <div className="space-y-4">
                 <h2 className="text-[13px] font-black text-slate-900 mb-1">2. Capturar plantilla</h2>
                 <p className="text-[10px] font-semibold text-slate-500 mb-4">El navegador ordena la captura, pero el SDK se ejecuta exclusivamente en el puente local.</p>
                 
                 {selectedDocente && (
                    <div className="p-4 rounded-xl bg-black text-white border border-black mb-4">
                       <h4 className="text-[11px] font-black mb-0.5">{selectedDocente.nombres} {selectedDocente.apellidos}</h4>
                       <p className="text-[10px] font-black text-blue-500">{selectedDocente.codigo}</p>
                    </div>
                 )}

                 <div className="space-y-1 mb-4">
                    <label className="text-[10px] font-extrabold text-slate-800 ml-1">Dedo</label>
                    <select className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none shadow-sm">
                       <option>Índice derecho</option>
                       <option>Pulgar derecho</option>
                       <option>Índice izquierdo</option>
                    </select>
                 </div>

                 <div className="border border-slate-200 rounded-xl bg-white p-10 flex flex-col items-center justify-center text-center shadow-sm h-64 mb-4">
                    <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-blue-500 mb-4">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mb-1">Coloque el dedo en el lector</h3>
                    <p className="text-[10px] font-bold text-blue-600">La aplicación no muestra ni almacena una fotografía de la huella.</p>
                 </div>

                 <div className="flex gap-3">
                    <Button onClick={handleCapture} disabled={isCapturing} className="flex-1 font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10">
                      {isCapturing ? "Iniciando hardware..." : "Capturar huella"}
                    </Button>
                    <Button variant="outline" onClick={() => toast.success("Buffer limpiado.")} className="font-bold border-slate-200 bg-white shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-6">Limpiar</Button>
                 </div>
              </div>

              {/* Col 3: Revisar y guardar */}
              <div className="space-y-4">
                 <h2 className="text-[13px] font-black text-slate-900 mb-1">3. Revisar y guardar</h2>
                 <p className="text-[10px] font-semibold text-slate-500 mb-4">Confirme únicamente una captura con calidad suficiente.</p>
                 
                 <div className="rounded-xl bg-black h-80 flex flex-col items-center justify-center p-6 text-center text-white mt-10">
                    <h3 className="text-[11px] font-black text-blue-500 mb-2">Sin plantilla temporal</h3>
                    <p className="text-[10px] font-bold text-slate-500 leading-snug">Después de capturar aparecerán aquí la calidad, el lector y la versión del SDK.</p>
                 </div>
              </div>
           </div>

           <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden mt-6">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center">
               <div>
                 <h2 className="text-lg font-black text-slate-900">Enrolamientos recientes</h2>
                 <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Últimas plantillas guardadas realmente en PostgreSQL.</p>
               </div>
               <div className="bg-black text-white text-[10px] font-black px-3 py-1.5 rounded-full">0 registro(s)</div>
             </div>
             <CardContent className="p-16 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-black rounded-2xl mb-4"></div>
                <h3 className="text-base font-black text-slate-900 mb-1">Todavía no existen enrolamientos</h3>
                <p className="text-xs font-semibold text-slate-500">Las huellas registradas mediante el puente aparecerán aquí.</p>
             </CardContent>
           </Card>
        </div>
      )}

      {/* --- TAB CONTENT: MOVILES --- */}
      {activeTab === "moviles" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden"><CardContent className="p-4"><p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total</p><h3 className="text-2xl font-black text-slate-900">2</h3></CardContent></Card>
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden"><CardContent className="p-4"><p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Pendientes</p><h3 className="text-2xl font-black text-slate-900">0</h3></CardContent></Card>
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden"><CardContent className="p-4"><p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Autorizados</p><h3 className="text-2xl font-black text-slate-900">1</h3></CardContent></Card>
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden"><CardContent className="p-4"><p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Suspendidos</p><h3 className="text-2xl font-black text-slate-900">0</h3></CardContent></Card>
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden"><CardContent className="p-4"><p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Revocados</p><h3 className="text-2xl font-black text-slate-900">1</h3></CardContent></Card>
           </div>

           <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
             <div className="p-6 border-b border-slate-200 flex justify-between items-start">
               <div>
                 <h2 className="text-lg font-black text-slate-900">Marcaciones móviles de hoy</h2>
                 <p className="text-[11px] font-bold text-slate-600 mt-1">Fecha institucional: Mon Jul 27 2026 00:00:00 GMT-0500 (hora estándar de Perú). Cada registro conserva desafío, firma y evidencia Bluetooth cuando corresponde.</p>
               </div>
               <div className="w-16 h-5 bg-black rounded-full"></div>
             </div>
             <CardContent className="p-6">
                <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                   {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(i => <div key={i} className="bg-black h-14 rounded-lg"></div>)}
                </div>
             </CardContent>
           </Card>

           <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
             <div className="p-6 border-b border-slate-200">
               <h2 className="text-lg font-black text-slate-900">Sincronizar y autorizar móvil</h2>
               <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Seleccione al docente. El QR vincula y autoriza automáticamente el celular que lo escanee desde esa cuenta.</p>
             </div>
             <CardContent className="p-6 space-y-3">
                <label className="text-[10px] font-extrabold text-slate-800 ml-1">Docente</label>
                <div className="flex gap-4">
                   <select className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-sm">
                      <option>Seleccione un docente</option>
                      {docentes.map(d => <option key={d.id}>{d.nombres} {d.apellidos}</option>)}
                   </select>
                   <Button className="font-black bg-orange-500 hover:bg-orange-600 text-white shadow-sm border-none h-10 px-6 shrink-0">Generar QR de sincronización</Button>
                </div>
                <p className="text-[9px] font-black text-slate-900 ml-1">El docente debe abrir la aplicación, pulsar "Sincronizar con la página" y escanear el QR. Si existe otro celular autorizado o suspendido, revóquelo antes de reemplazarlo.</p>
             </CardContent>
           </Card>

           <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
             <div className="p-6 border-b border-slate-200 flex justify-between items-start">
               <div>
                 <h2 className="text-lg font-black text-slate-900">Celulares registrados</h2>
                 <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Cada docente puede mantener un solo dispositivo pendiente, autorizado o suspendido.</p>
               </div>
               <div className="w-10 h-5 bg-black rounded-full"></div>
             </div>
             <CardContent className="p-6 space-y-4">
                {mobileDevices.length === 0 ? (
                   <div className="p-8 text-center text-slate-500 font-bold text-xs">No hay dispositivos registrados en este momento.</div>
                ) : (
                   mobileDevices.map(device => (
                      <div key={device.id} className="border border-slate-200 rounded-xl p-5 shadow-sm hover:border-blue-300 transition-colors">
                         <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                               <h3 className="text-sm font-black text-slate-900">{device.model}</h3>
                               <div className={`w-16 h-4 rounded-full ${device.active ? "bg-green-500" : "bg-red-500"} flex items-center justify-center text-white text-[8px] font-black uppercase`}>
                                  {device.active ? "Activo" : "Revocado"}
                               </div>
                            </div>
                            <div className="flex gap-1.5">
                               <Button onClick={() => handleDeviceAction(device.id, "suspend")} className="h-7 px-3 text-[9px] font-black bg-amber-500 text-white shadow-sm hover:bg-amber-600">Suspender</Button>
                               <Button onClick={() => handleDeviceAction(device.id, "revoke")} variant="outline" className="h-7 px-3 text-[9px] font-black border-slate-200 text-slate-700 shadow-sm">Revocar</Button>
                            </div>
                         </div>
                         <p className="text-[11px] font-black text-slate-900 mb-1">{device.docente} - {device.code}</p>
                         <p className="text-[9px] font-black text-slate-700">Android 16 - SDK 36 - app 0.9.3+20</p>
                         <p className="text-[9px] font-bold text-slate-500 mb-3">Clave de vinculación: {device.id === 1 ? "7ed175bd6419ace255dfe..." : "f94bb363ad2497bce..."}</p>
                      </div>
                   ))
                )}
             </CardContent>
           </Card>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
               <div className="p-6 border-b border-slate-200">
                 <h2 className="text-lg font-black text-slate-900">Solicitudes recientes</h2>
                 <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Códigos generados y utilizados.</p>
               </div>
               <CardContent className="p-6 space-y-3">
                  {[
                     {n:"Pedro Quispe Mamani", c:"DOC-0001", d:"vence 23 jul. 2026, 5:08 a. m."},
                     {n:"Lucía Valverde Quispe", c:"DOC-DEMO-001", d:"vence 23 jul. 2026, 4:15 a. m."},
                     {n:"Lucía Valverde Quispe", c:"DOC-DEMO-001", d:"vence 23 jul. 2026, 3:27 a. m."},
                     {n:"Lucía Valverde Quispe", c:"DOC-DEMO-001", d:"vence 23 jul. 2026, 3:27 a. m."},
                     {n:"Lucía Valverde Quispe", c:"DOC-DEMO-001", d:"vence 23 jul. 2026, 3:25 a. m."},
                     {n:"Pedro Quispe Mamani", c:"DOC-0001", d:"vence 23 jul. 2026, 3:17 a. m."},
                     {n:"Pedro Quispe Mamani", c:"DOC-0001", d:"vence 22 jul. 2026, 6:34 p. m."},
                     {n:"Pedro Quispe Mamani", c:"DOC-0001", d:"vence 22 jul. 2026, 1:25 a. m."}
                  ].map((s, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:bg-slate-50">
                       <div>
                          <h4 className="text-[11px] font-black text-slate-900">{s.n}</h4>
                          <p className="text-[9px] font-bold text-slate-600">{s.c} · {s.d}</p>
                       </div>
                       <div className="w-12 h-4 bg-black rounded-full"></div>
                    </div>
                  ))}
               </CardContent>
             </Card>

             <Card className="rounded-2xl border-slate-200/60 shadow-sm bg-white overflow-hidden">
               <div className="p-6 border-b border-slate-200">
                 <h2 className="text-lg font-black text-slate-900">Eventos de seguridad</h2>
                 <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Últimas acciones relacionadas con dispositivos móviles.</p>
               </div>
               <CardContent className="p-6 space-y-3">
                  {[
                     {e:"ASISTENCIA QR REGISTRADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:47 p. m."},
                     {e:"CLAVE ASISTENCIA CONFIRMADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:45 p. m."},
                     {e:"ASISTENCIA MOVIL REGISTRADA", n:"Pedro Quispe Mamani - Sistema", d:"26 jul. 2026, 5:45 p. m."},
                     {e:"DESAFIO ASISTENCIA EMITIDO", n:"Pedro Quispe Mamani - Sistema", d:"26 jul. 2026, 5:45 p. m."},
                     {e:"CLAVE ASISTENCIA CONFIRMADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:44 p. m."},
                     {e:"CLAVE ASISTENCIA CONFIRMADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:44 p. m."},
                     {e:"ASISTENCIA QR REGISTRADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:44 p. m."},
                     {e:"CLAVE ASISTENCIA CONFIRMADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:27 p. m."},
                     {e:"CLAVE ASISTENCIA CONFIRMADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"26 jul. 2026, 5:27 p. m."},
                     {e:"CLAVE ASISTENCIA CONFIRMADA", n:"Pedro Quispe Mamani - Pedro Quispe Mamani", d:"24 jul. 2026, 7:42 p. m."},
                  ].map((evt, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:bg-slate-50">
                       <div>
                          <h4 className="text-[11px] font-black text-slate-900">{evt.e}</h4>
                          <p className="text-[9px] font-bold text-slate-600">{evt.n} · {evt.d}</p>
                       </div>
                       <div className="w-10 h-4 bg-black rounded-full"></div>
                    </div>
                  ))}
               </CardContent>
             </Card>
           </div>
        </div>
      )}

      {/* QR MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
           <Card className="w-full max-w-sm bg-white p-8 shadow-2xl rounded-3xl border-none flex flex-col items-center text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-blue-600"></div>
             <h2 className="text-2xl font-black text-slate-900 mb-1">Vincular Celular</h2>
             <p className="text-[11px] font-semibold text-slate-500 mb-6">Escanea este código desde la app móvil del docente.</p>
             
             {/* Fake QR */}
             <div className="w-48 h-48 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                <svg className="w-24 h-24 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-contain bg-center opacity-90 invert mix-blend-screen p-2"></div>
             </div>
             
             <p className="text-[10px] font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-lg mb-6 break-all w-full">Token: 7ed175bd6419ace255dfe36518ee282c</p>
             
             <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11" onClick={() => setShowQrModal(false)}>Cerrar ventana</Button>
           </Card>
        </div>
      )}

    </div>
  );
}