const pool = require('../db'); // Importamos el pool de conexiones a la base de datos PostgreSQL

// ============================================================
// CONTROLADORES DE RESERVAS
// Cada función maneja una ruta específica de la API REST.
// El objeto 'req' contiene los datos de la solicitud entrante,
// y 'res' se usa para enviar la respuesta al cliente.
// ============================================================

// GET /api/reservas — Devuelve SOLO las reservas del usuario autenticado
const obtenerReservas = async (req, res) => {
    // El middleware JWT ya validó el token y dejó los datos del usuario en req.user
    const id_cliente_logueado = req.user.id_cliente;

    try {
        // JOIN entre reservas, clientes y habitaciones para traer info completa
        // El WHERE filtra por el ID extraído del token: cada cliente solo ve sus reservas
        const result = await pool.query(
            `SELECT r.id_reserva, r.fecha_inicio, r.fecha_fin, r.estado, 
                c.nombre, c.apellido, h.tipo, h.estado AS estado_habitacion 
            FROM reservas r
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN habitaciones h ON r.id_habitacion = h.id_habitacion 
            WHERE r.id_cliente = $1
            ORDER BY r.id_reserva DESC`,
            [id_cliente_logueado] // $1 se reemplaza por este valor (evita SQL Injection)
        );
        res.json(result.rows); // Enviamos el array de resultados como JSON
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las reservas' });
    }
};

// GET /api/reservas/:id — Devuelve una reserva específica por su ID
const obtenerReservaPorId = async (req, res) => {
    const { id } = req.params; // Extraemos el parámetro :id de la URL
    try {
        const result = await pool.query('SELECT * FROM reservas WHERE id_reserva = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/reservas — Crea una nueva reserva usando una transacción y un procedimiento almacenado
const crearReserva = async (req, res) => {
    const { id_habitacion, fecha_inicio, fecha_fin } = req.body; // Datos enviados en el cuerpo del POST
    const id_cliente = req.user.id_cliente; // El ID del cliente se toma del token, no del body (seguridad)

    // Obtenemos una conexión dedicada del pool para manejar la transacción manualmente
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Iniciamos la transacción

        // Llamamos al procedimiento almacenado en PostgreSQL que contiene la lógica de negocio
        // (validaciones, inserción, cambio de estado de habitación, etc.)
        await client.query(
            'SELECT crear_reserva($1, $2, $3, $4)',
            [id_cliente, id_habitacion, fecha_inicio, fecha_fin]
        );

        await client.query('COMMIT'); // Si todo salió bien, confirmamos los cambios en la BD
        res.json({ mensaje: 'Reserva creada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK'); // Si algo falla, revertimos TODO (ningún cambio queda a medias)
        res.status(400).json({ error: error.message });
    } finally {
        client.release(); // Siempre liberamos la conexión de vuelta al pool, haya error o no
    }
};

// PUT /api/reservas/:id — Actualiza el estado de una reserva (ej: 'pendiente' -> 'confirmada')
const actualizarReserva = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const result = await pool.query(
            'UPDATE reservas SET estado = $1 WHERE id_reserva = $2 RETURNING *',
            [estado, id] // RETURNING * devuelve la fila modificada sin necesidad de otro SELECT
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/reservas/:id — Elimina una reserva por ID
const eliminarReserva = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM reservas WHERE id_reserva = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json({ mensaje: 'Reserva eliminada', reserva: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// CONTROLADORES DE HABITACIONES
// ============================================================

// GET /api/habitaciones — Devuelve todas las habitaciones
const obtenerHabitaciones = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM habitaciones');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/habitaciones/:id
const obtenerHabitacionPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM habitaciones WHERE id_habitacion = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/habitaciones/:id — Actualiza todos los campos de una habitación
const actualizarHabitacion = async (req, res) => {
    const { id } = req.params;
    const { numero, tipo, precio_noche, estado } = req.body; // Desestructuramos los campos del body
    try {
        const result = await pool.query(
            'UPDATE habitaciones SET numero = $1, tipo = $2, precio_noche = $3, estado = $4 WHERE id_habitacion = $5 RETURNING *',
            [numero, tipo, precio_noche, estado, id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// CONTROLADORES DE CLIENTES
// ============================================================

// GET /api/clientes — Devuelve solo los campos no sensibles (sin contraseña)
const obtenerClientes = async (req, res) => {
    try {
        // Seleccionamos columnas específicas para no exponer datos sensibles como la contraseña
        const result = await pool.query('SELECT id_cliente, nombre, apellido, dni FROM clientes');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/clientes/:id
const obtenerClientePorId = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM clientes WHERE id_cliente = $1', [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/clientes/:id — Actualiza los datos personales de un cliente
const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, dni } = req.body;
    try {
        const result = await pool.query(
            'UPDATE clientes SET nombre = $1, apellido = $2, dni = $3 WHERE id_cliente = $4 RETURNING *',
            [nombre, apellido, dni, id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(400).json({ error: error.message }); // 400: error de datos del cliente
    }
};

// DELETE /api/clientes/:id
const eliminarCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM clientes WHERE id_cliente = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        }
        res.json({ mensaje: 'Cliente eliminado', cliente: result.rows });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// ============================================================
// CONTROLADORES DE PAGOS
// ============================================================

// GET /api/pagos
const obtenerPagos = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pagos');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/pagos/:id
const obtenerPagoPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM pagos WHERE id_pago = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/pagos — Registra un nuevo pago vinculado a una reserva y habitación
const crearPago = async (req, res) => {
    const { id_reserva, id_habitacion, tipo, monto, fecha } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO pagos (id_reserva, id_habitacion, tipo, monto, fecha) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id_reserva, id_habitacion, tipo, monto, fecha]
        );
        res.json({ mensaje: 'Pago registrado', pago: result.rows });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// PUT /api/pagos/:id — Actualiza el estado de un pago (ej: 'pendiente' -> 'completado')
const actualizarPago = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const result = await pool.query(
            'UPDATE pagos SET estado = $1 WHERE id_pago = $2 RETURNING *',
            [estado, id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// DELETE /api/pagos/:id
const eliminarPago = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM pagos WHERE id_pago = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });
        res.json({ mensaje: 'Pago eliminado', pago: result.rows });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Exportamos todas las funciones para que el archivo de rutas pueda usarlas
module.exports = { obtenerReservas, obtenerReservaPorId, crearReserva, actualizarReserva, eliminarReserva, obtenerHabitaciones, obtenerHabitacionPorId, actualizarHabitacion, obtenerClientes, obtenerClientePorId, actualizarCliente, eliminarCliente, obtenerPagos, obtenerPagoPorId, crearPago, actualizarPago, eliminarPago };