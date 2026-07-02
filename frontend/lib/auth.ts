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

export async function mockLogin({
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