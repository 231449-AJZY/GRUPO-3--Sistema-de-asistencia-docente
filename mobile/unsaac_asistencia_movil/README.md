# UNSAAC Asistencia Móvil — Paso 8A

Aplicación Flutter Android real para iniciar la integración móvil del sistema Gabo.

## Alcance implementado

- Inicio de sesión contra `POST /api/auth/login`.
- Validación de sesión mediante `GET /api/auth/me`.
- Acceso exclusivo para cuentas con rol Docente.
- Dirección del backend configurable desde la app.
- Token y configuración cifrados mediante Android Keystore (AES-GCM).
- Detección y prueba real de biometría local con el diálogo oficial de Android.
- Consulta del estado del dispositivo y Bluetooth.
- Solicitud de permisos Bluetooth según la versión de Android.
- Búsqueda real de dispositivos Bluetooth Low Energy cercanos.
- APK debug generada por el instalador cuando Flutter y Android SDK están listos.

## Fuera del alcance de 8A

- No extrae ni almacena la huella o rostro del teléfono.
- No registra todavía la asistencia definitiva.
- No vincula aún la clave pública del celular con PostgreSQL.
- No genera QR temporal.
- No existe todavía una estación BLE institucional emisora.

Estas funciones corresponden a 8B, 8C y 8D.

## Requisitos

- Windows 10/11 de 64 bits.
- Flutter 3.44 o superior en PATH.
- Android Studio y Android SDK configurados.
- Licencias Android aceptadas.
- POCO X7 Pro u otro Android API 24 o superior.
- PC y celular en la misma red Wi-Fi para conexión local.

Verificación:

```powershell
flutter doctor -v
flutter devices
```

## Servidor local

En la app, configure la IP real de la PC, por ejemplo:

```text
http://192.168.1.50:3000
```

No utilice `localhost` desde el celular.

## Ejecutar en el teléfono

Con depuración USB habilitada:

```powershell
cd "C:\Users\Gabo\Desktop\Carpetas nuevas\Nueva carpeta (10)\Gaa\PROYECTO-GABO-LIMPIO\mobile\unsaac_asistencia_movil"
flutter devices
flutter run
```

## APK de prueba

Ruta esperada después del instalador:

```text
mobile\unsaac_asistencia_movil\build\app\outputs\flutter-apk\app-debug.apk
```

Esta APK es para pruebas internas, no para publicación.
