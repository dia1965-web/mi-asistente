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

// Cargar tareas guardadas al abrir la app
document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  displayTasks();
  updateStats();
});

// Eventos
form.addEventListener('submit', addTask);
searchInput.addEventListener('input', filterTasks);
filterType.addEventListener('change', filterTasks);
themeToggle.addEventListener('click', toggleTheme);
statsBtn.addEventListener('click', () => statsPanel.classList.remove('hidden'));
closeStats.addEventListener('click', () => statsPanel.classList.add('hidden'));
exportBtn.addEventListener('click', exportToCSV);
clearAllBtn.addEventListener('click', clearAllTasks);

// Función para agregar tarea
function addTask(e) {
  e.preventDefault();

  const newTask = {
    id: Date.now(),
    title: document.getElementById('task-title').value,
    type: document.getElementById('task-type').value,
    date: document.getElementById('task-date').value,
    completed: false,
    createdAt: new Date().toISOString()
  };

  saveTask(newTask);
  displayTasks();
  form.reset();
  updateStats();
  
  // Notificación visual
  showNotification('✅ Tarea agregada correctamente!');
}

// Función para guardar en LocalStorage
function saveTask(task) {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  tasks.push(task);
  localStorage.setItem('myTasks', JSON.stringify(tasks));
}

// Función para mostrar las tareas en pantalla
function displayTasks() {
  taskList.innerHTML = '';
  allTasks = JSON.parse(localStorage.getItem('myTasks')) || [];

  if (allTasks.length === 0) {
    taskList.innerHTML = '<li style="text-align: center; color: #999; padding: 20px;">✨ ¡No tienes tareas! ✨</li>';
    clearAllBtn.classList.add('hidden');
    return;
  }

  clearAllBtn.classList.remove('hidden');

  // Ordenar tareas: las facturas primero por importancia, luego por fecha
  let displayTasks = [...allTasks].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'factura' ? -1 : 1;
    }
    return new Date(a.date) - new Date(b.date);
  });

  displayTasks.forEach(task => renderTask(task));
  
  // Notificar tareas que vencen hoy
  checkOverdueNotifications();
}

// Función para renderizar una tarea
function renderTask(task) {
  const li = document.createElement('li');
  li.className = `task-item ${task.type} ${task.completed ? 'completed' : ''}`;
  
  let typeLabel = task.type === 'factura' ? '💵 Factura' : 
                  task.type === 'llamada' ? '📞 Llamada' : 
                  '🏢 Trámite';

  const today = new Date();
  const taskDate = new Date(task.date);
  const daysLeft = Math.ceil((taskDate - today) / (1000 * 60 * 60 * 24));
  let daysInfo = '';
  let urgencyClass = '';
  
  if (daysLeft < 0) {
    daysInfo = `⚠️ ${Math.abs(daysLeft)} días atrasado`;
    urgencyClass = 'urgency-high';
  } else if (daysLeft === 0) {
    daysInfo = '🔴 ¡Hoy vence!';
    urgencyClass = 'urgency-critical';
  } else if (daysLeft <= 3) {
    daysInfo = `🟠 ${daysLeft} días restantes`;
    urgencyClass = 'urgency-medium';
  } else {
    daysInfo = `📅 ${daysLeft} días restantes`;
  }

  li.innerHTML = `
    <div class="task-info">
      <p class="title">${escapeHtml(task.title)}</p>
      <p class="date">${typeLabel} - Vence: ${task.date}</p>
      <p class="days-left ${urgencyClass}">${daysInfo}</p>
    </div>
    <div class="task-buttons">
      <button class="btn-complete" onclick="toggleTask(${task.id})" title="Marcar como completada">✔ Hecho</button>
      <button class="btn-delete" onclick="deleteTask(${task.id})" title="Eliminar tarea">🗑️</button>
    </div>
  `;
  taskList.appendChild(li);
}

// Función para filtrar tareas
function filterTasks() {
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

// Función para marcar como completada
function toggleTask(id) {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  tasks = tasks.map(task => {
    if (task.id === id) {
      task.completed = !task.completed;
    }
    return task;
  });
  localStorage.setItem('myTasks', JSON.stringify(tasks));
  displayTasks();
  updateStats();
  showNotification('✅ Estado actualizado!');
}

// Función para borrar una tarea
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

// Función para limpiar todas las tareas
function clearAllTasks() {
  if (confirm('⚠️ ¿Estás seguro de que quieres borrar TODAS las tareas?')) {
    localStorage.removeItem('myTasks');
    displayTasks();
    updateStats();
    showNotification('🗑️ Todas las tareas han sido eliminadas');
  }
}

// Función para actualizar estadísticas
function updateStats() {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  
  const today = new Date();
  const overdueTasks = tasks.filter(t => {
    if (t.completed) return false;
    const taskDate = new Date(t.date);
    return taskDate < today;
  }).length;

  document.getElementById('total-tasks').textContent = totalTasks;
  document.getElementById('completed-tasks').textContent = completedTasks;
  document.getElementById('pending-tasks').textContent = pendingTasks;
  document.getElementById('overdue-tasks').textContent = overdueTasks;
}

// Función para exportar a CSV
function exportToCSV() {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  
  if (tasks.length === 0) {
    alert('No hay tareas para exportar');
    return;
  }

  const headers = ['Título', 'Tipo', 'Fecha de Vencimiento', 'Estado', 'Creada el'];
  const rows = tasks.map(task => [
    task.title,
    task.type === 'factura' ? 'Factura' : task.type === 'llamada' ? 'Llamada' : 'Trámite',
    task.date,
    task.completed ? 'Completada' : 'Pendiente',
    new Date(task.createdAt).toLocaleDateString('es-ES')
  ]);

  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tareas_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showNotification('📥 Tareas exportadas correctamente');
}

// Función para cambiar tema
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  
  if (isDark) {
    html.removeAttribute('data-theme');
    localStorage.setItem('theme', 'light');
    themeToggle.textContent = '🌙';
  } else {
    html.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');
    themeToggle.textContent = '☀️';
  }
}

// Función para cargar tema guardado
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const html = document.documentElement;
  
  if (savedTheme === 'dark') {
    html.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
  } else {
    html.removeAttribute('data-theme');
    themeToggle.textContent = '🌙';
  }
}

// Función para mostrar notificaciones
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Función para verificar tareas vencidas
function checkOverdueNotifications() {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  const today = new Date().toISOString().split('T')[0];
  
  const tasksVencidoHoy = tasks.filter(t => t.date === today && !t.completed);
  
  if (tasksVencidoHoy.length > 0) {
    playNotificationSound();
    showNotification(`⏰ ¡${tasksVencidoHoy.length} tarea(s) vence(n) hoy!`);
  }
}

// Función para reproducir sonido de notificación
function playNotificationSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// Función para escapar HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// 1. Validar que el teléfono/navegador soporte el reconocimiento de voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  
  // Configuración del reconocimiento
  recognition.lang = 'es-ES'; // Idioma español
  recognition.continuous = false; // Se detiene automáticamente cuando dejas de hablar
  recognition.interimResults = false; // Solo muestra el resultado final procesado

  // Obtenemos los elementos del HTML que modificamos antes
  const botonVoz = document.getElementById('btn-voz');
  const textoEscuchado = document.getElementById('texto-escuchado');

  // 2. Evento al tocar el botón del micrófono
  botonVoz.addEventListener('click', () => {
    try {
      recognition.start();
      textoEscuchado.innerText = "Escuchando... habla ahora.";
      // Le damos un efecto visual de brillo verde mientras escucha
      botonVoz.style.boxShadow = "0 0 25px rgba(46, 204, 113, 0.8)";
      botonVoz.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
    } catch (error) {
      console.log("El reconocimiento ya estaba activo.");
    }
  });

  // 3. Qué hace la app cuando dejas de hablar y entiende el texto
  recognition.onresult = (event) => {
    // Convertimos lo que dijiste a minúsculas para que sea fácil de leer por el código
    const comando = event.results[0][0].transcript.toLowerCase();
    textoEscuchado.innerText = `Entendido: "${comando}"`;
    
    // Devolvemos el botón a su color azul original
    restaurarBoton(botonVoz);

    // Enviamos el texto a nuestro "cerebro" de comandos
    procesarComando(comando);
  };
// =======================================================
// NUEVO CEREBRO DEL ASISTENTE: PROCESAR ÓRDENES POR VOZ
// =======================================================
function procesarComando(orden) {
  
  // 1. FUNCIÓN PARA QUE EL ASISTENTE HABLE
  function asistenteHabla(texto) {
    const s语音 = new SpeechSynthesisUtterance(texto);
    s语音.lang = 'es-ES'; // Voz en español
    s语音.volume = 1;     // Volumen al máximo
    s语音.rate = 1;       // Velocidad normal
    window.speechSynthesis.speak(s语音);
  }

  // 2. DETECTAR SI ES UNA TAREA / RECORDATORIO
  if (orden.includes("recordar") || orden.includes("tarea") || orden.includes("trámite") || orden.includes("pagar")) {
    
    const textoTarea = orden.replace("recordar", "").replace("tarea", "").trim();
    
    if (textoTarea === "") {
      asistenteHabla("Por favor, dime qué tarea deseas que guarde.");
      return;
    }

    // Rellenamos el formulario viejo automáticamente con lo que dijiste
    document.getElementById('task-title').value = textoTarea.toUpperCase();
    
    const selectorTipo = document.getElementById('task-type');
    if (orden.includes("llamar")) {
      selectorTipo.value = "llamada";
    } else if (orden.includes("pagar") || orden.includes("factura")) {
      selectorTipo.value = "factura";
    } else {
      selectorTipo.value = "tramite";
    }

    // Ponemos la fecha de hoy por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('task-date').value = hoy;

    // Guardamos la tarea ejecutando tu formulario original automáticamente
    const formulario = document.getElementById('task-form');
    formulario.requestSubmit(); 

    // El asistente te responde hablando
    asistenteHabla(`Tarea guardada con éxito: ${textoTarea}. Te avisaré media hora antes del vencimiento.`);

    // Programamos la alerta interna de 30 minutos
    programarAvisoMediaHoraAntes(textoTarea);
  } 
  
  // DETECTAR LLAMADAS
  else if (orden.includes("llamar a")) {
    const contacto = orden.replace("llamar a", "").trim();
    asistenteHabla(`Marcando a ${contacto}`);
    window.location.href = `tel:${contacto}`;
  } 
  
  else {
    asistenteHabla("Registré tu orden, pero aún no sé cómo ejecutar esa acción.");
  }
}

// =======================================================
// SISTEMA DE ALERTAS (30 MINUTOS ANTES)
// =======================================================
function programarAvisoMediaHoraAntes(nombreTarea) {
  const ahora = new Date();
  const horaVencimiento = new Date();
  
  // Ponemos hora de vencimiento por defecto a las 6:00 PM de hoy
  horaVencimiento.setHours(18, 0, 0); 

  // Restamos 30 minutos al vencimiento
  const tiempoAlerta = horaVencimiento.getTime() - (30 * 60 * 1000); 
  const tiempoEspera = tiempoAlerta - ahora.getTime();

  if (tiempoEspera > 0) {
    setTimeout(() => {
      // El teléfono habla solo cuando se cumple el tiempo
      const aviso = new SpeechSynthesisUtterance(`Atención. Tu tarea: ${nombreTarea}, vencerá en treinta minutos.`);
      aviso.lang = 'es-ES';
      window.speechSynthesis.speak(aviso);
      
      alert(`⏰ Alerta de Asistente: "${nombreTarea}" vence en 30 minutos.`);
    }, tiempoEspera);
  }
}
