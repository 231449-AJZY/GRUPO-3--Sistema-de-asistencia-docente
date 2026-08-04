"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../asistencia.module.css";
import { getLegacyUser, getToken } from "@/lib/auth";

interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  rol: string;
  dni?: string;
  categoria?: string;
}

interface AsistenciaIngreso {
  fecha: string;
  hora_registro: string;
  estado: string;
}

export default function IngresoInstitucional() {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ingresos, setIngresos] = useState<AsistenciaIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "validating">("idle");
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const fetchIngresos = (jwtToken: string) => {
    fetch("/api/asistencia/docente/me", {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ingresos) {
          setIngresos(data.ingresos);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching check-ins:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const storedUser = getLegacyUser();
    const storedToken = getToken();

    if (storedUser && storedToken) {
      try {
        const parsed = storedUser;
        setUser(parsed);
        setToken(storedToken);
        fetchIngresos(storedToken);
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-PE", { hour12: false }));
      setCurrentDate(
        now.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleRegister = async () => {
    if (!user || !token) return;

    setRegistering(true);
    setStatus("validating");
    setMessage("Validando huella dactilar...");

    // Simular escaneo biométrico
    setTimeout(async () => {
      try {
        const response = await fetch("/api/asistencia/ingreso", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            dispositivo_id: "Lector Bio-01",
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(`Ingreso registrado correctamente. Estado: ${data.registro.estado}`);
          fetchIngresos(token);
        } else {
          setStatus("error");
          setMessage(data.error || "Ocurrió un error en la validación biométrica.");
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("No se pudo conectar con el lector biométrico.");
      } finally {
        setRegistering(false);
      }
    }, 2000);
  };

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Mg. Verónica Holgado Canales";
  const category = user?.categoria || "Docente Auxiliar Tiempo Completo";

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  if (loading) {
    return (
      <div className={styles.container} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "65vh" }}>
        <div style={{ textAlign: "center" }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: "#f58025", marginBottom: "1rem" }}></i>
          <p>Cargando módulo de ingreso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/login/PanelDocente/asistencia" className={styles.backLink}>
        <i className="fas fa-arrow-left"></i> Volver al panel de asistencias
      </Link>

      <div className={styles.headerSection}>
        <h1>Registro de ingreso institucional</h1>
        <p>Validación biométrica para registrar el ingreso diario del docente al campus universitario</p>
      </div>

      <div className={styles.contentGrid}>
        {/* Lado Izquierdo: Escaneo Biométrico */}
        <div className={`${styles.panelCard} ${styles.col6}`}>
          <div className={styles.panelHeader}>
            <h2>Validación de identidad</h2>
            {status === "validating" && (
              <span className={`${styles.badge} ${styles.badgeOrange}`} style={{ animation: "pulse 1.5s infinite" }}>
                Validando identidad biométrica
              </span>
            )}
          </div>
          <div className={styles.panelBody} style={{ alignItems: "center", textAlign: "center" }}>
            {/* Animación del sensor de huella */}
            <div className={styles.biometricScan}>
              <div className={`${styles.scanCircle} ${styles.scanCircle1}`} style={{ animationPlayState: status === "validating" ? "running" : "paused" }}></div>
              <div className={`${styles.scanCircle} ${styles.scanCircle2}`} style={{ animationPlayState: status === "validating" ? "running" : "paused" }}></div>
              <div className={`${styles.scanCircle} ${styles.scanCircle3}`} style={{ animationPlayState: status === "validating" ? "running" : "paused" }}></div>
              <div className={styles.scanIcon}>
                <i className={`fas ${status === "success" ? "fa-check-circle" : status === "error" ? "fa-times-circle" : "fa-fingerprint"}`} 
                   style={{ color: status === "success" ? "#10b981" : status === "error" ? "#ef4444" : "#3b82f6" }}></i>
              </div>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#0b2b42", margin: "0 0 6px 0" }}>{docenteName}</h3>
              <p style={{ fontSize: "0.85rem", color: "#5e6f8d", margin: 0 }}>Docente · {category}</p>
            </div>

            <div style={{ display: "flex", gap: "12px", width: "100%", marginTop: "1.5rem" }}>
              <div className={styles.cardMetaBox} style={{ flex: 1, margin: 0 }}>
                <span className={styles.metaLabel}>Fecha actual</span>
                <span className={styles.metaValue}>{currentDate || "23 de mayo de 2025"}</span>
              </div>
              <div className={styles.cardMetaBox} style={{ flex: 1, margin: 0 }}>
                <span className={styles.metaLabel}>Hora actual</span>
                <span className={styles.metaValue}>{currentTime || "10:24:35"}</span>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={registering}
              className={`${styles.btnOrange} ${styles.btnFull}`}
              style={{ marginTop: "1.5rem" }}
            >
              {registering ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i> Procesando huella...
                </>
              ) : (
                "Registrar ingreso"
              )}
            </button>
          </div>
        </div>

        {/* Lado Derecho: Indicadores de Estado */}
        <div className={`${styles.panelCard} ${styles.col6}`}>
          <div className={styles.panelHeader}>
            <h2>Estados del proceso biométrico</h2>
            <p>Visualización de los posibles resultados del registro institucional.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.statusList}>
              {/* Estado 1: Validando */}
              <div className={styles.statusItem} style={{ borderLeft: "4px solid #f58025", backgroundColor: status === "validating" ? "#fffbeb" : "#ffffff" }}>
                <div className={`${styles.statusIcon} ${styles.badgeOrange}`}>
                  <i className="fas fa-circle-notch fa-spin"></i>
                </div>
                <div className={styles.statusText}>
                  <h4>Validando biometría</h4>
                  <p>El sistema compara la huella capturada con el patrón registrado del docente.</p>
                </div>
                {status === "validating" && <span className={`${styles.badgeSmall} ${styles.badgeOrange}`}>En proceso</span>}
              </div>

              {/* Estado 2: Aprobado */}
              <div className={styles.statusItem} style={{ borderLeft: "4px solid #10b981", backgroundColor: status === "success" ? "#f0fdf4" : "#ffffff" }}>
                <div className={`${styles.statusIcon} ${styles.badgeGreen}`}>
                  <i className="fas fa-check"></i>
                </div>
                <div className={styles.statusText}>
                  <h4>Ingreso registrado correctamente</h4>
                  <p>La identidad fue confirmada y el ingreso institucional quedó guardado.</p>
                </div>
                {status === "success" && <span className={`${styles.badgeSmall} ${styles.badgeGreen}`}>Aprobado</span>}
              </div>

              {/* Estado 3: Error */}
              <div className={styles.statusItem} style={{ borderLeft: "4px solid #ef4444", backgroundColor: status === "error" ? "#fef2f2" : "#ffffff" }}>
                <div className={`${styles.statusIcon} ${styles.badgeRed}`}>
                  <i className="fas fa-times"></i>
                </div>
                <div className={styles.statusText}>
                  <h4>Error de validación</h4>
                  <p>No se pudo reconocer la huella o el ingreso ya fue registrado hoy.</p>
                </div>
                {status === "error" && <span className={`${styles.badgeSmall} ${styles.badgeRed}`}>Reintentar</span>}
              </div>
            </div>

            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className={styles.alertBox} style={{ backgroundColor: "#f8fafc", border: "1px solid #cbd5e1" }}>
                <span className={`${styles.badgeSmall} ${styles.badgeGreen}`} style={{ display: "inline-block", marginRight: "4px", width: "10px", height: "10px", borderRadius: "50%", padding: 0 }}></span>
                <span style={{ color: "#334155", fontWeight: "600" }}>Dispositivo biométrico:</span> Conectado - Lector Bio-01
              </div>

              {message && (
                <div className={`${styles.alertBox} ${status === "success" ? styles.alertBlue : status === "error" ? styles.alertRed : styles.alertOrange}`}>
                  <i className={`fas ${status === "success" ? "fa-info-circle" : "fa-exclamation-triangle"}`}></i>
                  <span>{message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historial inferior del día */}
      <div className={styles.panelCard} style={{ marginTop: "1rem" }}>
        <div className={styles.panelHeader}>
          <h2>Registro de actividad reciente</h2>
          <p>Últimas validaciones del módulo de ingreso institucional</p>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.tableResponsive}>
            <table className={styles.logTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Docente</th>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {ingresos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#8e9db5" }}>
                      Aún no hay ingresos institucionales registrados en el histórico.
                    </td>
                  </tr>
                ) : (
                  ingresos.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "700" }}>{formatDate(item.fecha)}</td>
                      <td>{item.hora_registro}</td>
                      <td>{docenteName}</td>
                      <td>Ingreso institucional</td>
                      <td>
                        <span className={`${styles.badge} ${item.estado === "PUNTUAL" ? styles.badgeGreen : styles.badgeOrange}`}>
                          {item.estado}
                        </span>
                      </td>
                      <td>Lector Bio-01</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
