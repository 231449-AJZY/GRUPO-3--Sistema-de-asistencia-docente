"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}

interface DocenteStats {
  total: string;
  activos: string;
  inactivos: string;
}

interface AsistenciaHoyStats {
  puntuales: string;
  tardanzas: string;
  total_registros: string;
}

interface StatsData {
  docentes: DocenteStats;
  asistenciaHoy: AsistenciaHoyStats;
}

interface RegistroHoy {
  nombres: string;
  apellidos: string;
  codigo: string;
  departamento: string;
  hora_registro: string;
  estado: string;
}

interface AsistenciaHoyData {
  fecha: string;
  registros: RegistroHoy[];
}

export default function SupervisorDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [asistenciaHoy, setAsistenciaHoy] = useState<AsistenciaHoyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }

    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      
      Promise.all([
        fetch("/api/docentes/stats", { headers }).then((res) => res.json()),
        fetch("/api/asistencia/hoy", { headers }).then((res) => res.json()),
      ])
        .then(([statsData, hoyData]) => {
          setStats(statsData);
          setAsistenciaHoy(hoyData);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching supervisor data:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // --- Procesamiento de Datos Reales ---
  const totalDocentes = stats?.docentes ? parseInt(stats.docentes.total) : 0;
  const totalActivos = stats?.docentes ? parseInt(stats.docentes.activos) : 0;
  
  const totalMarcacionesHoy = asistenciaHoy?.registros.length || 0;
  const totalPuntualesHoy = asistenciaHoy?.registros.filter((r) => r.estado === "PUNTUAL").length || 0;
  const totalTardanzasHoy = asistenciaHoy?.registros.filter((r) => r.estado === "TARDANZA").length || 0;
  
  const inasistenciasHoy = Math.max(0, totalActivos - totalMarcacionesHoy);
  const percentAsistencia = totalActivos > 0 ? Math.round((totalMarcacionesHoy / totalActivos) * 100) : 0;

  // --- Generación Dinámica del Gráfico de Marcaciones por Hora ---
  const chartHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const hourlyCounts = chartHours.map((h) => {
    const prefix = `${String(h).padStart(2, "0")}:`;
    return asistenciaHoy?.registros.filter((r) => r.hora_registro.startsWith(prefix)).length || 0;
  });

  const maxCount = Math.max(...hourlyCounts, 1); // Evitar división por cero
  
  // Mapeo a coordenadas SVG (x de 40 a 480, y de 140 a 40)
  const chartPoints = chartHours.map((h, i) => {
    const x = 40 + (i * (440 / (chartHours.length - 1)));
    const y = 140 - (hourlyCounts[i] * (100 / maxCount));
    return { x, y, hour: `${String(h).padStart(2, "0")}:00`, count: hourlyCounts[i] };
  });

  let linePath = "";
  let areaPath = "";
  if (chartPoints.length > 0) {
    linePath = `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    for (let i = 1; i < chartPoints.length; i++) {
      linePath += ` L ${chartPoints[i].x} ${chartPoints[i].y}`;
    }
    areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x} 140 L ${chartPoints[0].x} 140 Z`;
  }

  function formatTime(timeStr: string) {
    if (!timeStr) return "";
    return timeStr.slice(0, 8); // Mostrar HH:MM:SS
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: "#f58025", marginBottom: "1rem" }}></i>
          <p>Cargando información del supervisor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Title Section */}
      <div className={styles.titleSection}>
        <h1>Dashboard del supervisor</h1>
        <p>Monitoreo general de asistencia, alertas e incidencias del sistema biométrico</p>
      </div>

      {/* Metric Cards Grid */}
      <div className={styles.metricGrid}>
        {/* Card 1: Asistencias en TR */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Marcaciones de Hoy</span>
            <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
              <i className="fas fa-heartbeat"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>{totalMarcacionesHoy}</span>
            <span className={styles.cardSub}>
              De los docentes activos hoy
            </span>
          </div>
        </div>

        {/* Card 2: Docentes Presentes */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Docentes Puntuales</span>
            <div className={`${styles.cardIcon} ${styles.iconGreen}`}>
              <i className="fas fa-user-check"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>{totalPuntualesHoy}</span>
            <span className={styles.cardSub}>{percentAsistencia}% de asistencia registrada</span>
            <div className={styles.sparklineWrapper}>
              <svg viewBox="0 0 100 30" width="100%" height="100%" preserveAspectRatio="none">
                <path
                  d="M0,25 Q15,5 30,20 T60,10 T90,18 T100,5"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2"
                />
                <path
                  d="M0,25 Q15,5 30,20 T60,10 T90,18 T100,5 L100,30 L0,30 Z"
                  fill="rgba(34,197,94,0.08)"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: Docentes Ausentes */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Inasistencias</span>
            <div className={`${styles.cardIcon} ${styles.iconRed}`}>
              <i className="fas fa-user-times"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>{inasistenciasHoy}</span>
            <span className={styles.cardSub}>Docentes sin marcación</span>
            <div className={styles.sparklineWrapper}>
              <svg viewBox="0 0 100 30" width="100%" height="100%" preserveAspectRatio="none">
                <path
                  d="M0,10 Q15,28 30,15 T60,25 T90,12 T100,22"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                />
                <path
                  d="M0,10 Q15,28 30,15 T60,25 T90,12 T100,22 L100,30 L0,30 Z"
                  fill="rgba(239,68,68,0.08)"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 4: Tardanzas del día */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Tardanzas de Hoy</span>
            <div className={`${styles.cardIcon} ${styles.iconOrange}`}>
              <i className="fas fa-history"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>{totalTardanzasHoy}</span>
            <span className={styles.cardSub}>
              Requieren seguimiento o justificación
            </span>
          </div>
        </div>

        {/* Card 5: Docentes Registrados */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Total Docentes</span>
            <div className={`${styles.cardIcon} ${styles.iconRedShield}`}>
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>{totalDocentes}</span>
            <span className={styles.cardSub}>{totalActivos} activos en el sistema</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Chart & Recent Alerts */}
      <div className={styles.middleRow}>
        {/* Activity Chart Section */}
        <div className={styles.dashboardSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <i className="fas fa-chart-line" style={{ color: "#3b82f6" }}></i>
              Actividad diaria de marcaciones (En vivo)
            </span>
          </div>
          <div className={styles.chartContainer}>
            <svg viewBox="0 0 500 180" width="100%" height="100%">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Chart Line Path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
              )}

              {/* Area Path */}
              {areaPath && (
                <path
                  d={areaPath}
                  fill="url(#chartGrad)"
                  opacity="0.15"
                />
              )}

              {/* Indicator Dots */}
              {chartPoints.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                  <title>{`${pt.hour}: ${pt.count} marcaciones`}</title>
                </g>
              ))}

              {/* Time Indicators */}
              {chartPoints.filter((_, idx) => idx % 2 === 0 || idx === chartPoints.length - 1).map((pt, i) => (
                <text key={i} x={pt.x} y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">
                  {pt.hour}
                </text>
              ))}

              {/* Y Axis Values */}
              <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">{maxCount}</text>
              <text x="30" y="80" fill="#94a3b8" fontSize="10" textAnchor="end">{Math.round(maxCount / 2)}</text>
              <text x="30" y="144" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

              {/* Definitions */}
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Alerts Section (Static template, since DB alerts are handled via triggers/notifs) */}
        <div className={styles.dashboardSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <i className="fas fa-bell" style={{ color: "#ef4444" }}></i>
              Alertas recientes
            </span>
          </div>
          <div className={styles.alertList}>
            {totalTardanzasHoy > 0 ? (
              <div className={styles.alertItem}>
                <div className={`${styles.alertIcon} ${styles.iconOrange}`}>
                  <i className="fas fa-clock"></i>
                </div>
                <div className={styles.alertContent}>
                  <div className={styles.alertMeta}>
                    <span className={styles.alertTitle}>Tardanza detectada</span>
                    <span className={styles.alertTime}>Hoy</span>
                  </div>
                  <span className={styles.alertText}>Existen {totalTardanzasHoy} docentes con retraso hoy.</span>
                </div>
              </div>
            ) : null}

            {inasistenciasHoy > 0 ? (
              <div className={styles.alertItem}>
                <div className={`${styles.alertIcon} ${styles.iconRed}`}>
                  <i className="fas fa-user-slash"></i>
                </div>
                <div className={styles.alertContent}>
                  <div className={styles.alertMeta}>
                    <span className={styles.alertTitle}>Inasistencias detectadas</span>
                    <span className={styles.alertTime}>Hoy</span>
                  </div>
                  <span className={styles.alertText}>Hay {inasistenciasHoy} docentes sin registrar ingreso hoy.</span>
                </div>
              </div>
            ) : (
              <div className={styles.alertItem}>
                <div className={`${styles.alertIcon} ${styles.iconBlue}`}>
                  <i className="fas fa-check-double"></i>
                </div>
                <div className={styles.alertContent}>
                  <div className={styles.alertMeta}>
                    <span className={styles.alertTitle}>Sistema Operativo</span>
                    <span className={styles.alertTime}>OK</span>
                  </div>
                  <span className={styles.alertText}>Sin anomalías críticas registradas.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Table & Devices */}
      <div className={styles.bottomRow}>
        {/* Real-time activity table */}
        <div className={styles.dashboardSection} style={{ flex: 2 }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <i className="fas fa-list-ul" style={{ color: "#f58025" }}></i>
              Resumen de actividad en tiempo real
            </span>
          </div>
          <div className={styles.tableContainer}>
            <table className={styles.activityTable}>
              <thead>
                <tr>
                  <th>Docente</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Departamento</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                {(!asistenciaHoy?.registros || asistenciaHoy.registros.length === 0) ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.4)" }}>
                      No se registran marcaciones de ingreso el día de hoy.
                    </td>
                  </tr>
                ) : (
                  asistenciaHoy.registros.map((r, idx) => (
                    <tr key={idx}>
                      <td className={styles.docenteName}>{`${r.nombres} ${r.apellidos}`}</td>
                      <td>{formatTime(r.hora_registro)}</td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            r.estado === "PUNTUAL"
                              ? styles.statusPresente
                              : r.estado === "TARDANZA"
                              ? styles.statusTardanza
                              : styles.statusAusente
                          }`}
                        >
                          {r.estado === "PUNTUAL" ? "Presente" : r.estado}
                        </span>
                      </td>
                      <td>{r.departamento}</td>
                      <td>Biométrico</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Biometric Status Section */}
        <div className={styles.dashboardSection} style={{ flex: 1 }}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <i className="fas fa-fingerprint" style={{ color: "#22c55e" }}></i>
              Dispositivos biométricos
            </span>
          </div>
          <div className={styles.deviceList}>
            <div className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceName}>Biométrico Entrada Principal</span>
                <span className={styles.deviceSync}>Estado: Activo</span>
              </div>
              <span className={`${styles.deviceStatus} ${styles.deviceOnline}`}>
                <span className={styles.statusDot}></span> En línea
              </span>
            </div>

            <div className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceName}>Biométrico Pabellón Sistemas</span>
                <span className={styles.deviceSync}>Estado: Activo</span>
              </div>
              <span className={`${styles.deviceStatus} ${styles.deviceOnline}`}>
                <span className={styles.statusDot}></span> Estable
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
