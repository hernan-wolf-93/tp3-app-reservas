const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
// Importamos los 5 controladores: pagos tiene CRUD completo
const { obtenerPagos, obtenerPagoPorId, crearPago, actualizarPago, eliminarPago } = require('../controllers/controllers'); 

// Protege todas las rutas de pagos con JWT
router.use(verificarToken);

router.get('/', obtenerPagos);          // GET    /api/pagos
router.get('/:id', obtenerPagoPorId);   // GET    /api/pagos/:id
router.post('/', crearPago);            // POST   /api/pagos
router.put('/:id', actualizarPago);     // PUT    /api/pagos/:id
router.delete('/:id', eliminarPago);    // DELETE /api/pagos/:id
// A diferencia de habitaciones, pagos sí tiene CRUD completo (POST y DELETE incluidos)

module.exports = router; // Se monta en app.js bajo el prefijo /api/pagos