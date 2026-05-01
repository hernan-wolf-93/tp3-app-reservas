const express = require('express');
require('dotenv').config(); // Para leer las variables del archivo .env

const app = express();

// Middleware para que Express pueda leer los JSON que enviamos por el body
app.use(express.json()); 

// 1. IMPORTAMOS TODAS TUS RUTAS DESDE LA CARPETA 'routes'
const authRoutes = require('./routes/auth');
const reservasRoutes = require('./routes/reservas');
const habitacionesRoutes = require('./routes/habitaciones');
const clientesRoutes = require('./routes/clientes');

// 2. LE DECIMOS A EXPRESS QUÉ URL USAR PARA CADA ARCHIVO
// Rutas públicas (Registro y Login)
app.use('/api/auth', authRoutes);

// Rutas protegidas (El middleware JWT ya está adentro de estos archivos)
app.use('/api/reservas', reservasRoutes);
app.use('/api/habitaciones', habitacionesRoutes);
app.use('/api/clientes', clientesRoutes);

// 3. INICIAMOS EL SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
