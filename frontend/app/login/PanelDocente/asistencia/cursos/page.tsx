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

interface CursoHorario {
  id: number;
  curso: string;
  aula: string;
  diaSemana: number; // 1=Lunes, ..., 5=Viernes
  diaNombre: string;
  horaInicio: string;
  horaFin: string;
}

interface AsistenciaCursoLog {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

// Cursos hardcodeados que coinciden exactamente con los registros en horarios_curso en la BD
const PROGRAMACION_CURSOS: CursoHorario[] = [
  { id: 1, curso: "Base de Datos II", aula: "LAB-02", diaSemana: 1, diaNombre: "Lunes", horaInicio: "08:00", horaFin: "10:00" },
  { id: 2, curso: "Ingeniería Web", aula: "A-204", diaSemana: 2, diaNombre: "Martes", horaInicio: "10:00", horaFin: "12:00" },
  { id: 3, curso: "Tutoría", aula: "B-101", diaSemana: 3, diaNombre: "Miércoles", horaInicio: "08:00", horaFin: "10:00" },
  { id: 4, curso: "Seminario TI", aula: "C-301", diaSemana: 4, diaNombre: "Jueves", horaInicio: "12:00", horaFin: "14:00" },
  { id: 5, curso: "Arquitectura SW", aula: "LAB-01", diaSemana: 5, diaNombre: "Viernes", horaInicio: "08:00", horaFin: "12:00" },
];

export default function AsistenciaCursos() {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [cursosLog, setCursosLog] = useState<AsistenciaCursoLog[]>([]);
  const [selectedCurso, setSelectedCurso] = useState<CursoHorario>(PROGRAMACION_CURSOS[0]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error" | "validating">("idle");
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const fetchCursosLog = (userId: number, jwtToken: string) => {
    fetch(`/api/asistencia/docente/${userId}`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.cursos) {
          setCursosLog(data.cursos);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching courses logs:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        setToken(storedToken);
        fetchCursosLog(parsed.id, storedToken);
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

  const handleRegister = () => {
    if (!user || !token) return;

    setRegistering(true);
    setStatus("validating");
    setMessage("Verificando huella dactilar para el curso...");

    setTimeout(async () => {
      try {
        const response = await fetch("/api/asistencia/curso", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            horario_curso_id: selectedCurso.id,
            docente_id: user.id,
            dispositivo_id: `Lector ${selectedCurso.aula}`,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus("success");
          setMessage(`Asistencia registrada: ${data.mensaje}`);
          fetchCursosLog(user.id, token);
        } else {
          setStatus("error");
          setMessage(data.error || "Ocurrió un error. Verifique el horario de la clase.");
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage("Error al conectar con la base de datos.");
      } finally {
        setRegistering(false);
      }
    }, 2000);
  };

  const docenteName = user ? `${user.nombres} ${user.apellidos}` : "Mg. Verónica Holgado Canales";

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
          <p>Cargando módulo de asistencia a cursos...</p>
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
        <h1>Registro de asistencia a cursos</h1>
        <p>Valide su asistencia biométrica para la sesión académica programada del día</p>
      </div>

      <div className={styles.contentGrid}>
        {/* Lado Izquierdo: Curso Asignado */}
        <div className={`${styles.panelCard} ${styles.col6}`}>
          <div className={styles.panelHeader}>
            <h2>Curso asignado</h2>
            <p>Seleccione el curso a registrar de la lista.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.filterGroup} style={{ margin: 0 }}>
              <label>Seleccionar curso de la programación</label>
              <select
                value={selectedCurso.id}
                onChange={(e) => {
                  const found = PROGRAMACION_CURSOS.find((c) => c.id === parseInt(e.target.value));
                  if (found) {
                    setSelectedCurso(found);
                    setStatus("idle");
                    setMessage("");
                  }
                }}
              >
                {PROGRAMACION_CURSOS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.curso} ({c.diaNombre})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ backgroundColor: "#f8fafc", padding: "1.25rem", borderRadius: "12px", border: "1px solid #eef2f6", display: "flex", flexDirection: "column", gap: "10px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#0b2b42", margin: 0 }}>{selectedCurso.curso}</h3>
              <div style={{ fontSize: "0.85rem", color: "#5e6f8d", display: "flex", flexDirection: "column", gap: "4px" }}>
                <span><strong>Docente:</strong> {docenteName}</span>
                <span><strong>Aula asignada:</strong> {selectedCurso.aula}</span>
                <span><strong>Horario programado:</strong> {selectedCurso.horaInicio} - {selectedCurso.horaFin} ({selectedCurso.diaNombre})</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <div className={styles.cardMetaBox} style={{ flex: 1, margin: 0, textAlign: "center" }}>
                <span className={styles.metaLabel}>Hora actual</span>
                <span className={styles.metaValue} style={{ fontSize: "1.25rem", color: "#007bff" }}>{currentTime}</span>
              </div>
              <div className={styles.cardMetaBox} style={{ flex: 1, margin: 0, textAlign: "center" }}>
                <span className={styles.metaLabel}>Resultado esperado</span>
                <span className={`${styles.badge} ${styles.badgeGreen}`} style={{ marginTop: "4px" }}>Dentro de margen</span>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={registering}
              className={`${styles.btnOrange} ${styles.btnFull}`}
              style={{ marginTop: "1rem" }}
            >
              Registrar asistencia al curso
            </button>
          </div>
        </div>

        {/* Lado Derecho: Panel de Validación Biométrica */}
        <div className={`${styles.panelCard} ${styles.col6}`}>
          <div className={styles.panelHeader}>
            <h2>Panel de validación biométrica</h2>
          </div>
          <div className={styles.panelBody} style={{ alignItems: "center", textAlign: "center" }}>
            <div className={styles.biometricScan} style={{ width: "140px", height: "140px" }}>
              <div className={`${styles.scanCircle} ${styles.scanCircle1}`} style={{ animationPlayState: status === "validating" ? "running" : "paused" }}></div>
              <div className={`${styles.scanCircle} ${styles.scanCircle2}`} style={{ animationPlayState: status === "validating" ? "running" : "paused" }}></div>
              <div className={styles.scanIcon} style={{ fontSize: "3.5rem" }}>
                <i className={`fas ${status === "success" ? "fa-check-circle" : status === "error" ? "fa-times-circle" : "fa-fingerprint"}`} 
                   style={{ color: status === "success" ? "#10b981" : status === "error" ? "#ef4444" : "#3b82f6" }}></i>
              </div>
            </div>

            <div className={styles.statusList} style={{ width: "100%" }}>
              <div className={styles.statusItem} style={{ padding: "0.75rem 1rem", borderLeft: "4px solid #10b981" }}>
                <div className={styles.statusText} style={{ textAlign: "left" }}>
                  <h4>Dispositivo conectado</h4>
                  <p>Lector biométrico {selectedCurso.aula} activo</p>
                </div>
              </div>
              <div className={styles.statusItem} style={{ padding: "0.75rem 1rem", borderLeft: "4px solid #f59e0b" }}>
                <div className={styles.statusText} style={{ textAlign: "left" }}>
                  <h4>Estado actual</h4>
                  <p>Esperando validación de huella del docente</p>
                </div>
              </div>
            </div>

            <div className={styles.alertBox} className={`${styles.alertBox} ${styles.alertBlue}`} style={{ width: "100%", marginTop: "1rem" }}>
              <i className="fas fa-shield-alt"></i>
              <span>Acerque su huella al sensor y manténgala por 2 segundos.</span>
            </div>

            {message && (
              <div className={`${styles.alertBox} ${status === "success" ? styles.alertBlue : status === "error" ? styles.alertRed : styles.alertOrange}`} style={{ width: "100%", marginTop: "0.5rem" }}>
                <i className="fas fa-info-circle"></i>
                <span>{message}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lista de cursos del día */}
      <div className={styles.contentGrid} style={{ marginTop: "1rem" }}>
        <div className={`${styles.panelCard} ${styles.col8}`}>
          <div className={styles.panelHeader}>
            <h2>Lista de cursos programados</h2>
            <p>Historial de marcaciones por sesiones de clase del docente.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.tableResponsive}>
              <table className={styles.logTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Curso</th>
                    <th>Aula</th>
                    <th>Hora Marcación</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cursosLog.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#8e9db5" }}>
                        No se registran asistencias de clase guardadas.
                      </td>
                    </tr>
                  ) : (
                    cursosLog.slice(0, 10).map((log, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: "700" }}>{formatDate(log.fecha)}</td>
                        <td style={{ fontWeight: "600", color: "#0b2b42" }}>{log.curso}</td>
                        <td>{log.aula}</td>
                        <td>{log.hora_registro}</td>
                        <td>
                          <span className={`${styles.badge} ${log.estado === "PRESENTE" || log.estado === "PUNTUAL" ? styles.badgeGreen : styles.badgeOrange}`}>
                            {log.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Resumen de escenarios explicativos */}
        <div className={`${styles.panelCard} ${styles.col4}`}>
          <div className={styles.panelHeader}>
            <h2>Explicación de estados</h2>
          </div>
          <div className={styles.panelBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className={styles.alertBox} className={`${styles.alertBox} ${styles.alertBlue}`} style={{ borderLeft: "4px solid #10b981", color: "#15803d", backgroundColor: "#f0fdf4" }}>
                <div><strong>PRESENTE:</strong> Marcación dentro del horario y del margen de tolerancia.</div>
              </div>
              <div className={styles.alertBox} className={`${styles.alertBox} ${styles.alertBlue}`} style={{ borderLeft: "4px solid #f59e0b", color: "#b45309", backgroundColor: "#fffbeb" }}>
                <div><strong>TARDANZA:</strong> Marcación posterior al inicio, pero dentro de tolerancia.</div>
              </div>
              <div className={styles.alertBox} className={`${styles.alertBox} ${styles.alertBlue}`} style={{ borderLeft: "4px solid #ef4444", color: "#b91c1c", backgroundColor: "#fef2f2" }}>
                <div><strong>FUERA DE HORA:</strong> Marcación fuera del margen permitido por la UNSAAC.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
