-- Tabla para registrar los eventos y auditoría de autenticación biométrica
CREATE TABLE IF NOT EXISTS logs_biometria (
    id SERIAL PRIMARY KEY,
    docente_id INT REFERENCES docentes(id) ON DELETE SET NULL,
    tipo_biometria VARCHAR(30) NOT NULL, -- ej: 'ROSTRO', 'HUELLA', 'PALMA'
    resultado VARCHAR(20) NOT NULL,       -- 'EXITOSO', 'FALLIDO', 'DENEGADO'
    motivo_fallo VARCHAR(255),           -- ej: 'Rostro no coincidente', 'Baja iluminación', null si fue exitoso
    dispositivo_id VARCHAR(50),          -- Identificador del terminal o lector
    ip_origen VARCHAR(45),               -- IP desde donde se realizó el intento
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);