---
title: "Pruebas de API con Cypress: de cy.request() a producción con GitHub Actions y Render"
tags: cypress, testing, api, githubactions
---

# Pruebas de API con Cypress: de `cy.request()` a producción con GitHub Actions y Render

Cuando escuchamos "Cypress" casi siempre pensamos en pruebas de interfaz: clics, formularios, navegación. Pero Cypress también es una herramienta muy cómoda para **probar APIs REST**, y lo mejor es que podemos tener pruebas de API y de interfaz en el mismo proyecto, con la misma sintaxis.

En este artículo construyo **TaskLab**, una API de tareas con Node.js y Express, la pruebo con Cypress, automatizo las pruebas con **GitHub Actions** y la despliego en **Render**, de forma que **solo llega a producción el código que pasa todas las pruebas**.

- 📦 Repositorio: https://github.com/JhonyVargas/tasklab-api-testing
- 🌐 Demo en vivo: https://tasklab-api-testing.onrender.com
- 🎬 Video: _[enlace al video]_

---

## 1. La aplicación

TaskLab expone un CRUD de tareas:

| Método | Ruta | Respuestas |
|--------|------|------------|
| GET | `/api/health` | 200 |
| GET | `/api/tareas?estado=&prioridad=&q=` | 200, 400 |
| GET | `/api/tareas/:id` | 200, 404 |
| POST | `/api/tareas` | 201, 400 |
| PUT | `/api/tareas/:id` | 200, 400, 404 |
| DELETE | `/api/tareas/:id` | 204, 404 |

Cada tarea tiene `titulo` (3-100 caracteres), `descripcion`, `prioridad` (`baja | media | alta`) y `completada`. La API valida los datos y responde siempre en JSON, incluso en los errores:

```js
app.post('/api/tareas', (req, res) => {
  const errores = store.validate(req.body, { parcial: false });
  if (errores.length) return error(res, 400, 'Datos inválidos', errores);
  const tarea = store.create(req.body);
  res.status(201).location(`/api/tareas/${tarea.id}`).json(tarea);
});
```

Además tiene un frontend con una **consola de API** que muestra cada petición HTTP que hace la interfaz (método, ruta, código de estado, tiempo y body), así se ve en todo momento qué pasa "por debajo".

## 2. Instalando Cypress

```bash
npm install -D cypress start-server-and-test
```

`cypress.config.js`:

```js
const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    video: false,
    retries: { runMode: 1, openMode: 0 },
  },
});
```

Leer `baseUrl` desde una variable de entorno permite ejecutar **las mismas pruebas** en local y contra producción.

## 3. Primera prueba: `cy.request()`

`cy.request()` hace una petición HTTP real y nos da el `status`, los `headers`, el `body` y la `duration`:

```js
it('GET /api/health responde 200 y status ok', () => {
  cy.request('/api/health').then((res) => {
    expect(res.status).to.eq(200);
    expect(res.headers['content-type']).to.include('application/json');
    expect(res.body).to.have.property('status', 'ok');
    expect(res.duration).to.be.lessThan(2000);
  });
});
```

## 4. Probando el CRUD

**Crear (201 + header Location):**

```js
it('crea una tarea válida y responde 201', () => {
  const nueva = { titulo: 'Aprender cy.request()', prioridad: 'alta' };

  cy.request('POST', '/api/tareas', nueva).then((res) => {
    expect(res.status).to.eq(201);
    expect(res.headers).to.have.property('location', `/api/tareas/${res.body.id}`);
    expect(res.body).to.include(nueva);
    expect(res.body.completada).to.eq(false);
  });
});
```

**Eliminar y verificar que ya no existe:**

```js
it('elimina una tarea y responde 204', () => {
  cy.crearTarea({ titulo: 'Tarea a eliminar' }).then((tarea) => {
    cy.request('DELETE', `/api/tareas/${tarea.id}`).its('status').should('eq', 204);
    cy.request({ url: `/api/tareas/${tarea.id}`, failOnStatusCode: false })
      .its('status').should('eq', 404);
  });
});
```

> 💡 Por defecto `cy.request()` falla si el código no es 2xx/3xx. Para probar errores usamos `failOnStatusCode: false`.

## 5. Casos negativos guiados por datos

Probar solo el "camino feliz" no basta. Con un arreglo de casos generamos varias pruebas de validación:

```js
const invalidos = [
  { caso: 'sin título',         body: { prioridad: 'alta' },                 mensaje: '"titulo" es obligatorio' },
  { caso: 'título muy corto',   body: { titulo: 'ab' },                      mensaje: 'al menos 3 caracteres' },
  { caso: 'prioridad inválida', body: { titulo: 'Tarea', prioridad: 'urgente' }, mensaje: '"prioridad" debe ser' },
];

invalidos.forEach(({ caso, body, mensaje }) => {
  it(`responde 400 cuando el body tiene ${caso}`, () => {
    cy.request({ method: 'POST', url: '/api/tareas', body, failOnStatusCode: false })
      .then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.detalles.join(' ')).to.include(mensaje);
      });
  });
});
```

## 6. Comandos personalizados

Para no repetir código, creé comandos en `cypress/support/commands.js`:

```js
Cypress.Commands.add('crearTarea', (tarea = {}) =>
  cy.request('POST', '/api/tareas', { titulo: `Tarea ${Date.now()}`, ...tarea }).its('body')
);
```

## 7. Bonus: probar que el frontend usa bien la API

Con `cy.intercept()` espiamos las peticiones que hace la página y validamos request y response:

```js
cy.intercept('POST', '/api/tareas').as('crear');
cy.get('[data-cy=input-titulo]').type('Tarea UI');
cy.get('[data-cy=btn-agregar]').click();

cy.wait('@crear').then(({ request, response }) => {
  expect(request.body.titulo).to.eq('Tarea UI');
  expect(response.statusCode).to.eq(201);
});
```

Resultado local: **33 pruebas en verde** ✅

```
  ✔  api/stats.cy.js       2 passing
  ✔  api/tareas.cy.js     26 passing
  ✔  ui/frontend.cy.js     5 passing
```

## 8. Automatización con GitHub Actions

Cada `push` o `pull request` a `main` levanta la API y ejecuta Cypress con la acción oficial:

```yaml
name: CI - Pruebas de API con Cypress
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: 'http://localhost:3000/api/health'
```

## 9. Despliegue en Render (solo si las pruebas pasan)

El archivo `render.yaml` define el servicio como código:

```yaml
services:
  - type: web
    name: tasklab-api-testing
    runtime: node
    plan: free
    buildCommand: npm ci --omit=dev
    startCommand: npm start
    healthCheckPath: /api/health
    autoDeployTrigger: checksPass
```

La clave es `autoDeployTrigger: checksPass`: Render espera a que GitHub Actions termine en verde antes de desplegar. Si una prueba falla, **el código roto nunca llega a producción**.

Para crearlo: en Render, **New → Blueprint** y seleccionar el repositorio.

## 10. Probar producción

Como `baseUrl` sale de una variable de entorno, un segundo workflow ejecuta las pruebas de API contra la URL pública todos los días:

```bash
BASE_URL=https://tasklab-api-testing.onrender.com npx cypress run --spec "cypress/e2e/api/**"
```

## Conclusiones

- `cy.request()` hace que probar APIs con Cypress sea simple y legible.
- Probar los **casos negativos** (400, 404, JSON mal formado) es tan importante como el camino feliz.
- Con GitHub Actions + `autoDeployTrigger: checksPass` en Render tenemos un pipeline donde **las pruebas son la puerta de entrada a producción**.
- La misma suite sirve para local, CI y producción.

¿Usas Cypress para probar APIs o prefieres Postman/Newman o k6? ¡Te leo en los comentarios! 👇
