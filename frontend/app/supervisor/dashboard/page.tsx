"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_SUPERVISOR } from "@/lib/constants";

export default function SupervisorDashboardPage() {
  const [stats, setStats] = useState({
    docentesMonitoreados: 0,
    alertasNuevas: 0,
    inconsistencias: 0,
    registrosValidados: 0,
  });
  const [registros, setRegistros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token");
        const res = await fetch("/api/dashboard/supervisor", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al cargar dashboard");
        const data = await res.json();
        setStats(data.stats);
        setRegistros(data.registrosHoy);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <DashboardLayout user={MOCK_SUPERVISOR} active="dashboard">
      <div className="mb-8">
        <h1 className="text-[34px] font-extrabold text-unsaac-text">Dashboard supervisor</h1>
        <p className="mt-2 text-base font-semibold text-unsaac-muted">
          Monitoreo operativo de asistencia, inconsistencias y alertas.
        </p>
      </div>

      {loading ? (
        <p className="text-unsaac-muted">Cargando datos...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
            {[
              { label: "Docentes monitoreados", value: stats.docentesMonitoreados, color: "text-unsaac-blue" },
              { label: "Alertas nuevas",         value: stats.alertasNuevas,        color: "text-unsaac-yellow" },
              { label: "Inconsistencias",        value: stats.inconsistencias,      color: "text-unsaac-red" },
              { label: "Registros validados",    value: stats.registrosValidados,   color: "text-unsaac-green" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-unsaac-muted">{s.label}</p>
                <p className={`mt-4 text-4xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-extrabold text-unsaac-text">Registros de hoy</h2>
            {registros.length === 0 ? (
              <p className="text-unsaac-muted">No hay registros de asistencia hoy.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Docente</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Hora</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-unsaac-border">
                  {registros.map((r, i) => (
                    <tr key={i} className="hover:bg-unsaac-content-soft">
                      <td className="px-4 py-3 text-sm font-semibold text-unsaac-text">{r.docente}</td>
                      <td className="px-4 py-3 text-sm text-unsaac-muted">{r.hora_registro}</td>
                      <td className="px-4 py-3 text-sm font-bold">
                        <span className={r.estado === 'PUNTUAL' ? 'text-unsaac-green' : 'text-unsaac-yellow'}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
