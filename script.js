// Seleccionar elementos de la pantalla
const form = document.getElementById('task-form');
const taskList = document.getElementById('task-list');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const themeToggle = document.getElementById('theme-toggle');
const statsBtn = document.getElementById('stats-btn');
const statsPanel = document.getElementById('stats-panel');
const closeStats = document.getElementById('close-stats');
const exportBtn = document.getElementById('export-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// Variables globales
let allTasks = [];
let filteredTasks = [];

// UN SOLO ARRANQUE PARA TODA LA APP
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  displayTasks();
  updateStats();
  reprogramarAlertasAlIniciar(); 
  
  // ACTIVAR TARJETAS DE ACCESO RÁPIDO
  const btnPagar = document.getElementById('tarjeta-pagar');
  const btnLlamar = document.getElementById('tarjeta-llamar');

  if (btnPagar) {
    btnPagar.addEventListener('click', () => {
      if (filterType) {
        filterType.value = filterType.value === 'factura' ? '' : 'factura';
        filterTasks(); 
        btnPagar.style.borderColor = filterType.value === 'factura' ? '#0083b0' : '#edf2f7';
        if (btnLlamar) btnLlamar.style.borderColor = '#edf2f7'; 
      }
    });
  }

  if (btnLlamar) {
    btnLlamar.addEventListener('click', () => {
      if (filterType) {
        filterType.value = filterType.value === 'llamada' ? '' : 'llamada';
        filterTasks(); 
        btnLlamar.style.borderColor = filterType.value === 'llamada' ? '#0083b0' : '#edf2f7';
        if (btnPagar) btnPagar.style.borderColor = '#edf2f7'; 
      }
    });
  }
});

// Eventos generales
if (form) form.addEventListener('submit', addTask);
if (searchInput) searchInput.addEventListener('input', filterTasks);
if (filterType) filterType.addEventListener('change', filterTasks);
if (themeToggle) themeToggle.setAttribute('style', 'cursor: pointer;'); // fallback preventivo
if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
if (statsBtn) statsBtn.addEventListener('click', () => statsPanel.classList.remove('hidden'));
if (closeStats) closeStats.addEventListener('click', () => statsPanel.classList.add('hidden'));
if (exportBtn) exportBtn.addEventListener('click', exportToCSV);
if (clearAllBtn) clearAllBtn.addEventListener('click', clearAllTasks);

// Función para agregar tarea (CORREGIDA PARA PC Y VOZ)
function addTask(e) {
  // Solo ejecuta preventDefault si el evento existe realmente (click manual)
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }

  const titleEl = document.getElementById('task-title');
  const typeEl = document.getElementById('task-type');
  const dateEl = document.getElementById('task-date');
  const timeEl = document.getElementById('task-time'); 

  if (!titleEl || !titleEl.value.trim()) return;

  const nuevaFecha = dateEl && dateEl.value ? dateEl.value : new Date().toLocaleDateString('sv-SE');
  const nuevaHora = timeEl && timeEl.value ? timeEl.value : "18:00";

  const newTask = {
    id: Date.now(),
    title: titleEl.value,
    type: typeEl ? typeEl.value : 'tramite',
    date: nuevaFecha,
    time: nuevaHora, 
    completed: false,
    createdAt: new Date().toISOString()
  };

  saveTask(newTask);
  displayTasks();
  
  // Limpiar el formulario solo si fue una carga manual
  if (e && form) form.reset(); 
  
  updateStats();
  showNotification('✅ Tarea agregada correctamente!');
  programarAvisoMediaHoraAntes(newTask.title, nuevaFecha, nuevaHora);
}

// Función para guardar en LocalStorage
function saveTask(task) {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  tasks.push(task);
  localStorage.setItem('myTasks', JSON.stringify(tasks));
}

// Función para mostrar las tareas en pantalla
function displayTasks() {
  if (!taskList) return;
  taskList.innerHTML = '';
  allTasks = JSON.parse(localStorage.getItem('myTasks')) || [];

  if (allTasks.length === 0) {
    taskList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">✨ ¡No tienes tareas! ✨</li>';
    if (clearAllBtn) clearAllBtn.classList.add('hidden');
    return;
  }

  if (clearAllBtn) clearAllBtn.classList.remove('hidden');

  let displayTasks = [...allTasks].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'factura' ? -1 : 1;
    }
    return new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00'));
  });

  displayTasks.forEach(task => renderTask(task));
  checkOverdueNotifications();
}

// Función para renderizar una tarea
function renderTask(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.type} ${task.completed ? 'completed' : ''}`;
  
  let typeLabel = task.type === 'factura' ? '💵 Factura' : 
                  task.type === 'llamada' ? '📞 Llamada' : 
                  '🏢 Trámite';

  const todayStr = new Date().toLocaleDateString('sv-SE');
  let daysInfo = '';
  let urgencyClass = '';
  
  if (task.date < todayStr) {
    daysInfo = `⚠️ Atrasado`;
    urgencyClass = 'urgency-high';
  } else if (task.date === todayStr) {
    daysInfo = '🔴 ¡Hoy vence!';
    urgencyClass = 'urgency-critical';
  } else {
    daysInfo = `📅 ${task.date} a las ${task.time || '18:00'}`;
  }

  li.innerHTML = `
    <div class="task-info">
      <p class="title">${escapeHtml(task.title)}</p>
      <p class="date">${typeLabel} - Vence: ${task.date} a las ${task.time || '18:00'}</p>
      <p class="days-left ${urgencyClass}">${daysInfo}</p>
    </div>
    <div class="task-buttons">
      <button class="btn-complete" onclick="toggleTask(${task.id})" title="Marcar como completada">✔ Hecho</button>
      <button class="btn-delete" onclick="deleteTask(${task.id})" title="Eliminar tarea">🗑️</button>
    </div>
  `;
  taskList.appendChild(li);
}

function filterTasks() {
  if (!searchInput || !filterType || !taskList) return;
  const searchTerm = searchInput.value.toLowerCase();
  const typeFilter = filterType.value;

  filteredTasks = allTasks.filter(task => {
    const matchSearch = task.title.toLowerCase().includes(searchTerm);
    const matchType = typeFilter === '' || task.type === typeFilter;
    return matchSearch && matchType && !task.completed;
  });
  taskList.innerHTML = '';
  if (filteredTasks.length === 0) {
    taskList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">🔍 No se encontraron tareas</li>';
    return;
  }
  filteredTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
  filteredTasks.forEach(task => renderTask(task));
}

function toggleTask(id) {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  tasks = tasks.map(task => { if (task.id === id) task.completed = !task.completed; return task; });
  localStorage.setItem('myTasks', JSON.stringify(tasks));
  displayTasks();
  updateStats();
  showNotification('✅ Estado actualizado!');
}

function deleteTask(id) {
  if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
    tasks = tasks.filter(task => task.id !== id);
    localStorage.setItem('myTasks', JSON.stringify(tasks));
    displayTasks();
    updateStats();
    showNotification('🗑️ Tarea eliminada');
  }
}

function clearAllTasks() {
  if (confirm('⚠️ ¿Estás seguro de que quieres borrar TODAS las tareas?')) {
    localStorage.removeItem('myTasks');
    displayTasks();
    updateStats();
    showNotification('🗑️ Todas las tareas han sido eliminadas');
  }
}

function updateStats() {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  
  const todayStr = new Date().toLocaleDateString('sv-SE');
  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    return t.date < todayStr;
  }).length;

  const eTotal = document.getElementById('total-tasks');
  const eCompleted = document.getElementById('completed-tasks');
  const ePending = document.getElementById('pending-tasks');
  const eOverdue = document.getElementById('overdue-tasks');
  if (eTotal) eTotal.textContent = totalTasks;
  if (eCompleted) eCompleted.textContent = completedTasks;
  if (ePending) ePending.textContent = pendingTasks;
  if (eOverdue) eOverdue.textContent = overdueTasks;
}

function exportToCSV() {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  if (tasks.length === 0) { alert('No hay tareas para exportar'); return; }
  const headers = ['Título', 'Tipo', 'Fecha', 'Hora', 'Estado'];
  const rows = tasks.map(task => [task.title, task.type, task.date, task.time || '18:00', task.completed ? 'Completada' : 'Pendiente']);
  let csv = headers.join(',') + '\n';
  rows.forEach(row => { csv += row.map(cell => `"${cell}"`).join(',') + '\n'; });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tareas.csv`;
  link.click();
}

function toggleTheme() {
  const html = document.documentElement;
  if (html.getAttribute('data-theme') === 'dark') {
    html.removeAttribute('data-theme'); localStorage.setItem('theme', 'light');
    if (themeToggle) themeToggle.textContent = '🌙';
  } else {
    html.setAttribute('data-theme', 'dark'); localStorage.setItem('theme', 'dark');
    if (themeToggle) themeToggle.textContent = '☀️';
  }
}

function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.textContent = '☀️';
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => { notification.classList.add('show'); }, 10);
  setTimeout(() => { notification.classList.remove('show'); setTimeout(() => notification.remove(), 300); }, 3000);
}

function checkOverdueNotifications() {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  const today = new Date().toLocaleDateString('sv-SE');
  const tasksVencidoHoy = tasks.filter(t => t.date === today && !t.completed);
  if (tasksVencidoHoy.length > 0) { showNotification(`⏰ ¡Tienes tareas que vencen hoy!`); }
}

function escapeHtml(text) {
  const div = document.createElement('div'); div.textContent = text; return div.innerHTML;
}

// =======================================================
// RECONOCIMIENTO DE VOZ INTEGRADO
// =======================================================
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = false;

  const botonVoz = document.getElementById('btn-voz');
  const textoEscuchado = document.getElementById('texto-escuchado');

  if (botonVoz) {
    botonVoz.addEventListener('click', () => {
      try {
        recognition.start();
        if (textoEscuchado) textoEscuchado.innerText = "Escuchando... habla ahora.";
        botonVoz.style.boxShadow = "0 0 25px rgba(46, 204, 113, 0.8)";
        botonVoz.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
      } catch (error) { console.log("Ya activo"); }
    });
  }

  recognition.onresult = (event) => {
    const comando = event.results[0][0].transcript.toLowerCase();
    if (textoEscuchado) textoEscuchado.innerText = `Entendido: "${comando}"`;
    restaurarBoton(botonVoz);
    procesarComando(comando);
  };
  recognition.onerror = () => { restaurarBoton(botonVoz); };
  recognition.onend = () => { restaurarBoton(botonVoz); };
}

function restaurarBoton(boton) {
  if (boton) {
    boton.style.boxShadow = "0 8px 18px rgba(0, 180, 219, 0.35)";
    boton.style.background = "linear-gradient(135deg, #00b4db 0%, #0083b0 100%)";
  }
}

// =======================================================
// INTELIGENCIA ARTIFICIAL: PROCESADOR DE FRASES, FECHAS Y HORAS (ULTRA-ROBUSTO)
// =======================================================
function procesarComando(orden) {
  function asistenteHabla(texto) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const mensajeVoz = new SpeechSynthesisUtterance(texto);
      mensajeVoz.lang = 'es-ES';
      window.speechSynthesis.speak(mensajeVoz);
    }
  }

  let textoTarea = orden.replace("recordar", "").replace("tarea", "").replace("trámite", "").trim();
  
  let fechaDetectada = new Date().toLocaleDateString('sv-SE');
  let horaDetectada = "18:00"; // Hora por defecto si no se detecta ninguna

  // EXTRACTOR DE HORA TODO-TERRENO (Soporta: "15:30", "15 y 30", "5 y 10", "09:00", etc.)
  // Busca cualquier combinación de números después de "a las"
  const regexHoraUniversal = /a las\s+(\d{1,2})(?:\s*[\s:y]\s*)(\d{2})?/i;
  const matchHora = orden.match(regexHoraUniversal);
  
  if (matchHora) {
    let hora = matchHora[1].padStart(2, '0');
    let minutos = matchHora[2] ? matchHora[2].padStart(2, '0') : '00';
    horaDetectada = `${hora}:${minutos}`;
    textoTarea = textoTarea.replace(matchHora[0], "").trim();
  } else {
    // Intento secundario por si dijiste una hora exacta sin minutos (Ej: "a las 15 horas" o "a las 3")
    const regexHoraSimple = /a las\s+(\d{1,2})/i;
    const matchSimple = orden.match(regexHoraSimple);
    if (matchSimple) {
      let hora = matchSimple[1].padStart(2, '0');
      horaDetectada = `${hora}:00`;
      textoTarea = textoTarea.replace(matchSimple[0], "").trim();
    }
  }

  // Limpiar palabras basura del final de la hora si se cuelan
  textoTarea = textoTarea.replace(/horas?$/i, "").trim();

  // DETECTOR DE FECHAS
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const regexFecha = /(\d{1,2})\s+de\s+([a-z]+)/i;
  const matchFecha = orden.match(regexFecha);
  
  if (matchFecha) {
    const dia = matchFecha[1].padStart(2, '0');
    const nombreMes = matchFecha[2].toLowerCase();
    const indiceMes = meses.indexOf(nombreMes);
    
    if (indiceMes !== -1) {
      const anoActual = new Date().getFullYear(); 
      const mes = String(indiceMes + 1).padStart(2, '0');
      fechaDetectada = `${anoActual}-${mes}-${dia}`;
      textoTarea = textoTarea.replace(matchFecha[0], "").trim();
    }
  }

  if (textoTarea === "") {
    asistenteHabla("¿Qué tarea deseas que guarde?");
    return;
  }

  // RELLENAR CAMPOS E INYECTAR DATOS DIRECTOS
  const campoTitulo = document.getElementById('task-title');
  if (campoTitulo) campoTitulo.value = textoTarea.toUpperCase();
  
  const selectorTipo = document.getElementById('task-type');
  if (selectorTipo) {
    if (orden.includes("llamar") || orden.includes("telefono")) selectorTipo.value = "llamada";
    else if (orden.includes("pagar") || orden.includes("factura") || orden.includes("agua") || orden.includes("luz")) selectorTipo.value = "factura";
    else selectorTipo.value = "tramite";
  }

  const campoFecha = document.getElementById('task-date');
  if (campoFecha) campoFecha.value = fechaDetectada;

  const campoHora = document.getElementById('task-time');
  if (campoHora) campoHora.value = horaDetectada;

  // Ejecutamos pasando un evento falso seguro para que la PC no se congele
  addTask({ preventDefault: () => {} });

  // Limpieza preventiva del formulario visual después de guardar por voz
  if (campoTitulo) campoTitulo.value = '';

  asistenteHabla(`Guardado con éxito: ${textoTarea}.`);
}

// =======================================================
// ALARMAS DINÁMICAS PRECISAS (30 MINUTOS ANTES)
// =======================================================
function programarAvisoMediaHoraAntes(nombreTarea, fecha, hora) {
  const ahora = new Date();
  const horaVencimiento = new Date(`${fecha}T${hora}`);
  const tiempoAlerta = horaVencimiento.getTime() - (30 * 60 * 1000); 
  const tiempoEspera = tiempoAlerta - ahora.getTime();

  if (tiempoEspera > 0) {
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const aviso = new SpeechSynthesisUtterance(`Atención. Tu tarea: ${nombreTarea}, vence en treinta minutos.`);
        aviso.lang = 'es-ES';
        window.speechSynthesis.speak(aviso);
      }
      alert(`⏰ Alerta: "${nombreTarea}" vence en 30 min.`);
    }, tiempoEspera);
  }
}

function reprogramarAlertasAlIniciar() {
  const tareas = JSON.parse(localStorage.getItem('myTasks')) || [];
  tareas.forEach(t => {
    if (!t.completed && t.date && t.time) {
      programarAvisoMediaHoraAntes(t.title, t.date, t.time);
    }
  });
}
