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