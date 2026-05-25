const API = "/api";
const state = {
  user: null,
  tasks: [],
  filter: "Todas",
  authMode: "login"
};

function html(strings, ...values) {
  return strings.reduce((result, string, index) => result + string + (values[index] ?? ""), "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("focustask_token");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Error de solicitud");
  return data;
}

function render() {
  const root = document.getElementById("root");
  root.innerHTML = state.user ? dashboardTemplate() : authTemplate();
  bindEvents();
}

function authTemplate(error = "") {
  const registerField = state.authMode === "register"
    ? html`<label>Nombre<input id="name" placeholder="Jhoiner Gonzalez" required /></label>`
    : "";

  return html`
    <main class="auth-layout">
      <section class="brand-panel">
        <div class="brand-mark">FT</div>
        <h1>FocusTask</h1>
        <p>Organiza actividades, prioriza pendientes y conserva tus tareas en una cuenta segura.</p>
        <div class="feature-list">
          <span>Autenticacion</span>
          <span>CRUD de tareas</span>
          <span>Seguimiento</span>
        </div>
      </section>
      <section class="auth-card">
        <div class="switcher">
          <button data-auth-mode="login" class="${state.authMode === "login" ? "active" : ""}">Iniciar sesion</button>
          <button data-auth-mode="register" class="${state.authMode === "register" ? "active" : ""}">Registrarse</button>
        </div>
        <form id="auth-form">
          ${registerField}
          <label>Correo<input id="email" type="email" placeholder="correo@ejemplo.com" required /></label>
          <label>Contrasena<input id="password" type="password" placeholder="Minimo 6 caracteres" minlength="6" required /></label>
          ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
          <button class="primary-button" type="submit">${state.authMode === "login" ? "Entrar" : "Crear cuenta"}</button>
        </form>
      </section>
    </main>
  `;
}

function dashboardTemplate(error = "") {
  const done = state.tasks.filter(task => task.completed).length;
  const pending = state.tasks.length - done;
  const visibleTasks = state.tasks.filter(task => {
    if (state.filter === "Completadas") return task.completed;
    if (state.filter === "Pendientes") return !task.completed;
    return true;
  });

  return html`
    <main class="app-shell">
      <header class="topbar">
        <div>
          <span class="eyebrow">Task Manager Web</span>
          <h1>FocusTask</h1>
        </div>
        <div class="user-box">
          <span>${escapeHtml(state.user.name)}</span>
          <button title="Cerrar sesion" class="icon-button" id="logout">Salir</button>
        </div>
      </header>
      <section class="stats-grid">
        <div><strong>${state.tasks.length}</strong><span>Total</span></div>
        <div><strong>${pending}</strong><span>Pendientes</span></div>
        <div><strong>${done}</strong><span>Completadas</span></div>
      </section>
      <form class="task-form" id="task-form">
        <input id="task-title" placeholder="Nueva tarea" required />
        <input id="task-description" placeholder="Descripcion breve" />
        <select id="task-priority">
          <option>Alta</option>
          <option selected>Media</option>
          <option>Baja</option>
        </select>
        <input id="task-due-date" type="date" />
        <button title="Agregar tarea" class="icon-button add" type="submit">+</button>
      </form>
      <nav class="filters">
        ${["Todas", "Pendientes", "Completadas"].map(option =>
          `<button data-filter="${option}" class="${state.filter === option ? "active" : ""}">${option}</button>`
        ).join("")}
      </nav>
      ${error ? `<p class="error">${escapeHtml(error)}</p>` : ""}
      <section class="task-list">
        ${visibleTasks.length ? visibleTasks.map(taskTemplate).join("") : `<div class="empty-state">No hay tareas en esta vista.</div>`}
      </section>
    </main>
  `;
}

function taskTemplate(task) {
  return html`
    <article class="task-card ${task.completed ? "done" : ""}" data-task-id="${task.id}">
      <button class="complete-button" data-action="toggle" title="${task.completed ? "Marcar pendiente" : "Marcar completada"}">
        ${task.completed ? "✓" : "○"}
      </button>
      <div class="task-main">
        <h3>${escapeHtml(task.title)}</h3>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
        <div class="task-meta">
          <span class="priority ${task.priority.toLowerCase()}">${escapeHtml(task.priority)}</span>
          ${task.dueDate ? `<span>Fecha: ${escapeHtml(task.dueDate)}</span>` : ""}
        </div>
      </div>
      <div class="task-actions">
        <button title="Editar" class="icon-button" data-action="edit">Editar</button>
        <button title="Eliminar" class="icon-button danger" data-action="delete">Borrar</button>
      </div>
    </article>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-auth-mode]").forEach(button => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      render();
    });
  });

  document.getElementById("auth-form")?.addEventListener("submit", handleAuth);
  document.getElementById("logout")?.addEventListener("click", logout);
  document.getElementById("task-form")?.addEventListener("submit", createTask);

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => handleTaskAction(button));
  });
}

async function handleAuth(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById("name")?.value || "",
    email: document.getElementById("email").value,
    password: document.getElementById("password").value
  };

  try {
    const path = state.authMode === "login" ? "/login" : "/register";
    const data = await apiRequest(path, { method: "POST", body: JSON.stringify(payload) });
    localStorage.setItem("focustask_token", data.token);
    state.user = data.user;
    await loadTasks();
  } catch (error) {
    document.getElementById("root").innerHTML = authTemplate(error.message);
    bindEvents();
  }
}

async function loadTasks() {
  const data = await apiRequest("/tasks");
  state.tasks = data.tasks;
  render();
}

async function createTask(event) {
  event.preventDefault();
  const payload = {
    title: document.getElementById("task-title").value,
    description: document.getElementById("task-description").value,
    priority: document.getElementById("task-priority").value,
    dueDate: document.getElementById("task-due-date").value
  };
  const data = await apiRequest("/tasks", { method: "POST", body: JSON.stringify(payload) });
  state.tasks = [data.task, ...state.tasks];
  render();
}

async function handleTaskAction(button) {
  const card = button.closest("[data-task-id]");
  const id = card.dataset.taskId;
  const task = state.tasks.find(item => item.id === id);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    await updateTask(id, { completed: !task.completed });
    return;
  }

  if (button.dataset.action === "delete") {
    await apiRequest(`/tasks/${id}`, { method: "DELETE" });
    state.tasks = state.tasks.filter(item => item.id !== id);
    render();
    return;
  }

  if (button.dataset.action === "edit") {
    const title = prompt("Titulo de la tarea", task.title);
    if (title === null) return;
    const description = prompt("Descripcion", task.description || "");
    if (description === null) return;
    await updateTask(id, { title, description });
  }
}

async function updateTask(id, changes) {
  const data = await apiRequest(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(changes) });
  state.tasks = state.tasks.map(task => task.id === id ? data.task : task);
  render();
}

function logout() {
  localStorage.removeItem("focustask_token");
  state.user = null;
  state.tasks = [];
  render();
}

async function boot() {
  try {
    const data = await apiRequest("/me");
    state.user = data.user;
    await loadTasks();
  } catch {
    localStorage.removeItem("focustask_token");
    render();
  }
}

boot();
