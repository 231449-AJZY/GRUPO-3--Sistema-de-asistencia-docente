"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface UserData {
  nombres: string;
  apellidos: string;
  rol: "Administrador" | "Docente" | "Supervisor" | string;
}

interface LoginResponse {
  token: string;
  user: UserData;
  error?: string;
}

export type MessageType = "error" | "success" | "";

export interface LoginMessage {
  html: string;
  type: MessageType;
}

// ── Constantes ─────────────────────────────────────────────────────────────

const ROLE_ROUTES: Record<string, string> = {
  Administrador: "/login/PanelAdmin",
  Docente:       "/login/PanelDocente",
  Supervisor:    "/login/PanelSupervisor",
};

const DEFAULT_MESSAGE: LoginMessage = {
  html: '<i class="fas fa-shield-alt"></i> Sistema seguro · datos biométricos protegidos',
  type: "",
};

// ── Hook ───────────────────────────────────────────────────────────────────

export function useLogin() {
  const router = useRouter();

  const [username,        setUsername]        = useState("");
  const [password,        setPassword]        = useState("");
  const [role, setRole] = useState("");             
  const [showPassword,    setShowPassword]    = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [message,         setMessage]         = useState<LoginMessage>(DEFAULT_MESSAGE);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const showMsg = (html: string, type: MessageType) =>
    setMessage({ html, type });

  const togglePassword = () => setShowPassword((v) => !v);

  const handleForgot = (e: React.MouseEvent) => {
    e.preventDefault();
    showMsg(
      '<i class="fas fa-fingerprint"></i> Comuníquese con el administrador del sistema para restablecer sus credenciales o enrolamiento biométrico.',
      ""
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      showMsg(
        '<i class="fas fa-exclamation-triangle"></i> Por favor ingrese usuario y contraseña.',
        "error"
      );
      return;
    }

    setLoading(true);
    showMsg(
      '<i class="fas fa-circle-notch fa-spin"></i> Verificando credenciales...',
      ""
    );

    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok) {
        showMsg(
          `<i class="fas fa-times-circle"></i> ${data.error ?? "Credenciales incorrectas."}`,
          "error"
        );
        return;
      }

      // Persistir sesión según preferencia del usuario
      const storage = rememberSession ? localStorage : sessionStorage;
      storage.setItem("token", data.token);
      storage.setItem("user",  JSON.stringify(data.user));

      showMsg(
        `<i class="fas fa-check-circle"></i> Bienvenido/a <strong>${data.user.nombres} ${data.user.apellidos}</strong> · ${data.user.rol}. Redirigiendo...`,
        "success"
      );

      setTimeout(() => {
        router.push(ROLE_ROUTES[data.user.rol] ?? "/dashboard");
      }, 1200);

    } catch {
      showMsg(
        '<i class="fas fa-exclamation-triangle"></i> No se pudo conectar con el servidor. Intente nuevamente.',
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── API pública del hook ──────────────────────────────────────────────────

  return {
    // Estado del formulario
    username,
    password,
    showPassword,
    rememberSession,
    loading,
    message,
    role,
    setRole,
    // Setters simples
    setUsername,
    setPassword,
    setRememberSession,
    // Handlers
    togglePassword,
    handleForgot,
    handleSubmit,
  };
}