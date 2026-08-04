"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  getDashboardPathByRole,
  normalizeUserRole,
  saveSession,
} from "@/lib/auth";

import type { BackendLoginUser } from "@/lib/auth";

export type UserData = BackendLoginUser;

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

const DEFAULT_MESSAGE: LoginMessage = {
  html: '<i class="fas fa-shield-alt"></i> Sistema seguro · datos biométricos protegidos',
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

  const showMsg = (
    html: string,
    type: MessageType
  ) => setMessage({ html, type });

  const togglePassword = () =>
    setShowPassword((value) => !value);

  const handleForgot = (
    event: React.MouseEvent
  ) => {
    event.preventDefault();

    showMsg(
      '<i class="fas fa-fingerprint"></i> Comuníquese con el administrador del sistema para restablecer sus credenciales o enrolamiento biométrico.',
      ""
    );
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

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

      const data =
        (await response.json()) as LoginResponse;

      if (!response.ok) {
        showMsg(
          `<i class="fas fa-times-circle"></i> ${
            data.error ??
            "Credenciales incorrectas."
          }`,
          "error"
        );
        setLoading(false);
        return;
      }

      const normalizedRole =
        normalizeUserRole(data.user.rol);

      saveSession(
        data.user,
        data.token,
        rememberSession,
        data.user
      );

      showMsg(
        `<i class="fas fa-check-circle"></i> Bienvenido/a <strong>${data.user.nombres} ${data.user.apellidos}</strong> · ${data.user.rol}. Redirigiendo...`,
        "success"
      );

      router.replace(
        getDashboardPathByRole(normalizedRole)
      );
    } catch {
      showMsg(
        '<i class="fas fa-exclamation-triangle"></i> No se pudo conectar con el servidor. Intente nuevamente.',
        "error"
      );

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
