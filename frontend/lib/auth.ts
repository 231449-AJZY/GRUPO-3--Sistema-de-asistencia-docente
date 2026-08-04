import type { UsuarioActivo, UserRole } from "@/types/usuario";

interface LoginPayload {
  correo: string;
  password: string;
}

interface LoginResponse {
  user: UsuarioActivo;
  token: string;
}

export async function mockLogin({
  correo,
  password,
}: LoginPayload): Promise<LoginResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: correo, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Credenciales incorrectas");
  }

  const rolMap: Record<string, UserRole> = {
    Administrador: "ADMINISTRADOR",
    Docente:       "DOCENTE",
    Supervisor:    "SUPERVISOR",
  };

  const user: UsuarioActivo = {
    id:     data.user.id,
    nombre: data.user.nombres + " " + data.user.apellidos,
    correo: data.user.email,
    rol:    rolMap[data.user.rol] ?? "DOCENTE",
  };

  return { user, token: data.token };
}

interface RequestPasswordResetPayload {
  correo: string;
}

/**
 * Solicita la recuperación de contraseña para un correo institucional.
 *
 * Implementación actual: solo frontend (no existe todavía el endpoint en el
 * backend). Cuando esté disponible, reemplazar el cuerpo por algo como:
 *
 *   const res = await fetch("/api/auth/forgot-password", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ correo }),
 *   });
 *   const data = await res.json();
 *   if (!res.ok) throw new Error(data.error || "No se pudo enviar la solicitud");
 */
export async function requestPasswordReset({
  correo,
}: RequestPasswordResetPayload): Promise<void> {
  if (!correo.trim()) {
    throw new Error("Ingrese su correo institucional.");
  }

  // Simula la latencia de red mientras no exista el endpoint real.
  await new Promise((resolve) => setTimeout(resolve, 900));
}

export function getDashboardPathByRole(role: UserRole): string {
  if (role === "ADMINISTRADOR") return "/Admin/dashboard";
  if (role === "DOCENTE")       return "/login/PanelDocente";
  return "/login/PanelSupervisor";
}

export function saveSession(user: UsuarioActivo, token: string) {
  localStorage.setItem("unsaac_user",  JSON.stringify(user));
  localStorage.setItem("unsaac_token", token);
  // También guardar con las claves que usa andy
  localStorage.setItem("user",  JSON.stringify({
    id:       user.id,
    nombres:  user.nombre.split(" ")[0],
    apellidos: user.nombre.split(" ").slice(1).join(" "),
    correo:   user.correo,
    rol:      user.rol,
  }));
  localStorage.setItem("token", token);
}

export function clearSession() {
  localStorage.removeItem("unsaac_user");
  localStorage.removeItem("unsaac_token");
  localStorage.removeItem("user");
  localStorage.removeItem("token");
}
