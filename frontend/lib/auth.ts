import type { UsuarioActivo, UserRole } from "@/types/usuario";
import { MOCK_ADMIN, MOCK_DOCENTE, MOCK_SUPERVISOR } from "@/lib/constants";

interface LoginPayload {
  correo: string;
  password: string;
}

interface LoginResponse {
  user: UsuarioActivo;
  token: string;
}

interface BackendUser {
  id: number;
  codigo?: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
}

interface BackendLoginResponse {
  token: string;
  user: BackendUser;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function mapBackendRole(role: string): UserRole {
  const normalizedRole = role.trim().toLowerCase();

  if (normalizedRole === "administrador") return "ADMINISTRADOR";
  if (normalizedRole === "docente") return "DOCENTE";
  if (normalizedRole === "supervisor") return "SUPERVISOR";

  return "DOCENTE";
}

async function realLogin({
  correo,
  password,
}: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: correo.trim(),
      password: password.trim(),
    }),
  });

  const data = (await response.json()) as Partial<BackendLoginResponse> & {
    error?: string;
  };

  if (!response.ok || !data.user || !data.token) {
    throw new Error(data.error ?? "Credenciales incorrectas");
  }

  const user: UsuarioActivo = {
    id: data.user.id,
    nombre: `${data.user.nombres} ${data.user.apellidos}`.trim(),
    correo: data.user.email,
    rol: mapBackendRole(data.user.rol),
  };

  return {
    user,
    token: data.token,
  };
}

async function localMockLogin({
  correo,
  password,
}: LoginPayload): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (password !== "123456") {
    throw new Error("Contraseña incorrecta");
  }

  const normalizedEmail = correo.trim().toLowerCase();

  if (normalizedEmail === "admin@unsaac.edu.pe") {
    return {
      user: MOCK_ADMIN,
      token: "mock-token-admin",
    };
  }

  if (normalizedEmail === "mquispe@unsaac.edu.pe") {
    return {
      user: MOCK_DOCENTE,
      token: "mock-token-docente",
    };
  }

  if (normalizedEmail === "aquispe@unsaac.edu.pe") {
    return {
      user: MOCK_SUPERVISOR,
      token: "mock-token-supervisor",
    };
  }

  throw new Error("Usuario no encontrado");
}

export async function mockLogin(payload: LoginPayload): Promise<LoginResponse> {
  const useRealAuth = process.env.NEXT_PUBLIC_USE_REAL_AUTH === "true";

  if (useRealAuth) {
    return realLogin(payload);
  }

  return localMockLogin(payload);
}

export function getDashboardPathByRole(role: UserRole): string {
  if (role === "ADMINISTRADOR") return "/admin/dashboard";
  if (role === "DOCENTE") return "/docente/dashboard";
  return "/supervisor/dashboard";
}

export function saveSession(user: UsuarioActivo, token: string) {
  localStorage.setItem("unsaac_user", JSON.stringify(user));
  localStorage.setItem("unsaac_token", token);
}

export function clearSession() {
  localStorage.removeItem("unsaac_user");
  localStorage.removeItem("unsaac_token");
}
