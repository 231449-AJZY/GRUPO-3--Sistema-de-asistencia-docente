"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_ADMIN } from "@/lib/constants";

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  total_usuarios: string;
}

interface Usuario {
  id: number;
  codigo: string;
  nombres: string;
  apellidos: string;
  email: string;
  activo: boolean;
}

function getToken() {
  return localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token") || "";
}

const PERMISOS: Record<string, string[]> = {
  Administrador: [
    "Gestionar docentes (crear, editar, desactivar)",
    "Enrolar huellas biométricas",
    "Configurar horarios académicos",
    "Configurar márgenes de tolerancia",
    "Generar y exportar reportes",
    "Gestionar usuarios y roles",
    "Ver registro de auditoría",
  ],
  Docente: [
    "Registrar ingreso institucional (biométrico)",
    "Registrar asistencia a cursos (biométrico)",
    "Consultar propio historial de asistencia",
    "Ver calendario académico y horarios",
  ],
  Supervisor: [
    "Ver asistencia en tiempo real",
    "Generar reportes por docente, curso y departamento",
    "Emitir alertas por ausencias reiteradas",
    "Consultar historial de semestres anteriores",
  ],
};

export default function AdminRolesPage() {
  const [roles, setRoles]           = useState<Rol[]>([]);
  const [usuarios, setUsuarios]     = useState<Usuario[]>([]);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol | null>(null);
  const [loading, setLoading]       = useState(true);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [cambiandoRol, setCambiandoRol] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/roles", {
      headers: { "Authorization": `Bearer ${getToken()}` }
    })
      .then(r => r.json())
      .then(d => setRoles(d.roles))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function verUsuarios(rol: Rol) {
    setRolSeleccionado(rol);
    setLoadingUsuarios(true);
    try {
      const res = await fetch(`/api/roles/${rol.id}/usuarios`, {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setUsuarios(data.usuarios);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsuarios(false);
    }
  }

  async function cambiarRol(usuarioId: number, nuevoRolId: number) {
    setCambiandoRol(usuarioId);
    try {
      const res = await fetch(`/api/roles/usuario/${usuarioId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`
        },
        body: JSON.stringify({ rol_id: nuevoRolId })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
      alert("Rol actualizado correctamente");
      // Recargar roles
      const rolesRes = await fetch("/api/roles", {
        headers: { "Authorization": `Bearer ${getToken()}` }
      });
      const rolesData = await rolesRes.json();
      setRoles(rolesData.roles);
      if (rolSeleccionado) verUsuarios(rolSeleccionado);
    } catch (err) {
      console.error(err);
    } finally {
      setCambiandoRol(null);
    }
  }

  const colorRol: Record<string, string> = {
    Administrador: "bg-blue-100 text-blue-800",
    Docente:       "bg-green-100 text-green-800",
    Supervisor:    "bg-yellow-100 text-yellow-800",
  };

  return (
    <DashboardLayout user={MOCK_ADMIN} active="roles">
      <div className="admin-dashboard-animated">
        <div className="mb-6">
          <h1 className="text-[34px] font-extrabold text-unsaac-text">Gestión de roles</h1>
          <p className="mt-2 text-base font-semibold text-unsaac-muted">
            Configuración de permisos para administradores, docentes y supervisores.
          </p>
        </div>

        {loading ? (
          <p className="text-unsaac-muted">Cargando roles...</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {roles.map((rol) => (
              <div key={rol.id} className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${colorRol[rol.nombre] || "bg-gray-100 text-gray-800"}`}>
                    {rol.nombre}
                  </span>
                  <span className="text-2xl font-extrabold text-unsaac-blue">{rol.total_usuarios}</span>
                </div>
                <p className="text-sm text-unsaac-muted mb-4">{rol.descripcion}</p>
                <div className="mb-4">
                  <p className="text-xs font-extrabold text-unsaac-text uppercase mb-2">Permisos:</p>
                  <ul className="space-y-1">
                    {(PERMISOS[rol.nombre] || []).map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-unsaac-muted">
                        <span className="text-unsaac-green mt-0.5">✓</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => verUsuarios(rol)}
                  className="w-full rounded-xl border border-unsaac-border py-2 text-sm font-bold text-unsaac-blue hover:bg-unsaac-content-soft transition"
                >
                  Ver usuarios ({rol.total_usuarios})
                </button>
              </div>
            ))}
          </div>
        )}

        {rolSeleccionado && (
          <div className="mt-8 rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-unsaac-text">
                Usuarios con rol: {rolSeleccionado.nombre}
              </h2>
              <button onClick={() => setRolSeleccionado(null)}
                className="text-sm text-unsaac-muted hover:text-unsaac-text">
                ✕ Cerrar
              </button>
            </div>

            {loadingUsuarios ? (
              <p className="text-unsaac-muted">Cargando usuarios...</p>
            ) : usuarios.length === 0 ? (
              <p className="text-unsaac-muted">No hay usuarios con este rol.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Código</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Nombre</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Email</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Estado</th>
                    <th className="px-4 py-3 text-sm font-extrabold text-unsaac-text">Cambiar rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-unsaac-border">
                  {usuarios.map((u) => (
                    <tr key={u.id} className="hover:bg-unsaac-content-soft">
                      <td className="px-4 py-3 text-sm font-bold text-unsaac-muted">{u.codigo}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-unsaac-text">{u.nombres} {u.apellidos}</td>
                      <td className="px-4 py-3 text-sm text-unsaac-muted">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.activo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          defaultValue={rolSeleccionado.id}
                          onChange={(e) => cambiarRol(u.id, parseInt(e.target.value))}
                          disabled={cambiandoRol === u.id}
                          className="rounded-lg border border-unsaac-border px-2 py-1 text-sm text-unsaac-text outline-none focus:border-unsaac-blue"
                        >
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>{r.nombre}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
