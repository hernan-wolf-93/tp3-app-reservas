const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth'); 
const { obtenerClientes, obtenerClientePorId, actualizarCliente, eliminarCliente } = require('../controllers/controllers'); 

router.use(verificarToken); // Candado JWT para proteger los clientes

router.get('/', obtenerClientes);
router.get('/:id', obtenerClientePorId);
router.put('/:id', actualizarCliente);
router.delete('/:id', eliminarCliente);

module.exports = router;