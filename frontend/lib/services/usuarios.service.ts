import { getToken } from "@/lib/auth";
import { getRolePresentation } from "@/lib/role-permissions";

import type {
  SystemRole,
  RoleName,
} from "@/types/rol";

import type {
  RolSistema,
  Usuario,
  UsuarioFormValues,
  UsuarioRol,
} from "@/types/usuario";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "/api";

interface ErrorPayload {
  error?: string;
  fields?: Record<string, string>;
}

interface BackendUser {
  id: number | string;
  codigo?: string;
  nombres?: string;
  apellidos?: string;
  email?: string;
  activo?: boolean;
  creado_en?: string;
  actualizado_en?: string;
  rol_id?: number | string;
  rol?: string;
  docente_id?: number | string | null;
}

interface BackendRole {
  id: number | string;
  nombre: string;
  descripcion?: string | null;
  total_usuarios?: number | string;
  usuarios_activos?: number | string;
}

interface UsersResponse {
  usuarios: BackendUser[];
}

interface UserResponse {
  usuario: BackendUser;
  mensaje?: string;
}

interface RolesResponse {
  roles: BackendRole[];
}

export class ApiUsuariosError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiUsuariosError";
    this.status = status;
    this.fields = fields;
  }
}

function normalizeRoleName(value: string): UsuarioRol {
  const normalized = value.trim().toLowerCase();

  if (normalized === "administrador") {
    return "Administrador";
  }

  if (normalized === "docente") {
    return "Docente";
  }

  if (normalized === "supervisor") {
    return "Supervisor";
  }

  throw new ApiUsuariosError(
    `El servidor devolvió un rol no reconocido: ${value}`,
    502
  );
}

function normalizeUser(raw: BackendUser): Usuario {
  return {
    id: Number(raw.id),
    codigo: raw.codigo ?? "",
    nombres: raw.nombres ?? "",
    apellidos: raw.apellidos ?? "",
    email: raw.email ?? "",
    rolId: Number(raw.rol_id),
    rol: normalizeRoleName(raw.rol ?? ""),
    activo: Boolean(raw.activo),
    creadoEn: raw.creado_en ?? "",
    actualizadoEn:
      raw.actualizado_en ??
      raw.creado_en ??
      "",
    docenteId:
      raw.docente_id === null ||
      raw.docente_id === undefined
        ? null
        : Number(raw.docente_id),
  };
}

function normalizeRole(raw: BackendRole): RolSistema {
  return {
    id: Number(raw.id),
    nombre: normalizeRoleName(raw.nombre),
    descripcion:
      raw.descripcion?.trim() ||
      "Rol institucional del sistema.",
    totalUsuarios: Number(raw.total_usuarios ?? 0),
    usuariosActivos: Number(raw.usuarios_activos ?? 0),
  };
}

function toSystemRole(role: RolSistema): SystemRole {
  const name = role.nombre as RoleName;
  const presentation = getRolePresentation(name);

  return {
    id: role.id,
    name,
    code: presentation.code,
    description: role.descripcion,
    userCount: role.totalUsuarios ?? 0,
    activeUserCount: role.usuariosActivos ?? 0,
    protected: true,
    tone: presentation.tone,
    permissionIds: presentation.permissionIds,
  };
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  if (!token) {
    throw new ApiUsuariosError(
      "No existe una sesión válida. Inicie sesión nuevamente.",
      401
    );
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const response = await fetch(
      `${API_URL}${path}`,
      {
        ...init,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const payload = (await response
      .json()
      .catch(() => null)) as
      | T
      | ErrorPayload
      | null;

    if (!response.ok) {
      const errorPayload =
        payload as ErrorPayload | null;

      throw new ApiUsuariosError(
        errorPayload?.error ??
          "No se pudo completar la operación.",
        response.status,
        errorPayload?.fields
      );
    }

    if (!payload) {
      throw new ApiUsuariosError(
        "El servidor devolvió una respuesta vacía.",
        502
      );
    }

    return payload as T;
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new ApiUsuariosError(
        "El servidor tardó demasiado en responder.",
        408
      );
    }

    if (error instanceof ApiUsuariosError) {
      throw error;
    }

    throw new ApiUsuariosError(
      "No se pudo conectar con el servidor del sistema.",
      0
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function toUserPayload(values: UsuarioFormValues) {
  return {
    codigo: values.codigo.trim().toUpperCase(),
    nombres: values.nombres.trim(),
    apellidos: values.apellidos.trim(),
    email: values.email.trim().toLowerCase(),
    rol_id: values.rolId,
    activo: values.activo,
    password: values.password,
  };
}

export async function getUsuarios(): Promise<Usuario[]> {
  const response = await apiRequest<UsersResponse>(
    "/usuarios"
  );

  return response.usuarios.map(normalizeUser);
}

export async function getRolesSistema(): Promise<RolSistema[]> {
  const response = await apiRequest<RolesResponse>(
    "/roles"
  );

  return response.roles.map(normalizeRole);
}

export async function getSystemRoles(): Promise<SystemRole[]> {
  const roles = await getRolesSistema();
  return roles.map(toSystemRole);
}

export async function createUsuario(
  values: UsuarioFormValues
): Promise<Usuario> {
  const response = await apiRequest<UserResponse>(
    "/usuarios",
    {
      method: "POST",
      body: JSON.stringify(toUserPayload(values)),
    }
  );

  return normalizeUser(response.usuario);
}

export async function updateUsuario(
  userId: number,
  values: UsuarioFormValues
): Promise<Usuario> {
  const response = await apiRequest<UserResponse>(
    `/usuarios/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify(toUserPayload(values)),
    }
  );

  return normalizeUser(response.usuario);
}

export async function changeUsuarioStatus(
  userId: number,
  activo: boolean
): Promise<Usuario> {
  const response = await apiRequest<UserResponse>(
    `/usuarios/${userId}/estado`,
    {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    }
  );

  return normalizeUser(response.usuario);
}

export async function changeUsuarioRole(
  userId: number,
  roleId: number
): Promise<Usuario> {
  const response = await apiRequest<UserResponse>(
    `/roles/usuario/${userId}`,
    {
      method: "PUT",
      body: JSON.stringify({ rol_id: roleId }),
    }
  );

  return normalizeUser(response.usuario);
}

export async function deleteUsuario(
  userId: number
): Promise<void> {
  await apiRequest<{ mensaje: string }>(
    `/usuarios/${userId}`,
    { method: "DELETE" }
  );
}
