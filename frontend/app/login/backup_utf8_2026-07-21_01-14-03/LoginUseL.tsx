"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

const ROLE_ROUTES: Record<string, string> = {
  Administrador: "/admin/dashboard",
  Docente: "/login/PanelDocente",
  Supervisor: "/login/PanelSupervisor",
};

const DEFAULT_MESSAGE: LoginMessage = {
  html: '<i class="fas fa-shield-alt"></i> Sistema seguro Â· datos biomÃ©tricos protegidos',
  type: "",
};

export function useLogin() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] =
    useState<LoginMessage>(DEFAULT_MESSAGE);

  const showMsg = (html: string, type: MessageType) =>
    setMessage({ html, type });

  const togglePassword = () =>
    setShowPassword((value) => !value);

  const handleForgot = (event: React.MouseEvent) => {
    event.preventDefault();

    showMsg(
      '<i class="fas fa-fingerprint"></i> ComunÃ­quese con el administrador del sistema para restablecer sus credenciales o enrolamiento biomÃ©trico.',
      ""
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      showMsg(
        '<i class="fas fa-exclamation-triangle"></i> Por favor ingrese usuario y contraseÃ±a.',
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        showMsg(
          `<i class="fas fa-times-circle"></i> ${
            data.error ?? "Credenciales incorrectas."
          }`,
          "error"
        );
        return;
      }

      const storage = rememberSession
        ? localStorage
        : sessionStorage;

      const alternateStorage = rememberSession
        ? sessionStorage
        : localStorage;

      alternateStorage.removeItem("token");
      alternateStorage.removeItem("user");

      storage.setItem("token", data.token);
      storage.setItem("user", JSON.stringify(data.user));

      showMsg(
        `<i class="fas fa-check-circle"></i> Bienvenido/a <strong>${data.user.nombres} ${data.user.apellidos}</strong> Â· ${data.user.rol}. Redirigiendo...`,
        "success"
      );

      window.setTimeout(() => {
        router.push(
          ROLE_ROUTES[data.user.rol] ?? "/dashboard"
        );
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

  return {
    username,
    password,
    showPassword,
    rememberSession,
    loading,
    message,
    role,
    setRole,
    setUsername,
    setPassword,
    setRememberSession,
    togglePassword,
    handleForgot,
    handleSubmit,
  };
}
