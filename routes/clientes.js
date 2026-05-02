const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth'); // Importamos el middleware JWT
// Importamos solo los controladores que necesita este router (desestructuración)
const { obtenerClientes, obtenerClientePorId, actualizarCliente, eliminarCliente } = require('../controllers/controllers'); 

// router.use() aplica verificarToken a TODAS las rutas definidas abajo en este archivo.
// Es equivalente a poner verificarToken como argumento en cada router.get/put/delete,
// pero más limpio cuando todas las rutas del archivo requieren autenticación.
router.use(verificarToken);

// Cada línea mapea un método HTTP + URL a su función controladora correspondiente
router.get('/', obtenerClientes);         // GET    /api/clientes
router.get('/:id', obtenerClientePorId);  // GET    /api/clientes/:id
router.put('/:id', actualizarCliente);    // PUT    /api/clientes/:id
router.delete('/:id', eliminarCliente);   // DELETE /api/clientes/:id

module.exports = router; // Se monta en app.js bajo el prefijo /api/clientes