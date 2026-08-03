"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_DOCENTE } from "@/lib/constants";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

// Simulated Data
const DUMMY_HISTORIAL = [
  { id: 1, fecha: "15/05/2026", hora_registro: "07:58", estado: "PUNTUAL" },
  { id: 2, fecha: "14/05/2026", hora_registro: "08:15", estado: "TARDANZA" },
  { id: 3, fecha: "13/05/2026", hora_registro: "-", estado: "INASISTENCIA" },
  { id: 4, fecha: "12/05/2026", hora_registro: "07:50", estado: "PUNTUAL" },
  { id: 5, fecha: "11/05/2026", hora_registro: "08:20", estado: "TARDANZA" }
];

export default function DocenteDashboardPage() {
  const [stats, setStats] = useState({ asistencias: 14, tardanzas: 3, inasistencias: 1 });
  const [historial, setHistorial] = useState<any[]>(DUMMY_HISTORIAL);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("TODOS");

  const handleRefresh = () => {
     setLoading(true);
     toast.info("Sincronizando datos con el servidor...", { duration: 1000 });
     setTimeout(() => {
        setLoading(false);
        toast.success("Registros actualizados.");
     }, 1200);
  };

  const filteredHistorial = historial.filter(h => {
     if (filter === "TODOS") return true;
     if (filter === "ASISTENCIA" && h.estado === "PUNTUAL") return true;
     if (filter === "TARDANZA" && h.estado === "TARDANZA") return true;
     if (filter === "INASISTENCIA" && h.estado === "INASISTENCIA") return true;
     return false;
  });

  return (
    <DashboardLayout user={MOCK_DOCENTE} active="dashboard">
      <div className="mb-8 flex justify-between items-end">
        <div>
           <h1 className="text-[34px] font-extrabold text-unsaac-text">Dashboard docente</h1>
           <p className="mt-2 text-base font-semibold text-unsaac-muted">
             Vista personal de asistencia, horarios y calendario académico.
           </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading} className="font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-none h-10 px-6">
           {loading ? "Sincronizando..." : "Actualizar registros"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          { label: "Asistencias del mes", value: stats.asistencias,   color: "text-unsaac-green"  },
          { label: "Tardanzas",           value: stats.tardanzas,     color: "text-unsaac-yellow" },
          { label: "Inasistencias",       value: stats.inasistencias, color: "text-unsaac-red"    },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-unsaac-muted">{s.label}</p>
            <p className={`mt-4 text-4xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-unsaac-border bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <h2 className="text-xl font-extrabold text-unsaac-text">Últimos registros</h2>
           <div className="flex gap-2">
              <button onClick={() => setFilter("TODOS")} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${filter === "TODOS" ? "bg-black text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Todos</button>
              <button onClick={() => setFilter("ASISTENCIA")} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${filter === "ASISTENCIA" ? "bg-green-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Asistencias</button>
              <button onClick={() => setFilter("TARDANZA")} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${filter === "TARDANZA" ? "bg-amber-500 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Tardanzas</button>
              <button onClick={() => setFilter("INASISTENCIA")} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-colors ${filter === "INASISTENCIA" ? "bg-red-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Inasistencias</button>
           </div>
        </div>
        
        {loading ? (
           <div className="p-16 text-center animate-pulse">
              <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-bold text-slate-500">Cargando registros recientes...</p>
           </div>
        ) : filteredHistorial.length === 0 ? (
          <div className="p-12 text-center">
             <p className="text-unsaac-muted font-bold text-sm">No hay registros que coincidan con este filtro.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Fecha</th>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Hora</th>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-unsaac-border">
              {filteredHistorial.map((h, i) => (
                <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-black text-unsaac-text">{h.fecha}</td>
                  <td className="px-6 py-4 text-sm font-bold text-unsaac-muted">{h.hora_registro}</td>
                  <td className="px-6 py-4 text-xs font-black">
                    <span className={`px-3 py-1 rounded-full ${h.estado === 'PUNTUAL' ? 'bg-green-50 text-green-700' : h.estado === 'TARDANZA' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                      {h.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
}
