"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface UserData {
  nombres: string;
  apellidos: string;
  rol: string;
}

export default function DocenteDashboard() {
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

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Mg. Verónica Holgado Canales";

  return (
    <div className={styles.dashboardContainer}>
      {/* Sección de Bienvenida */}
      <section className={styles.welcomeSection}>
        <h1>Dashboard del docente</h1>
        <p>Bienvenida, {docenteName} · Resumen de asistencia y actividad académica</p>
      </section>

      {/* Tarjetas de Métricas Superiores */}
      <section className={styles.metricsGrid}>
        {/* Tarjeta 1: Asistencia */}
        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconGreen}`}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Estado de asistencia del día</span>
            <span className={`${styles.metricValue} ${styles.textGreen}`}>Presente</span>
            <span className={styles.metricSubtext}>Ingreso registrado a las 07:41</span>
            <div className={styles.badgeContainer}>
              <span className={`${styles.statusBadge} ${styles.badgeGreen}`}>Puntual</span>
            </div>
          </div>
        </div>

        {/* Tarjeta 2: Próximo Curso */}
        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconBlue}`}>
            <i className="fa-solid fa-calendar-day"></i>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Próximo curso asignado</span>
            <span className={styles.courseValue}>Base de Datos II</span>
            <span className={styles.metricSubtext}>Aula LAB-02 · 10:00 a 12:00</span>
            <span className={styles.metricDetailText}>Hoy · Escuela Profesional de Ingeniería de Sistemas</span>
          </div>
        </div>

        {/* Tarjeta 3: Tardanzas */}
        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconOrange}`}>
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Tardanzas acumuladas</span>
            <span className={`${styles.metricValue} ${styles.textOrange}`}>03</span>
            <span className={styles.metricSubtext}>1 en mayo · 2 en abril</span>
            <span className={styles.metricDetailText}>Última tardanza: 09/05/2025</span>
          </div>
        </div>

        {/* Tarjeta 4: Inasistencias */}
        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconRed}`}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Inasistencias acumuladas</span>
            <span className={`${styles.metricValue} ${styles.textRed}`}>01</span>
            <span className={styles.metricSubtext}>Justificada por comisión académica</span>
            <span className={styles.metricDetailText}>Fecha: 17/04/2025</span>
          </div>
        </div>
      </section>

      {/* Fila Central: Calendario + Próxima Actividad */}
      <section className={styles.contentGrid}>
        {/* Calendario Semanal */}
        <div className={`${styles.card} ${styles.colSpan8}`}>
          <div className={styles.cardHeader}>
            <h2>Calendario resumido semanal</h2>
            <p>Vista de los cursos programados de la semana actual.</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.tableResponsive}>
              <table className={styles.scheduleTable}>
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Hora</th>
                    <th>Lun</th>
                    <th>Mar</th>
                    <th>Mié</th>
                    <th>Jue</th>
                    <th>Vie</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Fila 08:00 */}
                  <tr>
                    <td className={styles.hourCell}>08:00</td>
                    <td>
                      <div className={`${styles.courseBlock} ${styles.bgBlue}`}>
                        <span className={styles.blockTitle}>Base de Datos II</span>
                        <span className={styles.blockTime}>08:00 - 10:00</span>
                        <span className={styles.blockRoom}>LAB-02</span>
                      </div>
                    </td>
                    <td></td>
                    <td>
                      <div className={`${styles.courseBlock} ${styles.bgYellow}`}>
                        <span className={styles.blockTitle}>Tutoría</span>
                        <span className={styles.blockTime}>08:00 - 10:00</span>
                        <span className={styles.blockRoom}>B-101</span>
                      </div>
                    </td>
                    <td></td>
                    <td rowSpan={2} style={{ verticalAlign: 'top' }}>
                      <div className={`${styles.courseBlock} ${styles.bgRed}`} style={{ height: 'calc(100% - 10px)', minHeight: '140px' }}>
                        <span className={styles.blockTitle}>Arquitectura SW</span>
                        <span className={styles.blockTime}>08:00 - 12:00</span>
                        <span className={styles.blockRoom}>LAB-01</span>
                      </div>
                    </td>
                  </tr>

                  {/* Fila 10:00 */}
                  <tr>
                    <td className={styles.hourCell}>10:00</td>
                    <td></td>
                    <td>
                      <div className={`${styles.courseBlock} ${styles.bgGreen}`}>
                        <span className={styles.blockTitle}>Ingeniería Web</span>
                        <span className={styles.blockTime}>10:00 - 12:00</span>
                        <span className={styles.blockRoom}>A-204</span>
                      </div>
                    </td>
                    <td></td>
                    <td></td>
                    {/* El viernes está ocupado por el rowSpan */}
                  </tr>

                  {/* Fila 12:00 */}
                  <tr>
                    <td className={styles.hourCell}>12:00</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      <div className={`${styles.courseBlock} ${styles.bgPurple}`}>
                        <span className={styles.blockTitle}>Seminario TI</span>
                        <span className={styles.blockTime}>12:00 - 14:00</span>
                        <span className={styles.blockRoom}>C-301</span>
                      </div>
                    </td>
                    <td></td>
                  </tr>

                  {/* Fila 14:00 */}
                  <tr>
                    <td className={styles.hourCell}>14:00</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>

                  {/* Fila 16:00 */}
                  <tr>
                    <td className={styles.hourCell}>16:00</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Próxima Actividad Académica */}
        <div className={`${styles.card} ${styles.colSpan4}`}>
          <div className={styles.cardHeader}>
            <h2>Próxima actividad académica</h2>
            <p>Detalles de la siguiente sesión programada para hoy.</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.activityBox}>
              <h3 className={styles.activityTitle}>Base de Datos II</h3>
              <p className={styles.activitySubtitle}>Ingeniería de Sistemas · Ciclo VII</p>
              
              <div className={styles.activityInfoGrid}>
                <div>
                  <span className={styles.infoLabel}>Aula:</span>
                  <span className={styles.infoVal}>LAB-02</span>
                </div>
                <div>
                  <span className={styles.infoLabel}>Hora:</span>
                  <span className={styles.infoVal}>10:00 - 12:00</span>
                </div>
              </div>

              <div className={styles.activityBadgeRow}>
                <span className={`${styles.statusBadge} ${styles.badgeLightBlue}`}>
                  En 1 h 35 min
                </span>
              </div>
            </div>

            <div className={styles.observationBox}>
              <h4>Observación</h4>
              <p>Llevar lista de prácticas y verificar marcación de ingreso al laboratorio antes de iniciar clase.</p>
            </div>

            <button className={styles.btnFullOrange}>
              Ver horario completo
            </button>
          </div>
        </div>
      </section>

      {/* Fila Inferior: Marcaciones + Resumen Semanal */}
      <section className={styles.contentGrid}>
        {/* Últimas Marcaciones */}
        <div className={`${styles.card} ${styles.colSpan8}`}>
          <div className={styles.cardHeader}>
            <h2>Últimas marcaciones biométricas</h2>
            <p>Registro de ingreso institucional y asistencias recientes.</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.tableResponsive}>
              <table className={styles.logTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Tipo de marcación</th>
                    <th>Resultado</th>
                    <th>Método</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.boldCell}>23/05/2025</td>
                    <td>07:41:12</td>
                    <td>Ingreso institucional</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.badgeGreen}`}>Puntual</span>
                    </td>
                    <td>Huella digital</td>
                  </tr>
                  <tr>
                    <td className={styles.boldCell}>22/05/2025</td>
                    <td>10:03:28</td>
                    <td>Inicio de clase</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.badgeOrange}`}>Tardanza</span>
                    </td>
                    <td>Huella digital</td>
                  </tr>
                  <tr>
                    <td className={styles.boldCell}>21/05/2025</td>
                    <td>07:43:05</td>
                    <td>Ingreso institucional</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.badgeGreen}`}>Puntual</span>
                    </td>
                    <td>Reconocimiento facial</td>
                  </tr>
                  <tr>
                    <td className={styles.boldCell}>20/05/2025</td>
                    <td>12:01:14</td>
                    <td>Salida de clase</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles.badgeLightGreen}`}>Correcto</span>
                    </td>
                    <td>Huella digital</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resumen de la Semana */}
        <div className={`${styles.card} ${styles.colSpan4}`}>
          <div className={styles.cardHeader}>
            <h2>Resumen de la semana</h2>
            <p>Indicadores rápidos de cumplimiento académico y asistencia.</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.summaryStatsGrid}>
              <div className={styles.statSubCard}>
                <span className={styles.statLabel}>Clases programadas</span>
                <span className={`${styles.statNumber} ${styles.textBlue}`}>05</span>
              </div>
              <div className={styles.statSubCard}>
                <span className={styles.statLabel}>Clases dictadas</span>
                <span className={`${styles.statNumber} ${styles.textGreen}`}>04</span>
              </div>
            </div>

            <div className={styles.reminderBox}>
              <h4>Recordatorio académico</h4>
              <p>Mañana tiene sesión de Ingeniería Web a las 10:00 en el aula A-204. Revise el material de laboratorio y confirme la asistencia del grupo.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
