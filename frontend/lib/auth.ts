"use client";

import type { UsuarioActivo, UserRole } from "@/types/usuario";

export type SessionPersistence = "local" | "session";

export interface BackendLoginUser {
  id: number;
  usuario_id?: number;
  docente_id?: number | null;
  nombres: string;
  apellidos: string;
  email: string;
  codigo?: string;
  rol: string;
}

export interface LegacySessionUser {
  id: number;
  usuario_id: number;
  docente_id: number | null;
  nombres: string;
  apellidos: string;
  email: string;
  correo: string;
  codigo?: string;
  rol: "Administrador" | "Docente" | "Supervisor";
}

type SessionUserInput =
  | UsuarioActivo
  | BackendLoginUser
  | LegacySessionUser;

export interface LoginPayload {
  correo: string;
  password: string;
}

export interface LoginResult {
  user: UsuarioActivo;
  sessionUser: BackendLoginUser;
  token: string;
}

export interface AuthSession {
  user: UsuarioActivo;
  legacyUser: LegacySessionUser;
  userId: number;
  teacherId: number | null;
  token: string;
  persistence: SessionPersistence;
}

interface LoginApiResponse {
  user?: BackendLoginUser;
  token?: string;
  error?: string;
}

const STORAGE_KEYS = {
  canonicalUser: "unsaac_user",
  canonicalToken: "unsaac_token",
  legacyUser: "user",
  legacyToken: "token",
} as const;

const ALL_STORAGE_KEYS = Object.values(STORAGE_KEYS);

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined";
}

function getStorages(): Array<{
  storage: Storage;
  persistence: SessionPersistence;
}> {
  if (!canUseBrowserStorage()) {
    return [];
  }

  return [
    { storage: window.localStorage, persistence: "local" },
    { storage: window.sessionStorage, persistence: "session" },
  ];
}

function safeParse<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function normalizeUserRole(role: string): UserRole {
  const normalized = role.trim().toUpperCase();

  if (normalized === "ADMINISTRADOR") {
    return "ADMINISTRADOR";
  }

  if (normalized === "DOCENTE") {
    return "DOCENTE";
  }

  if (normalized === "SUPERVISOR") {
    return "SUPERVISOR";
  }

  throw new Error(`Rol no reconocido: ${role}`);
}

function toLegacyRole(
  role: UserRole
): LegacySessionUser["rol"] {
  if (role === "ADMINISTRADOR") {
    return "Administrador";
  }

  if (role === "DOCENTE") {
    return "Docente";
  }

  return "Supervisor";
}

function isCanonicalUser(
  user: SessionUserInput
): user is UsuarioActivo {
  return "nombre" in user && "correo" in user;
}

function toPositiveInteger(value: unknown): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function getUserIdFromInput(
  user: SessionUserInput
): number {
  const explicitUserId =
    "usuario_id" in user
      ? toPositiveInteger(user.usuario_id)
      : null;

  const fallbackId = toPositiveInteger(user.id);
  const userId = explicitUserId ?? fallbackId;

  if (!userId) {
    throw new Error(
      "La sesión almacenada no contiene un usuario_id válido."
    );
  }

  return userId;
}

function getTeacherIdFromInput(
  user?: SessionUserInput | null
): number | null {
  if (!user || !("docente_id" in user)) {
    return null;
  }

  return toPositiveInteger(user.docente_id);
}

function getEmailFromUser(
  user: SessionUserInput
): string {
  const email =
    ("email" in user &&
    typeof user.email === "string"
      ? user.email
      : "") ||
    ("correo" in user &&
    typeof user.correo === "string"
      ? user.correo
      : "");

  const cleanEmail = email.trim();

  if (!cleanEmail) {
    throw new Error(
      "La sesión almacenada no contiene un correo válido."
    );
  }

  return cleanEmail;
}

function toCanonicalUser(
  user: SessionUserInput
): UsuarioActivo {
  if (isCanonicalUser(user)) {
    return {
      id: getUserIdFromInput(user),
      nombre: user.nombre.trim(),
      correo: getEmailFromUser(user),
      rol: normalizeUserRole(user.rol),
    };
  }

  return {
    id: getUserIdFromInput(user),
    nombre: `${user.nombres} ${user.apellidos}`.trim(),
    correo: getEmailFromUser(user),
    rol: normalizeUserRole(user.rol),
  };
}

function splitDisplayName(nombre: string): {
  nombres: string;
  apellidos: string;
} {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { nombres: "Usuario", apellidos: "" };
  }

  if (parts.length === 1) {
    return { nombres: parts[0], apellidos: "" };
  }

  return {
    nombres: parts[0],
    apellidos: parts.slice(1).join(" "),
  };
}

function toLegacyUser(
  user: SessionUserInput,
  sourceUser?: BackendLoginUser
): LegacySessionUser {
  const canonical = toCanonicalUser(user);
  const source =
    sourceUser ??
    (isCanonicalUser(user) ? null : user);

  const splitName = splitDisplayName(canonical.nombre);
  const email = source
    ? getEmailFromUser(source)
    : canonical.correo;

  const userId = source
    ? getUserIdFromInput(source)
    : canonical.id;

  return {
    id: userId,
    usuario_id: userId,
    docente_id: getTeacherIdFromInput(source),
    nombres: source?.nombres?.trim() || splitName.nombres,
    apellidos: source?.apellidos?.trim() || splitName.apellidos,
    email,
    correo: email,
    codigo: source?.codigo,
    rol: toLegacyRole(canonical.rol),
  };
}

function readToken(storage: Storage): string | null {
  return (
    storage.getItem(STORAGE_KEYS.canonicalToken) ??
    storage.getItem(STORAGE_KEYS.legacyToken)
  );
}

function decodeJwtExpiration(token: string): number | null {
  const [, payload] = token.split(".");

  if (!payload || !canUseBrowserStorage()) {
    return null;
  }

  try {
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "="
    );

    const parsed = JSON.parse(
      window.atob(padded)
    ) as { exp?: number };

    return typeof parsed.exp === "number"
      ? parsed.exp * 1000
      : null;
  } catch {
    return null;
  }
}

export async function mockLogin({
  correo,
  password,
}: LoginPayload): Promise<LoginResult> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: correo.trim(),
      password,
    }),
  });

  let data: LoginApiResponse;

  try {
    data = (await response.json()) as LoginApiResponse;
  } catch {
    throw new Error(
      "El servidor devolvió una respuesta no válida."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Credenciales incorrectas"
    );
  }

  if (!data.user || !data.token) {
    throw new Error(
      "La respuesta de autenticación está incompleta."
    );
  }

  return {
    user: toCanonicalUser(data.user),
    sessionUser: data.user,
    token: data.token,
  };
}

export function getDashboardPathByRole(
  role: UserRole
): string {
  if (role === "ADMINISTRADOR") {
    return "/admin/dashboard";
  }

  if (role === "DOCENTE") {
    return "/docente/dashboard";
  }

  return "/supervisor/dashboard";
}

export function saveSession(
  user: SessionUserInput,
  token: string,
  rememberSession = true,
  sourceUser?: BackendLoginUser
): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  const cleanToken = token.trim();

  if (!cleanToken) {
    throw new Error(
      "No se recibió un token de autenticación válido."
    );
  }

  const canonicalUser = toCanonicalUser(user);
  const legacyUser = toLegacyUser(user, sourceUser);

  clearSession();

  const storage = rememberSession
    ? window.localStorage
    : window.sessionStorage;

  storage.setItem(
    STORAGE_KEYS.canonicalUser,
    JSON.stringify(canonicalUser)
  );

  storage.setItem(
    STORAGE_KEYS.canonicalToken,
    cleanToken
  );

  // Compatibilidad temporal con las pantallas heredadas de L00S3RR.
  storage.setItem(
    STORAGE_KEYS.legacyUser,
    JSON.stringify(legacyUser)
  );

  storage.setItem(
    STORAGE_KEYS.legacyToken,
    cleanToken
  );
}

export function getSession(): AuthSession | null {
  for (const { storage, persistence } of getStorages()) {
    const token = readToken(storage);

    if (!token) {
      continue;
    }

    const canonicalStored = safeParse<UsuarioActivo>(
      storage.getItem(STORAGE_KEYS.canonicalUser)
    );

    const legacyStored = safeParse<LegacySessionUser>(
      storage.getItem(STORAGE_KEYS.legacyUser)
    );

    try {
      const canonicalUser = canonicalStored
        ? toCanonicalUser(canonicalStored)
        : legacyStored
          ? toCanonicalUser({
              id:
                legacyStored.usuario_id ??
                legacyStored.id,
              usuario_id:
                legacyStored.usuario_id ??
                legacyStored.id,
              docente_id:
                legacyStored.docente_id ?? null,
              nombres: legacyStored.nombres,
              apellidos: legacyStored.apellidos,
              email:
                legacyStored.email ||
                legacyStored.correo,
              codigo: legacyStored.codigo,
              rol: legacyStored.rol,
            })
          : null;

      if (!canonicalUser) {
        continue;
      }

      const legacyUser = legacyStored
        ? toLegacyUser(legacyStored)
        : toLegacyUser(canonicalUser);

      const userId =
        toPositiveInteger(legacyStored?.usuario_id) ??
        canonicalUser.id;

      const teacherId =
        toPositiveInteger(legacyStored?.docente_id) ??
        null;

      return {
        user: canonicalUser,
        legacyUser,
        userId,
        teacherId,
        token,
        persistence,
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function getToken(): string | null {
  return getSession()?.token ?? null;
}

export function getCurrentUser(): UsuarioActivo | null {
  return getSession()?.user ?? null;
}

export function getUserId(): number | null {
  return getSession()?.userId ?? null;
}

export function getTeacherId(): number | null {
  return getSession()?.teacherId ?? null;
}

export function getLegacyUser(): LegacySessionUser | null {
  return getSession()?.legacyUser ?? null;
}

export function hasValidSession(
  expectedRole?: UserRole
): boolean {
  const session = getSession();

  if (!session) {
    return false;
  }

  if (
    expectedRole &&
    session.user.rol !== expectedRole
  ) {
    return false;
  }

  const expiration = decodeJwtExpiration(session.token);

  return expiration === null || expiration > Date.now();
}

export function clearSession(): void {
  for (const { storage } of getStorages()) {
    for (const key of ALL_STORAGE_KEYS) {
      storage.removeItem(key);
    }
  }
}
