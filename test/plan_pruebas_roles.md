# Plan de Pruebas: Gestión de Roles (Sistema de Asistencia Docente)

Este plan de pruebas describe los escenarios necesarios para validar que la gestión y los permisos de los diferentes roles de usuario (`ADMINISTRADOR`, `DOCENTE`, `SUPERVISOR`) funcionen correctamente según las especificaciones del sistema.

## 1. Objetivos
- Garantizar que cada tipo de usuario solo pueda acceder a los módulos correspondientes a su nivel de permisos.
- Asegurar que intentos de accesos no autorizados a rutas protegidas (ej. un Docente intentando entrar al panel de Administración) sean bloqueados y redirigidos correctamente.
- Validar que los elementos de la interfaz de usuario (UI), como los menús laterales y botones, se rendericen únicamente si el rol del usuario lo permite.

## 2. Tipos de Usuarios (Roles)
- **ADMINISTRADOR**: Acceso completo al sistema, incluyendo `/Admin/roles`, `/Admin/docentes`.
- **DOCENTE**: Acceso restringido, principalmente al `/login/PanelDocente`.
- **SUPERVISOR**: Acceso restringido a reportes o vistas de supervisión en `/login/PanelSupervisor`.

## 3. Casos de Prueba (Test Cases)

### CP-01: Verificación de Redirección Correcta Post-Login
- **Descripción**: Validar que cada usuario sea dirigido a su respectivo "Dashboard" después de iniciar sesión.
- **Precondiciones**: Sistema corriendo, tener credenciales válidas para los 3 roles.
- **Pasos**: 
  1. Iniciar sesión como `ADMINISTRADOR`. Comprobar redirección a `/Admin/...`.
  2. Iniciar sesión como `DOCENTE`. Comprobar redirección a `/login/PanelDocente`.
  3. Iniciar sesión como `SUPERVISOR`. Comprobar redirección a `/login/PanelSupervisor`.
- **Resultado Esperado**: Las redirecciones son precisas según el rol.

### CP-02: Control de Acceso y Prevención de Escalamiento de Privilegios
- **Descripción**: Validar que usuarios con roles de menores privilegios no puedan entrar a módulos de administrador.
- **Pasos**:
  1. Iniciar sesión como `DOCENTE`.
  2. Forzar la navegación en la barra de direcciones (URL) a `/Admin/roles`.
- **Resultado Esperado**: El sistema muestra un error `403 Forbidden`, o redirige inmediatamente al dashboard del Docente.

### CP-03: Visibilidad de la Interfaz (Menú y Botones)
- **Descripción**: Validar que un usuario sin privilegios no pueda ver los enlaces al panel de administración.
- **Pasos**:
  1. Iniciar sesión como `DOCENTE`.
  2. Inspeccionar el menú lateral (Sidebar) y el encabezado (Header).
- **Resultado Esperado**: No existe ningún enlace hacia la "Gestión de Roles" o la "Gestión de Docentes".

### CP-04: Acceso a la Gestión de Roles por un Administrador
- **Descripción**: Validar que el Administrador puede ingresar al módulo de Gestión de Roles sin problemas.
- **Pasos**:
  1. Iniciar sesión como `ADMINISTRADOR`.
  2. Navegar a través de la interfaz hacia el módulo de "Gestión de roles" o visitar `/Admin/roles`.
- **Resultado Esperado**: La página carga correctamente mostrando el módulo "Gestión de roles" con su respectivo "PagePlaceholder" o componentes funcionales.
