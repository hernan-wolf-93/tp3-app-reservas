const express = require('express');
require('dotenv').config(); // Carga el .env antes que cualquier otra cosa para que process.env esté disponible

const app = express(); // Creamos la instancia principal de la aplicación Express

// ============================================================
// MIDDLEWARES GLOBALES
// Se ejecutan en orden para TODAS las solicitudes entrantes,
// antes de llegar a cualquier ruta.
// ============================================================

app.use(express.json());        // Parsea el body de las solicitudes JSON (sin esto, req.body sería undefined)
app.use(express.static('public')); // Sirve los archivos estáticos de la carpeta /public (HTML, CSS, JS del frontend)

// ============================================================
// RUTAS
// Cada archivo de rutas maneja un recurso distinto de la API.
// ============================================================

const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const habitacionesRoutes = require('./routes/habitaciones');
const clientesRoutes = require('./routes/clientes');

// Ruta pública: no requiere token (acá viven /register y /login)
app.use('/api/auth', authRoutes);

// Rutas protegidas: el middleware verificarToken ya está aplicado dentro de cada archivo de rutas.
// El prefijo definido acá es el que completa la URL final:
// ej: '/api/reservas' + '/:id' (definido en el router) = '/api/reservas/:id'
app.use('/api/reservas', reservasRoutes);
app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/clientes', clientesRoutes);

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================

// Usa el PORT del .env si existe, o 3000 como fallback para desarrollo local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});