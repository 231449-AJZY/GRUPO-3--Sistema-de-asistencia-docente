"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}

export default function SupervisorDashboard() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className={styles.dashboardContainer}>
      {/* Title Section */}
      <div className={styles.titleSection}>
        <h1>Dashboard del supervisor</h1>
        <p>Monitoreo general de asistencia, alertas e incidencias del sistema biométrico</p>
      </div>

      {/* Metric Cards Grid */}
      <div className={styles.metricGrid}>
        {/* Card 1 */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Asistencias en TR</span>
            <div className={`${styles.cardIcon} ${styles.iconBlue}`}>
              <i className="fas fa-heartbeat"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>164</span>
            <span className={styles.cardSub}>
              <span className={styles.trendUp}>+12%</span> frente a última hora
            </span>
          </div>
        </div>

        {/* Card 2 */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Docentes Presentes</span>
            <div className={`${styles.cardIcon} ${styles.iconGreen}`}>
              <i className="fas fa-user-check"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>128</span>
            <span className={styles.cardSub}>68% de la programación</span>
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

        {/* Card 3 */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Docentes Ausentes</span>
            <div className={`${styles.cardIcon} ${styles.iconRed}`}>
              <i className="fas fa-user-times"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>16</span>
            <span className={styles.cardSub}>8% del total general</span>
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

        {/* Card 4 */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Tardanzas del día</span>
            <div className={`${styles.cardIcon} ${styles.iconOrange}`}>
              <i className="fas fa-history"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>14</span>
            <span className={styles.cardSub}>
              Promedio: <span className={styles.trendDown}>9 min tarde</span>
            </span>
          </div>
        </div>

        {/* Card 5 */}
        <div className={styles.metricCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Alertas Totales</span>
            <div className={`${styles.cardIcon} ${styles.iconRedShield}`}>
              <i className="fas fa-exclamation-triangle"></i>
            </div>
          </div>
          <div className={styles.cardBody}>
            <span className={styles.cardValue}>09</span>
            <span className={styles.cardSub}>5 pendientes · 4 atendidas</span>
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
            <select className={styles.dropdownSelect} defaultValue="hoy">
              <option value="hoy">Hoy</option>
              <option value="ayer">Ayer</option>
              <option value="semana">Esta semana</option>
            </select>
          </div>
          <div className={styles.chartContainer}>
            <svg viewBox="0 0 500 180" width="100%" height="100%">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="60" x2="480" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="100" x2="480" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Chart Line Path */}
              <path
                d="M 40 140 C 90 140, 120 130, 160 80 C 200 30, 240 60, 280 40 C 320 20, 360 90, 400 120 C 440 145, 460 140, 480 140"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
              />

              {/* Area Path */}
              <path
                d="M 40 140 C 90 140, 120 130, 160 80 C 200 30, 240 60, 280 40 C 320 20, 360 90, 400 120 C 440 145, 460 140, 480 140 L 480 140 L 40 140 Z"
                fill="url(#chartGrad)"
                opacity="0.15"
              />

              {/* Peak Indicator Dot */}
              <circle cx="280" cy="40" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />

              {/* Time Indicators */}
              <text x="40" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">07:00</text>
              <text x="130" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">09:00</text>
              <text x="220" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">11:00</text>
              <text x="310" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">13:00</text>
              <text x="400" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">15:00</text>
              <text x="480" y="160" fill="#94a3b8" fontSize="10" textAnchor="middle">17:00</text>

              {/* Y Axis Values */}
              <text x="30" y="24" fill="#94a3b8" fontSize="10" textAnchor="end">150</text>
              <text x="30" y="64" fill="#94a3b8" fontSize="10" textAnchor="end">100</text>
              <text x="30" y="104" fill="#94a3b8" fontSize="10" textAnchor="end">50</text>
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

        {/* Alerts Section */}
        <div className={styles.dashboardSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <i className="fas fa-bell" style={{ color: "#ef4444" }}></i>
              Alertas recientes
            </span>
            <button className={styles.sectionAction}>Ver todas</button>
          </div>
          <div className={styles.alertList}>
            {/* Alert 1 */}
            <div className={styles.alertItem}>
              <div className={`${styles.alertIcon} ${styles.iconOrange}`}>
                <i className="fas fa-clock"></i>
              </div>
              <div className={styles.alertContent}>
                <div className={styles.alertMeta}>
                  <span className={styles.alertTitle}>Tardanza reiterada</span>
                  <span className={styles.alertTime}>08:45</span>
                </div>
                <span className={styles.alertText}>Lic. Juan Carlos Arias Loayza</span>
              </div>
            </div>

            {/* Alert 2 */}
            <div className={styles.alertItem}>
              <div className={`${styles.alertIcon} ${styles.iconRed}`}>
                <i className="fas fa-user-slash"></i>
              </div>
              <div className={styles.alertContent}>
                <div className={styles.alertMeta}>
                  <span className={styles.alertTitle}>Inasistencia detectada</span>
                  <span className={styles.alertTime}>09:15</span>
                </div>
                <span className={styles.alertText}>Dra. Eliana Cáceres Andia</span>
              </div>
            </div>

            {/* Alert 3 */}
            <div className={styles.alertItem}>
              <div className={`${styles.alertIcon} ${styles.iconBlue}`}>
                <i className="fas fa-calendar-times"></i>
              </div>
              <div className={styles.alertContent}>
                <div className={styles.alertMeta}>
                  <span className={styles.alertTitle}>Inconsistencia de horario</span>
                  <span className={styles.alertTime}>09:32</span>
                </div>
                <span className={styles.alertText}>Mg. Martha Paredes Zegarra</span>
              </div>
            </div>

            {/* Alert 4 */}
            <div className={styles.alertItem}>
              <div className={`${styles.alertIcon} ${styles.iconRed}`}>
                <i className="fas fa-wifi-slash"></i>
              </div>
              <div className={styles.alertContent}>
                <div className={styles.alertMeta}>
                  <span className={styles.alertTitle}>Dispositivo sin respuesta</span>
                  <span className={styles.alertTime}>10:01</span>
                </div>
                <span className={styles.alertText}>Biométrico B-02 offline</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Table & Devices */}
      <div className={styles.bottomRow}>
        {/* Real-time activity table */}
        <div className={styles.dashboardSection}>
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
                  <th>Curso</th>
                  <th>Aula</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.docenteName}>Dr. Alberto Acosta Sullca</td>
                  <td>10:22:14</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles.statusPresente}`}>
                      Presente
                    </span>
                  </td>
                  <td>Base de Datos II</td>
                  <td>A-101</td>
                  <td>Biométrico</td>
                </tr>
                <tr>
                  <td className={styles.docenteName}>Mg. Verónica Holgado Canales</td>
                  <td>10:21:48</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles.statusPresente}`}>
                      Presente
                    </span>
                  </td>
                  <td>Ingeniería Web</td>
                  <td>B-205</td>
                  <td>Biométrico</td>
                </tr>
                <tr>
                  <td className={styles.docenteName}>Lic. Miguel A. Valdivia C.</td>
                  <td>10:20:37</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles.statusTardanza}`}>
                      Tardanza
                    </span>
                  </td>
                  <td>Física I</td>
                  <td>C-303</td>
                  <td>Biométrico</td>
                </tr>
                <tr>
                  <td className={styles.docenteName}>Dra. Nelly P. Jiménez Chino</td>
                  <td>10:19:58</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles.statusAusente}`}>
                      Ausente
                    </span>
                  </td>
                  <td>Química General</td>
                  <td>A-102</td>
                  <td>Sin registro</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Biometric Status Section */}
        <div className={styles.dashboardSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <i className="fas fa-fingerprint" style={{ color: "#22c55e" }}></i>
              Dispositivos biométricos
            </span>
          </div>
          <div className={styles.deviceList}>
            {/* Device 1 */}
            <div className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceName}>Biométrico A-01</span>
                <span className={styles.deviceSync}>Sincronizado: 10:24</span>
              </div>
              <span className={`${styles.deviceStatus} ${styles.deviceOnline}`}>
                <span className={styles.statusDot}></span> En línea
              </span>
            </div>

            {/* Device 2 */}
            <div className={styles.deviceCard}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceName}>Biométrico B-01</span>
                <span className={styles.deviceSync}>Sincronizado: 10:22</span>
              </div>
              <span className={`${styles.deviceStatus} ${styles.deviceOnline}`}>
                <span className={styles.statusDot}></span> Estable
              </span>
            </div>

            {/* Device 3 */}
            <div className={`${styles.deviceCard} ${styles.deviceCardAlert}`}>
              <div className={styles.deviceInfo}>
                <span className={styles.deviceName}>Biométrico C-03</span>
                <span className={styles.deviceSync}>Sincronizado: 10:17</span>
              </div>
              <span className={`${styles.deviceStatus} ${styles.deviceWarning}`}>
                <span className={styles.statusDot}></span> Atención
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
