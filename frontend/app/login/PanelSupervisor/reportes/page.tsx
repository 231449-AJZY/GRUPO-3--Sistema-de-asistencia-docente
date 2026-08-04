"use client";
import { useState } from "react";

export default function ReportesPage() {
  const [docenteId, setDocenteId] = useState("");
  const [reporte, setReporte]     = useState<any>(null);
  const [loading, setLoading]     = useState(false);

  function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  }

  async function buscarReporte() {
    if (!docenteId) { alert("Ingrese el ID del docente"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/asistencia/docente/${docenteId}`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      setReporte(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold text-unsaac-text">Reportes de asistencia</h1>
        <p className="text-sm text-unsaac-muted mt-1">Consulte el historial de asistencia por docente.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Buscar por docente</h2>
        <div className="flex gap-4">
          <input value={docenteId} onChange={e => setDocenteId(e.target.value)}
            placeholder="ID del docente"
            className="rounded-xl border border-unsaac-border px-4 py-2 text-sm outline-none focus:border-unsaac-blue w-64" />
          <button onClick={buscarReporte}
            className="rounded-xl bg-unsaac-blue px-6 py-2 text-sm font-bold text-white hover:opacity-90 transition">
            {loading ? "Buscando..." : "Generar reporte"}
          </button>
        </div>
      </div>

      {reporte && (
        <>
          <div className="mb-6 rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">
              Ingresos institucionales ({reporte.ingresos.length} registros)
            </h2>
            {reporte.ingresos.length === 0 ? (
              <p className="text-unsaac-muted">Sin registros de ingreso.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Fecha</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Hora</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-unsaac-border">
                  {reporte.ingresos.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-unsaac-content-soft">
                      <td className="px-4 py-3 text-sm text-unsaac-text">{r.fecha}</td>
                      <td className="px-4 py-3 text-sm text-unsaac-muted">{r.hora_registro}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          r.estado === "PUNTUAL" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{r.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">
              Asistencia a cursos ({reporte.cursos.length} registros)
            </h2>
            {reporte.cursos.length === 0 ? (
              <p className="text-unsaac-muted">Sin registros de cursos.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Fecha</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Curso</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Aula</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-unsaac-border">
                  {reporte.cursos.map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-unsaac-content-soft">
                      <td className="px-4 py-3 text-sm text-unsaac-text">{r.fecha}</td>
                      <td className="px-4 py-3 text-sm text-unsaac-text">{r.curso}</td>
                      <td className="px-4 py-3 text-sm text-unsaac-muted">{r.aula}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          r.estado === "PRESENTE" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{r.estado}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
