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
  if (e) e.preventDefault();

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

  const eTotal = document.getElementById('total-tasks');
  const eCompleted = document.getElementById('completed-tasks');
  const ePending = document.getElementById('pending-tasks');
  const eOverdue = document.getElementById('overdue-tasks');

  if (eTotal) eTotal.textContent = totalTasks;
  if (eCompleted) eCompleted.textContent = completedTasks;
  if (ePending) ePending.textContent = pendingTasks;
  if (eOverdue) eOverdue.textContent = overdueTasks;
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
      } catch (error) {
        console.log("El reconocimiento ya estaba activo.");
      }
    });
  }

  recognition.onresult = (event) => {
    const comando = event.results[0][0].transcript.toLowerCase();
    if (textoEscuchado) textoEscuchado.innerText = `Entendido: "${comando}"`;
    restaurarBoton(botonVoz);
    procesarComando(comando);
  };

  recognition.onerror = () => {
    if (textoEscuchado) textoEscuchado.innerText = "No logré escucharte bien. ¡Intenta de nuevo!";
    restaurarBoton(botonVoz);
  };

  recognition.onend = () => {
    restaurarBoton(botonVoz);
  };
}

function restaurarBoton(boton) {
  if (boton) {
    boton.style.boxShadow = "0 8px 18px rgba(0, 180, 219, 0.35)";
    boton.style.background = "linear-gradient(135deg, #00b4db 0%, #0083b0 100%)";
  }
}

// =======================================================
// CEREBRO DE COMANDOS DE VOZ Y DIÁLOGO LOGRADO
// =======================================================
function procesarComando(orden) {
  
  function asistenteHabla(texto) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const mensajeVoz = new SpeechSynthesisUtterance(texto);
      mensajeVoz.lang = 'es-ES';
      mensajeVoz.volume = 1;
      mensajeVoz.rate = 1;
      window.speechSynthesis.speak(mensajeVoz);
    }
  }

  if (orden.includes("recordar") || orden.includes("tarea") || orden.includes("trámite") || orden.includes("pagar")) {
    const textoTarea = orden.replace("recordar", "").replace("tarea", "").trim();
    
    if (textoTarea === "") {
      asistenteHabla("Por favor, dime qué tarea deseas que guarde.");
      return;
    }

    const campoTitulo = document.getElementById('task-title');
    if (campoTitulo) campoTitulo.value = textoTarea.toUpperCase();
    
    const selectorTipo = document.getElementById('task-type');
    if (selectorTipo) {
      if (orden.includes("llamar")) {
        selectorTipo.value = "llamada";
      } else if (orden.includes("pagar") || orden.includes("factura")) {
        selectorTipo.value = "factura";
      } else {
        selectorTipo.value = "tramite";
      }
    }

    const hoy = new Date().toISOString().split('T')[0];
    const campoFecha = document.getElementById('task-date');
    if (campoFecha) campoFecha.value = hoy;

    // Llamamos directamente a la función existente addTask pasándole un evento nulo falso
    addTask(null);

    asistenteHabla(`Tarea guardada con éxito: ${textoTarea}. Te avisaré media hora antes del vencimiento.`);
    programarAvisoMediaHoraAntes(textoTarea);
  } 
  else if (orden.includes("llamar a")) {
    const contacto = orden.replace("llamar a", "").trim();
    asistenteHabla(`Marcando a ${contacto}`);
    setTimeout(() => {
      window.location.href = `tel:${contacto}`;
    }, 1500);
  } 
  else {
    asistenteHabla("Registré tu orden, pero aún no sé cómo ejecutar esa acción.");
  }
}

function programarAvisoMediaHoraAntes(nombreTarea) {
  const ahora = new Date();
  const horaVencimiento = new Date();
  
  // Vencimiento simulado a las 18:00 hs de hoy
  horaVencimiento.setHours(18, 0, 0); 

  const tiempoAlerta = horaVencimiento.getTime() - (30 * 60 * 1000); 
  const tiempoEspera = tiempoAlerta - ahora.getTime();

  if (tiempoEspera > 0) {
    setTimeout(() => {
      if ('speechSynthesis' in window) {
        const aviso = new SpeechSynthesisUtterance(`Atención. Tu tarea: ${nombreTarea}, vencerá en treinta minutos.`);
        aviso.lang = 'es-ES';
        window.speechSynthesis.speak(aviso);
      }
      alert(`⏰ Alerta de Asistente: "${nombreTarea}" vence en 30 minutos.`);
    }, tiempoEspera);
  }
}
// =======================================================
// ACTIVAR TARJETAS DE ACCESO RÁPIDO (FILTROS AL TOCAR)
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
  // Buscamos las tarjetas en la pantalla (asumiendo que tienen estos IDs o clases)
  // Nota: Para asegurar que funcione, puedes buscar en tu HTML si las tarjetas tienen ID o definirlos aquí
  const tarjetas = document.querySelectorAll('.action-card');
  const selectorFiltro = document.getElementById('filter-type');

  tarjetas.forEach(tarjeta => {
    tarjeta.addEventListener('click', () => {
      const textoTarjeta = tarjeta.innerText.toLowerCase();
      
      // Si la tarjeta que tocaste habla de "pagar" o "factura"
      if (textoTarjeta.includes('pagar') || textoTarjeta.includes('factura')) {
        if (selectorFiltro) {
          // Si ya estaba filtrado por factura, limpiamos el filtro. Si no, lo activamos.
          selectorFiltro.value = selectorFiltro.value === 'factura' ? '' : 'factura';
        }
      } 
      // Si la tarjeta habla de "llamar" o "contacto"
      else if (textoTarjeta.includes('llamar') || textoTarjeta.includes('contacto')) {
        if (selectorFiltro) {
          selectorFiltro.value = selectorFiltro.value === 'llamada' ? '' : 'llamada';
        }
      }

      // Le avisamos a tu función original de filtrar que haga la magia en la pantalla
      if (typeof filterTasks === 'function') {
        filterTasks();
      }

      // Efecto visual rápido de selección (opcional)
      tarjetas.forEach(t => t.style.borderColor = '#edf2f7');
      if (selectorFiltro && selectorFiltro.value !== '') {
        tarjeta.style.borderColor = '#0083b0';
      }
    });
  });
