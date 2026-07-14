"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_DOCENTE } from "@/lib/constants";

export default function DocenteDashboardPage() {
  const [stats, setStats] = useState({ asistencias: 0, tardanzas: 0, inasistencias: 0 });
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token");
        const res = await fetch("/api/dashboard/docente", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al cargar dashboard");
        const data = await res.json();
        setStats(data.stats);
        setHistorial(data.historial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <DashboardLayout user={MOCK_DOCENTE} active="dashboard">
      <div className="mb-8">
        <h1 className="text-[34px] font-extrabold text-unsaac-text">Dashboard docente</h1>
        <p className="mt-2 text-base font-semibold text-unsaac-muted">
          Vista personal de asistencia, horarios y calendario académico.
        </p>
      </div>

      {loading ? (
        <p className="text-unsaac-muted">Cargando datos...</p>
      ) : (
        <>
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

          <div className="mt-8 rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-extrabold text-unsaac-text">Últimos registros</h2>
            {historial.length === 0 ? (
              <p className="text-unsaac-muted">No tienes registros de asistencia aún.</p>
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
                  {historial.map((h, i) => (
                    <tr key={i} className="hover:bg-unsaac-content-soft">
                      <td className="px-4 py-3 text-sm font-semibold text-unsaac-text">{h.fecha}</td>
                      <td className="px-4 py-3 text-sm text-unsaac-muted">{h.hora_registro}</td>
                      <td className="px-4 py-3 text-sm font-bold">
                        <span className={h.estado === 'PUNTUAL' ? 'text-unsaac-green' : 'text-unsaac-yellow'}>
                          {h.estado}
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
