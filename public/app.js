// ==========================================
// LÓGICA DE LOGIN
// ==========================================
const formLogin = document.getElementById('form-login');

// VERIFICAMOS SI ESTAMOS EN LA PÁGINA DE LOGIN
if (formLogin) { 
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const dni = document.getElementById('dni').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('¡Login exitoso!');
                localStorage.setItem('token', data.token); // Guardamos el token [cite: 34]
                window.location.href = 'reservas.html';    // Redirigimos al panel
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error de conexión:', error);
        }
    });
}

// ==========================================
// LÓGICA DE REGISTRO
// ==========================================
const formRegister = document.getElementById('form-register');

// VERIFICAMOS SI ESTAMOS EN LA PÁGINA DE REGISTRO
if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('nombre').value;
        const apellido = document.getElementById('apellido').value;
        const dni = document.getElementById('dni').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, apellido, dni, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('¡Registro exitoso!');
                window.location.href = 'index.html'; // Redirigimos al login
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error de conexión:', error);
        }
    });
}

// ==========================================
// LÓGICA DEL PANEL DE RESERVAS
// ==========================================

// 1. CERRAR SESIÓN
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token'); // Borramos la llave
        window.location.href = 'index.html'; // Lo pateamos al login
    });
}

// 2. OBTENER Y MOSTRAR DATOS (Requiere Token)
async function cargarDatosProtegidos() {
    const listaDatos = document.getElementById('lista-datos');
    
    // Si no estamos en la página de reservas, no ejecutamos esto
    if (!listaDatos) return; 

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Acceso denegado. Por favor, inicia sesión.');
        window.location.href = 'index.html';
        return;
    }

    try {
        // Hacemos el GET enviando el token en el header (Requisito clave del TP)
        const response = await fetch('/api/reservas', { // <-- TIENE QUE DECIR /api/reservas
        method: 'GET',
        headers: {
        'Authorization': `Bearer ${token}`
    }
});

        const data = await response.json();

        if (response.ok) {
            // Limpiamos el texto de "Cargando..."
            listaDatos.innerHTML = ''; 

        data.forEach(item => {
            const div = document.createElement('div');
    
        // Armamos una variable para el botón dependiendo del estado
            let botonAccion = '';
        if (item.estado === 'confirmada') {
            botonAccion = `<button onclick="cancelarReserva(${item.id_reserva})" style="margin-top: 10px; color: red; cursor: pointer;">Cancelar Reserva</button>`;
        } else {
            botonAccion = `<button disabled style="margin-top: 10px; color: gray; cursor: not-allowed;">Reserva ${item.estado}</button>`;
        }

        div.innerHTML = `
            <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
                <strong>Reserva #${item.id_reserva}</strong><br>
                Cliente: ${item.nombre} ${item.apellido}<br>
                Habitación: ${item.tipo} (Estado actual: ${item.estado_habitacion})<br>
                Fechas: ${item.fecha_inicio.split('T')[0]} al ${item.fecha_fin.split('T')[0]}<br>
                Estado de reserva: <strong>${item.estado}</strong><br>
            
                <!-- Inyectamos el botón que armamos arriba -->
                ${botonAccion}
            </div>
        `;
    listaDatos.appendChild(div);
});
        } else {
            listaDatos.innerHTML = `<p>Error al cargar datos: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Ejecutamos la función de cargar datos ni bien carga el script
cargarDatosProtegidos();

// 3. CREAR NUEVA RESERVA (Requiere Token)
const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const id_habitacion = document.getElementById('id_habitacion').value;
        const fecha_inicio = document.getElementById('fecha_inicio').value;
        const fecha_fin = document.getElementById('fecha_fin').value;

        try {
            const response = await fetch('/api/reservas', { // ⚠️ Cambiá por tu ruta POST real
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Mandamos el token para que nos deje crear
                },
                body: JSON.stringify({ id_habitacion, fecha_inicio, fecha_fin })
            });

            if (response.ok) {
                alert('¡Reserva creada con éxito!');
                formReserva.reset(); // Limpiamos el formulario
                cargarDatosProtegidos(); // Volvemos a cargar la lista para ver el cambio
            } else {
                const errorData = await response.json();
                alert('Error al reservar: ' + errorData.error);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

async function cancelarReserva(id_reserva) {
    const token = localStorage.getItem('token');
    
    // Hacemos una petición PUT a tu endpoint de actualización
    const response = await fetch(`/api/reservas/${id_reserva}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: 'cancelada' }) // Le pasamos el nuevo estado
    });

    if (response.ok) {
        alert('Reserva cancelada.');
        cargarDatosProtegidos(); // Volvemos a cargar la lista para ver los cambios
    } else {
        alert('Hubo un error al cancelar.');
    }
}