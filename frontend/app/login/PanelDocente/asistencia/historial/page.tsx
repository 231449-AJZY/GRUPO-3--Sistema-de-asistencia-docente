"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../asistencia.module.css";

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

export default function AsistenciaHistorial() {
  const [user, setUser] = useState<UserData | null>(null);
  const [asistenciaData, setAsistenciaData] = useState<AsistenciaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCurso, setFilterCurso] = useState("Todos");
  const [startDate, setStartDate] = useState("2026-03-01");
  const [endDate, setEndDate] = useState("2026-07-31");

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);

        fetch(`/api/asistencia/docente/${parsed.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((data) => {
            setAsistenciaData(data);
            setLoading(false);
          })
          .catch((err) => {
            console.error(err);
            setLoading(false);
          });
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Mg. Verónica Holgado Canales";

  // --- Consolidar todos los registros de ingreso y cursos ---
  const rawRegistros: Array<{
    fecha: string;
    curso: string;
    aula: string;
    horaProgramada: string;
    horaRegistrada: string;
    estado: string;
    obs: string;
  }> = [];

  if (asistenciaData) {
    asistenciaData.ingresos.forEach((r) => {
      rawRegistros.push({
        fecha: r.fecha.split("T")[0],
        curso: "Ingreso institucional",
        aula: "Lector General",
        horaProgramada: "08:00:00",
        horaRegistrada: r.hora_registro,
        estado: r.estado,
        obs: r.estado === "PUNTUAL" ? "Registro validado correctamente" : "Demora en ingreso",
      });
    });

    asistenciaData.cursos.forEach((r) => {
      rawRegistros.push({
        fecha: r.fecha.split("T")[0],
        curso: r.curso,
        aula: r.aula,
        horaProgramada: "Variable",
        horaRegistrada: r.hora_registro,
        estado: r.estado,
        obs: "Sesión desarrollada con normalidad",
      });
    });
  }

  // Filtrar registros
  const registrosFiltrados = rawRegistros.filter((r) => {
    const isWithinDates = r.fecha >= startDate && r.fecha <= endDate;
    const matchesCurso = filterCurso === "Todos" || r.curso === filterCurso;
    return isWithinDates && matchesCurso;
  });

  // Ordenar cronológicamente descendente
  registrosFiltrados.sort((a, b) => {
    const dtA = `${a.fecha}T${a.horaRegistrada}`;
    const dtB = `${b.fecha}T${b.horaRegistrada}`;
    return dtB.localeCompare(dtA);
  });

  // Métricas
  const totalAsistencias = registrosFiltrados.length;
  const totalTardanzas = registrosFiltrados.filter((r) => r.estado === "TARDANZA").length;
  const totalAusencias = registrosFiltrados.filter((r) => r.estado === "AUSENTE").length;
  const totalPuntuales = registrosFiltrados.filter((r) => r.estado === "PUNTUAL" || r.estado === "PRESENTE").length;

  const complianceRate =
    totalAsistencias > 0
      ? Math.round((totalPuntuales / totalAsistencias) * 100)
      : 100;

  // Extraer nombres de cursos únicos para el dropdown de filtros
  const cursosUnicos = Array.from(new Set(rawRegistros.map((r) => r.curso)));

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
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
          <p>Cargando historial de asistencias...</p>
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
        <h1>Historial de asistencia</h1>
        <p>Consulta detallada de asistencias registradas por curso, fecha y cumplimiento académico</p>
      </div>

      {/* Tarjetas de métricas del historial */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.badgeGreen}`}>
            <i className="fas fa-check-circle"></i>
          </div>
          <div className={styles.metricInfo}>
            <h4>{String(totalAsistencias).padStart(2, "0")}</h4>
            <p>Asistencias totales</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.badgeOrange}`}>
            <i className="fas fa-clock"></i>
          </div>
          <div className={styles.metricInfo}>
            <h4>{String(totalTardanzas).padStart(2, "0")}</h4>
            <p>Tardanzas acumuladas</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.badgeRed}`}>
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className={styles.metricInfo}>
            <h4>{String(totalAusencias).padStart(2, "0")}</h4>
            <p>Inasistencias registradas</p>
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.badgeBlue}`}>
            <i className="fas fa-chart-line"></i>
          </div>
          <div className={styles.metricInfo}>
            <h4>{complianceRate}%</h4>
            <p>Cumplimiento promedio</p>
          </div>
        </div>
      </div>

      {/* Contenedor de Filtros */}
      <div className={styles.filterCard}>
        <div className={styles.filterGroup}>
          <label>Fecha inicial</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label>Fecha final</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className={styles.filterGroup}>
          <label>Curso / Registro</label>
          <select value={filterCurso} onChange={(e) => setFilterCurso(e.target.value)}>
            <option value="Todos">Todos</option>
            {cursosUnicos.map((curso, idx) => (
              <option key={idx} value={curso}>
                {curso}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Tabla Detalle de Registros */}
        <div className={`${styles.panelCard} ${styles.col8}`}>
          <div className={styles.panelHeader}>
            <h2>Detalle de registros</h2>
            <p>Detalle consolidado de registros biométricos del rango seleccionado.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.tableResponsive}>
              <table className={styles.logTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Curso / Tipo</th>
                    <th>Aula</th>
                    <th>Hora Marcada</th>
                    <th>Estado</th>
                    <th>Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#8e9db5" }}>
                        No hay marcas registradas para el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    registrosFiltrados.map((item, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: "700" }}>{formatDate(item.fecha)}</td>
                        <td style={{ fontWeight: "600", color: "#0b2b42" }}>{item.curso}</td>
                        <td>{item.aula}</td>
                        <td>{item.horaRegistrada}</td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              item.estado === "PUNTUAL" || item.estado === "PRESENTE"
                                ? styles.badgeGreen
                                : item.estado === "TARDANZA"
                                ? styles.badgeOrange
                                : styles.badgeRed
                            }`}
                          >
                            {item.estado}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>{item.obs}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gráfico de barras y resumen a la derecha */}
        <div className={`${styles.panelCard} ${styles.col4}`}>
          <div className={styles.panelHeader}>
            <h2>Cumplimiento mensual</h2>
            <p>Porcentaje de asistencia efectiva por mes académico.</p>
          </div>
          <div className={styles.panelBody}>
            {/* Gráfico de Barras Estilizado en CSS */}
            <div className={styles.chartContainer}>
              <div className={styles.chartBarWrapper}>
                <div className={styles.chartBar} style={{ height: "90%" }}>
                  <span className={styles.chartVal}>90%</span>
                </div>
                <span className={styles.chartLabel}>Ene</span>
              </div>
              <div className={styles.chartBarWrapper}>
                <div className={styles.chartBar} style={{ height: "94%" }}>
                  <span className={styles.chartVal}>94%</span>
                </div>
                <span className={styles.chartLabel}>Feb</span>
              </div>
              <div className={styles.chartBarWrapper}>
                <div className={styles.chartBar} style={{ height: "96%" }}>
                  <span className={styles.chartVal}>96%</span>
                </div>
                <span className={styles.chartLabel}>Mar</span>
              </div>
              <div className={styles.chartBarWrapper}>
                <div className={styles.chartBar} style={{ height: "92%" }}>
                  <span className={styles.chartVal}>92%</span>
                </div>
                <span className={styles.chartLabel}>Abr</span>
              </div>
              <div className={styles.chartBarWrapper}>
                <div className={styles.chartBar} style={{ height: "94%" }}>
                  <span className={styles.chartVal}>94%</span>
                </div>
                <span className={styles.chartLabel}>May</span>
              </div>
            </div>

            {/* Resumen Académico */}
            <div className={styles.obsCard} style={{ marginTop: "1rem" }}>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "0.95rem", fontWeight: "800", color: "#0b2b42" }}>Resumen académico</h3>
              <div className={styles.obsItem}>
                <span className={styles.obsTitle}>Curso con mejor cumplimiento:</span>
                <span className={`${styles.badgeSmall} ${styles.badgeGreen}`}>Base de Datos II (97%)</span>
              </div>
              <div className={styles.obsItem} style={{ marginTop: "8px" }}>
                <span className={styles.obsTitle}>Curso con mayor tardanza:</span>
                <span className={`${styles.badgeSmall} ${styles.badgeOrange}`}>Ingeniería Web (4 tardanzas)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
