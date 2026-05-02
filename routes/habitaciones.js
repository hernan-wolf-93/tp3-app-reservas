const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
// Solo se importan los 3 controladores que este router necesita
const { obtenerHabitaciones, obtenerHabitacionPorId, actualizarHabitacion } = require('../controllers/controllers'); 

// Protege todas las rutas de habitaciones con JWT
router.use(verificarToken);

router.get('/', obtenerHabitaciones);           // GET /api/habitaciones
router.get('/:id', obtenerHabitacionPorId);     // GET /api/habitaciones/:id
router.put('/:id', actualizarHabitacion);       // PUT /api/habitaciones/:id
// Nota: no hay DELETE ni POST porque las habitaciones son creadas y eliminadas
// directamente desde la BD, no desde la API

module.exports = router; // Se monta en app.js bajo el prefijo /api/habitaciones