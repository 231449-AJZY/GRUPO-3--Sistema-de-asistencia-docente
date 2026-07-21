"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./layout.module.css";

interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}

export default function SupervisorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    // Cargar datos de usuario
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }

    // Actualizar fecha y hora
    const updateDateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("es-PE", { hour12: false });
      setCurrentTime(timeStr);

      const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
      };
      const dateStr = now.toLocaleDateString("es-PE", options);
      setCurrentDate(dateStr);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const closeDropdown = () => setIsDropdownOpen(false);
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, [isDropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    router.push("/");
  };

  const supervisorName = user ? `${user.nombres} ${user.apellidos}` : "Supervisor académico";

  return (
    <div className={styles.container}>
      {/* Sidebar Lateral */}
      <aside className={styles.sidebar}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>
            <i className="fas fa-university"></i>
          </div>
          <div className={styles.logoText}>
            <h2>UNSAAC</h2>
            <p>CUSCO</p>
          </div>
        </div>

        <nav className={styles.navMenu}>
          <Link href="/login/PanelSupervisor" className={`${styles.navItem} ${styles.active}`}>
            <i className="fas fa-home"></i>
            <span>Inicio</span>
          </Link>
          <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>
            <i className="fas fa-clock"></i>
            <span>Tiempo real</span>
          </a>
          <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>
            <i className="fas fa-exclamation-circle"></i>
            <span>Inconsistencias</span>
          </a>
          <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>
            <i className="fas fa-bell"></i>
            <span>Alertas</span>
          </a>
          <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>
            <i className="fas fa-search"></i>
            <span>Consultas</span>
          </a>
          <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>
            <i className="fas fa-history"></i>
            <span>Historial</span>
          </a>
          <a href="#" className={styles.navItem} onClick={(e) => e.preventDefault()}>
            <i className="fas fa-file-alt"></i>
            <span>Reportes</span>
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerLogo}>
            <i className="fas fa-university"></i>
          </div>
          <div className={styles.footerText}>
            <p>Universidad Nacional de</p>
            <p>San Antonio Abad del Cusco</p>
            <span>UNSAAC</span>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <div className={styles.mainWrapper}>
        {/* Header Superior */}
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
                <span>{currentDate || "23 de mayo de 2025"}</span>
              </div>
              <div className={styles.dateTimeItem}>
                <i className="far fa-clock"></i>
                <span className={styles.timeSpan}>{currentTime || "10:24:35"}</span>
              </div>
            </div>

            <div className={styles.userProfile} onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }} title="Opciones de usuario">
              <div className={styles.avatar}>
                <i className="fas fa-user-shield"></i>
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userRole}>Supervisor</span>
                <span className={styles.userName}>{supervisorName}</span>
              </div>
              <button className={`${styles.logoutBtn} ${isDropdownOpen ? styles.rotated : ""}`}>
                <i className="fas fa-chevron-down"></i>
              </button>

              {isDropdownOpen && (
                <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.dropdownUser}>
                    <div className={styles.dropdownRol}>
                      <span>SP</span>
                    </div>
                    <div className={styles.dropdownUserID}>
                      <span style={{ fontWeight: 'bold' , fontSize: '15px' , color: 'black' }}>Supervisor</span>
                      <br></br>
                      <span>Supervisor académico</span>
                      <br></br>
                      <span>usuario</span>
                    </div>
                  </div>

                  <Link href="/login/PanelSupervisor/perfil" className={styles.dropdownItem}>
                    <i className="fas fa-user"></i>
                    <span>Mi Perfil</span>
                  </Link>
                  <a href="#" className={styles.dropdownItem} onClick={(e) => { e.preventDefault(); alert("Configuración no disponible"); }}>
                    <i className="fas fa-cog"></i>
                    <span>Configuración de cuenta</span>
                  </a>
                  <a href="#" className={styles.dropdownItem} onClick={(e) => { e.preventDefault(); alert("Configuración no disponible"); }}>
                    <i className="fas fa-lock"></i>
                    <span>Cambiar contraseña</span>
                  </a>
                  <a href="#" className={styles.dropdownItem} onClick={(e) => { e.preventDefault(); alert("Configuración no disponible"); }}>
                    <i className="fas fa-sliders-h"></i>
                    <span>Preferencias</span>
                  </a>
                  <a href="#" className={styles.dropdownItem} onClick={(e) => { e.preventDefault(); alert("Configuración no disponible"); }}>
                    <i className="fas fa-question-circle"></i>
                    <span>Ayuda / Soporte</span>
                  </a>
                  <button className={`${styles.dropdownItem} ${styles.logout}`} onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}
