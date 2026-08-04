"use client";
import { useEffect, useState } from "react";

interface Registro {
  nombres: string;
  apellidos: string;
  codigo: string;
  departamento: string;
  hora_registro: string;
  estado: string;
}

export default function MonitoreoTiempoReal() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading]     = useState(true);
  const [ultima, setUltima]       = useState("");

  async function cargar() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token") || "";
    try {
      const res = await fetch("/api/asistencia/hoy", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setRegistros(data.registros || []);
      setUltima(new Date().toLocaleTimeString("es-PE"));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000); // actualiza cada 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold text-unsaac-text">Asistencia en tiempo real</h1>
          <p className="text-sm text-unsaac-muted mt-1">Última actualización: {ultima} · Se actualiza cada 30 segundos</p>
        </div>
        <button onClick={cargar}
          className="rounded-xl bg-unsaac-blue px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition">
          ↻ Actualizar
        </button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-unsaac-border bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">Total registros hoy</p>
          <p className="mt-2 text-4xl font-extrabold text-unsaac-blue">{registros.length}</p>
        </div>
        <div className="rounded-2xl border border-unsaac-border bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">Puntuales</p>
          <p className="mt-2 text-4xl font-extrabold text-unsaac-green">
            {registros.filter(r => r.estado === "PUNTUAL").length}
          </p>
        </div>
        <div className="rounded-2xl border border-unsaac-border bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-unsaac-muted">Tardanzas</p>
          <p className="mt-2 text-4xl font-extrabold text-unsaac-yellow">
            {registros.filter(r => r.estado === "TARDANZA").length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Registros del día</h2>
        {loading ? (
          <p className="text-unsaac-muted">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="text-unsaac-muted py-8 text-center">No hay registros de asistencia hoy.</p>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Código</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Docente</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Departamento</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Hora</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-unsaac-border">
              {registros.map((r, i) => (
                <tr key={i} className="hover:bg-unsaac-content-soft">
                  <td className="px-4 py-3 text-sm font-bold text-unsaac-muted">{r.codigo}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-unsaac-text">{r.nombres} {r.apellidos}</td>
                  <td className="px-4 py-3 text-sm text-unsaac-muted">{r.departamento}</td>
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
    </div>
  );
}
