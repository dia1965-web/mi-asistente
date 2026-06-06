// Seleccionar elementos de la pantalla
const form = document.getElementById('task-form');
const taskList = document.getElementById('task-list');

// Cargar tareas guardadas al abrir la app
document.addEventListener('DOMContentLoaded', displayTasks);

// Escuchar cuando el usuario hace clic en "Agregar Tarea"
form.addEventListener('submit', function(e) {
  e.preventDefault(); // Evita que la página se recargue

  // Crear el objeto de la tarea con lo que escribió el usuario
  const newTask = {
    id: Date.now(),
    title: document.getElementById('task-title').value,
    type: document.getElementById('task-type').value,
    date: document.getElementById('task-date').value
  };

  // Guardar en el almacenamiento del celular
  saveTask(newTask);
  
  // Refrescar la lista en pantalla
  displayTasks();

  // Limpiar el formulario
  form.reset();
});

// Función para guardar en LocalStorage
function saveTask(task) {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  tasks.push(task);
  localStorage.setItem('myTasks', JSON.stringify(tasks));
}

// Función para mostrar las tareas en pantalla
function displayTasks() {
  taskList.innerHTML = '';
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];

  // Ordenar tareas: las facturas primero por importancia
  tasks.sort((a, b) => (a.type === 'factura' ? -1 : 1));

  tasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.type}`;
    
    // Traducir el tipo para mostrarlo bonito
    let typeLabel = task.type === 'factura' ? '💵 Factura' : task.type === 'llamada' ? '📞 Llamada' : '🏢 Trámite';

    li.innerHTML = `
      <div class="task-info">
        <p class="title">${task.title}</p>
        <p class="date">📆 ${typeLabel} - Vence: ${task.date}</p>
      </div>
      <button class="btn-complete" onclick="deleteTask(${task.id})">✔ Hecho</button>
    `;
    taskList.appendChild(li);
  });
}

// Función para borrar/completar una tarea
function deleteTask(id) {
  let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];
  tasks = tasks.filter(task => task.id !== id);
  localStorage.setItem('myTasks', JSON.stringify(tasks));
  displayTasks();
}
