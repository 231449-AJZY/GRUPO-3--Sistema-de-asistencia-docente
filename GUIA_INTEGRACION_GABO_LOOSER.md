# Guía de Integración: Frontend Gabo + Backend Looser

## 1. Objetivo

Esta guía documenta la integración del backend real desarrollado por Looser dentro de la estructura limpia del frontend de Gabo.

La rama de trabajo es:

```txt
integracion/gabo-backend-looser
```

La rama base recomendada para el Pull Request es:

```txt
gabo
```

No se debe hacer Pull Request directo a `main` todavía.

---

## 2. Resumen de la integración

Esta integración une:

```txt
Frontend base: Gabo
Backend base: Looser / L00S3RR
```

La decisión técnica fue mantener la estructura limpia de Gabo para el frontend y agregar el backend real de Looser sin copiar frontends antiguos o mezclados.

---

## 3. Qué se integró

Se agregó el backend real en:

```txt
backend/
```

Archivos principales agregados:

```txt
backend/server.js
backend/src/app.js
backend/src/db/pool.js
backend/src/middlewares/auth.middleware.js
backend/src/routes/auth.routes.js
backend/src/routes/dashboard.routes.js
backend/src/routes/docentes.routes.js
backend/src/routes/asistencia.routes.js
backend/src/routes/index.js
backend/modelo_bd_unsaac.sql
backend/.env.example
backend/.gitignore
backend/ecosystem.config.js
```

También se actualizó:

```txt
.gitignore
backend/package.json
backend/package-lock.json
frontend/lib/auth.ts
```

---

## 4. Qué NO se hizo

Esta integración NO hace lo siguiente:

```txt
No modifica main.
No crea datos de prueba.
No crea seeds.
No inserta usuarios en PostgreSQL.
No sube backend/.env.
No sube frontend/.env.local.
No fuerza autenticación real.
No cambia la estructura limpia del frontend de Gabo.
```

---

## 5. Estructura final del proyecto

La estructura recomendada queda así:

```txt
GRUPO-3--Sistema-de-asistencia-docente/
├── backend/
│   ├── server.js
│   ├── modelo_bd_unsaac.sql
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   ├── .gitignore
│   └── src/
│       ├── app.js
│       ├── db/
│       │   └── pool.js
│       ├── middlewares/
│       │   └── auth.middleware.js
│       └── routes/
│           ├── auth.routes.js
│           ├── dashboard.routes.js
│           ├── docentes.routes.js
│           ├── asistencia.routes.js
│           └── index.js
├── frontend/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── docentes/
│   │   │   ├── biometria/
│   │   │   ├── usuarios/
│   │   │   ├── roles/
│   │   │   └── configuracion/
│   │   ├── docente/
│   │   │   └── dashboard/
│   │   ├── supervisor/
│   │   │   └── dashboard/
│   │   ├── login/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── data/
│   ├── lib/
│   └── types/
├── diseños/
├── test/
├── .gitignore
├── azure-pipelines.yml
└── README.md
```

---

## 6. Puertos recomendados

Para evitar conflictos entre Next.js y Express:

```txt
Frontend Next.js: http://localhost:3000
Backend Express:  http://localhost:3001
```

---

## 7. Configuración local del backend

Crear localmente el archivo:

```txt
backend/.env
```

Contenido recomendado para desarrollo local:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_NAME=unsaac_asistencia
DB_USER=unsaac_user
DB_PASSWORD=tu_password_local

JWT_SECRET=dev_secret_gabo_2026
```

Importante:

```txt
backend/.env no debe subirse a GitHub.
```

---

## 8. Configuración local del frontend

Crear localmente el archivo:

```txt
frontend/.env.local
```

Contenido recomendado actualmente:

```env
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_USE_REAL_AUTH=false
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Esto significa:

```txt
El dashboard usa datos mock.
El login usa usuarios mock.
El backend real queda preparado, pero todavía no se fuerza.
```

Importante:

```txt
frontend/.env.local no debe subirse a GitHub.
```

---

## 9. Cómo ejecutar el backend

Entrar a:

```txt
backend/
```

Ejecutar:

```powershell
npm install
npm start
```

Debe mostrar:

```txt
Servidor corriendo en http://localhost:3001
```

Probar health check:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
```

Respuesta esperada:

```txt
status: ok
```

---

## 10. Cómo ejecutar el frontend

Entrar a:

```txt
frontend/
```

Ejecutar:

```powershell
npm install
npm run dev
```

Abrir:

```txt
http://localhost:3000/login
```

---

## 11. Cómo compilar el frontend

Entrar a:

```txt
frontend/
```

Ejecutar:

```powershell
npm run build
```

Resultado esperado:

```txt
Compiled successfully
Finished TypeScript
Generating static pages
```

---

## 12. Endpoints disponibles del backend

Base local:

```txt
http://localhost:3001/api
```

Endpoints:

```txt
GET  /api/health

POST /api/auth/login
GET  /api/auth/me
GET  /api/auth/funcionalidades

GET  /api/dashboard/admin

GET  /api/docentes
GET  /api/docentes/stats
GET  /api/docentes/:id

POST /api/asistencia/ingreso
POST /api/asistencia/curso
GET  /api/asistencia/hoy
GET  /api/asistencia/docente/:id
```

---

## 13. Autenticación actual

Actualmente el frontend sigue funcionando en modo seguro:

```env
NEXT_PUBLIC_USE_REAL_AUTH=false
```

Eso mantiene activo el login mock de Gabo.

El archivo:

```txt
frontend/lib/auth.ts
```

ya está preparado para activar login real en el futuro con:

```env
NEXT_PUBLIC_USE_REAL_AUTH=true
```

Cuando se active login real, el frontend enviará al backend:

```json
{
  "username": "correo_o_codigo",
  "password": "contraseña"
}
```

El backend responderá con:

```json
{
  "token": "jwt",
  "user": {
    "id": 1,
    "nombres": "...",
    "apellidos": "...",
    "email": "...",
    "codigo": "...",
    "rol": "Administrador"
  }
}
```

---

## 14. Pendientes antes de activar login real

Antes de activar autenticación real, el equipo debe definir:

```txt
Usuarios de prueba.
Contraseñas de prueba.
Estrategia de seeds.
Responsable de insertar datos en PostgreSQL.
Formato final de roles.
```

No se deben insertar usuarios sin acuerdo del equipo.

---

## 15. Reglas para no romper la integración

No subir estos archivos o carpetas:

```txt
backend/.env
frontend/.env.local
backend/node_modules/
frontend/node_modules/
frontend/.next/
```

No crear todavía:

```txt
seed_dev.sql
datos_prueba.sql
usuarios_test.sql
```

No hacer Pull Request directo a:

```txt
main
```

El Pull Request correcto actualmente es:

```txt
base: gabo
compare: integracion/gabo-backend-looser
```

---

## 16. Pruebas realizadas

Se verificó:

```txt
Frontend compila correctamente con npm run build.
Frontend corre en http://localhost:3000.
Backend corre en http://localhost:3001.
GET /api/health responde status ok.
Dashboard funciona usando mocks.
Login mock se mantiene activo.
```

---

## 17. Siguiente etapa recomendada

Después de que el equipo revise esta integración:

```txt
1. Confirmar estructura frontend definitiva.
2. Confirmar modelo de base de datos.
3. Definir usuarios de prueba.
4. Activar login real.
5. Conectar dashboard real con token JWT.
6. Conectar módulo de docentes.
7. Conectar biometría, usuarios, roles y configuración.
```

---

## 18. Nota final

Esta rama deja preparado el proyecto para trabajar con backend real sin romper el avance actual del frontend.

El frontend sigue trabajando con mocks para no interferir con el backend ni con la base de datos mientras el equipo revisa la integración.
