# Reporte Consolidado de Planes de Pruebas

## 1️⃣ Plan de Pruebas – Funcionalidades Faltantes (Módulos Administrativos)

**Ubicación:** `/Admin/*`

### 1.1 Módulo de Biometría
- **Objetivo:** Validar administración de dispositivos físicos y sincronización de huellas/rostros.
- **Casos de Prueba:**
  - Añadir dispositivo con IP/MAC/Ubicación (validar formato de IP).  
  - Simular caída de conexión y comprobar estado "Desconectado".
  - Forzar sincronización manual y validar mensaje de éxito/fallo.

### 1.2 Módulo de Usuarios del Sistema
- **Objetivo:** Crear y gestionar cuentas internas (supervisores, administradores).
- **Casos de Prueba:**
  - Creación de usuario con email y rol, verificar generación/ envío de contraseña temporal.
  - Edición de rol y desactivación de cuenta, intentar login y validar rechazo.
  - Paginación (>10 usuarios) – validar botones "Siguiente"/"Anterior" sin recarga completa.

### 1.3 Módulo de Configuración
- **Objetivo:** Probar parámetros globales (tolerancias, horarios, integraciones).
- **Casos de Prueba:**
  - Cambiar tolerancia de tardanza (10 → 15 min) y validar estado "Presente" a los 12 min.
  - Probar botón “Probar Conexión” a la base de datos académica.
  - Generar/descargar backup manual y confirmar archivo correcto.

### 1.4 Funcionalidades Transversales (Exportación)
- **Objetivo:** Generar reportes.
- **Caso de Prueba:** Generar y descargar reporte Excel/PDF, validar archivo no corrupto y columnas correctas (DNI, Nombre, Asistencia).

---

## 2️⃣ Plan de Pruebas – Módulo del Supervisor

**Ubicación:** `/login/PanelSupervisor`

### 2.1 Verificación de Métricas Generales
- **Objetivo:** Validar tarjetas de resumen.
- **Casos:**
  - Métrica "Asistencias en TR" suma correcta.
  - Tendencias (%) calculadas adecuadamente.
  - Conteos de "Docentes Presentes", "Ausentes" y "Tardanzas" coinciden con tabla en tiempo real.

### 2.2 Gráfico de Actividad Diaria
- **Objetivo:** Verificar respuesta del gráfico a filtros temporales.
- **Casos:**
  - Cambiar filtro a "Hoy", "Ayer" y "Esta semana" sin errores y con curva correcta.
  - Puntos máximos (picos) resaltados visualmente en la hora correcta.

### 2.3 Panel de Alertas Recientes
- **Objetivo:** Validar visualización y gestión de incidencias.
- **Casos:**
  - Alertas aparecen en orden cronológico inverso.
  - Iconos de alerta (rojo, naranja, azul) coinciden con gravedad.
  - Botón "Ver todas" redirige al historial completo.

### 2.4 Tabla de Actividad en Tiempo Real
- **Objetivo:** Probar registro instantáneo de marcaciones.
- **Casos:**
  - Simular marcación backend y verificar actualización sin recarga (WebSockets/Polling).
  - Validar estilos de etiquetas de estado (`Presente`, `Ausente`, `Tardanza`).

### 2.5 Monitoreo de Dispositivos Biométricos
- **Objetivo:** Confirmar conectividad de terminales.
- **Casos:**
  - Dispositivo desconectado cambia a "Atención" o "Desconectado".
  - Marca de tiempo "Sincronizado" corresponde al último ping.

---

**Conclusión:**
Los dos planes cubren integralmente los módulos críticos del sistema, definiendo objetivos claros y casos de prueba detallados que permiten validar la funcionalidad, la usabilidad y la fiabilidad tanto del panel de administrador como del panel del supervisor.
