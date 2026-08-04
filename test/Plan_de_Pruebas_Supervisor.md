# Plan de Pruebas: Módulo del Supervisor

Este plan de pruebas describe los escenarios necesarios para validar que el Dashboard del Supervisor (`/login/PanelSupervisor`) funcione correctamente. El objetivo principal del supervisor es el monitoreo de asistencias, gestión de incidencias y estado de los dispositivos biométricos en tiempo real.

## 1. Verificación de Métricas Generales
**Objetivo:** Validar que las tarjetas de resumen muestran información correcta y actualizada.
- **Caso de Prueba 1.1:** Verificar que la métrica de "Asistencias en TR" suma correctamente las asistencias diarias.
- **Caso de Prueba 1.2:** Validar que los porcentajes y tendencias (ej. "+12% frente a última hora") se calculan adecuadamente según los datos históricos.
- **Caso de Prueba 1.3:** Comprobar que los "Docentes Presentes", "Docentes Ausentes" y "Tardanzas del día" correspondan con el conteo de la tabla de actividad en tiempo real.

## 2. Gráfico de Actividad Diaria
**Objetivo:** Asegurar que el gráfico lineal responde a los filtros temporales.
- **Caso de Prueba 2.1:** Cambiar el filtro a "Hoy", "Ayer" y "Esta semana", y verificar que el gráfico se actualice sin errores y muestre la curva de marcaciones correspondiente.
- **Caso de Prueba 2.2:** Comprobar que los puntos máximos (picos) se destaquen visualmente en la hora correcta.

## 3. Panel de Alertas Recientes
**Objetivo:** Validar la visualización y gestión de incidencias.
- **Caso de Prueba 3.1:** Comprobar que las alertas (Tardanza reiterada, Inasistencia, Inconsistencia de horario) aparezcan en orden cronológico inverso (más recientes primero).
- **Caso de Prueba 3.2:** Validar que el estado visual del ícono de alerta (Rojo, Naranja, Azul) corresponda a la gravedad del evento.
- **Caso de Prueba 3.3 (Faltante de interacción):** Si aplica, probar el botón "Ver todas" para asegurar que redirija al historial completo de alertas.

## 4. Tabla de Actividad en Tiempo Real
**Objetivo:** Probar el registro instantáneo de los docentes que marcan asistencia.
- **Caso de Prueba 4.1:** Simular una marcación en el backend y verificar que la tabla se actualice en tiempo real sin necesidad de recargar la página (WebSockets o Polling).
- **Caso de Prueba 4.2:** Validar que las etiquetas de estado (`Presente`, `Ausente`, `Tardanza`) usen el estilo (color) adecuado.

## 5. Monitoreo de Dispositivos Biométricos
**Objetivo:** Confirmar la conectividad de las terminales.
- **Caso de Prueba 5.1:** Verificar que un dispositivo desconectado cambie su estado de "En línea" a "Atención" o "Desconectado".
- **Caso de Prueba 5.2:** Confirmar que la hora de "Sincronizado" corresponde al último "ping" o envío de datos por parte del biométrico.
