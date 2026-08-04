"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const crypto = require("crypto");

const HOST = "127.0.0.1";
const DEFAULT_PORT = 4765;
const MAX_BODY_BYTES = 128 * 1024;
const PROTOCOL_VERSION = 1;
const BRIDGE_VERSION = "1.0.0";

function parseEnvFile(filePath) {
  const values = {};

  if (!fs.existsSync(filePath)) {
    return values;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator < 1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(
      `No se pudo leer ${filePath}: ${error.message}`
    );
    return fallback;
  }
}

function cleanText(value, maxLength = 255) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizeFinger(value) {
  return cleanText(value, 40).toUpperCase();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ""), "utf8");
  const b = Buffer.from(String(right ?? ""), "utf8");

  if (!a.length || a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload);

  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  res.end(body);
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;

      if (size > MAX_BODY_BYTES) {
        reject(
          Object.assign(
            new Error("La solicitud supera el tamaño permitido."),
            { code: "REQUEST_TOO_LARGE" }
          )
        );
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(
          JSON.parse(Buffer.concat(chunks).toString("utf8"))
        );
      } catch {
        reject(
          Object.assign(
            new Error("La solicitud JSON no es válida."),
            { code: "INVALID_JSON" }
          )
        );
      }
    });

    req.on("error", reject);
  });
}

function validateTemplate(value) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    throw Object.assign(
      new Error("El adaptador no devolvió una plantilla."),
      { code: "TEMPLATE_REQUIRED" }
    );
  }

  if (/^data:image\//i.test(raw)) {
    throw Object.assign(
      new Error(
        "El adaptador devolvió una imagen cruda. Solo se admite una plantilla."
      ),
      { code: "RAW_IMAGE_FORBIDDEN" }
    );
  }

  const normalized = raw.replace(
    /^data:application\/octet-stream;base64,/i,
    ""
  );

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw Object.assign(
      new Error("La plantilla Base64 no es válida."),
      { code: "TEMPLATE_INVALID" }
    );
  }

  const buffer = Buffer.from(normalized, "base64");

  if (buffer.length < 32 || buffer.length > 131072) {
    throw Object.assign(
      new Error(
        "La plantilla debe tener entre 32 bytes y 128 KB."
      ),
      { code: "TEMPLATE_SIZE_INVALID" }
    );
  }

  return {
    base64: buffer.toString("base64"),
    bytes: buffer.length,
    sha256: crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex"),
  };
}

function normalizeAdapterResponse(payload, config) {
  if (!payload || typeof payload !== "object") {
    throw Object.assign(
      new Error("El adaptador devolvió una respuesta vacía."),
      { code: "ADAPTER_EMPTY_RESPONSE" }
    );
  }

  if (payload.ok === false) {
    throw Object.assign(
      new Error(
        cleanText(
          payload.error ??
            payload.message ??
            "El SDK rechazó la operación.",
          500
        )
      ),
      {
        code: cleanText(
          payload.code ?? "ADAPTER_OPERATION_FAILED",
          80
        ),
      }
    );
  }

  const template = validateTemplate(
    payload.templateBase64 ??
      payload.template_base64 ??
      payload.template
  );

  const quality = Number(
    payload.quality ?? payload.calidad
  );

  if (
    !Number.isInteger(quality) ||
    quality < 0 ||
    quality > 100
  ) {
    throw Object.assign(
      new Error(
        "El adaptador no devolvió una calidad válida."
      ),
      { code: "QUALITY_INVALID" }
    );
  }

  if (
    payload.rawImage ||
    payload.raw_image ||
    payload.imageBase64 ||
    payload.image_base64
  ) {
    throw Object.assign(
      new Error(
        "El adaptador intentó devolver una imagen cruda."
      ),
      { code: "RAW_IMAGE_FORBIDDEN" }
    );
  }

  const configuredDevice =
    config.device &&
    typeof config.device === "object"
      ? config.device
      : {};

  const reportedDevice =
    payload.device &&
    typeof payload.device === "object"
      ? payload.device
      : {};

  const device = {
    codigo: cleanText(
      reportedDevice.codigo ??
        reportedDevice.code ??
        configuredDevice.codigo ??
        configuredDevice.code ??
        "LECTOR-LOCAL-01",
      80
    ).toUpperCase(),
    nombre: cleanText(
      reportedDevice.nombre ??
        reportedDevice.name ??
        configuredDevice.nombre ??
        configuredDevice.name ??
        "Lector biométrico local",
      160
    ),
    fabricante: cleanText(
      reportedDevice.fabricante ??
        reportedDevice.manufacturer ??
        configuredDevice.fabricante ??
        configuredDevice.manufacturer,
      120
    ),
    modelo: cleanText(
      reportedDevice.modelo ??
        reportedDevice.model ??
        configuredDevice.modelo ??
        configuredDevice.model,
      120
    ),
    numero_serie: cleanText(
      reportedDevice.numero_serie ??
        reportedDevice.serialNumber ??
        reportedDevice.serial ??
        configuredDevice.numero_serie ??
        configuredDevice.serialNumber,
      160
    ),
    ubicacion: cleanText(
      reportedDevice.ubicacion ??
        reportedDevice.location ??
        configuredDevice.ubicacion ??
        configuredDevice.location ??
        "Equipo administrador",
      180
    ),
    version_firmware: cleanText(
      reportedDevice.version_firmware ??
        reportedDevice.firmwareVersion ??
        configuredDevice.version_firmware ??
        configuredDevice.firmwareVersion,
      80
    ),
    version_sdk: cleanText(
      payload.sdkVersion ??
        payload.sdk_version ??
        reportedDevice.version_sdk ??
        reportedDevice.sdkVersion ??
        configuredDevice.version_sdk ??
        configuredDevice.sdkVersion,
      80
    ),
    agente_id: cleanText(
      configuredDevice.agente_id ??
        configuredDevice.agentId ??
        `bridge-${HOST}-${DEFAULT_PORT}`,
      160
    ),
    estado: "CONECTADO",
    porcentaje_senal: 100,
    registros_pendientes: 0,
    sincronizacion_automatica: true,
    mensaje: "Captura recibida mediante el puente local.",
  };

  const metadata =
    payload.metadata &&
    typeof payload.metadata === "object"
      ? payload.metadata
      : {};

  return {
    templateBase64: template.base64,
    templateBytes: template.bytes,
    templateSha256: template.sha256,
    quality,
    sdkVersion: device.version_sdk || null,
    device,
    metadata: {
      ...metadata,
      bridge_version: BRIDGE_VERSION,
      protocol_version: PROTOCOL_VERSION,
      stores_raw_image: false,
    },
  };
}

function adapterConfigured(config) {
  return Boolean(
    cleanText(config.adapterCommand, 1000)
  );
}

function runAdapter(config, requestPayload) {
  return new Promise((resolve, reject) => {
    if (!adapterConfigured(config)) {
      reject(
        Object.assign(
          new Error(
            "El puente está activo, pero no se configuró el ejecutable del SDK."
          ),
          { code: "ADAPTER_NOT_CONFIGURED" }
        )
      );
      return;
    }

    const command = path.resolve(
      cleanText(config.adapterCommand, 1000)
    );
    const args = Array.isArray(config.adapterArgs)
      ? config.adapterArgs.map((value) =>
          String(value)
        )
      : [];

    if (!fs.existsSync(command)) {
      reject(
        Object.assign(
          new Error(
            `No se encontró el adaptador configurado: ${command}`
          ),
          { code: "ADAPTER_NOT_FOUND" }
        )
      );
      return;
    }

    const child = spawn(command, args, {
      cwd: path.dirname(command),
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeoutMs = Math.min(
      Math.max(
        Number(config.timeoutMs) || 30000,
        5000
      ),
      90000
    );

    const timer = setTimeout(() => {
      if (finished) {
        return;
      }

      finished = true;
      child.kill();

      reject(
        Object.assign(
          new Error(
            "El SDK superó el tiempo máximo de captura."
          ),
          { code: "ADAPTER_TIMEOUT" }
        )
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");

      if (stdout.length > 1024 * 1024) {
        child.kill();
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");

      if (stderr.length > 256 * 1024) {
        stderr = stderr.slice(-256 * 1024);
      }
    });

    child.on("error", (error) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);

      reject(
        Object.assign(
          new Error(
            `No se pudo iniciar el adaptador: ${error.message}`
          ),
          { code: "ADAPTER_START_FAILED" }
        )
      );
    });

    child.on("close", (code) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timer);

      if (code !== 0) {
        reject(
          Object.assign(
            new Error(
              cleanText(
                stderr ||
                  `El adaptador terminó con código ${code}.`,
                500
              )
            ),
            { code: "ADAPTER_EXIT_ERROR" }
          )
        );
        return;
      }

      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const candidate = lines.at(-1);

      if (!candidate) {
        reject(
          Object.assign(
            new Error(
              "El adaptador no devolvió una respuesta JSON."
            ),
            { code: "ADAPTER_EMPTY_RESPONSE" }
          )
        );
        return;
      }

      try {
        resolve(JSON.parse(candidate));
      } catch {
        reject(
          Object.assign(
            new Error(
              "La salida final del adaptador no es JSON válido."
            ),
            { code: "ADAPTER_INVALID_JSON" }
          )
        );
      }
    });

    child.stdin.end(
      `${JSON.stringify(requestPayload)}\n`,
      "utf8"
    );
  });
}

function loadConfiguration(projectRoot) {
  const backendEnvPath = path.join(
    projectRoot,
    "backend",
    ".env"
  );
  const envValues = {
    ...parseEnvFile(backendEnvPath),
    ...process.env,
  };
  const configPath = path.join(
    projectRoot,
    "tools",
    "biometric-bridge",
    "config.json"
  );
  const config = readJson(configPath, {});

  return {
    projectRoot,
    configPath,
    config,
    token: cleanText(
      envValues.BIOMETRIC_BRIDGE_TOKEN,
      500
    ),
    port: Math.min(
      Math.max(
        Number(envValues.BIOMETRIC_BRIDGE_PORT) ||
          DEFAULT_PORT,
        1024
      ),
      65535
    ),
  };
}

const projectRoot = path.resolve(
  process.argv[2] ??
    path.join(__dirname, "..", "..")
);
const runtime = loadConfiguration(projectRoot);

if (!runtime.token) {
  console.error(
    "BIOMETRIC_BRIDGE_TOKEN no está configurado en backend/.env."
  );
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  try {
    const authorization =
      req.headers.authorization ?? "";
    const token = authorization.replace(
      /^Bearer\s+/i,
      ""
    );

    if (!safeEqual(token, runtime.token)) {
      jsonResponse(res, 401, {
        ok: false,
        code: "BRIDGE_UNAUTHORIZED",
        error: "Token del puente inválido.",
      });
      return;
    }

    const requestUrl = new URL(
      req.url ?? "/",
      `http://${HOST}:${runtime.port}`
    );

    if (
      req.method === "GET" &&
      requestUrl.pathname === "/health"
    ) {
      const command = cleanText(
        runtime.config.adapterCommand,
        1000
      );
      const exists = command
        ? fs.existsSync(path.resolve(command))
        : false;

      jsonResponse(res, 200, {
        ok: true,
        bridgeVersion: BRIDGE_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        host: HOST,
        port: runtime.port,
        adapterConfigured:
          adapterConfigured(runtime.config),
        adapterAvailable: exists,
        adapterCommand: command
          ? path.basename(command)
          : null,
        device:
          runtime.config.device &&
          typeof runtime.config.device === "object"
            ? runtime.config.device
            : null,
        storesRawImages: false,
        message: !adapterConfigured(runtime.config)
          ? "Puente activo; falta configurar el adaptador del fabricante."
          : exists
            ? "Puente y adaptador disponibles."
            : "El adaptador configurado no existe.",
      });
      return;
    }

    if (
      req.method === "POST" &&
      requestUrl.pathname === "/diagnostic"
    ) {
      const payload = await runAdapter(
        runtime.config,
        {
          protocolVersion: PROTOCOL_VERSION,
          operation: "diagnostic",
          requestId: crypto.randomUUID(),
        }
      );

      jsonResponse(res, 200, {
        ok: payload?.ok !== false,
        bridgeVersion: BRIDGE_VERSION,
        result: payload,
      });
      return;
    }

    if (
      req.method === "POST" &&
      requestUrl.pathname === "/capture"
    ) {
      const body = await readRequestJson(req);
      const finger = normalizeFinger(body.finger);

      if (!finger) {
        jsonResponse(res, 400, {
          ok: false,
          code: "FINGER_REQUIRED",
          error: "Seleccione el dedo que será capturado.",
        });
        return;
      }

      const adapterPayload = await runAdapter(
        runtime.config,
        {
          protocolVersion: PROTOCOL_VERSION,
          operation: "capture",
          requestId: crypto.randomUUID(),
          finger,
          timeoutMs: Math.min(
            Math.max(Number(body.timeoutMs) || 30000, 5000),
            90000
          ),
          options:
            body.options &&
            typeof body.options === "object"
              ? body.options
              : {},
        }
      );

      const capture = normalizeAdapterResponse(
        adapterPayload,
        runtime.config
      );

      jsonResponse(res, 200, {
        ok: true,
        bridgeVersion: BRIDGE_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        finger,
        capturedAt: new Date().toISOString(),
        ...capture,
      });
      return;
    }

    jsonResponse(res, 404, {
      ok: false,
      code: "BRIDGE_ROUTE_NOT_FOUND",
      error: "Ruta del puente no encontrada.",
    });
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}]`,
      error
    );

    jsonResponse(res, 503, {
      ok: false,
      code:
        cleanText(error.code, 80) ||
        "BRIDGE_OPERATION_FAILED",
      error:
        cleanText(error.message, 500) ||
        "La operación del puente falló.",
    });
  }
});

server.listen(runtime.port, HOST, () => {
  console.log("");
  console.log("PUENTE BIOMÉTRICO LOCAL — UNSAAC");
  console.log("================================");
  console.log(`Versión: ${BRIDGE_VERSION}`);
  console.log(`Dirección: http://${HOST}:${runtime.port}`);
  console.log(`Proyecto: ${projectRoot}`);
  console.log(
    `Adaptador: ${
      adapterConfigured(runtime.config)
        ? runtime.config.adapterCommand
        : "NO CONFIGURADO"
    }`
  );
  console.log(
    "Seguridad: solo localhost, token privado y sin imágenes crudas."
  );
  console.log("");
  console.log(
    "Mantenga esta ventana abierta durante las capturas."
  );
});

function shutdown(signal) {
  console.log(`\nCerrando puente (${signal})...`);

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 3000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
