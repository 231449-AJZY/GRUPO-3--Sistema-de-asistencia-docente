# Arquitectura Paso 8A.1 Mobile

## Cambios incluidos

- La aplicación admite inicio de sesión para Administrador y Docente.
- El panel se selecciona automáticamente según el rol informado por el backend.
- La pantalla pública permite abrir una marcación rápida sin iniciar sesión.
- La marcación rápida solicita código institucional y autenticación biométrica local.

## Límite de esta versión

Android confirma que una biometría válida del teléfono fue aprobada, pero no entrega a la aplicación la identidad de la huella utilizada. Por ello, el Paso 8A.1 no inserta una asistencia real en PostgreSQL.

La operación definitiva requiere:

1. Paso 8B: vincular el teléfono con un docente y registrar su clave pública.
2. Paso 8C: emitir un desafío de un solo uso, firmarlo después de la biometría y registrar la asistencia.
3. Paso 8D: validar proximidad con una estación Bluetooth institucional.

## Flujo preparado

```text
Pantalla pública
    -> Código institucional
    -> Biometría oficial de Android
    -> Resultado de prueba local
    -> Paso 8B: validación dispositivo-docente
    -> Paso 8C: registro real
```
