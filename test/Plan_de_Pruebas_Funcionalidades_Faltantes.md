# Plan de Pruebas: Funcionalidades Faltantes (Módulos Administrativos Restantes)

Como ya se han cubierto las pruebas para `Roles` y `Docentes`, este documento establece los lineamientos para probar el resto de los módulos críticos que comprenden las "funcionalidades faltantes" en el panel del administrador (`/Admin/*`).

## 1. Módulo de Biometría (`/Admin/biometria`)
**Objetivo:** Validar la administración de los dispositivos físicos y la sincronización de huellas/rostros.
- **Caso de Prueba 1.1:** Añadir un nuevo dispositivo biométrico ingresando su IP, MAC y Ubicación. Validar que el sistema impida guardar si la IP tiene un formato incorrecto.
- **Caso de Prueba 1.2:** Simular la caída de conexión de un biométrico y comprobar que el estado cambie a "Desconectado" en el panel.
- **Caso de Prueba 1.3:** Forzar sincronización manual de huellas hacia el dispositivo y verificar el mensaje de confirmación de éxito o fracaso.

## 2. Módulo de Usuarios del Sistema (`/Admin/usuarios`)
**Objetivo:** Asegurar que los administradores puedan crear cuentas para el personal interno (supervisores, otros administradores) independientemente de los docentes.
- **Caso de Prueba 2.1 (Creación):** Registrar un nuevo usuario del sistema, asignándole un correo electrónico y rol. Verificar que la contraseña temporal se genere/envíe correctamente.
- **Caso de Prueba 2.2 (Edición y Bloqueo):** Cambiar el rol de un usuario existente o desactivar su cuenta. Intentar iniciar sesión con la cuenta desactivada y validar que el sistema lo rechace.
- **Caso de Prueba 2.3 (Paginación):** Si existen más de 10 usuarios, validar que los botones de "Siguiente" y "Anterior" en la tabla funcionen y no recarguen toda la página.

## 3. Módulo de Configuración (`/Admin/configuracion`)
**Objetivo:** Probar los parámetros globales del sistema, como tolerancias, horarios generales e integraciones.
- **Caso de Prueba 3.1 (Tolerancia de Tardanza):** Cambiar el límite de tolerancia global (ej. de 10 a 15 minutos). Simular una marcación en el minuto 12 y validar que el estado sea "Presente" y no "Tardanza".
- **Caso de Prueba 3.2 (Integración Base de Datos):** Validar que la conexión con el sistema académico principal (si aplica, para importar cursos y aulas) se pueda probar mediante el botón "Probar Conexión".
- **Caso de Prueba 3.3 (Respaldos):** Probar el botón de descarga o generación de copias de seguridad de la base de datos (backup manual) y confirmar la descarga del archivo correcto.

## 4. Funcionalidades Transversales (Exportación)
**Objetivo:** Validar la generación de reportes, un requerimiento común y fundamental.
- **Caso de Prueba 4.1:** Generar y descargar reporte general en formato Excel o PDF. Comprobar que el archivo no esté corrupto y contenga las columnas correctas (DNI, Nombre, Asistencia).
