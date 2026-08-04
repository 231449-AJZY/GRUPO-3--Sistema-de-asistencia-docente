# Arquitectura del Paso 8A Mobile

## Flujo actual

```text
Aplicación Flutter Android
        |
        | HTTPS/HTTP local
        v
Backend Node.js :3000
        |
        v
PostgreSQL
```

## Seguridad local

El token JWT y la URL se cifran mediante una clave AES alojada en Android Keystore. La aplicación no exporta la clave y no recibe la plantilla biométrica del sistema operativo.

## Biometría

La autenticación se ejecuta mediante `local_auth`, que presenta el diálogo oficial de Android. El resultado disponible para la aplicación es únicamente aprobación o rechazo.

## Bluetooth

En 8A la aplicación:

1. Detecta si Bluetooth existe.
2. Solicita permisos compatibles con Android 6–15+.
3. Abre la configuración de Bluetooth.
4. Realiza una búsqueda BLE de seis segundos.
5. Destaca nombres que empiecen con `UNSAAC`.

La estación institucional BLE y sus desafíos firmados corresponden al Paso 8D.

## Evolución prevista

### Paso 8B

- Tablas de dispositivos móviles y credenciales públicas.
- Vinculación mediante QR temporal.
- Registro, suspensión y revocación del teléfono.
- Generación de par de claves y prueba de posesión.

### Paso 8C

- Firma criptográfica después de la biometría.
- Desafío de un solo uso.
- Registro real de ingreso y asistencia por curso.
- Validación de horario, semestre y duplicidad.

### Paso 8D

- Estaciones BLE autorizadas.
- Proximidad y desafío rotativo.
- Prevención de marcaciones remotas.

### Paso 8E

- Operación offline controlada.
- Cola cifrada y sincronización.
- Notificaciones e historial móvil.
