# 🧪 TaskLab — API Testing con Cypress

[![CI - Pruebas de API con Cypress](https://github.com/JhonyVargas/tasklab-api-testing/actions/workflows/ci.yml/badge.svg)](https://github.com/JhonyVargas/tasklab-api-testing/actions/workflows/ci.yml)

API REST de gestión de tareas (Node.js + Express) con un frontend moderno, **probada con Cypress**, **automatizada con GitHub Actions** y **desplegada en Render**.

> Actividad Grupal 2: API Testing — Jhony Vargas

🌐 **Demo:** https://tasklab-api-testing.onrender.com

---

## 🏗️ Arquitectura

```
 git push ──► GitHub Actions ──► Cypress (33 pruebas) ──✔──► Render (deploy automático)
                                                                  │
                                         Pruebas diarias contra ◄─┘
                                         producción (prod-smoke.yml)
```

## 📡 Endpoints

| Método | Ruta | Descripción | Respuestas |
|--------|------|-------------|------------|
| GET | `/api/health` | Estado del servicio | 200 |
| GET | `/api/stats` | Totales y progreso | 200 |
| GET | `/api/tareas?estado=&prioridad=&q=` | Listar / filtrar / buscar | 200, 400 |
| GET | `/api/tareas/:id` | Obtener una tarea | 200, 404 |
| POST | `/api/tareas` | Crear tarea | 201, 400 |
| PUT | `/api/tareas/:id` | Actualizar (parcial) | 200, 400, 404 |
| DELETE | `/api/tareas/:id` | Eliminar | 204, 404 |

Ejemplo de tarea:

```json
{
  "id": 5,
  "titulo": "Aprender cy.request()",
  "descripcion": "Pruebas de API",
  "prioridad": "alta",
  "completada": false,
  "creadaEn": "2026-11-10T15:00:00.000Z",
  "actualizadaEn": "2026-11-10T15:00:00.000Z"
}
```

## 🚀 Ejecutar en local

```bash
npm install
npm start            # http://localhost:3000
```

## ✅ Pruebas

```bash
npm run test:ci      # levanta el servidor y ejecuta todas las pruebas
npm run cy:open      # abre Cypress en modo interactivo (servidor encendido)
npm run test:api     # solo pruebas de API
npm run test:ui      # solo pruebas del frontend
```

Pruebas contra producción:

```bash
BASE_URL=https://tasklab-api-testing.onrender.com npm run test:prod
```

| Suite | Archivo | Pruebas |
|-------|---------|---------|
| API Tareas (CRUD, validaciones, filtros, 404) | `cypress/e2e/api/tareas.cy.js` | 26 |
| API Estadísticas | `cypress/e2e/api/stats.cy.js` | 2 |
| Frontend (con `cy.intercept`) | `cypress/e2e/ui/frontend.cy.js` | 5 |

## ☁️ Despliegue en Render

1. Crear cuenta en [render.com](https://render.com) con GitHub.
2. **New → Blueprint** → seleccionar este repositorio (usa `render.yaml`).
3. Render despliega automáticamente cada push a `main` **solo si las pruebas de GitHub Actions pasan** (`autoDeployTrigger: checksPass`).
4. (Opcional) En GitHub: *Settings → Secrets and variables → Actions → Variables* crear `PROD_URL` con la URL de Render para activar las pruebas diarias contra producción.

## 📁 Estructura

```
├── src/
│   ├── app.js            # rutas y validaciones de la API
│   ├── store.js          # datos en memoria
│   └── server.js         # arranque del servidor
├── public/               # frontend (HTML + CSS + JS)
├── cypress/
│   ├── e2e/api/          # pruebas de API con cy.request()
│   ├── e2e/ui/           # pruebas de interfaz con cy.intercept()
│   └── support/          # comandos personalizados
├── .github/workflows/    # CI y pruebas en producción
└── render.yaml           # infraestructura como código para Render
```

## 🛠️ Tecnologías

Node.js · Express · Cypress · GitHub Actions · Render
