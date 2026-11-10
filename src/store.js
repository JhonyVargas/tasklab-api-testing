// Almacenamiento en memoria (suficiente para la demo; se reinicia con el servidor)
const PRIORIDADES = ['baja', 'media', 'alta'];
const MAX_TAREAS = 200;

let tareas = [];
let siguienteId = 1;

function seed() {
  tareas = [];
  siguienteId = 1;
  create({ titulo: 'Diseñar endpoints de la API', descripcion: 'CRUD de tareas con Express', prioridad: 'alta', completada: true });
  create({ titulo: 'Escribir pruebas con Cypress', descripcion: 'Usar cy.request() para validar status, headers y body', prioridad: 'alta' });
  create({ titulo: 'Configurar GitHub Actions', descripcion: 'Ejecutar las pruebas en cada push', prioridad: 'media' });
  create({ titulo: 'Desplegar en Render', descripcion: 'Auto-deploy desde la rama main', prioridad: 'baja' });
}

function validate(body, { parcial }) {
  const errores = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ['El cuerpo debe ser un objeto JSON'];
  const { titulo, descripcion, prioridad, completada } = body;

  if (!parcial || titulo !== undefined) {
    if (typeof titulo !== 'string' || titulo.trim().length < 3) errores.push('"titulo" es obligatorio y debe tener al menos 3 caracteres');
    else if (titulo.trim().length > 100) errores.push('"titulo" no puede superar 100 caracteres');
  }
  if (descripcion !== undefined && (typeof descripcion !== 'string' || descripcion.length > 300)) {
    errores.push('"descripcion" debe ser texto de máximo 300 caracteres');
  }
  if (prioridad !== undefined && !PRIORIDADES.includes(prioridad)) {
    errores.push(`"prioridad" debe ser: ${PRIORIDADES.join(' | ')}`);
  }
  if (completada !== undefined && typeof completada !== 'boolean') {
    errores.push('"completada" debe ser booleano');
  }
  return errores;
}

function create({ titulo, descripcion = '', prioridad = 'media', completada = false }) {
  const ahora = new Date().toISOString();
  const tarea = { id: siguienteId++, titulo: titulo.trim(), descripcion: descripcion.trim(), prioridad, completada, creadaEn: ahora, actualizadaEn: ahora };
  tareas.push(tarea);
  return tarea;
}

function list({ estado, prioridad, q } = {}) {
  return tareas
    .filter((t) => !estado || (estado === 'completada') === t.completada)
    .filter((t) => !prioridad || t.prioridad === prioridad)
    .filter((t) => !q || `${t.titulo} ${t.descripcion}`.toLowerCase().includes(String(q).toLowerCase()))
    .sort((a, b) => b.id - a.id);
}

const get = (id) => tareas.find((t) => t.id === id);

function update(id, cambios) {
  const tarea = get(id);
  ['titulo', 'descripcion', 'prioridad', 'completada'].forEach((campo) => {
    if (cambios[campo] !== undefined) tarea[campo] = typeof cambios[campo] === 'string' ? cambios[campo].trim() : cambios[campo];
  });
  tarea.actualizadaEn = new Date().toISOString();
  return tarea;
}

function remove(id) {
  const i = tareas.findIndex((t) => t.id === id);
  if (i === -1) return false;
  tareas.splice(i, 1);
  return true;
}

function stats() {
  const completadas = tareas.filter((t) => t.completada).length;
  return {
    total: tareas.length,
    completadas,
    pendientes: tareas.length - completadas,
    progreso: tareas.length ? Math.round((completadas / tareas.length) * 100) : 0,
    porPrioridad: Object.fromEntries(PRIORIDADES.map((p) => [p, tareas.filter((t) => t.prioridad === p).length])),
  };
}

const isFull = () => tareas.length >= MAX_TAREAS;

seed();

module.exports = { PRIORIDADES, validate, create, list, get, update, remove, stats, isFull, seed };
