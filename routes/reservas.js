const express = require('express');
const router = express.Router();
const verificarToken = require('../middleware/auth');
// CRUD completo: las reservas son la entidad principal del sistema
const { obtenerReservas, obtenerReservaPorId, crearReserva, actualizarReserva, eliminarReserva } = require('../controllers/controllers'); 

// Protege todas las rutas de reservas con JWT
router.use(verificarToken);

router.get('/', obtenerReservas);           // GET    /api/reservas        — solo devuelve las del usuario autenticado (filtro por req.user)
router.get('/:id', obtenerReservaPorId);    // GET    /api/reservas/:id
router.post('/', crearReserva);             // POST   /api/reservas        — usa transacción + procedimiento almacenado
router.put('/:id', actualizarReserva);      // PUT    /api/reservas/:id    — usado para cancelar o hacer checkout desde el frontend
router.delete('/:id', eliminarReserva);     // DELETE /api/reservas/:id

module.exports = router; // Se monta en app.js bajo el prefijo /api/reservas