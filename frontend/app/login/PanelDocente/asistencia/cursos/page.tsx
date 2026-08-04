"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import styles from "../asistencia.module.css";

import { getLegacyUser, getToken } from "@/lib/auth";
import {
  ApiHorariosError,
  getMisHorarios,
} from "@/lib/services/horarios.service";

import type { HorarioCurso } from "@/types/horario";

interface UserData {
  id: number;
  nombres: string;
  apellidos: string;
  rol: string;
}

interface AsistenciaCursoLog {
  fecha: string;
  hora_registro: string;
  estado: string;
  curso: string;
  aula: string;
}

const DAY_NAMES = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

export default function AsistenciaCursos() {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<HorarioCurso[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(0);
  const [cursosLog, setCursosLog] = useState<AsistenciaCursoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "error" | "validating"
  >("idle");
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  const selectedSchedule = useMemo(
    () => horarios.find((item) => item.id === selectedScheduleId) ?? horarios[0] ?? null,
    [horarios, selectedScheduleId]
  );

  const fetchAttendance = useCallback(async (jwtToken: string) => {
    const response = await fetch("/api/asistencia/docente/me", {
      headers: { Authorization: `Bearer ${jwtToken}` },
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as
      | { cursos?: AsistenciaCursoLog[]; error?: string }
      | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "No se pudo cargar el historial de asistencia.");
    }

    setCursosLog(data?.cursos ?? []);
  }, []);

  const loadData = useCallback(async () => {
    const storedUser = getLegacyUser();
    const storedToken = getToken();

    if (!storedUser || !storedToken) {
      setLoadError("No existe una sesión docente válida.");
      setLoading(false);
      return;
    }

    setUser(storedUser);
    setToken(storedToken);
    setLoading(true);
    setLoadError("");

    try {
      const [scheduleResponse] = await Promise.all([
        getMisHorarios(),
        fetchAttendance(storedToken),
      ]);

      const activeSchedules = scheduleResponse.filter((item) => item.activo);
      setHorarios(activeSchedules);
      setSelectedScheduleId((current) =>
        activeSchedules.some((item) => item.id === current)
          ? current
          : activeSchedules[0]?.id ?? 0
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la programación del docente."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchAttendance]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();

    function updateClock() {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("es-PE", { hour12: false }));
      setCurrentDate(
        now.toLocaleDateString("es-PE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    }

    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [loadData]);

  async function handleRegister() {
    if (!user || !token || !selectedSchedule) return;

    setRegistering(true);
    setStatus("validating");
    setMessage("Verificando la identidad biométrica para la sesión seleccionada...");

    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    try {
      const response = await fetch("/api/asistencia/curso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          horario_curso_id: selectedSchedule.id,
          dispositivo_id: `Lector ${selectedSchedule.aula}`,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { mensaje?: string; error?: string }
        | null;

      if (!response.ok) {
        setStatus("error");
        setMessage(
          data?.error ?? "No se pudo registrar la asistencia para esta sesión."
        );
        return;
      }

      setStatus("success");
      setMessage(`Asistencia registrada: ${data?.mensaje ?? "operación correcta"}`);
      await fetchAttendance(token);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof ApiHorariosError
          ? error.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setRegistering(false);
    }
  }

  const docenteName = user
    ? `${user.nombres} ${user.apellidos}`.trim()
    : "Docente";

  if (loading) {
    return (
      <div
        className={styles.container}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "65vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <i
            className="fa-solid fa-circle-notch fa-spin fa-3x"
            style={{ color: "#f58025", marginBottom: "1rem" }}
          />
          <p>Cargando programación académica...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/login/PanelDocente/asistencia" className={styles.backLink}>
        <i className="fas fa-arrow-left" /> Volver al panel de asistencias
      </Link>

      <div className={styles.headerSection}>
        <h1>Registro de asistencia a cursos</h1>
        <p>Seleccione una sesión real de su programación académica.</p>
      </div>

      {loadError && (
        <div className={`${styles.alertBox} ${styles.alertRed}`}>
          <i className="fas fa-triangle-exclamation" />
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadData()}>
            Reintentar
          </button>
        </div>
      )}

      {!loadError && horarios.length === 0 ? (
        <div className={styles.panelCard}>
          <div className={styles.panelBody} style={{ textAlign: "center" }}>
            <i
              className="fas fa-calendar-xmark fa-3x"
              style={{ color: "#94a3b8", marginBottom: "1rem" }}
            />
            <h2>No tiene horarios activos asignados</h2>
            <p>La programación aparecerá cuando el administrador asigne un curso.</p>
          </div>
        </div>
      ) : selectedSchedule ? (
        <>
          <div className={styles.contentGrid}>
            <div className={`${styles.panelCard} ${styles.col6}`}>
              <div className={styles.panelHeader}>
                <h2>Sesión académica</h2>
                <p>Programación vinculada a su cuenta docente.</p>
              </div>

              <div className={styles.panelBody}>
                <div className={styles.filterGroup} style={{ margin: 0 }}>
                  <label>Seleccionar horario</label>
                  <select
                    value={selectedSchedule.id}
                    onChange={(event) => {
                      setSelectedScheduleId(Number(event.target.value));
                      setStatus("idle");
                      setMessage("");
                    }}
                  >
                    {horarios.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.cursoCodigo} · {item.curso} ({DAY_NAMES[item.diaSemana]})
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px solid #eef2f6",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "800",
                      color: "#0b2b42",
                      margin: 0,
                    }}
                  >
                    {selectedSchedule.curso}
                  </h3>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "#5e6f8d",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <span><strong>Docente:</strong> {docenteName}</span>
                    <span><strong>Semestre:</strong> {selectedSchedule.semestre}</span>
                    <span><strong>Aula:</strong> {selectedSchedule.aula}</span>
                    <span>
                      <strong>Horario:</strong> {selectedSchedule.horaInicio} - {selectedSchedule.horaFin}
                      {" "}({DAY_NAMES[selectedSchedule.diaSemana]})
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div className={styles.cardMetaBox} style={{ flex: 1, margin: 0, textAlign: "center" }}>
                    <span className={styles.metaLabel}>Hora actual</span>
                    <span className={styles.metaValue} style={{ fontSize: "1.25rem", color: "#007bff" }}>
                      {currentTime}
                    </span>
                  </div>
                  <div className={styles.cardMetaBox} style={{ flex: 1, margin: 0, textAlign: "center" }}>
                    <span className={styles.metaLabel}>Fecha</span>
                    <span className={styles.metaValue}>{currentDate}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRegister()}
                  disabled={registering}
                  className={`${styles.btnOrange} ${styles.btnFull}`}
                  style={{ marginTop: "1rem" }}
                >
                  {registering ? "Validando..." : "Registrar asistencia al curso"}
                </button>
              </div>
            </div>

            <div className={`${styles.panelCard} ${styles.col6}`}>
              <div className={styles.panelHeader}>
                <h2>Validación biométrica</h2>
              </div>
              <div className={styles.panelBody} style={{ alignItems: "center", textAlign: "center" }}>
                <div className={styles.biometricScan} style={{ width: "140px", height: "140px" }}>
                  <div
                    className={`${styles.scanCircle} ${styles.scanCircle1}`}
                    style={{ animationPlayState: status === "validating" ? "running" : "paused" }}
                  />
                  <div
                    className={`${styles.scanCircle} ${styles.scanCircle2}`}
                    style={{ animationPlayState: status === "validating" ? "running" : "paused" }}
                  />
                  <div className={styles.scanIcon} style={{ fontSize: "3.5rem" }}>
                    <i
                      className={`fas ${
                        status === "success"
                          ? "fa-check-circle"
                          : status === "error"
                            ? "fa-times-circle"
                            : "fa-fingerprint"
                      }`}
                      style={{
                        color:
                          status === "success"
                            ? "#10b981"
                            : status === "error"
                              ? "#ef4444"
                              : "#3b82f6",
                      }}
                    />
                  </div>
                </div>

                <div className={`${styles.alertBox} ${styles.alertBlue}`} style={{ width: "100%" }}>
                  <i className="fas fa-shield-alt" />
                  <span>El sistema validará el día, la hora y la titularidad del horario.</span>
                </div>

                {message && (
                  <div
                    className={`${styles.alertBox} ${
                      status === "error" ? styles.alertRed : styles.alertBlue
                    }`}
                    style={{ width: "100%", marginTop: "0.5rem" }}
                  >
                    <i className="fas fa-info-circle" />
                    <span>{message}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.panelCard} style={{ marginTop: "1rem" }}>
            <div className={styles.panelHeader}>
              <h2>Historial de marcaciones de cursos</h2>
              <p>Registros guardados para sus sesiones académicas.</p>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.tableResponsive}>
                <table className={styles.logTable}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Curso</th>
                      <th>Aula</th>
                      <th>Hora</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cursosLog.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "#8e9db5" }}>
                          No existen marcaciones de clase registradas.
                        </td>
                      </tr>
                    ) : (
                      cursosLog.slice(0, 10).map((log, index) => (
                        <tr key={`${log.fecha}-${log.hora_registro}-${index}`}>
                          <td style={{ fontWeight: "700" }}>{formatDate(log.fecha)}</td>
                          <td style={{ fontWeight: "600", color: "#0b2b42" }}>{log.curso}</td>
                          <td>{log.aula}</td>
                          <td>{log.hora_registro}</td>
                          <td>
                            <span className={`${styles.badge} ${log.estado === "PRESENTE" ? styles.badgeGreen : styles.badgeOrange}`}>
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
        </>
      ) : null}
    </div>
  );
}

function formatDate(dateValue: string) {
  const cleanDate = dateValue?.split("T")[0] ?? "";
  const parts = cleanDate.split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateValue;
}
