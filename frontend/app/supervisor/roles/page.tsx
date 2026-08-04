"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { MOCK_SUPERVISOR } from "@/lib/constants";
import Button from "@/components/ui/Button";
import Card, { CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  total_usuarios: string;
}

// Fallback dynamic descriptions in case database has default descriptions
const ROLE_METADATA: Record<
  string,
  {
    descripcion: string;
    iconBg: string;
    icon: React.ReactNode;
  }
> = {
  Administrador: {
    descripcion: "Gestión completa del sistema, usuarios, configuración y reportes institucionales.",
    iconBg: "bg-blue-50 text-blue-600 border border-blue-100",
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 11 2 2 4-4" />
      </svg>
    ),
  },
  Docente: {
    descripcion: "Consulta de asistencia personal, visualización de horarios y acceso a reportes propios.",
    iconBg: "bg-green-50 text-green-600 border border-green-100",
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  Supervisor: {
    descripcion: "Monitoreo en tiempo real, seguimiento de incidencias y acceso a reportes de control.",
    iconBg: "bg-amber-50 text-amber-500 border border-amber-100",
    icon: (
      <svg
        className="h-7 w-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
      </svg>
    ),
  },
};

const DEFAULT_MATRIX = {
  "Gestión docentes": { Administrador: true, Docente: false, Supervisor: true },
  "Gestión académica": { Administrador: true, Docente: false, Supervisor: true },
  "Reportes": { Administrador: true, Docente: true, Supervisor: true },
  "Supervisión": { Administrador: true, Docente: false, Supervisor: true },
  "Configuración": { Administrador: true, Docente: false, Supervisor: false },
  "Historial biométrico": { Administrador: true, Docente: true, Supervisor: true },
};

type MatrixKey = keyof typeof DEFAULT_MATRIX;
type RoleKey = "Administrador" | "Docente" | "Supervisor";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("unsaac_token") || sessionStorage.getItem("unsaac_token") || "";
}

export default function SupervisorRolesPage() {
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleKey>("Administrador");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleKey | null>(null);

  // Matrix state
  const [matrix, setMatrix] = useState<typeof DEFAULT_MATRIX>(DEFAULT_MATRIX);
  const [hasChanges, setHasChanges] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: "success" | "info"; text: string } | null>(null);

  useEffect(() => {
    // Load active user
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    // Load matrix from localStorage or fallback
    const saved = localStorage.getItem("unsaac_permisos_matriz");
    if (saved) {
      try {
        setMatrix(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading matrix from storage", e);
      }
    }

    // Fetch dynamic role counts
    fetch("/api/roles", {
      headers: { "Authorization": `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.roles) {
          setRoles(d.roles);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTogglePermission = (permission: MatrixKey, role: RoleKey) => {
    const updated = {
      ...matrix,
      [permission]: {
        ...matrix[permission],
        [role]: !matrix[permission][role],
      },
    };
    setMatrix(updated);
    setHasChanges(true);
  };

  const handleSaveChanges = () => {
    localStorage.setItem("unsaac_permisos_matriz", JSON.stringify(matrix));
    setHasChanges(false);
    setAlertMessage({ type: "success", text: "¡Cambios guardados con éxito!" });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleCancelChanges = () => {
    const saved = localStorage.getItem("unsaac_permisos_matriz");
    if (saved) {
      setMatrix(JSON.parse(saved));
    } else {
      setMatrix(DEFAULT_MATRIX);
    }
    setHasChanges(false);
    setAlertMessage({ type: "info", text: "Modificaciones descartadas." });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  // Helper to obtain user count dynamically from fetched API roles data
  const getRoleUserCount = (roleName: string) => {
    const found = roles.find((r) => r.nombre.toLowerCase() === roleName.toLowerCase());
    return found ? found.total_usuarios : "—";
  };

  const roleKeys: RoleKey[] = ["Administrador", "Docente", "Supervisor"];

  const displayUser = user ? {
    id: user.id,
    nombre: user.nombre || `${user.nombres || ""} ${user.apellidos || ""}`.trim() || "Supervisor",
    correo: user.correo || user.email || "supervisor@unsaac.edu.pe",
    rol: (user.rol || "SUPERVISOR").toUpperCase() as any,
  } : MOCK_SUPERVISOR;

  return (
    <DashboardLayout user={displayUser} active="roles">
      <div className="admin-dashboard-animated space-y-8">
        
        {/* Banner Notification */}
        {alertMessage && (
          <div
            className={`fixed right-8 top-28 z-50 flex items-center gap-3 rounded-xl border px-6 py-4 shadow-lg transition-all duration-300 ${
              alertMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            <span className="text-xl">
              {alertMessage.type === "success" ? "✓" : "i"}
            </span>
            <p className="text-sm font-bold">{alertMessage.text}</p>
          </div>
        )}

        {/* Title Section */}
        <div>
          <h1 className="text-[34px] font-extrabold text-unsaac-text leading-tight">
            Gestión de roles de usuario
          </h1>
          <p className="mt-2 text-base font-semibold text-unsaac-muted">
            Administre la distribución de permisos y el acceso de cada tipo de usuario al sistema
          </p>
        </div>

        {/* Role Cards Grid */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {roleKeys.map((roleName) => {
            const meta = ROLE_METADATA[roleName];
            const isSelected = selectedRole === roleName;
            const userCount = getRoleUserCount(roleName);

            return (
              <Card
                key={roleName}
                className={`transition-all duration-300 ${
                  isSelected ? "ring-2 ring-unsaac-blue shadow-md" : "hover:shadow-md"
                }`}
              >
                <CardContent className="flex flex-col h-full justify-between p-6">
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      {/* Icon Container */}
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg}`}
                      >
                        {meta.icon}
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h3 className="text-lg font-extrabold text-unsaac-text">
                          {roleName}
                        </h3>
                        <p className="text-sm font-semibold text-unsaac-muted leading-relaxed">
                          {meta.descripcion}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Users Count */}
                    <div className="mt-4 border-t border-unsaac-border pt-4">
                      <p className="text-xs font-extrabold text-unsaac-muted uppercase tracking-wider">
                        Usuarios asignados
                      </p>
                      <p className="text-3xl font-extrabold text-unsaac-blue mt-1">
                        {loading ? (
                          <span className="text-sm text-unsaac-muted animate-pulse">Cargando...</span>
                        ) : (
                          userCount
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Select/Edit Button */}
                  <div className="mt-6">
                    <Button
                      onClick={() => {
                        setSelectedRole(roleName);
                        setEditingRole(roleName);
                        setIsModalOpen(true);
                      }}
                      variant={isSelected ? "secondary" : "outline"}
                      fullWidth
                      size="sm"
                      className="text-sm py-2.5 font-bold"
                    >
                      Editar permisos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {/* Permission Matrix Section */}
        <section className="rounded-2xl border border-unsaac-border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-unsaac-text">
              Matriz de permisos
            </h2>
            <p className="mt-1 text-sm font-semibold text-unsaac-muted">
              Configure qué acciones puede realizar cada rol dentro de la plataforma institucional.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-unsaac-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-unsaac-border">
                  <th className="px-6 py-4 text-sm font-extrabold text-unsaac-text">
                    Permiso / Módulo
                  </th>
                  {roleKeys.map((roleName) => (
                    <th
                      key={roleName}
                      className={`px-6 py-4 text-sm font-extrabold text-center transition-colors duration-250 ${
                        selectedRole === roleName
                          ? "text-unsaac-blue bg-blue-50/50"
                          : "text-unsaac-text"
                      }`}
                    >
                      {roleName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-unsaac-border">
                {(Object.keys(DEFAULT_MATRIX) as MatrixKey[]).map((permission) => (
                  <tr
                    key={permission}
                    className="hover:bg-unsaac-content-soft transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-unsaac-text">
                      {permission}
                    </td>
                    {roleKeys.map((roleName) => {
                      const hasPermission = matrix[permission][roleName];

                      return (
                        <td
                          key={roleName}
                          className={`px-6 py-4 text-center transition-colors duration-250 ${
                            selectedRole === roleName ? "bg-blue-50/20" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(permission, roleName)}
                            className="inline-flex items-center justify-center p-2 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none"
                            title={`Toggle ${permission} for ${roleName}`}
                          >
                            {hasPermission ? (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-unsaac-green border border-green-200">
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-50 text-unsaac-red border border-red-100">
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="3.5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Alerts & Action Controls */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Info Message */}
            <div className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm font-semibold text-green-800">
              <span className="text-green-600 font-extrabold text-base">i</span>
              <span>Los cambios aplicarán a todos los usuarios asociados a cada rol</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              <Button
                variant="outline"
                onClick={handleCancelChanges}
                disabled={!hasChanges}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveChanges}
                disabled={!hasChanges}
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        </section>

        {/* Modal for editing role permissions directly */}
        <Modal
          open={isModalOpen}
          title={`Permisos: ${editingRole}`}
          description="Active o desactive los módulos a los que este rol tiene acceso."
          confirmText="Guardar"
          cancelText="Descartar"
          onClose={() => setIsModalOpen(false)}
          onConfirm={() => {
            handleSaveChanges();
            setIsModalOpen(false);
          }}
        >
          {editingRole && (
            <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2">
              {(Object.keys(DEFAULT_MATRIX) as MatrixKey[]).map((permission) => {
                const hasPermission = matrix[permission][editingRole];
                return (
                  <div
                    key={permission}
                    className="flex items-center justify-between p-3 border border-unsaac-border rounded-xl bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-extrabold text-unsaac-text">{permission}</span>
                    <button
                      type="button"
                      onClick={() => handleTogglePermission(permission, editingRole)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-unsaac-blue focus-visible:ring-offset-2 ${
                        hasPermission ? "bg-green-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          hasPermission ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
}
