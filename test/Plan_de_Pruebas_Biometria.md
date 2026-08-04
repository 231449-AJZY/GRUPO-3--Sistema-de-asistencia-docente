# Plan de Pruebas: Interfaz de Biometría

## 1. Introducción
Este documento detalla el plan de pruebas para el módulo o interfaz de biometría del sistema. El objetivo principal es asegurar el correcto funcionamiento, la precisión de las lecturas y la seguridad en la captura, almacenamiento y verificación de los datos biométricos.

## 2. Alcance
Las pruebas cubrirán los siguientes aspectos:
*   Conexión e inicialización del hardware biométrico.
*   Proceso de enrolamiento (registro) de nuevas huellas o rostros.
*   Proceso de verificación/autenticación (match).
*   Manejo de errores, excepciones e interrupciones del hardware.
*   Sincronización y seguridad de los datos biométricos.

## 3. Entorno de Pruebas
*   **Hardware:** Lector biométrico/Sensor de huellas o cámara facial, PC/Terminal de pruebas.
*   **Software:** Sistema Operativo correspondiente, drivers y SDK del dispositivo instalados y configurados.
*   **Datos:** Base de datos de prueba aislada para evitar corromper datos de producción.

## 4. Escenarios de Prueba

### 4.1. Pruebas Funcionales (Happy Path)

| ID Caso | Descripción | Precondiciones | Pasos | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| BIO-001 | Inicialización del dispositivo | Dispositivo conectado y drivers instalados. | 1. Iniciar la aplicación o interfaz biométrica. | El sistema detecta el dispositivo correctamente y muestra el estado "Conectado" o "Listo para capturar". |
| BIO-002 | Enrolamiento exitoso | Sensor limpio, usuario no registrado. | 1. Seleccionar la opción de enrolamiento.<br>2. Capturar la biometría las veces que indique el sistema (ej. 3 veces).<br>3. Confirmar guardado. | El sistema genera el *template* biométrico correctamente, lo asocia al perfil del usuario y muestra mensaje de éxito. |
| BIO-003 | Verificación exitosa (Match) | Usuario previamente enrolado. | 1. Iniciar el proceso de marcación o login biométrico.<br>2. Colocar la huella/rostro en el sensor. | El sistema identifica al usuario correctamente, registra el evento y permite el acceso. |

### 4.2. Pruebas de Casos Extremos y Manejo de Errores

| ID Caso | Descripción | Precondiciones | Pasos | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| BIO-ERR-001 | Fallo de Verificación (No Match) | Usuario no enrolado o huella distinta. | 1. Iniciar autenticación.<br>2. Escanear biometría incorrecta o no registrada. | El sistema rechaza el intento mostrando el mensaje "Usuario no reconocido" o "Verificación fallida". No permite el acceso. |
| BIO-ERR-002 | Desconexión repentina del hardware | Dispositivo en estado de lectura. | 1. Activar el modo de lectura del sensor.<br>2. Desconectar el cable USB o perder conexión. | El sistema detecta el error, muestra una alerta de "Dispositivo desconectado" y cancela la operación sin cerrarse de forma abrupta (*crash*). |
| BIO-ERR-003 | Lectura de mala calidad | Dedo sucio, húmedo, o iluminación pobre (facial). | 1. Intentar enrolar o autenticar bajo malas condiciones de lectura. | El sistema detecta la mala calidad, descarta la captura y pide al usuario volver a intentarlo ("Calidad insuficiente"). |
| BIO-ERR-004 | Tiempo de espera agotado (Timeout) | Sistema en espera de lectura. | 1. Iniciar la autenticación.<br>2. No interactuar con el sensor. | Tras superar el límite de tiempo configurado (ej. 10-15 segundos), la interfaz cancela la espera y vuelve a su estado inicial. |

### 4.3. Pruebas de Seguridad y Rendimiento

| ID Caso | Descripción | Criterio de Éxito |
| :--- | :--- | :--- |
| BIO-SEC-001 | Privacidad y Cifrado de Templates | Los datos biométricos (*templates*) nunca se almacenan como imágenes planas. Deben guardarse cifrados (ej. AES-256) en la base de datos y no ser reversibles. |
| BIO-SEC-002 | Prevención de Fraude (Anti-Spoofing) | El sistema debe rechazar intentos de autenticación con fotografías impresas (si es facial) o copias de huellas en silicona (depende del soporte del hardware/Liveness detection). |
| BIO-PERF-001| Tiempo de Respuesta | El proceso de validación (desde la captura hasta la respuesta de acceso) debe ejecutarse en menos de 2 segundos. |

## 5. Criterios de Aceptación
1.  El **100% de los casos funcionales** (BIO-001, BIO-002, BIO-003) deben aprobarse sin incidencias.
2.  El sistema debe manejar las interrupciones de hardware (BIO-ERR-002) de forma elegante y sin pérdida de datos.
3.  Se cumple con los requerimientos de seguridad de encriptación de plantillas (Templates).

## 6. Aprobaciones
*   [ ] Responsable de QA
*   [ ] Líder de Desarrollo / Integración Hardware
*   [ ] Product Manager / Cliente
