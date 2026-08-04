"use client";

import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_SUPERVISOR } from "@/lib/constants";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

const DUMMY_REGISTROS = [
  { id: 1, docente: "Lucía Valverde Quispe",    hora_registro: "07:55", estado: "PUNTUAL",     curso: "Programación I" },
  { id: 2, docente: "Pedro Quispe Mamani",       hora_registro: "08:12", estado: "TARDANZA",    curso: "Representación Arquitectónica" },
  { id: 3, docente: "Sofía Castro Ramos",        hora_registro: "-",     estado: "INASISTENCIA",curso: "Anatomía Humana" },
  { id: 4, docente: "Bruno Vargas Palomino",     hora_registro: "07:48", estado: "PUNTUAL",     curso: "Topografía" },
  { id: 5, docente: "Rodrigo Aguilar Sucso",     hora_registro: "08:30", estado: "TARDANZA",    curso: "Contabilidad General" },
  { id: 6, docente: "Mauricio Vega Quispe",      hora_registro: "07:59", estado: "PUNTUAL",     curso: "Anatomía Dental" },
  { id: 7, docente: "Sebastián Núñez Puma",      hora_registro: "-",     estado: "INASISTENCIA",curso: "Didáctica General" },
];

export default function SupervisorDashboardPage() {
  const [registros] = useState(DUMMY_REGISTROS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("TODOS");
  const [searchTerm, setSearchTerm] = useState("");

  const stats = {
    docentesMonitoreados: registros.length,
    alertasNuevas: registros.filter(r => r.estado === "INASISTENCIA").length,
    inconsistencias: registros.filter(r => r.estado === "TARDANZA").length,
    registrosValidados: registros.filter(r => r.estado === "PUNTUAL").length,
  };

  const handleRefresh = () => {
    setLoading(true);
    toast.info("Sincronizando registros del día...", { duration: 1000 });
    setTimeout(() => {
      setLoading(false);
      toast.success("Panel actualizado con los datos más recientes.");
    }, 1400);
  };

  const handleValidar = (id: number, nombre: string) => {
    toast.success(`Registro de ${nombre} validado manualmente.`);
  };

  const filteredRegistros = registros.filter(r => {
    const matchesFilter = filter === "TODOS" || r.estado === filter;
    const matchesSearch = r.docente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.curso.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <DashboardLayout user={MOCK_SUPERVISOR} active="dashboard">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-[34px] font-extrabold text-unsaac-text">Dashboard supervisor</h1>
          <p className="mt-2 text-base font-semibold text-unsaac-muted">
            Monitoreo operativo de asistencia, inconsistencias y alertas.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={loading} className="font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-none h-10 px-6">
          {loading ? "Actualizando..." : "Actualizar panel"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
        {[
          { label: "Docentes monitoreados", value: stats.docentesMonitoreados, color: "text-unsaac-blue",   filter: "TODOS" },
          { label: "Alertas nuevas",         value: stats.alertasNuevas,        color: "text-unsaac-yellow", filter: "INASISTENCIA" },
          { label: "Inconsistencias",        value: stats.inconsistencias,      color: "text-unsaac-red",    filter: "TARDANZA" },
          { label: "Registros validados",    value: stats.registrosValidados,   color: "text-unsaac-green",  filter: "PUNTUAL" },
        ].map((s) => (
          <div
            key={s.label}
            onClick={() => setFilter(s.filter)}
            className={`rounded-2xl border bg-white p-6 shadow-sm cursor-pointer transition-all hover:shadow-md ${filter === s.filter ? "border-blue-400 ring-2 ring-blue-100" : "border-unsaac-border"}`}
          >
            <p className="text-sm font-bold text-unsaac-muted">{s.label}</p>
            <p className={`mt-4 text-4xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="mt-8 rounded-2xl border border-unsaac-border bg-white overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-50">
          <h2 className="text-xl font-extrabold text-unsaac-text">Registros de hoy</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar docente o curso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 px-3 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-blue-400 bg-white"
            />
            {["TODOS", "PUNTUAL", "TARDANZA", "INASISTENCIA"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  filter === f
                    ? f === "PUNTUAL" ? "bg-green-600 text-white"
                    : f === "TARDANZA" ? "bg-amber-500 text-white"
                    : f === "INASISTENCIA" ? "bg-red-600 text-white"
                    : "bg-black text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {f === "TODOS" ? "Todos" : f === "PUNTUAL" ? "Puntuales" : f === "TARDANZA" ? "Tardanzas" : "Inasistencias"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-slate-500">Cargando registros recientes...</p>
          </div>
        ) : filteredRegistros.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-unsaac-muted font-bold text-sm">No hay registros que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Docente</th>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Curso</th>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Hora</th>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Estado</th>
                <th className="px-6 py-4 text-xs font-extrabold text-unsaac-muted uppercase tracking-widest border-b border-slate-100">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-unsaac-border">
              {filteredRegistros.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-black text-unsaac-text">{r.docente}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">{r.curso}</td>
                  <td className="px-6 py-4 text-sm font-bold text-unsaac-muted">{r.hora_registro}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      r.estado === "PUNTUAL" ? "bg-green-50 text-green-700" :
                      r.estado === "TARDANZA" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleValidar(r.id, r.docente)}
                      className="text-xs font-black text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      Validar
                    </button>
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
