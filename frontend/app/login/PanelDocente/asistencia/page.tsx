"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./asistencia.module.css";

interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  rol: string;
  codigo?: string;
  departamento?: string;
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

export default function AsistenciaPanel() {
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
              console.error("Error fetching attendance:", err);
              setLoading(false);
            });
        } else {
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Mg. Verónica Holgado Canales";
  const docenteCodigo = user?.codigo || "DOC-0231";
  const docenteDep = user?.departamento || "Ingeniería Informática y de Sistemas";

  // Calcular métricas
  const totalAsistencias = (asistenciaData?.ingresos.length || 0) + (asistenciaData?.cursos.length || 0);
  const totalTardanzas =
    (asistenciaData?.ingresos.filter((r) => r.estado === "TARDANZA").length || 0) +
    (asistenciaData?.cursos.filter((r) => r.estado === "TARDANZA").length || 0);
  const totalAusencias =
    (asistenciaData?.ingresos.filter((r) => r.estado === "AUSENTE").length || 0) +
    (asistenciaData?.cursos.filter((r) => r.estado === "AUSENTE").length || 0);

  const complianceRate =
    totalAsistencias > 0
      ? Math.round(((totalAsistencias - totalTardanzas - totalAusencias) / totalAsistencias) * 100)
      : 100;

  // Última marcación
  const todasLasMarcaciones: Array<{fecha: string; hora: string; tipo: string; resultado: string; dependencia?: string; obs?: string; curso?: string; aula?: string}> = [];
  if (asistenciaData) {
    asistenciaData.ingresos.forEach((r) => {
      todasLasMarcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: "Ingreso institucional",
        dependencia: "Pabellón A - Lector B-01",
        resultado: r.estado,
        obs: "Marcación validada correctamente",
      });
    });
    asistenciaData.cursos.forEach((r) => {
      todasLasMarcaciones.push({
        fecha: r.fecha,
        hora: r.hora_registro,
        tipo: `Asistencia: ${r.curso}`,
        dependencia: `Aula ${r.aula}`,
        resultado: r.estado,
        obs: "Asistencia validada correctamente",
      });
    });
  }

  // Ordenar cronológicamente descendente
  todasLasMarcaciones.sort((a, b) => {
    const dtA = `${a.fecha.split("T")[0]}T${a.hora}`;
    const dtB = `${b.fecha.split("T")[0]}T${b.hora}`;
    return dtB.localeCompare(dtA);
  });

  const ultimaMarcacionHora = todasLasMarcaciones[0] ? todasLasMarcaciones[0].hora.slice(0, 5) : "—";

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
          <p>Cargando panel de asistencias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h1>Panel de asistencias</h1>
        <p>Seleccione una opción para registrar su ingreso institucional, marcar asistencia a cursos o revisar su historial.</p>
      </div>

      {/* Banner de Info del Docente */}
      <div className={styles.docenteBanner}>
        <div className={styles.docenteBannerLeft}>
          <div className={styles.docenteBannerIcon}>
            <i className="fas fa-user-tie"></i>
          </div>
          <div className={styles.docenteBannerInfo}>
            <h3>Docente: {docenteName}</h3>
            <p>{docenteDep} · Código {docenteCodigo} · Semestre 2025-I</p>
          </div>
        </div>
        <div className={styles.docenteBannerRight}>
          <span className={`${styles.badge} ${styles.badgeGreen}`}>
            <i className="fas fa-fingerprint"></i> Biometría activa
          </span>
          <span className={`${styles.badge} ${styles.badgeBlue}`}>
            Última marcación: {ultimaMarcacionHora}
          </span>
        </div>
      </div>

      {/* Menu principal con las 3 tarjetas de las imágenes */}
      <div className={styles.menuGrid}>
        {/* Tarjeta 1: Ingreso Institucional */}
        <div className={styles.menuCard}>
          <div className={styles.fingerprintInner} style={{ animation: "none", width: "70px", height: "70px", fontSize: "2rem" }}>
            <i className="fas fa-fingerprint"></i>
          </div>
          <h3 className={styles.cardHeaderTitle}>1. Registro de ingreso institucional</h3>
          <p className={styles.cardDesc}>Marque su ingreso general a la universidad mediante validación biométrica.</p>
          <div className={styles.cardMetaBox}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Estado del día</span>
              <span className={`${styles.metaValue} ${styles.textGreen}`}>Ingreso disponible</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Ingreso programado</span>
              <span className={styles.metaValue}>08:00 a. m.</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Dispositivo</span>
              <span className={styles.metaValue}>Lector B-01</span>
            </div>
          </div>
          <Link href="/login/PanelDocente/asistencia/ingreso" className={`${styles.btnOrange} ${styles.btnFull}`}>
            Ingresar a registro institucional
          </Link>
        </div>

        {/* Tarjeta 2: Asistencia a Cursos */}
        <div className={styles.menuCard}>
          <div className={styles.fingerprintInner} style={{ animation: "none", width: "70px", height: "70px", fontSize: "2rem", color: "#10b981", backgroundColor: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.1)" }}>
            <i className="fas fa-file-signature"></i>
          </div>
          <h3 className={styles.cardHeaderTitle}>2. Registro de asistencia a cursos</h3>
          <p className={styles.cardDesc}>Valide su presencia en cada curso asignado según horario académico.</p>
          <div className={styles.cardMetaBox}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Próximo curso</span>
              <span className={styles.metaValue}>Base de Datos II</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Horario</span>
              <span className={styles.metaValue}>10:00 a. m. - 12:00 p. m.</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Aula</span>
              <span className={styles.metaValue}>LAB-02</span>
            </div>
          </div>
          <Link href="/login/PanelDocente/asistencia/cursos" className={`${styles.btnOrange} ${styles.btnFull}`}>
            Ingresar a asistencia de cursos
          </Link>
        </div>

        {/* Tarjeta 3: Historial de Asistencia */}
        <div className={styles.menuCard}>
          <div className={styles.fingerprintInner} style={{ animation: "none", width: "70px", height: "70px", fontSize: "2rem", color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.1)" }}>
            <i className="fas fa-calendar-alt"></i>
          </div>
          <h3 className={styles.cardHeaderTitle}>3. Historial de asistencia</h3>
          <p className={styles.cardDesc}>Revise sus registros, tardanzas, inasistencias y observaciones del semestre.</p>
          <div className={styles.cardMetaBox}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Asistencias</span>
              <span className={styles.metaValue}>{totalAsistencias}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Tardanzas</span>
              <span className={styles.metaValue}>{totalTardanzas}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Cumplimiento</span>
              <span className={styles.metaValue}>{complianceRate}%</span>
            </div>
          </div>
          <Link href="/login/PanelDocente/asistencia/historial" className={`${styles.btnOrange} ${styles.btnFull}`}>
            Ver historial de asistencia
          </Link>
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className={styles.panelCard} style={{ marginTop: "1rem" }}>
        <div className={styles.panelHeader}>
          <h2>Actividad reciente</h2>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.tableResponsive}>
            <table className={styles.logTable}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo de registro</th>
                  <th>Curso / Dependencia</th>
                  <th>Hora</th>
                  <th>Estado</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {todasLasMarcaciones.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#8e9db5" }}>
                      No se han registrado marcas biométricas recientemente.
                    </td>
                  </tr>
                ) : (
                  todasLasMarcaciones.slice(0, 5).map((m, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: "700" }}>{formatDate(m.fecha)}</td>
                      <td>{m.tipo}</td>
                      <td>{m.dependencia}</td>
                      <td>{m.hora}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
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
                      <td>{m.obs}</td>
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
