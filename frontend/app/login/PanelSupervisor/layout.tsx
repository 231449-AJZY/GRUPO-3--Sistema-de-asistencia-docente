"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import styles from "./layout.module.css";

interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]             = useState<UserData | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch (e) { console.error(e); }
    }
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-PE", { hour12: false }));
      setCurrentDate(now.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("unsaac_token");
    localStorage.removeItem("unsaac_user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    router.push("/");
  };

  const supervisorName = user ? `${user.nombres} ${user.apellidos}` : "Supervisor académico";

  const navItems = [
    { href: "/login/PanelSupervisor",                   icon: "fa-home",                 label: "Inicio" },
    { href: "/login/PanelSupervisor/monitoreo",         icon: "fa-circle-dot",           label: "Tiempo real" },
    { href: "/login/PanelSupervisor/alertas",           icon: "fa-bell",                 label: "Alertas" },
    { href: "/login/PanelSupervisor/reportes",          icon: "fa-chart-bar",            label: "Reportes" },
    { href: "/login/PanelSupervisor/historial",         icon: "fa-clock-rotate-left",    label: "Historial" },
    { href: "/login/PanelSupervisor/consultas",         icon: "fa-magnifying-glass",     label: "Consultas" },
    { href: "/login/PanelSupervisor/inconsistencias",   icon: "fa-triangle-exclamation", label: "Inconsistencias" },
  ];

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}><i className="fas fa-university"></i></div>
          <div className={styles.logoText}><h2>UNSAAC</h2><p>CUSCO</p></div>
        </div>

        <nav className={styles.navMenu}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href || (item.href !== "/login/PanelSupervisor" && pathname.startsWith(item.href)) ? styles.active : ""}`}
            >
              <i className={`fas ${item.icon}`}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerLogo}><i className="fas fa-university"></i></div>
          <div className={styles.footerText}>
            <p>Universidad Nacional de</p>
            <p>San Antonio Abad del Cusco</p>
            <span>UNSAAC</span>
          </div>
        </div>
      </aside>

      <div className={styles.mainWrapper}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerVerticalLine}></span>
            <h1>Control de Asistencia Docente</h1>
            <span className={styles.realTimeBadge}>
              <span className={styles.blinkDot}></span> Tiempo real
            </span>
            <span className={styles.biometricBadge}>
              <i className="fas fa-shield-alt"></i> Sistema biométrico
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.dateTime}>
              <div className={styles.dateTimeItem}>
                <i className="far fa-calendar-alt"></i>
                <span>{currentDate || "—"}</span>
              </div>
              <div className={styles.dateTimeItem}>
                <i className="far fa-clock"></i>
                <span className={styles.timeSpan}>{currentTime || "—"}</span>
              </div>
            </div>

            <div className={styles.userProfile}>
              <div className={styles.avatar}><i className="fas fa-user-shield"></i></div>
              <div className={styles.userInfo}>
                <span className={styles.userRole}>Supervisor</span>
                <span className={styles.userName}>{supervisorName}</span>
              </div>
              <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar Sesión">
                <i className="fas fa-chevron-down"></i>
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
