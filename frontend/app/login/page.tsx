"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { getDashboardPathByRole, mockLogin, saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [correo, setCorreo] = useState("admin@unsaac.edu.pe");
  const [password, setPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberSession, setRememberSession] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await mockLogin({ correo, password });

      saveSession(
        response.user,
        response.token,
        rememberSession,
        response.sessionUser
      );

      const redirectTo = getDashboardPathByRole(response.user.rol);
      router.replace(redirectTo);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #061B34 0%, #0A2E52 55%, #0D385F 100%)",
      }}
    >
      {/* Decoración de fondo: sin los 3 circulitos superiores */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-unsaac-blue/10" />
      <div className="pointer-events-none absolute right-[-120px] top-[95px] h-[260px] w-[260px] rounded-full bg-[#7FAAE9]/10" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-80px] h-[520px] w-[520px] rounded-full bg-unsaac-orange/10" />

      <div className="pointer-events-none absolute left-0 top-0 h-[230px] w-full opacity-[0.045]">
        <div className="h-full w-full rounded-b-[50%] bg-white" />
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-full opacity-[0.045]">
        <div className="h-full w-full rounded-t-[50%] bg-white" />
      </div>

      {/* Header superior */}
      <header className="relative z-10 flex h-[130px] items-center px-12">
        <div className="flex items-center">
          <Image
            src="/images/logo-unsaac.png"
            alt="Universidad Nacional de San Antonio Abad del Cusco"
            width={280}
            height={95}
            priority
            className="h-[90px] w-auto max-w-[280px] object-contain"
          />
        </div>

        <div className="ml-10 h-14 w-[3px] rounded-full bg-unsaac-orange" />

        <div className="ml-9">
          <h2 className="text-[30px] font-extrabold">
            Control de Asistencia Docente
          </h2>
          <p className="mt-2 text-sm font-semibold text-blue-100">
            Sistema de autenticación institucional biométrica
          </p>
        </div>

        <div className="ml-auto hidden items-center gap-3 rounded-full border border-[#376BA9] bg-[#102C50] px-7 py-3 text-sm font-bold text-[#A9C8F7] xl:flex">
          <LockIcon className="h-5 w-5" />
          Sistema biométrico
        </div>
      </header>

      {/* Contenido principal */}
      <section className="relative z-10 grid min-h-[calc(100vh-130px)] grid-cols-1 items-center gap-10 px-12 pb-12 lg:grid-cols-[1fr_520px]">
        {/* Zona informativa izquierda */}
        <div className="max-w-[760px]">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-extrabold text-blue-100 shadow-lg">
            <span className="h-2.5 w-2.5 rounded-full bg-unsaac-orange" />
            Plataforma institucional UNSAAC
          </div>

          <h2 className="text-[58px] font-extrabold leading-[1.05] tracking-[-0.04em]">
            Gestión moderna de asistencia docente
          </h2>

          <p className="mt-7 max-w-[650px] text-lg font-semibold leading-8 text-blue-100">
            Registre, supervise y consulte la asistencia docente mediante un
            sistema web seguro, preparado para integración biométrica y reportes
            institucionales.
          </p>

          <div className="mt-10 grid max-w-[680px] grid-cols-3 gap-4">
            <InfoCard value="186" label="Docentes registrados" />
            <InfoCard value="12" label="Dispositivos activos" />
            <InfoCard value="24/7" label="Monitoreo continuo" />
          </div>

          <div className="mt-10 grid max-w-[680px] grid-cols-2 gap-4">
            <FeatureItem
              title="Acceso por roles"
              description="Administrador, docente y supervisor."
            />
            <FeatureItem
              title="Reportes preparados"
              description="Datos listos para conexión al backend."
            />
          </div>
        </div>

        {/* Formulario */}
        <div className="mx-auto w-full max-w-[520px]">
          <div className="rounded-[32px] border border-white/20 bg-white/95 p-8 text-unsaac-text shadow-2xl backdrop-blur">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-unsaac-orange text-3xl font-extrabold text-white shadow-lg">
                U
              </div>

              <h1 className="text-[34px] font-extrabold">
                Iniciar sesión
              </h1>

              <p className="mt-3 text-sm font-semibold leading-6 text-unsaac-muted">
                Acceda al Sistema de Control de Asistencia Biométrica - UNSAAC.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                  Correo institucional
                </label>

                <div className="relative">
                  <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-unsaac-muted" />

                  <input
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    className="h-13 w-full rounded-2xl border border-unsaac-border bg-unsaac-content py-3 pl-12 pr-4 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                    placeholder="usuario@unsaac.edu.pe"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                  Contraseña
                </label>

                <div className="relative">
                  <LockIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-unsaac-muted" />

                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-13 w-full rounded-2xl border border-unsaac-border bg-unsaac-content py-3 pl-12 pr-12 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                    placeholder="Ingrese su contraseña"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-unsaac-muted transition hover:text-unsaac-text"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm font-bold text-unsaac-muted">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-unsaac-border"
                    checked={rememberSession}
                    onChange={(event) =>
                      setRememberSession(event.target.checked)
                    }
                  />
                  Recordar sesión
                </label>

                <Link
                  href="/login/recuperar-contrasena"
                  className="text-sm font-extrabold text-unsaac-blue hover:underline"
                >
                  ¿Olvidó su contraseña?
                </Link>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-unsaac-red">
                  {error}
                </div>
              )}

              <Button type="submit" fullWidth disabled={loading} size="lg">
                {loading ? "Validando acceso..." : "Ingresar al sistema"}
              </Button>
            </form>

            <div className="mt-8 rounded-2xl border border-unsaac-border bg-unsaac-content-soft p-5">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-[0.16em] text-unsaac-muted">
                Usuarios de prueba
              </p>

              <div className="space-y-2 text-xs font-semibold text-unsaac-muted">
                <p>
                  <span className="font-extrabold text-unsaac-text">
                    Administrador:
                  </span>{" "}
                  admin@unsaac.edu.pe
                </p>

                <p>
                  <span className="font-extrabold text-unsaac-text">
                    Docente:
                  </span>{" "}
                  mquispe@unsaac.edu.pe
                </p>

                <p>
                  <span className="font-extrabold text-unsaac-text">
                    Supervisor:
                  </span>{" "}
                  aquispe@unsaac.edu.pe
                </p>

                <p>
                  <span className="font-extrabold text-unsaac-text">
                    Contraseña:
                  </span>{" "}
                  123456
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-semibold text-blue-100">
            Universidad Nacional de San Antonio Abad del Cusco
          </p>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur">
      <p className="text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-2 text-sm font-semibold leading-5 text-blue-100">
        {label}
      </p>
    </div>
  );
}

function FeatureItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-unsaac-orange/20 text-unsaac-orange">
        ✓
      </div>
      <p className="text-base font-extrabold text-white">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-blue-100">
        {description}
      </p>
    </div>
  );
}


function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.36 5.3A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-3.06 3.98M6.6 6.6C4.2 8.1 2 12 2 12s3.5 7 10 7a9.9 9.9 0 0 0 4.24-.94"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 7l8 6 8-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
