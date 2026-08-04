"use client";
import { useEffect, useState } from "react";

interface Alerta {
  id: number;
  tipo: string;
  mensaje: string;
  fecha_alerta: string;
  leida: boolean;
  docente_id: number;
}

export default function AlertasPage() {
  const [alertas, setAlertas]   = useState<Alerta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mensaje, setMensaje]   = useState("");
  const [tipo, setTipo]         = useState("AUSENCIA_REITERADA");
  const [docenteId, setDocenteId] = useState("");

  function getToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
  }

  async function cargarAlertas() {
    try {
      const res = await fetch("/api/alertas", {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setAlertas(data.alertas || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function crearAlerta() {
    if (!mensaje || !docenteId) { alert("Complete todos los campos"); return; }
    try {
      const res = await fetch("/api/alertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ docente_id: parseInt(docenteId), tipo, mensaje })
      });
      if (!res.ok) { alert("Error al crear alerta"); return; }
      alert("✅ Alerta creada correctamente");
      setMensaje(""); setDocenteId("");
      cargarAlertas();
    } catch (err) { console.error(err); }
  }

  useEffect(() => { cargarAlertas(); }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-extrabold text-unsaac-text">Alertas e incumplimientos</h1>
        <p className="text-sm text-unsaac-muted mt-1">Gestione alertas por ausencias o incumplimiento de horario.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Emitir nueva alerta</h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <input value={docenteId} onChange={e => setDocenteId(e.target.value)}
            placeholder="ID del docente"
            className="rounded-xl border border-unsaac-border px-4 py-2 text-sm outline-none focus:border-unsaac-blue" />
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="rounded-xl border border-unsaac-border px-4 py-2 text-sm outline-none focus:border-unsaac-blue">
            <option value="AUSENCIA_REITERADA">Ausencia reiterada</option>
            <option value="INCUMPLIMIENTO_HORARIO">Incumplimiento de horario</option>
          </select>
          <input value={mensaje} onChange={e => setMensaje(e.target.value)}
            placeholder="Mensaje de la alerta"
            className="rounded-xl border border-unsaac-border px-4 py-2 text-sm outline-none focus:border-unsaac-blue" />
        </div>
        <button onClick={crearAlerta}
          className="mt-4 rounded-xl bg-unsaac-blue px-6 py-2 text-sm font-bold text-white hover:opacity-90 transition">
          Emitir alerta
        </button>
      </div>

      <div className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Alertas registradas</h2>
        {loading ? <p className="text-unsaac-muted">Cargando...</p> :
         alertas.length === 0 ? <p className="text-unsaac-muted py-8 text-center">No hay alertas registradas.</p> : (
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Tipo</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Mensaje</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Fecha</th>
                <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-unsaac-border">
              {alertas.map((a) => (
                <tr key={a.id} className="hover:bg-unsaac-content-soft">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                      {a.tipo.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-unsaac-text">{a.mensaje}</td>
                  <td className="px-4 py-3 text-sm text-unsaac-muted">
                    {new Date(a.fecha_alerta).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                      a.leida ? "bg-gray-100 text-gray-600" : "bg-yellow-100 text-yellow-700"
                    }`}>{a.leida ? "Leída" : "Pendiente"}</span>
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
