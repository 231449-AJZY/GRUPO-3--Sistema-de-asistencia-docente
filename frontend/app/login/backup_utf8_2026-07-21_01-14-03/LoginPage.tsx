"use client";

import Image from "next/image";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { useLogin } from "./LoginUseL";
import styles from "./LoginPage.module.css";

type IconProps = {
  className?: string;
};

type FeatureProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

function messageToPlainText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function usePremiumMotion(
  rootRef: React.RefObject<HTMLElement | null>,
  cardRef: React.RefObject<HTMLDivElement | null>,
  buttonRef: React.RefObject<HTMLButtonElement | null>
) {
  useEffect(() => {
    const root = rootRef.current;
    const card = cardRef.current;
    const button = buttonRef.current;

    if (!root || !card || !button) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      return;
    }

    let frameId = 0;
    let virtualScroll = clamp(window.scrollY, 0, 160);

    const pointerTarget = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.4,
    };

    const pointerCurrent = { ...pointerTarget };

    const cardTarget = {
      rotateX: 0,
      rotateY: 0,
      lift: 0,
    };

    const cardCurrent = { ...cardTarget };

    const buttonTarget = {
      x: 0,
      y: 0,
      glowX: 50,
      glowY: 50,
    };

    const buttonCurrent = { ...buttonTarget };

    const updateFrame = () => {
      pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.075;
      pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.075;

      cardCurrent.rotateX +=
        (cardTarget.rotateX - cardCurrent.rotateX) * 0.095;
      cardCurrent.rotateY +=
        (cardTarget.rotateY - cardCurrent.rotateY) * 0.095;
      cardCurrent.lift += (cardTarget.lift - cardCurrent.lift) * 0.1;

      buttonCurrent.x += (buttonTarget.x - buttonCurrent.x) * 0.14;
      buttonCurrent.y += (buttonTarget.y - buttonCurrent.y) * 0.14;
      buttonCurrent.glowX +=
        (buttonTarget.glowX - buttonCurrent.glowX) * 0.12;
      buttonCurrent.glowY +=
        (buttonTarget.glowY - buttonCurrent.glowY) * 0.12;

      const normalizedX =
        pointerCurrent.x / Math.max(window.innerWidth, 1) - 0.5;
      const normalizedY =
        pointerCurrent.y / Math.max(window.innerHeight, 1) - 0.5;

      const scrollProgress = clamp(
        (window.scrollY + virtualScroll) / 220,
        0,
        1
      );

      root.style.setProperty("--mouse-x", `${pointerCurrent.x}px`);
      root.style.setProperty("--mouse-y", `${pointerCurrent.y}px`);
      root.style.setProperty("--pointer-x", normalizedX.toFixed(4));
      root.style.setProperty("--pointer-y", normalizedY.toFixed(4));
      root.style.setProperty(
        "--scroll-progress",
        scrollProgress.toFixed(4)
      );

      card.style.setProperty(
        "--card-rx",
        `${cardCurrent.rotateX.toFixed(3)}deg`
      );
      card.style.setProperty(
        "--card-ry",
        `${cardCurrent.rotateY.toFixed(3)}deg`
      );
      card.style.setProperty(
        "--card-lift",
        `${cardCurrent.lift.toFixed(3)}px`
      );

      button.style.setProperty(
        "--magnetic-x",
        `${buttonCurrent.x.toFixed(3)}px`
      );
      button.style.setProperty(
        "--magnetic-y",
        `${buttonCurrent.y.toFixed(3)}px`
      );
      button.style.setProperty(
        "--button-glow-x",
        `${buttonCurrent.glowX.toFixed(2)}%`
      );
      button.style.setProperty(
        "--button-glow-y",
        `${buttonCurrent.glowY.toFixed(2)}%`
      );

      frameId = window.requestAnimationFrame(updateFrame);
    };

    const handleWindowPointerMove = (event: PointerEvent) => {
      pointerTarget.x = event.clientX;
      pointerTarget.y = event.clientY;
    };

    const handleScroll = () => {
      virtualScroll = clamp(window.scrollY, 0, 160);
    };

    const handleWheel = (event: WheelEvent) => {
      virtualScroll = clamp(
        virtualScroll + event.deltaY * 0.065,
        0,
        160
      );
    };

    const handleCardPointerMove = (event: PointerEvent) => {
      const bounds = card.getBoundingClientRect();
      const relativeX = (event.clientX - bounds.left) / bounds.width;
      const relativeY = (event.clientY - bounds.top) / bounds.height;

      cardTarget.rotateY = clamp((relativeX - 0.5) * 4.2, -2.1, 2.1);
      cardTarget.rotateX = clamp((0.5 - relativeY) * 3.4, -1.7, 1.7);
      cardTarget.lift = -4;
    };

    const handleCardPointerLeave = () => {
      cardTarget.rotateX = 0;
      cardTarget.rotateY = 0;
      cardTarget.lift = 0;
    };

    const handleButtonPointerMove = (event: PointerEvent) => {
      const bounds = button.getBoundingClientRect();
      const offsetX = event.clientX - (bounds.left + bounds.width / 2);
      const offsetY = event.clientY - (bounds.top + bounds.height / 2);

      buttonTarget.x = clamp(offsetX * 0.055, -4, 4);
      buttonTarget.y = clamp(offsetY * 0.085, -3, 3);
      buttonTarget.glowX = clamp(
        ((event.clientX - bounds.left) / bounds.width) * 100,
        0,
        100
      );
      buttonTarget.glowY = clamp(
        ((event.clientY - bounds.top) / bounds.height) * 100,
        0,
        100
      );
    };

    const handleButtonPointerLeave = () => {
      buttonTarget.x = 0;
      buttonTarget.y = 0;
      buttonTarget.glowX = 50;
      buttonTarget.glowY = 50;
    };

    window.addEventListener(
      "pointermove",
      handleWindowPointerMove,
      { passive: true }
    );
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });

    card.addEventListener("pointermove", handleCardPointerMove);
    card.addEventListener("pointerleave", handleCardPointerLeave);
    button.addEventListener("pointermove", handleButtonPointerMove);
    button.addEventListener("pointerleave", handleButtonPointerLeave);

    frameId = window.requestAnimationFrame(updateFrame);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener(
        "pointermove",
        handleWindowPointerMove
      );
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);

      card.removeEventListener(
        "pointermove",
        handleCardPointerMove
      );
      card.removeEventListener(
        "pointerleave",
        handleCardPointerLeave
      );
      button.removeEventListener(
        "pointermove",
        handleButtonPointerMove
      );
      button.removeEventListener(
        "pointerleave",
        handleButtonPointerLeave
      );
    };
  }, [buttonRef, cardRef, rootRef]);
}

export default function LoginPage() {
  const {
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
  } = useLogin();

  const rootRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const [capsLockActive, setCapsLockActive] = useState(false);

  usePremiumMotion(rootRef, cardRef, buttonRef);

  const safeMessage = useMemo(
    () => messageToPlainText(message.html),
    [message.html]
  );

  const isError = message.type === "error";
  const isSuccess = message.type === "success";

  const handleRoleChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setRole(event.target.value);

    roleRef.current?.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(-2px) scale(1.012)" },
        { transform: "translateY(0) scale(1)" },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(.22, 1, .36, 1)",
      }
    );
  };

  return (
    <main ref={rootRef} className={styles.page}>
      <AnimatedBackground />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <div className={styles.logoShell}>
              <span className={styles.logoLight} aria-hidden="true" />
              <Image
                src="/images/logo-unsaac.png"
                alt="Universidad Nacional de San Antonio Abad del Cusco"
                width={285}
                height={88}
                priority
                className={styles.logoImage}
              />
            </div>

            <div className={styles.universityText}>
              <p className={styles.universityName}>
                Universidad Nacional de San Antonio Abad del Cusco
              </p>
              <p className={styles.universitySubtitle}>
                Excelencia acadÃ©mica e innovaciÃ³n institucional
              </p>
            </div>
          </div>

          <span className={styles.headerDivider} aria-hidden="true" />

          <div className={styles.systemTitleBlock}>
            <h1 className={styles.systemTitle}>
              Control de Asistencia Docente
            </h1>
            <p className={styles.systemSubtitle}>
              Plataforma institucional de autenticaciÃ³n biomÃ©trica
            </p>
          </div>

          <div
            className={styles.availabilityBadge}
            aria-label="Estado del sistema: disponible"
          >
            <span className={styles.statusDot} aria-hidden="true">
              <span className={styles.statusPing} />
              <span className={styles.statusCore} />
            </span>
            <ShieldCheckIcon className={styles.badgeIcon} />
            <span>Sistema disponible</span>
          </div>
        </div>
      </header>

      <section className={styles.main}>
        <aside
          className={`${styles.biometricPanel} ${styles.leftPanel}`}
          aria-label="TecnologÃ­a biomÃ©trica institucional"
        >
          <div className={styles.biometricScene}>
            <span
              className={`${styles.depthLayer} ${styles.depthOne}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.depthLayer} ${styles.depthTwo}`}
              aria-hidden="true"
            />

            <div
              className={`${styles.ring} ${styles.ringOuter}`}
              aria-hidden="true"
            />
            <div
              className={`${styles.ring} ${styles.ringMiddle}`}
              aria-hidden="true"
            />
            <div
              className={`${styles.ring} ${styles.ringInner}`}
              aria-hidden="true"
            />

            <div className={styles.fingerprintCore}>
              <span className={styles.scannerLine} aria-hidden="true" />
              <FingerprintIcon className={styles.fingerprintIcon} />

              <div
                className={styles.biometricParticles}
                aria-hidden="true"
              >
                {Array.from({ length: 10 }, (_, index) => (
                  <span key={index} className={styles.bioParticle} />
                ))}
              </div>
            </div>
          </div>

          <div className={styles.panelCopy}>
            <p className={styles.panelEyebrow}>
              ValidaciÃ³n biomÃ©trica institucional
            </p>
            <h2 className={styles.panelTitle}>
              Identidad segura, acceso confiable
            </h2>
            <p className={styles.panelDescription}>
              ProtecciÃ³n de credenciales, trazabilidad de accesos y
              preparaciÃ³n para reconocimiento biomÃ©trico docente.
            </p>
          </div>

          <div className={styles.biometricFacts}>
            <Feature
              icon={<FingerprintIcon className={styles.factSvg} />}
              title="Huella digital"
              description="ValidaciÃ³n de identidad institucional."
            />
            <Feature
              icon={<ShieldIcon className={styles.factSvg} />}
              title="Datos protegidos"
              description="AutenticaciÃ³n y comunicaciÃ³n segura."
            />
          </div>
        </aside>

        <div className={styles.loginColumn}>
          <div
            ref={cardRef}
            className={[
              styles.loginCard,
              isError ? styles.cardError : "",
              isSuccess ? styles.cardSuccess : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className={styles.cardAmbient} aria-hidden="true" />
            <span className={styles.cardEdgeLight} aria-hidden="true" />

            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>
                  <LockIcon className={styles.cardIconSvg} />
                </div>

                <div>
                  <p className={styles.cardEyebrow}>
                    Acceso institucional
                  </p>
                  <h2 className={styles.cardTitle}>Bienvenido</h2>
                  <p className={styles.cardSubtitle}>
                    Ingrese sus credenciales para continuar al sistema.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className={styles.form}
                noValidate
              >
                <div
                  className={`${styles.inputGroup} ${styles.staggerOne}`}
                >
                  <div className={styles.labelRow}>
                    <label
                      htmlFor="institutional-user"
                      className={styles.label}
                    >
                      Usuario institucional
                    </label>
                    <span className={styles.requiredText}>
                      Correo o cÃ³digo
                    </span>
                  </div>

                  <div
                    className={[
                      styles.fieldShell,
                      username ? styles.fieldFilled : "",
                      isError ? styles.fieldError : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <UserIcon className={styles.fieldIcon} />

                    <input
                      id="institutional-user"
                      type="text"
                      className={styles.input}
                      placeholder="correo@unsaac.edu.pe o cÃ³digo docente"
                      autoComplete="username"
                      value={username}
                      onChange={(event) =>
                        setUsername(event.target.value)
                      }
                      disabled={loading}
                      aria-invalid={isError}
                    />
                  </div>
                </div>

                <div
                  className={`${styles.inputGroup} ${styles.staggerTwo}`}
                >
                  <div className={styles.labelRow}>
                    <label
                      htmlFor="institutional-password"
                      className={styles.label}
                    >
                      ContraseÃ±a
                    </label>
                  </div>

                  <div
                    className={[
                      styles.fieldShell,
                      password ? styles.fieldFilled : "",
                      isError ? styles.fieldError : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <KeyIcon className={styles.fieldIcon} />

                    <input
                      id="institutional-password"
                      type={showPassword ? "text" : "password"}
                      className={styles.input}
                      placeholder="Ingrese su contraseÃ±a"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      onKeyDown={(event) =>
                        setCapsLockActive(
                          event.getModifierState("CapsLock")
                        )
                      }
                      onKeyUp={(event) =>
                        setCapsLockActive(
                          event.getModifierState("CapsLock")
                        )
                      }
                      onBlur={() => setCapsLockActive(false)}
                      disabled={loading}
                      aria-invalid={isError}
                    />

                    <button
                      type="button"
                      className={`${styles.passwordToggle} ${styles.iconInteractive}`}
                      onClick={togglePassword}
                      aria-label={
                        showPassword
                          ? "Ocultar contraseÃ±a"
                          : "Mostrar contraseÃ±a"
                      }
                    >
                      {showPassword ? (
                        <EyeOpenIcon className={styles.toggleIcon} />
                      ) : (
                        <EyeClosedIcon className={styles.toggleIcon} />
                      )}
                    </button>
                  </div>

                  {capsLockActive && (
                    <p className={styles.capsNotice} role="status">
                      <WarningIcon className={styles.capsIcon} />
                      Bloq MayÃºs estÃ¡ activado.
                    </p>
                  )}
                </div>

                <div
                  className={`${styles.optionsRow} ${styles.staggerThree}`}
                >
                  <label className={styles.rememberLabel}>
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(event) =>
                        setRememberSession(event.target.checked)
                      }
                      className={styles.nativeCheckbox}
                    />

                    <span
                      className={styles.checkboxVisual}
                      aria-hidden="true"
                    >
                      <CheckIcon className={styles.checkboxTick} />
                    </span>

                    <span className={styles.rememberText}>
                      <span className={styles.rememberTitle}>
                        Recordar sesiÃ³n
                      </span>
                      <span className={styles.rememberSubtitle}>
                        Mantener el acceso en este dispositivo
                      </span>
                    </span>
                  </label>

                  <button
                    type="button"
                    className={styles.forgotButton}
                    onClick={handleForgot}
                  >
                    Â¿Problemas con sus credenciales?
                  </button>
                </div>

                <div
                  className={`${styles.roleGroup} ${styles.staggerFour}`}
                >
                  <label htmlFor="institutional-role" className={styles.label}>
                    Perfil de acceso
                  </label>

                  <div
                    ref={roleRef}
                    className={styles.roleShell}
                    data-role={role || "default"}
                  >
                    <RoleIcon className={styles.roleIcon} />

                    <select
                      id="institutional-role"
                      className={styles.roleSelect}
                      value={role}
                      onChange={handleRoleChange}
                      disabled={loading}
                      aria-label="Seleccione su perfil de acceso"
                    >
                      <option value="">Seleccione un perfil</option>
                      <option value="docente">Docente</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="administrador">
                        Administrador del sistema
                      </option>
                    </select>

                    <ChevronDownIcon
                      className={styles.selectChevron}
                    />
                  </div>

                  <p className={styles.roleHint}>
                    El sistema validarÃ¡ sus permisos con la cuenta
                    institucional registrada.
                  </p>
                </div>

                <button
                  ref={buttonRef}
                  type="submit"
                  className={[
                    styles.submitButton,
                    isError ? styles.submitError : "",
                    isSuccess ? styles.submitSuccess : "",
                    styles.staggerFive,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  disabled={loading}
                >
                  <span className={styles.buttonShine} aria-hidden="true" />

                  {loading ? (
                    <>
                      <span
                        className={styles.spinner}
                        aria-hidden="true"
                      />
                      <span className={styles.buttonText}>
                        Verificando credenciales...
                      </span>
                    </>
                  ) : (
                    <>
                      <LoginIcon className={styles.buttonIcon} />
                      <span className={styles.buttonText}>
                        Iniciar sesiÃ³n
                      </span>
                      <ArrowRightIcon
                        className={styles.buttonArrow}
                      />
                    </>
                  )}
                </button>

                <div
                  className={[
                    styles.message,
                    message.type === "error"
                      ? styles.messageError
                      : "",
                    message.type === "success"
                      ? styles.messageSuccess
                      : styles.messageNeutral,
                    styles.staggerSix,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role={isError ? "alert" : "status"}
                  aria-live={isError ? "assertive" : "polite"}
                >
                  <span className={styles.messageIcon}>
                    {isError ? (
                      <WarningIcon className={styles.messageSvg} />
                    ) : isSuccess ? (
                      <CheckCircleIcon className={styles.messageSvg} />
                    ) : (
                      <ShieldCheckIcon className={styles.messageSvg} />
                    )}
                  </span>

                  <span className={styles.messageText}>
                    {safeMessage ||
                      "Sistema seguro Â· datos biomÃ©tricos protegidos"}
                  </span>
                </div>
              </form>

              <div className={styles.cardFooter}>
                <ShieldCheckIcon className={styles.footerSecurityIcon} />
                <span>
                  AutenticaciÃ³n institucional protegida mediante JWT y
                  cifrado de contraseÃ±as.
                </span>
              </div>
            </div>
          </div>

          <p className={styles.mobileInstitution}>
            Universidad Nacional de San Antonio Abad del Cusco
          </p>
        </div>

        <aside
          className={`${styles.securityPanel} ${styles.rightPanel}`}
          aria-label="Seguridad de acceso"
        >
          <div className={styles.securityCard}>
            <div className={styles.securityIcon}>
              <ShieldCheckIcon className={styles.securityIconSvg} />
              <span className={styles.securityPulse} aria-hidden="true" />
            </div>

            <p className={styles.panelEyebrow}>Acceso protegido</p>
            <h2 className={styles.securityTitle}>
              Seguridad institucional en cada sesiÃ³n
            </h2>
            <p className={styles.securityDescription}>
              El acceso se valida contra el servidor institucional y
              aplica permisos segÃºn el perfil registrado.
            </p>

            <ul className={styles.securityList}>
              <SecurityItem text="Sesiones con token autenticado" />
              <SecurityItem text="ContraseÃ±as protegidas con bcrypt" />
              <SecurityItem text="Control de acceso por perfiles" />
              <SecurityItem text="Trazabilidad preparada para auditorÃ­a" />
            </ul>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerText}>
            Â© 2026 UNSAAC Â· Sistema de Control de Asistencia Docente
          </p>

          <div className={styles.footerLinks}>
            <button type="button" className={styles.footerLink}>
              Privacidad
            </button>
            <span aria-hidden="true">Â·</span>
            <button type="button" className={styles.footerLink}>
              Soporte TI
            </button>
            <span aria-hidden="true">Â·</span>
            <span>VersiÃ³n institucional</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function AnimatedBackground() {
  return (
    <div className={styles.backgroundLayer} aria-hidden="true">
      <div className={styles.gradientLayer} />
      <div className={styles.gridLayer} />
      <div className={styles.mouseGlow} />

      <span className={`${styles.orb} ${styles.orbOne}`} />
      <span className={`${styles.orb} ${styles.orbTwo}`} />
      <span className={`${styles.orb} ${styles.orbThree}`} />

      <div className={styles.backgroundParticles}>
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className={styles.backgroundParticle} />
        ))}
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className={styles.fact}>
      <span
        className={`${styles.factIcon} ${styles.iconInteractive}`}
      >
        {icon}
      </span>
      <span className={styles.factText}>
        <strong className={styles.factTitle}>{title}</strong>
        <span className={styles.factDescription}>
          {description}
        </span>
      </span>
    </div>
  );
}

function SecurityItem({ text }: { text: string }) {
  return (
    <li className={styles.securityItem}>
      <span className={styles.securityCheck}>
        <CheckIcon className={styles.securityCheckSvg} />
      </span>
      <span>{text}</span>
    </li>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="8"
        r="4"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M4.5 20c.9-4 3.4-6 7.5-6s6.6 2 7.5 6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KeyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        cx="8"
        cy="15"
        r="4"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="m11 12 8-8m-3 3 3 3m-6 0 3 3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="10"
        width="16"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LoginIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M10 12h11m-4-4 4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14m-5-5 5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeOpenIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="12"
        r="2.6"
        stroke="currentColor"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function EyeClosedIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="m3 3 18 18"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.7a2 2 0 0 0 2.7 2.7M9.8 5.2A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a16.5 16.5 0 0 1-2.7 3.6M6.1 6.2C3.8 7.8 2.5 12 2.5 12s3.5 7 9.5 7a10 10 0 0 0 4.1-.9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FingerprintIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 11a3 3 0 0 1 3 3c0 3.5-.7 6-1.7 8"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M9 21c1.2-2.7 1.5-5.2 1.5-7a1.5 1.5 0 0 1 3 0c0 2.4-.4 5.2-1.5 8"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M6 19c1.1-2.2 1.5-4.5 1.5-6a4.5 4.5 0 0 1 9 0c0 2.8-.4 5.4-1.3 7.8"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M4 16v-3a8 8 0 0 1 16 0c0 2.1-.2 4.2-.7 6.2"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
      <path
        d="M6.2 7.5A7.8 7.8 0 0 1 12 5a8 8 0 0 1 6.8 3.8"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 5 6v5c0 4.8 2.8 8 7 10 4.2-2 7-5.2 7-10V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="m8 12 2.7 2.7L16.5 9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4 3 20h18L12 4Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v5m0 3h.01"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RoleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle
        cx="8"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3.5 19a4.5 4.5 0 0 1 9 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15 8h6m-3-3v6M15 16h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
