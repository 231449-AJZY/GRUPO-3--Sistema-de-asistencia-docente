-- 1. Tabla de Configuración de Asistencia
CREATE TABLE IF NOT EXISTS configuracion_asistencia (
    id SERIAL PRIMARY KEY,
    hora_ingreso_limite TIME NOT NULL DEFAULT '09:00:00',
    tolerancia_antes_minutos INT NOT NULL DEFAULT 15,
    tolerancia_despues_minutos INT NOT NULL DEFAULT 10,
    CONSTRAINT chk_tolerancias CHECK (tolerancia_antes_minutos >= 0 AND tolerancia_despues_minutos >= 0)
);

-- Insertar configuración inicial por defecto (si la tabla está vacía)
INSERT INTO configuracion_asistencia (hora_ingreso_limite, tolerancia_antes_minutos, tolerancia_despues_minutos)
SELECT '09:00:00', 15, 10
WHERE NOT EXISTS (SELECT 1 FROM configuracion_asistencia);

-- 2. Tabla de Registros de Ingreso Institucional
CREATE TABLE IF NOT EXISTS registros_ingreso_institucional (
    id SERIAL PRIMARY KEY,
    docente_id INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_registro TIME NOT NULL DEFAULT CURRENT_TIME,
    dispositivo_id VARCHAR(100) NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PUNTUAL', 'TARDANZA')),
    CONSTRAINT uc_ingreso_por_dia UNIQUE (docente_id, fecha)
);

-- 3. Tabla de Registros de Asistencia a Cursos
CREATE TABLE IF NOT EXISTS registros_asistencia_curso (
    id SERIAL PRIMARY KEY,
    horario_curso_id INT NOT NULL,
    docente_id INT NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_registro TIME NOT NULL DEFAULT CURRENT_TIME,
    dispositivo_id VARCHAR(100) NULL,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PRESENTE', 'TARDANZA')),
    CONSTRAINT uc_asistencia_por_sesion UNIQUE (horario_curso_id, fecha)
);