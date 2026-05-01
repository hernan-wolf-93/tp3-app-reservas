const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth'); 
const { obtenerHabitaciones, obtenerHabitacionPorId, actualizarHabitacion } = require('../controllers/controllers'); 

router.use(verificarToken); // Candado JWT para proteger las habitaciones

router.get('/', obtenerHabitaciones);
router.get('/:id', obtenerHabitacionPorId);
router.put('/:id', actualizarHabitacion);

module.exports = router;