const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth'); 
const { obtenerReservas, obtenerReservaPorId, crearReserva, actualizarReserva, eliminarReserva } = require('../controllers/controllers'); 

// Candado JWT: Todas las rutas de acá abajo exigirán el token
router.use(verificarToken); 

router.get('/', obtenerReservas);
router.get('/:id', obtenerReservaPorId);
router.post('/', crearReserva);
router.put('/:id', actualizarReserva); 
router.delete('/:id', eliminarReserva); 

module.exports = router;