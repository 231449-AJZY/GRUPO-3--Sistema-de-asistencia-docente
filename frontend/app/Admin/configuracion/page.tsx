"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { MOCK_ADMIN } from "@/lib/constants";

function getToken() {
  return localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token") || "";
}

export default function AdminConfiguracionPage() {
  const [config, setConfig] = useState({
    hora_ingreso_limite:        "09:00:00",
    tolerancia_antes_minutos:   15,
    tolerancia_despues_minutos: 10,
    dias_laborables:            "LUN-VIE",
  });
  const [loading, setLoading]   = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg]           = useState("");

  useEffect(() => {
    fetch("/api/configuracion", {
      headers: { "Authorization": `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => { if (d.configuracion) setConfig(d.configuracion); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function guardar() {
    setGuardando(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      setMsg(res.ok ? "✅ Configuración guardada correctamente" : "❌ " + data.error);
    } catch {
      setMsg("❌ Error de conexión");
    } finally {
      setGuardando(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <DashboardLayout user={MOCK_ADMIN} active="configuracion">
      <div className="admin-dashboard-animated">
        <div className="mb-6">
          <h1 className="text-[34px] font-extrabold text-unsaac-text">Configuración del sistema</h1>
          <p className="mt-2 text-base font-semibold text-unsaac-muted">
            Parámetros generales de asistencia, horarios institucionales y tolerancias.
          </p>
        </div>

        {loading ? <p className="text-unsaac-muted">Cargando configuración...</p> : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Horario institucional</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-unsaac-muted">
                    Hora límite de ingreso
                  </label>
                  <input type="time"
                    value={config.hora_ingreso_limite.slice(0,5)}
                    onChange={e => setConfig(c => ({ ...c, hora_ingreso_limite: e.target.value + ":00" }))}
                    className="h-[46px] w-full rounded-xl border border-unsaac-border px-4 text-sm font-bold text-unsaac-text outline-none focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-unsaac-muted">Docentes que lleguen después de esta hora serán marcados como tardanza.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-unsaac-muted">
                    Días laborables
                  </label>
                  <select value={config.dias_laborables}
                    onChange={e => setConfig(c => ({ ...c, dias_laborables: e.target.value }))}
                    className="h-[46px] w-full rounded-xl border border-unsaac-border px-4 text-sm font-bold text-unsaac-text outline-none focus:border-unsaac-blue">
                    <option value="LUN-VIE">Lunes a Viernes</option>
                    <option value="LUN-SAB">Lunes a Sábado</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Tolerancias de asistencia a cursos</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-unsaac-muted">
                    Minutos de tolerancia antes del inicio
                  </label>
                  <input type="number" min={0} max={60}
                    value={config.tolerancia_antes_minutos}
                    onChange={e => setConfig(c => ({ ...c, tolerancia_antes_minutos: parseInt(e.target.value) }))}
                    className="h-[46px] w-full rounded-xl border border-unsaac-border px-4 text-sm font-bold text-unsaac-text outline-none focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-unsaac-muted">El docente puede registrar asistencia desde X minutos antes del inicio.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-unsaac-muted">
                    Minutos de tolerancia después del inicio
                  </label>
                  <input type="number" min={0} max={60}
                    value={config.tolerancia_despues_minutos}
                    onChange={e => setConfig(c => ({ ...c, tolerancia_despues_minutos: parseInt(e.target.value) }))}
                    className="h-[46px] w-full rounded-xl border border-unsaac-border px-4 text-sm font-bold text-unsaac-text outline-none focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                  />
                  <p className="mt-1 text-xs text-unsaac-muted">El docente puede registrar asistencia hasta X minutos después del inicio.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 xl:col-span-2">
              <h2 className="mb-4 text-lg font-extrabold text-unsaac-text">Información del sistema</h2>
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                  { label: "Versión",      value: "1.0.0" },
                  { label: "Motor BD",     value: "PostgreSQL 15" },
                  { label: "Backend",      value: "Node.js + Express" },
                  { label: "Servidor",     value: "AWS EC2 Ubuntu" },
                ].map(item => (
                  <div key={item.label} className="rounded-xl border border-unsaac-border p-4">
                    <p className="text-xs font-bold text-unsaac-muted">{item.label}</p>
                    <p className="mt-1 text-sm font-extrabold text-unsaac-text">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        )}

        {msg && (
          <div className={`mt-4 rounded-xl p-4 text-sm font-bold ${msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar configuración"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
