// ==========================================
// LÓGICA DE LOGIN
// ==========================================
const formLogin = document.getElementById('form-login');

// El if es necesario porque este script se carga en varias páginas.
// Si el elemento no existe en la página actual, no ejecutamos nada (evita errores).
if (formLogin) { 
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault(); // Cancelamos el comportamiento por defecto del form (recargar la página)
        const dni = document.getElementById('dni').value;
        const password = document.getElementById('password').value;

        try {
            // fetch() hace una petición HTTP asíncrona a nuestra API REST
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }, // Le avisamos que mandamos JSON
                body: JSON.stringify({ dni, password })           // Convertimos el objeto a texto JSON
            });

            const data = await response.json(); // Parseamos la respuesta de la API a objeto JS

            if (response.ok) { // response.ok es true si el status HTTP es 200-299
                localStorage.setItem('token', data.token); // Guardamos el JWT en el navegador
                window.location.href = 'reservas.html';    // Redirigimos al panel principal
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error de conexión:', error); // Solo se ejecuta si hay fallo de red
        }
    });
}

// ==========================================
// LÓGICA DE REGISTRO
// ==========================================
const formRegister = document.getElementById('form-register');

// Mismo patrón: verificamos si el formulario existe en esta página antes de usarlo
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
                window.location.href = 'index.html'; // Redirigimos al login para que inicie sesión
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

// CERRAR SESIÓN: simplemente borramos el token del localStorage y volvemos al login.
// Sin token no hay acceso, así de simple es el "logout" en JWT (no hay sesión en el servidor).
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

// Convierte el formato de fecha que devuelve PostgreSQL (ISO 8601) al formato legible DD-MM-YYYY
// Ejemplo: "2026-06-22T00:00:00.000Z" → "22-06-2026"
function cambiarFormatoFecha(fechaDesdeBD) {
    const soloFecha = fechaDesdeBD.split('T')[0];  // "2026-06-22T00:00:00.000Z" → "2026-06-22"
    const partes = soloFecha.split('-');            // "2026-06-22" → ["2026", "06", "22"]
    return `${partes[2]}-${partes[1]}-${partes[0]}`; // Rearmamos en orden DD-MM-YYYY
}

// Obtiene las reservas del usuario desde la API y las renderiza en el DOM
async function cargarDatosProtegidos() {
    const listaDatos = document.getElementById('lista-datos');
    
    // Si el contenedor no existe, no estamos en la página de reservas: salimos
    if (!listaDatos) return; 

    const token = localStorage.getItem('token');
    // Si no hay token guardado, el usuario no inició sesión: lo mandamos al login
    if (!token) {
        alert('Acceso denegado. Por favor, inicia sesión.');
        window.location.href = 'index.html';
        return;
    }

    try {
        // Enviamos el token en el header Authorization para pasar el middleware verificarToken
        const response = await fetch('/api/reservas', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Formato estándar Bearer exigido por el middleware
            }
        });

        const data = await response.json();

        if (response.ok) {
            listaDatos.innerHTML = ''; // Limpiamos el contenido anterior antes de renderizar

            data.forEach(item => {
                const div = document.createElement('div');
                
                // Lógica de botones según el estado de la reserva y la fecha actual
                const fechaActual = new Date();
                fechaActual.setHours(0, 0, 0, 0); // Normalizamos a medianoche para comparar solo días
                const fechaInicio = new Date(item.fecha_inicio);

                let botonesHTML = '';

                if (item.estado === 'confirmada') {
                    if (fechaActual < fechaInicio) {
                        // Reserva futura: se puede cancelar, checkout deshabilitado
                        botonesHTML = `
                            <button onclick="cambiarEstadoReserva(${item.id_reserva}, 'cancelada')" style="background-color: red; color: white;">Cancelar Reserva</button>
                            <button disabled style="background-color: gray; color: white; cursor: not-allowed;">Checkout (Aún no ingresa)</button>
                        `;
                    } else {
                        // Ya llegó o pasó la fecha de inicio: se puede hacer checkout, cancelar deshabilitado
                        botonesHTML = `
                            <button disabled style="background-color: gray; color: white; cursor: not-allowed;">Cancelar Reserva (Ya inició)</button>
                            <button onclick="cambiarEstadoReserva(${item.id_reserva}, 'finalizada')" style="background-color: green; color: white;">Realizar Checkout</button>
                        `;
                    }
                } else {
                    // Estado 'cancelada' o 'finalizada': no se puede hacer nada más
                    botonesHTML = `
                        <button disabled style="background-color: gray; color: white; cursor: not-allowed;">Reserva ${item.estado}</button>
                    `;
                }

                // Construimos el HTML de la tarjeta con los datos de la reserva
                div.innerHTML = `
                    <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px;">
                        <strong>Reserva #${item.id_reserva}</strong><br>
                        Cliente: ${item.nombre} ${item.apellido}<br>
                        Habitación: ${item.tipo} (Estado actual: ${item.estado_habitacion})<br>
                        Fechas: ${cambiarFormatoFecha(item.fecha_inicio)} al ${cambiarFormatoFecha(item.fecha_fin)}<br>
                        Estado de reserva: <strong>${item.estado}</strong><br>
                        <div style="margin-top: 15px;">
                            ${botonesHTML}
                        </div>
                    </div>
                `;
                listaDatos.appendChild(div); // Agregamos la tarjeta al contenedor en el DOM
            });
        } else {
            listaDatos.innerHTML = `<p>Error al cargar datos: ${data.error}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Llamamos a la función inmediatamente: cuando el script carga, ya busca y muestra las reservas
cargarDatosProtegidos();

// CREAR NUEVA RESERVA
const formReserva = document.getElementById('form-reserva');
if (formReserva) {
    formReserva.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        const id_habitacion = document.getElementById('id_habitacion').value;
        const fecha_inicio = document.getElementById('fecha_inicio').value;
        const fecha_fin = document.getElementById('fecha_fin').value;

        try {
            const response = await fetch('/api/reservas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Necesario para pasar el middleware
                },
                body: JSON.stringify({ id_habitacion, fecha_inicio, fecha_fin })
                // Nota: el id_cliente NO se manda desde acá, el backend lo extrae del token
            });

            if (response.ok) {
                alert('¡Reserva creada con éxito!');
                formReserva.reset();        // Limpiamos los campos del formulario
                cargarDatosProtegidos();    // Recargamos la lista para reflejar el cambio
            } else {
                const errorData = await response.json();
                alert('Error al reservar: ' + errorData.error);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// Cambia el estado de una reserva (a 'cancelada' o 'finalizada') mediante un PUT a la API.
// Se llama desde los botones generados dinámicamente en cargarDatosProtegidos()
async function cambiarEstadoReserva(id_reserva, nuevoEstado) {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/reservas/${id_reserva}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: nuevoEstado }) // Enviamos solo el campo a actualizar
    });

    if (response.ok) {
        alert(`La reserva ha sido ${nuevoEstado} exitosamente.`);
        cargarDatosProtegidos(); // Recargamos para que el botón cambie de estado visualmente
    } else {
        alert('Hubo un error al actualizar la reserva.');
    }
}