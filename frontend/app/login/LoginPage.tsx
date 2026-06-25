"use client";

import { useLogin } from "./LoginUseL";
import stylesB from "./BioMetric.module.css";
import styles from "./LoginPage.module.css";
import stylesH from "./Header.module.css"
import "./global.css"

export default function LoginPage() {
  const {
    username, password, showPassword, rememberSession, loading, message,role,setRole,
    setUsername, setPassword, setRememberSession,
    togglePassword, handleForgot, handleSubmit,
  } = useLogin();

  return (
      <div>
        <div className={stylesH.Encabezado}>
          hola
        </div>
        <div className = {styles.pageWrapper}>
          <div className={stylesB.BioM}>
            <div className={stylesB.circule1}>
              <div className={stylesB.circule2}>
                <div className={stylesB.circule3}>
                  <div className={stylesB.Ico}>
                    <i className="fa-solid fa-fingerprint fa-9x" ></i>
                  </div>
                </div>
              </div>
            </div>
            <div className = {stylesB.text}>
              <div style={{color:"rgba(210, 225, 255, 1)"}}>Validación biométrica institucional</div>
              <br></br>
              <br></br>
              <div style={{color:"rgba(140, 165, 215, 0.85)"}}>Huella digital · Identidad docente · Registro seguro</div>
            </div>
          </div>
          <div className={styles.loginContainer}>
            <div className={styles.loginCard}>
          
              {/* ── Brand header ── */}
              <div className={styles.brandHeader}>
                <div className={styles.universityBadge}>
                  <i className="fas fa-university" />
                  <span>UNSAAC - Cusco</span>
                  <i className="fas fa-fingerprint" />
                </div>
                <h1>Control de Asistencia Docente</h1>
                <p>Sistema biométrico · trazabilidad en tiempo real</p>
                <div className={styles.projectTag}>
                  <i className="fas fa-chalkboard-user" /> PROYECTO SEMESTRAL 2026-I | METODOLOGÍAS ÁGILES
                </div>
              </div>

              {/* ── Form ── */}
              <div className={styles.formContent}>
                <div className={styles.welcomeTitle}>Bienvenido</div>
                <div className={styles.subLine}>
                  Acceso seguro para docentes, supervisores y administradores
                </div>

                <form onSubmit={handleSubmit} noValidate>

                  {/* Usuario */}
                  <div className={styles.inputGroup}>
                    <label>
                      <i className="fas fa-user-graduate" /> Usuario institucional
                    </label>
                    <div className={styles.inputWrapper}>
                      <i className={`fas fa-envelope ${styles.inputIcon}`} />
                      <input
                        type="text"
                        className={styles.inputField}
                        placeholder="correo@unsaac.edu.pe | código docente"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Contraseña */}
                  <div className={styles.inputGroup}>
                    <label>
                      <i className="fas fa-lock" /> Contraseña
                    </label>
                    <div className={styles.inputWrapper}>
                      <i className={`fas fa-key ${styles.inputIcon}`} />
                      <input
                        type={showPassword ? "text" : "password"}
                        className={styles.inputField}
                        placeholder="············"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={togglePassword}
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        <i className={showPassword ? "far fa-eye" : "far fa-eye-slash"} />
                      </button>
                    </div>
                  </div>

                  {/* Opciones */}
                  <div className={styles.optionsRow}>
                    <label className={styles.remember}>
                      <input
                        type="checkbox"
                        checked={rememberSession}
                        onChange={(e) => setRememberSession(e.target.checked)}
                      />
                      <span>Recordar sesión</span>
                    </label>
                    <a href="#" className={styles.forgotLink} onClick={handleForgot}>
                      ¿Problemas con huella o credenciales?
                    </a>
                  </div>

                  {/*elegir rol */}
                  <select
                    className = {`${styles.rol} ${styles.Srol}`}
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="docente">
                      ♟︎ Docente
                    </option>
                    <option value="supervisor">
                      ⚙ Supervisor
                    </option>
                    <option value="administrador">
                      ♕ Administrador del sistema
                    </option>
                  </select>
                  {/* Submit */}
                  <button
                    type="submit"
                    className={`${styles.btnLogin} ${loading ? styles.loading : ""}`}
                    disabled={loading}
                  >
                    <div className={styles.btnSpinner} />
                    <span className={styles.btnLabel}>
                      <i className="fas fa-arrow-right-to-bracket" /> Iniciar Sesión
                    </span>
                  </button>

                  {/* Mensaje */}
                  <div
                    className={`${styles.messageArea} ${message.type === "error" ? styles.error : ""} ${message.type === "success" ? styles.success : ""}`}
                    dangerouslySetInnerHTML={{ __html: message.html }}
                  />
                </form>

                {/* Footer */}
                <div className={styles.footerLinks}>
                  <span>🔒 Autenticación biométrica integrada (huella / facial)</span>
                  {" · "}
                  <a href="#"><i className="fab fa-bitbucket" /> Soporte TI</a>
                  <br />
                  <small>© 2026 UNSAAC – Proyecto de metodologías Scrum | Control de asistencia docente</small>
                </div>
              </div>

            </div>
          </div>
          <div className={stylesB.BioM}>
            <div className={stylesB.caja}>
              <div className ={stylesB.burbuja}>
                <div className={stylesB.Ico}>
                  <i className="fa-solid fa-fingerprint fa-4x"></i>
                </div>
              </div>
              
            </div>
            <div className = {stylesB.text}>
              <div style={{color:"rgba(210, 225, 255, 1)"}}>Acceso protegido</div>
              <br></br>
              <br></br>
              <div style={{color:"rgba(140, 165, 215, 0.85)"}}>JWT · bcrypt · HTTPS</div>
            </div>
          </div>
      </div>
    </div>
  );
}
