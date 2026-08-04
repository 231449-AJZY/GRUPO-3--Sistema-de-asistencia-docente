PROTOCOLO DEL ADAPTADOR BIOMÉTRICO — UNSAAC
=================================================

OBJETIVO
-------
El puente local no incluye ni reemplaza el SDK del fabricante.
Para capturar una huella física, se configura un ejecutable adaptador
que use el SDK oficial del lector instalado en Windows.

ENTRADA DEL ADAPTADOR
---------------------
El puente ejecuta el programa configurado y escribe una sola línea JSON
en su entrada estándar.

Ejemplo de captura:

{
  "protocolVersion": 1,
  "operation": "capture",
  "requestId": "uuid",
  "finger": "INDICE_DERECHO",
  "timeoutMs": 30000,
  "options": {}
}

Ejemplo de diagnóstico:

{
  "protocolVersion": 1,
  "operation": "diagnostic",
  "requestId": "uuid"
}

SALIDA PARA CAPTURA EXITOSA
---------------------------
El adaptador debe imprimir como ÚLTIMA línea de stdout:

{
  "ok": true,
  "templateBase64": "BASE64_DE_LA_PLANTILLA_DEL_SDK",
  "quality": 87,
  "sdkVersion": "SDK 3.2.1",
  "device": {
    "codigo": "LECTOR-ADM-01",
    "nombre": "Lector de Administración",
    "fabricante": "Fabricante",
    "modelo": "Modelo",
    "numero_serie": "Serie",
    "version_firmware": "1.0.0",
    "version_sdk": "3.2.1"
  },
  "metadata": {
    "format": "ISO_19794_2"
  }
}

SALIDA DE ERROR
---------------
{
  "ok": false,
  "code": "FINGER_NOT_DETECTED",
  "error": "No se detectó correctamente el dedo."
}

REGLAS DE SEGURIDAD
-------------------
- No devolver rawImage, imageBase64 ni fotografías.
- Solo devolver la plantilla matemática creada por el SDK.
- La plantilla debe tener entre 32 bytes y 128 KB.
- quality debe ser un entero de 0 a 100.
- El proceso debe terminar con código 0 cuando la respuesta JSON sea válida.
- Los mensajes de diagnóstico pueden escribirse antes; la última línea debe ser JSON.
