"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { requestPasswordReset } from "@/lib/auth";

export default function RecuperarContrasenaPage() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await requestPasswordReset({ correo });
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar la solicitud"
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
      {/* Decoración de fondo */}
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
        <Image
          src="/logo-unsaac.png"
          alt="UNSAAC - Universidad Nacional de San Antonio Abad del Cusco"
          width={191}
          height={68}
          priority
        />

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
            Recupera el acceso a tu cuenta institucional
          </h2>

          <p className="mt-7 max-w-[650px] text-lg font-semibold leading-8 text-blue-100">
            Verifique su identidad mediante su correo institucional para
            restablecer su contraseña de forma segura y rápida.
          </p>

          <div className="mt-10 grid max-w-[680px] grid-cols-3 gap-4">
            <InfoCard value="186" label="Docentes registrados" />
            <InfoCard value="12" label="Dispositivos activos" />
            <InfoCard value="24/7" label="Monitoreo continuo" />
          </div>

          <div className="mt-10 grid max-w-[680px] grid-cols-2 gap-4">
            <FeatureItem
              title="Verificación segura"
              description="Proceso de confirmación institucional."
            />
            <FeatureItem
              title="Correo institucional"
              description="Enlace de recuperación enviado."
            />
          </div>
        </div>

        {/* Tarjeta de recuperación */}
        <div className="mx-auto w-full max-w-[520px]">
          <div className="rounded-[32px] border border-white/20 bg-white/95 p-8 text-unsaac-text shadow-2xl backdrop-blur">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[24px] bg-unsaac-orange text-white shadow-lg">
                <MailIcon className="h-9 w-9" />
              </div>

              <h1 className="text-[34px] font-extrabold">
                Recuperar contraseña
              </h1>

              <p className="mt-3 text-sm font-semibold leading-6 text-unsaac-muted">
                Ingrese su correo institucional para recibir instrucciones de
                recuperación.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-extrabold text-unsaac-text">
                  Correo institucional
                </label>

                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-unsaac-muted" />

                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                    className="h-13 w-full rounded-2xl border border-unsaac-border bg-unsaac-content py-3 pl-12 pr-4 text-sm font-semibold text-unsaac-text outline-none transition focus:border-unsaac-blue focus:ring-4 focus:ring-blue-100"
                    placeholder="usuario@unsaac.edu.pe"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-unsaac-red">
                  {error}
                </div>
              )}

              {sent && (
                <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-unsaac-green">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>
                    Solicitud enviada correctamente.
                    <br />
                    Revise su correo institucional.
                  </span>
                </div>
              )}

              <Button type="submit" fullWidth disabled={loading} size="lg">
                {loading ? (
                  "Enviando..."
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    Enviar solicitud
                    <ArrowRightIcon className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <Link
                href="/login"
                className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-unsaac-border bg-white text-sm font-extrabold text-unsaac-text transition hover:bg-unsaac-content-soft"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </form>

            <div className="mt-8 rounded-2xl border border-unsaac-border bg-unsaac-content-soft p-5">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-unsaac-muted">
                ¿Necesita ayuda?
              </p>

              <p className="text-xs font-semibold leading-5 text-unsaac-muted">
                Si no recibe el correo en 5 minutos, revise su carpeta de spam
                o contacte a soporte técnico:{" "}
                <a
                  href="mailto:soporte@unsaac.edu.pe"
                  className="font-extrabold text-unsaac-blue hover:underline"
                >
                  soporte@unsaac.edu.pe
                </a>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-semibold text-blue-100">
            Universidad Nacional de San Antonio Abad del Cusco
            <br />
            Recuperación de acceso segura mediante verificación de correo
            institucional
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

function EnvelopeIcon({ className }: { className?: string }) {
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="m8.5 12.5 2.5 2.5 4.5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
