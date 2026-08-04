-- =============================================================
-- MODELO DE BASE DE DATOS
-- Sistema de Control de Asistencia Biométrica - UNSAAC
-- Motor: PostgreSQL 15+
-- Autor: Development Team
-- Fecha: 2026-06-01
-- =============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- TABLA: roles
-- Roles del sistema: Administrador, Docente, Supervisor
-- =============================================================
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    creado_en   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (nombre, descripcion) VALUES
    ('Administrador', 'Gestión total del sistema'),
    ('Docente',       'Registro y consulta de asistencia personal'),
    ('Supervisor',    'Monitoreo y reportes de asistencia');

-- =============================================================
-- TABLA: usuarios
-- Usuarios del sistema (docentes, admin, supervisores)
-- =============================================================
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    codigo          VARCHAR(20)  NOT NULL UNIQUE,   -- código institucional
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol_id          INT          NOT NULL REFERENCES roles(id),
    activo          BOOLEAN      DEFAULT TRUE,
    creado_en       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- TABLA: departamentos_academicos
-- Facultades / departamentos de la UNSAAC
-- =============================================================
CREATE TABLE departamentos_academicos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL UNIQUE,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,
    activo      BOOLEAN      DEFAULT TRUE,
    creado_en   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- TABLA: docentes
-- Perfil extendido del docente (1-a-1 con usuarios)
-- =============================================================
CREATE TABLE docentes (
    id                      SERIAL PRIMARY KEY,
    usuario_id              INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    departamento_id         INT NOT NULL REFERENCES departamentos_academicos(id),
    dni                     VARCHAR(15) UNIQUE,
    categoria               VARCHAR(80),   -- Ej: Asociado, Principal, Auxiliar
    condicion               VARCHAR(50),   -- Ej: Nombrado, Contratado
    telefono                VARCHAR(20),
    foto_url                VARCHAR(255),
    creado_en               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- TABLA: datos_biometricos
-- Plantillas de huella dactilar u otros biométricos
-- Almacena la plantilla cifrada, NUNCA la imagen cruda
-- =============================================================
CREATE TABLE datos_biometricos (
    id                  SERIAL PRIMARY KEY,
    docente_id          INT         NOT NULL REFERENCES docentes(id) ON DELETE CASCADE,
    tipo                VARCHAR(30) NOT NULL DEFAULT 'HUELLA',  -- HUELLA | FACIAL | IRIS
    dedo                VARCHAR(20),                             -- PULGAR_DER, INDICE_IZQ, etc.
    plantilla_cifrada   BYTEA       NOT NULL,                   -- Plantilla biométrica AES-256
    version_sdk         VARCHAR(20),                             -- Versión del SDK biométrico
    activo              BOOLEAN     DEFAULT TRUE,
    enrolado_en         TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    enrolado_por        INT         REFERENCES usuarios(id),     -- Admin que enroló
    CONSTRAINT uc_docente_tipo_dedo UNIQUE (docente_id, tipo, dedo)
);

-- =============================================================
-- TABLA: semestres
-- Períodos académicos
-- =============================================================
CREATE TABLE semestres (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(15) NOT NULL UNIQUE,   -- Ej: 2026-I, 2026-II
    fecha_inicio DATE        NOT NULL,
    fecha_fin    DATE        NOT NULL,
    activo      BOOLEAN      DEFAULT FALSE,
    creado_en   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_fechas_semestre CHECK (fecha_fin > fecha_inicio)
);

-- =============================================================
-- TABLA: cursos
-- Catálogo de cursos de la institución
-- =============================================================
CREATE TABLE cursos (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(20)  NOT NULL UNIQUE,
    nombre              VARCHAR(150) NOT NULL,
    departamento_id     INT          NOT NULL REFERENCES departamentos_academicos(id),
    creditos            INT          DEFAULT 3,
    activo              BOOLEAN      DEFAULT TRUE,
    creado_en           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- TABLA: horarios_curso
-- Asignación de docente + curso + aula + día/hora (por semestre)
-- Máx. 5 cursos por docente según regla de negocio
-- =============================================================
CREATE TABLE horarios_curso (
    id              SERIAL PRIMARY KEY,
    docente_id      INT         NOT NULL REFERENCES docentes(id),
    curso_id        INT         NOT NULL REFERENCES cursos(id),
    semestre_id     INT         NOT NULL REFERENCES semestres(id),
    aula            VARCHAR(50) NOT NULL,
    dia_semana      SMALLINT    NOT NULL,   -- 1=Lunes … 5=Viernes
    hora_inicio     TIME        NOT NULL,
    hora_fin        TIME        NOT NULL,
    activo          BOOLEAN     DEFAULT TRUE,
    creado_en       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_dia_semana   CHECK (dia_semana BETWEEN 1 AND 5),
    CONSTRAINT chk_horas_curso  CHECK (hora_fin > hora_inicio),
    CONSTRAINT uc_horario_unico UNIQUE (docente_id, semestre_id, dia_semana, hora_inicio)
);

-- Regla de negocio: máx. 5 cursos activos por docente por semestre
CREATE OR REPLACE FUNCTION validar_max_cursos_docente()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        SELECT COUNT(*) FROM horarios_curso
        WHERE docente_id = NEW.docente_id
          AND semestre_id = NEW.semestre_id
          AND activo = TRUE
    ) >= 5 THEN
        RAISE EXCEPTION 'El docente ya tiene el máximo de 5 cursos asignados en este semestre.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_cursos
BEFORE INSERT ON horarios_curso
FOR EACH ROW EXECUTE FUNCTION validar_max_cursos_docente();


-- =============================================================
-- TABLA: configuracion_institucional
-- Datos generales y reglas complementarias del sistema
-- =============================================================
CREATE TABLE configuracion_institucional (
    id                          SMALLINT PRIMARY KEY DEFAULT 1,
    nombre_sistema              VARCHAR(150) NOT NULL,
    nombre_institucion          VARCHAR(200) NOT NULL,
    codigo_institucional        VARCHAR(20)  NOT NULL,
    correo_soporte              VARCHAR(150) NOT NULL,
    zona_horaria                VARCHAR(80)  NOT NULL DEFAULT 'America/Lima',
    idioma                      VARCHAR(30)  NOT NULL DEFAULT 'Español',
    requiere_salida             BOOLEAN      NOT NULL DEFAULT TRUE,
    permitir_validacion_manual  BOOLEAN      NOT NULL DEFAULT TRUE,
    limite_tardanza_minutos     INT          NOT NULL DEFAULT 20,
    actualizado_en              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_por             INT REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_configuracion_unica CHECK (id = 1),
    CONSTRAINT chk_limite_tardanza CHECK (
        limite_tardanza_minutos BETWEEN 1 AND 240
    )
);

INSERT INTO configuracion_institucional (
    id,
    nombre_sistema,
    nombre_institucion,
    codigo_institucional,
    correo_soporte
) VALUES (
    1,
    'Sistema de Asistencia Docente',
    'Universidad Nacional de San Antonio Abad del Cusco',
    'UNSAAC',
    'soporte@unsaac.edu.pe'
);

-- =============================================================
-- TABLA: configuracion_asistencia
-- Parámetros globales configurables por el Administrador
-- =============================================================
CREATE TABLE configuracion_asistencia (
    id                          SERIAL PRIMARY KEY,
    hora_ingreso_limite         TIME    NOT NULL DEFAULT '09:00:00',
    tolerancia_antes_minutos    INT     NOT NULL DEFAULT 15,
    tolerancia_despues_minutos  INT     NOT NULL DEFAULT 10,
    dias_laborables             VARCHAR(20) DEFAULT 'LUN-VIE',
    actualizado_en              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_por             INT REFERENCES usuarios(id),
    CONSTRAINT chk_tolerancias CHECK (
        tolerancia_antes_minutos >= 0 AND tolerancia_despues_minutos >= 0
    )
);

INSERT INTO configuracion_asistencia
    (hora_ingreso_limite, tolerancia_antes_minutos, tolerancia_despues_minutos)
VALUES ('09:00:00', 15, 10);

-- =============================================================
-- TABLA: registros_ingreso_institucional
-- Marca biométrica de entrada a la institución (antes 09:00)
-- =============================================================
CREATE TABLE registros_ingreso_institucional (
    id                  BIGSERIAL   PRIMARY KEY,
    docente_id          INT         NOT NULL REFERENCES docentes(id),
    fecha               DATE        NOT NULL,
    hora_registro       TIME        NOT NULL,
    dispositivo_id      VARCHAR(50),                     -- ID del lector biométrico
    estado              VARCHAR(20) NOT NULL DEFAULT 'PUNTUAL',
                                    -- PUNTUAL | TARDANZA | AUSENTE (calculado)
    observacion         TEXT,
    creado_en           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uc_ingreso_por_dia UNIQUE (docente_id, fecha)
);

-- =============================================================
-- TABLA: registros_asistencia_curso
-- Marca biométrica por cada sesión de clase
-- =============================================================
CREATE TABLE registros_asistencia_curso (
    id                  BIGSERIAL   PRIMARY KEY,
    horario_curso_id    INT         NOT NULL REFERENCES horarios_curso(id),
    docente_id          INT         NOT NULL REFERENCES docentes(id),
    fecha               DATE        NOT NULL,
    hora_registro       TIME        NOT NULL,
    dispositivo_id      VARCHAR(50),
    estado              VARCHAR(20) NOT NULL DEFAULT 'PRESENTE',
                                    -- PRESENTE | TARDANZA | AUSENTE
    observacion         TEXT,
    creado_en           TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uc_asistencia_por_sesion UNIQUE (horario_curso_id, fecha)
);

-- =============================================================
-- VISTA: resumen_asistencia_docente
-- Totales de asistencia por docente y semestre
-- =============================================================
CREATE OR REPLACE VIEW v_resumen_asistencia_docente AS
SELECT
    d.id                            AS docente_id,
    u.nombres || ' ' || u.apellidos AS docente,
    s.codigo                        AS semestre,
    hc.curso_id,
    c.nombre                        AS curso,
    COUNT(rac.id)                   AS total_sesiones_registradas,
    SUM(CASE WHEN rac.estado = 'PRESENTE'  THEN 1 ELSE 0 END) AS presentes,
    SUM(CASE WHEN rac.estado = 'TARDANZA'  THEN 1 ELSE 0 END) AS tardanzas,
    SUM(CASE WHEN rac.estado = 'AUSENTE'   THEN 1 ELSE 0 END) AS ausentes
FROM docentes d
JOIN usuarios           u   ON u.id  = d.usuario_id
JOIN horarios_curso     hc  ON hc.docente_id = d.id
JOIN cursos             c   ON c.id  = hc.curso_id
JOIN semestres          s   ON s.id  = hc.semestre_id
LEFT JOIN registros_asistencia_curso rac
    ON rac.horario_curso_id = hc.id
GROUP BY d.id, u.nombres, u.apellidos, s.codigo, hc.curso_id, c.nombre;

-- =============================================================
-- TABLA: alertas
-- Notificaciones generadas por el Supervisor
-- =============================================================
CREATE TABLE alertas (
    id              SERIAL PRIMARY KEY,
    docente_id      INT         NOT NULL REFERENCES docentes(id),
    tipo            VARCHAR(50) NOT NULL,   -- AUSENCIA_REITERADA | INCUMPLIMIENTO_HORARIO
    mensaje         TEXT        NOT NULL,
    generado_por    INT         REFERENCES usuarios(id),
    fecha_alerta    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    leida           BOOLEAN     DEFAULT FALSE
);

-- =============================================================
-- TABLA: audit_log
-- Registro de auditoría para acciones sensibles
-- =============================================================
CREATE TABLE audit_log (
    id          BIGSERIAL   PRIMARY KEY,
    usuario_id  INT         REFERENCES usuarios(id),
    accion      VARCHAR(100) NOT NULL,
    tabla       VARCHAR(80),
    registro_id INT,
    detalle     JSONB,
    ip_origen   INET,
    creado_en   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- ÍNDICES para rendimiento
-- =============================================================
CREATE INDEX idx_reg_ingreso_docente_fecha    ON registros_ingreso_institucional (docente_id, fecha);
CREATE INDEX idx_reg_asistencia_docente_fecha ON registros_asistencia_curso (docente_id, fecha);
CREATE INDEX idx_horarios_docente_semestre    ON horarios_curso (docente_id, semestre_id);
CREATE INDEX idx_datos_biometricos_docente    ON datos_biometricos (docente_id, activo);
CREATE INDEX idx_alertas_docente              ON alertas (docente_id, leida);
CREATE INDEX idx_audit_usuario_fecha          ON audit_log (usuario_id, creado_en);
