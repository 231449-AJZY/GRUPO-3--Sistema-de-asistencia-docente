"use client";


import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";


import { clearSession, getLegacyUser, getToken } from "@/lib/auth";


import styles from "./layout.module.css";


type IconName =
  | "home"
  | "attendance"
  | "schedule"
  | "calendar"
  | "late"
  | "absence"
  | "profile";


interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}


interface NavigationItem {
  label: string;
  href: string;
  icon: IconName;
  available: boolean;
}


const NAVIGATION: NavigationItem[] = [
  {
    label: "Inicio",
    href: "/login/PanelDocente",
    icon: "home",
    available: true,
  },
  {
    label: "Mi asistencia",
    href: "/login/PanelDocente/asistencia",
    icon: "attendance",
    available: true,
  },
  {
    label: "Mis horarios",
    href: "/login/PanelDocente/horarios",
    icon: "schedule",
    available: false,
  },
  {
    label: "Calendario",
    href: "/login/PanelDocente/calendario",
    icon: "calendar",
    available: false,
  },
  {
    label: "Tardanzas",
    href: "/login/PanelDocente/tardanzas",
    icon: "late",
    available: false,
  },
  {
    label: "Inasistencias",
    href: "/login/PanelDocente/inasistencias",
    icon: "absence",
    available: false,
  },
  {
    label: "Perfil",
    href: "/login/PanelDocente/perfil",
    icon: "profile",
    available: false,
  },
];


function UniversityIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-7h6v7" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
    </svg>
  );
}


function SidebarIcon({ name }: { name: IconName }) {
  const common = {
    className: styles.navIcon,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true,
  } as const;


  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10" />
        </svg>
      );
    case "attendance":
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "schedule":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M8 2v4M16 2v4M3 9h18" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M8 2v4M16 2v4M3 9h18M8 13h3M13 13h3M8 17h3" />
        </svg>
      );
    case "late":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    case "absence":
      return (
        <svg {...common}>
          <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      );
  }
}


function CalendarHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </svg>
  );
}


function ClockHeaderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" />
    </svg>
  );
}


function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}


function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </svg>
  );
}


function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}


function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}


function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/login/PanelDocente") {
    return pathname === href;
  }


  return pathname === href || pathname.startsWith(`${href}/`);
}


export default function DocenteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);


  useEffect(() => {
    const storedUser = getLegacyUser();
    const token = getToken();


    if (!storedUser || !token) {
      router.replace("/login");
      return;
    }


    if (String(storedUser.rol).trim().toUpperCase() !== "DOCENTE") {
      router.replace("/login");
      return;
    }


    setUser(storedUser);
  }, [router]);


  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-PE", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setCurrentDate(
        now.toLocaleDateString("es-PE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };


    updateDateTime();
    const interval = window.setInterval(updateDateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);


  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);


  const handleLogout = () => {
    clearSession();
    router.replace("/login");
    router.refresh();
  };


  const docenteName = user
    ? `${user.nombres} ${user.apellidos}`.trim()
    : "Docente";


  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brandArea}>
          <div className={styles.brandIcon}>
            <UniversityIcon />
          </div>
          <div className={styles.brandText}>
            <strong>UNSAAC</strong>
            <span>CUSCO</span>
          </div>
        </div>


        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-label="Abrir menu docente"
          aria-expanded={mobileMenuOpen}
        >
          <MenuIcon />
        </button>


        <div className={styles.headerTitle}>
          <span className={styles.headerAccent} />
          <h1>Control de Asistencia Docente</h1>
          <span className={styles.biometricBadge}>
            <ShieldIcon />
            Sistema biom&eacute;trico
          </span>
        </div>


        <div className={styles.headerRight}>
          <div className={styles.dateTimeGroup}>
            <div className={styles.dateTimeItem}>
              <CalendarHeaderIcon />
              <span>{currentDate}</span>
            </div>
            <div className={styles.dateTimeDivider} />
            <div className={styles.dateTimeItem}>
              <ClockHeaderIcon />
              <span className={styles.timeValue}>{currentTime}</span>
            </div>
          </div>


          <div className={styles.profileArea}>
            <button
              type="button"
              className={styles.profileButton}
              onClick={() => setProfileOpen((value) => !value)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <span className={styles.avatar}>
                <UserIcon />
              </span>
              <span className={styles.userInfo}>
                <strong>Docente</strong>
                <span>{docenteName}</span>
              </span>
              <span className={styles.chevron}>
                <ChevronIcon />
              </span>
            </button>


            {profileOpen ? (
              <div className={styles.profileMenu} role="menu">
                <div className={styles.profileMenuIdentity}>
                  <strong>{docenteName}</strong>
                  <span>Cuenta docente autenticada</span>
                </div>
                <button type="button" onClick={handleLogout} role="menuitem">
                  Cerrar sesi&oacute;n
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>


      <button
        type="button"
        className={`${styles.mobileOverlay} ${mobileMenuOpen ? styles.mobileOverlayVisible : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-label="Cerrar menu docente"
      />


      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <nav className={styles.navMenu} aria-label="Navegacion docente">
          {NAVIGATION.map((item) => {
            const active = item.available && isActiveRoute(pathname, item.href);


            if (!item.available) {
              return (
                <button
                  key={item.href}
                  type="button"
                  className={`${styles.navItem} ${styles.navItemPending}`}
                  aria-disabled="true"
                  title="Esta interfaz se implementara en el siguiente paso"
                >
                  <SidebarIcon name={item.icon} />
                  <span>{item.label}</span>
                </button>
              );
            }


            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ""}`}
              >
                <SidebarIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>


        <div className={styles.sidebarFooter}>
          <UniversityIcon className={styles.footerIcon} />
          <div className={styles.footerText}>
            <span>Universidad Nacional de</span>
            <span>San Antonio Abad del Cusco</span>
            <strong>UNSAAC</strong>
          </div>
        </div>
      </aside>


      <div className={styles.mainWrapper}>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}