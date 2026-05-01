const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth'); 
const { obtenerPagos, obtenerPagoPorId, crearPago, actualizarPago, eliminarPago } = require('../controllers/controllers'); 

// Candado JWT para proteger los pagos
router.use(verificarToken); 

router.get('/', obtenerPagos);
router.get('/:id', obtenerPagoPorId);
router.post('/', crearPago);
router.put('/:id', actualizarPago);
router.delete('/:id', eliminarPago);

module.exports = router;