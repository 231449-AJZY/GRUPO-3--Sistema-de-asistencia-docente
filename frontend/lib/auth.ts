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

export function getDashboardPathByRole(role: UserRole): string {
  if (role === "ADMINISTRADOR") return "/Admin/dashboard";
  if (role === "DOCENTE")       return "/login/PanelDocente";
  return "/login/PanelSupervisor";
}

export function saveSession(user: UsuarioActivo, token: string) {
  localStorage.setItem("unsaac_user",  JSON.stringify(user));
  localStorage.setItem("unsaac_token", token);
}

export function clearSession() {
  localStorage.removeItem("unsaac_user");
  localStorage.removeItem("unsaac_token");
}
