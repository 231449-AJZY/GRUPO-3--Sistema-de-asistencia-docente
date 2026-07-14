"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  rol: string;
}

interface AsistenciaIngreso {
  fecha: string;
  hora_registro: string;
  estado: string;
}

interface AsistenciaCurso {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

interface AsistenciaData {
  ingresos: AsistenciaIngreso[];
  cursos: AsistenciaCurso[];
}

export default function DocenteDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (token && parsedUser.id) {
          fetch(`/api/asistencia/docente/${parsedUser.id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
            .then((res) => res.json())
            .then((data) => {
              setAsistenciaData(data);
              setLoading(false);
            })
            .catch((err) => {
              console.error("Error fetching attendance data:", err);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Mg. Verónica Holgado Canales";

  // --- Procesamiento de Datos de Asistencia en Tiempo Real ---
  const todayStr = new Date().toISOString().split("T")[0];
  const todayIngreso = asistenciaData?.ingresos.find(
    (r) => r.fecha.split("T")[0] === todayStr
  );

  const isPresent = !!todayIngreso;
  const ingresoTime = todayIngreso ? todayIngreso.hora_registro.slice(0, 5) : "";
  const ingresoEstado = todayIngreso ? todayIngreso.estado : "PENDIENTE";

  // Tardanzas acumuladas
  const tardanzasIngresos = asistenciaData?.ingresos.filter((r) => r.estado === "TARDANZA") || [];
  const tardanzasCursos = asistenciaData?.cursos.filter((r) => r.estado === "TARDANZA") || [];
  const totalTardanzas = tardanzasIngresos.length + tardanzasCursos.length;

  const todasLasTardanzas = [...tardanzasIngresos, ...tardanzasCursos].sort((a, b) => 
    b.fecha.localeCompare(a.fecha)
  );
  const ultimaTardanzaFecha = todasLasTardanzas[0] 
    ? formatDate(todasLasTardanzas[0].fecha) 
    : "—";

  // Inasistencias acumuladas
  const ausenciasIngresos = asistenciaData?.ingresos.filter((r) => r.estado === "AUSENTE") || [];
  const ausenciasCursos = asistenciaData?.cursos.filter((r) => r.estado === "AUSENTE") || [];
  const totalAusencias = ausenciasIngresos.length + ausenciasCursos.length;

  const todasLasAusencias = [...ausenciasIngresos, ...ausenciasCursos].sort((a, b) => 
    b.fecha.localeCompare(a.fecha)
  );
  const ultimaAusenciaFecha = todasLasAusencias[0] 
    ? formatDate(todasLasAusencias[0].fecha) 
    : "—";

  // Consolidación de marcaciones para la tabla
  const marcaciones: Array<{
    fecha: string;
    hora: string;
    tipo: string;
    resultado: string;
    metodo: string;
  }> = [];

  if (asistenciaData) {
    asistenciaData.ingresos.forEach((r) => {
      marcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: "Ingreso institucional",
        resultado: r.estado,
        metodo: "Huella digital",
      });
    });
    asistenciaData.cursos.forEach((r) => {
      marcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: `Inicio de clase: ${r.curso}`,
        resultado: r.estado,
        metodo: "Huella digital",
      });
    });
  }

  // Ordenar cronológicamente descendente
  marcaciones.sort((a, b) => {
    const dateTimeA = `${a.fecha.split("T")[0]}T${a.hora}`;
    const dateTimeB = `${b.fecha.split("T")[0]}T${b.hora}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function formatNumber(num: number) {
    return num < 10 ? `0${num}` : `${num}`;
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: "#f58025", marginBottom: "1rem" }}></i>
          <p>Cargando información del docente...</p>
        </div>
      </div>
    );
  }

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
          <div className={`${styles.iconWrapper} ${isPresent ? styles.iconGreen : styles.iconOrange}`}>
            <i className={`fa-solid ${isPresent ? "fa-circle-check" : "fa-clock"}`}></i>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Estado de asistencia del día</span>
            <span className={`${styles.metricValue} ${isPresent ? styles.textGreen : styles.textOrange}`}>
              {isPresent ? "Presente" : "Sin registro"}
            </span>
            <span className={styles.metricSubtext}>
              {isPresent ? `Ingreso registrado a las ${ingresoTime}` : "No se detecta marcación hoy"}
            </span>
            <div className={styles.badgeContainer}>
              <span className={`${styles.statusBadge} ${ingresoEstado === "PUNTUAL" ? styles.badgeGreen : styles.badgeOrange}`}>
                {ingresoEstado}
              </span>
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
            <span className={`${styles.metricValue} ${styles.textOrange}`}>
              {formatNumber(totalTardanzas)}
            </span>
            <span className={styles.metricSubtext}>Total en el período actual</span>
            <span className={styles.metricDetailText}>Última tardanza: {ultimaTardanzaFecha}</span>
          </div>
        </div>

        {/* Tarjeta 4: Inasistencias */}
        <div className={styles.metricCard}>
          <div className={`${styles.iconWrapper} ${styles.iconRed}`}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Inasistencias acumuladas</span>
            <span className={`${styles.metricValue} ${styles.textRed}`}>
              {formatNumber(totalAusencias)}
            </span>
            <span className={styles.metricSubtext}>Sin justificar en el sistema</span>
            <span className={styles.metricDetailText}>Última inasistencia: {ultimaAusenciaFecha}</span>
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
                    <th style={{ width: "80px" }}>Hora</th>
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
                    <td rowSpan={2} style={{ verticalAlign: "top" }}>
                      <div className={`${styles.courseBlock} ${styles.bgRed}`} style={{ height: "calc(100% - 10px)", minHeight: "140px" }}>
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
                  Programada hoy
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
                  {marcaciones.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "rgba(255,255,255,0.5)" }}>
                        No hay marcaciones registradas para este docente.
                      </td>
                    </tr>
                  ) : (
                    marcaciones.map((m, index) => (
                      <tr key={index}>
                        <td className={styles.boldCell}>{formatDate(m.fecha)}</td>
                        <td>{m.hora}</td>
                        <td>{m.tipo}</td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              m.resultado === "PUNTUAL" || m.resultado === "PRESENTE"
                                ? styles.badgeGreen
                                : m.resultado === "TARDANZA"
                                ? styles.badgeOrange
                                : styles.badgeRed
                            }`}
                          >
                            {m.resultado}
                          </span>
                        </td>
                        <td>{m.metodo}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resumen de la Semana */}
        <div className={`${styles.card} ${styles.colSpan4}`}>
          <div className={styles.cardHeader}>
            <h2>Resumen del período</h2>
            <p>Indicadores rápidos de cumplimiento académico y asistencia.</p>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.summaryStatsGrid}>
              <div className={styles.statSubCard}>
                <span className={styles.statLabel}>Clases programadas</span>
                <span className={`${styles.statNumber} ${styles.textBlue}`}>05</span>
              </div>
              <div className={styles.statSubCard}>
                <span className={styles.statLabel}>Marcaciones exitosas</span>
                <span className={`${styles.statNumber} ${styles.textGreen}`}>
                  {formatNumber(asistenciaData?.ingresos.length || 0)}
                </span>
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
