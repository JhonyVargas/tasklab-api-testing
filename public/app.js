const API = '/api';
const state = { filtro: '', busqueda: '' };

const $ = (sel) => document.querySelector(sel);
const lista = $('[data-cy=lista-tareas]');
const vacio = $('[data-cy=vacio]');
const consola = $('[data-cy=consola]');
const form = $('[data-cy=form-tarea]');
const formError = $('[data-cy=form-error]');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Cliente HTTP que registra cada petición en la consola ----------
async function api(method, path, body) {
  const inicio = performance.now();
  let status = 0;
  let data = null;
  try {
    const res = await fetch(API + path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    data = res.status === 204 ? null : await res.json();
    return { ok: res.ok, status, data };
  } catch (e) {
    data = { error: 'Sin conexión con la API' };
    return { ok: false, status, data };
  } finally {
    registrar(method, path, status, Math.round(performance.now() - inicio), body, data);
  }
}

function registrar(method, path, status, ms, body, data) {
  const li = document.createElement('li');
  const ok = status >= 200 && status < 400;
  const detalle = [
    body ? `// Request body\n${JSON.stringify(body, null, 2)}\n\n` : '',
    `// Response ${status || 'ERR'}\n${data === null ? '(sin contenido)' : JSON.stringify(data, null, 2)}`,
  ].join('');
  li.innerHTML = `
    <details>
      <summary>
        <span class="m ${method.toLowerCase()}">${method}</span>
        <span class="path">${escapeHtml(API + path)}</span>
        <span class="code ${ok ? 'ok' : 'err'}">${status || 'ERR'}</span>
        <span class="ms">${ms}ms</span>
      </summary>
      <pre>${escapeHtml(detalle)}</pre>
    </details>`;
  consola.prepend(li);
  while (consola.children.length > 30) consola.lastChild.remove();
}

function toast(msg, tipo = 'ok') {
  const t = document.createElement('div');
  t.className = `toast ${tipo === 'error' ? 'error' : ''}`;
  t.textContent = msg;
  $('.toasts').appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

// ---------- Render ----------
function fecha(iso) {
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function renderTareas(tareas) {
  lista.innerHTML = tareas.map((t) => `
    <li class="task prio-${t.prioridad} ${t.completada ? 'done' : ''}" data-id="${t.id}" data-cy="tarea">
      <button class="check" data-action="toggle" aria-label="Marcar como ${t.completada ? 'pendiente' : 'completada'}" data-cy="btn-toggle">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>
      </button>
      <div class="task-body">
        <div class="task-title" data-cy="tarea-titulo">${escapeHtml(t.titulo)}</div>
        ${t.descripcion ? `<div class="task-desc">${escapeHtml(t.descripcion)}</div>` : ''}
        <div class="task-meta">
          <span class="badge ${t.prioridad}">${t.prioridad}</span>
          <span class="task-id">#${t.id}</span>
          <span>· ${fecha(t.creadaEn)}</span>
        </div>
      </div>
      <button class="icon-btn" data-action="delete" aria-label="Eliminar tarea" data-cy="btn-eliminar">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
      </button>
    </li>`).join('');
  vacio.hidden = tareas.length > 0;
}

function renderStats(s) {
  $('[data-cy=stat-total]').textContent = s.total;
  $('[data-cy=stat-pendientes]').textContent = s.pendientes;
  $('[data-cy=stat-completadas]').textContent = s.completadas;
  const ring = $('[data-cy=stat-progreso]');
  ring.style.setProperty('--p', s.progreso);
  ring.querySelector('span').textContent = `${s.progreso}%`;
}

// ---------- Carga de datos ----------
async function cargar() {
  const params = new URLSearchParams();
  if (state.filtro) params.set('estado', state.filtro);
  if (state.busqueda) params.set('q', state.busqueda);
  const qs = params.toString() ? `?${params}` : '';
  const [tareas, stats] = await Promise.all([api('GET', `/tareas${qs}`), api('GET', '/stats')]);
  if (tareas.ok) renderTareas(tareas.data);
  if (stats.ok) renderStats(stats.data);
}

async function checkHealth() {
  const pill = $('[data-cy=api-status]');
  try {
    const res = await fetch(`${API}/health`);
    const ok = res.ok;
    pill.className = `status-pill ${ok ? 'online' : 'offline'}`;
    pill.querySelector('.status-text').textContent = ok ? 'API en línea' : 'API con errores';
  } catch {
    pill.className = 'status-pill offline';
    pill.querySelector('.status-text').textContent = 'API fuera de línea';
  }
}

// ---------- Eventos ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';
  const btn = form.querySelector('button[type=submit]');
  const payload = {
    titulo: form.titulo.value,
    prioridad: form.prioridad.value,
    descripcion: form.descripcion.value,
  };
  btn.disabled = true;
  const res = await api('POST', '/tareas', payload);
  btn.disabled = false;
  if (!res.ok) {
    formError.textContent = res.data?.detalles?.join(' · ') || res.data?.error || 'No se pudo crear la tarea';
    return;
  }
  form.reset();
  form.prioridad.value = 'media';
  form.titulo.focus();
  toast(`Tarea #${res.data.id} creada`);
  cargar();
});

lista.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const item = btn.closest('.task');
  const id = item.dataset.id;

  if (btn.dataset.action === 'toggle') {
    const completada = !item.classList.contains('done');
    const res = await api('PUT', `/tareas/${id}`, { completada });
    if (res.ok) cargar();
    else toast(res.data?.error || 'Error al actualizar', 'error');
  }

  if (btn.dataset.action === 'delete') {
    item.classList.add('removing');
    const res = await api('DELETE', `/tareas/${id}`);
    if (res.ok) { toast(`Tarea #${id} eliminada`); setTimeout(cargar, 200); }
    else { item.classList.remove('removing'); toast(res.data?.error || 'Error al eliminar', 'error'); }
  }
});

document.querySelectorAll('.tab').forEach((tab) =>
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    state.filtro = tab.dataset.filter;
    cargar();
  })
);

let debounce;
$('[data-cy=input-buscar]').addEventListener('input', (e) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { state.busqueda = e.target.value.trim(); cargar(); }, 300);
});

$('[data-cy=btn-limpiar-consola]').addEventListener('click', () => { consola.innerHTML = ''; });

// ---------- Inicio ----------
checkHealth();
setInterval(checkHealth, 30000);
cargar();
