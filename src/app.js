const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./store');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Respuesta JSON uniforme para errores
const error = (res, status, mensaje, detalles) =>
  res.status(status).json({ error: mensaje, ...(detalles && { detalles }) });

// ---------- Salud ----------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

// ---------- Estadísticas ----------
app.get('/api/stats', (req, res) => {
  res.json(store.stats());
});

// ---------- Listar ----------
app.get('/api/tareas', (req, res) => {
  const { estado, prioridad, q } = req.query;
  if (estado && !['pendiente', 'completada'].includes(estado)) {
    return error(res, 400, 'Filtro "estado" inválido. Usa: pendiente | completada');
  }
  if (prioridad && !store.PRIORIDADES.includes(prioridad)) {
    return error(res, 400, `Filtro "prioridad" inválido. Usa: ${store.PRIORIDADES.join(' | ')}`);
  }
  res.json(store.list({ estado, prioridad, q }));
});

// ---------- Obtener una ----------
app.get('/api/tareas/:id', (req, res) => {
  const tarea = store.get(Number(req.params.id));
  if (!tarea) return error(res, 404, 'Tarea no encontrada');
  res.json(tarea);
});

// ---------- Crear ----------
app.post('/api/tareas', (req, res) => {
  const errores = store.validate(req.body, { parcial: false });
  if (errores.length) return error(res, 400, 'Datos inválidos', errores);
  if (store.isFull()) return error(res, 429, 'Límite de tareas alcanzado, elimina algunas');
  const tarea = store.create(req.body);
  res.status(201).location(`/api/tareas/${tarea.id}`).json(tarea);
});

// ---------- Actualizar ----------
app.put('/api/tareas/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!store.get(id)) return error(res, 404, 'Tarea no encontrada');
  const errores = store.validate(req.body, { parcial: true });
  if (errores.length) return error(res, 400, 'Datos inválidos', errores);
  res.json(store.update(id, req.body));
});

// ---------- Eliminar ----------
app.delete('/api/tareas/:id', (req, res) => {
  if (!store.remove(Number(req.params.id))) return error(res, 404, 'Tarea no encontrada');
  res.status(204).end();
});

// ---------- 404 para rutas de API inexistentes ----------
app.use('/api', (req, res) => error(res, 404, `Ruta ${req.method} ${req.originalUrl} no existe`));

// ---------- JSON mal formado ----------
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return error(res, 400, 'JSON mal formado');
  console.error(err);
  error(res, 500, 'Error interno del servidor');
});

module.exports = app;
