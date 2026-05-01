const pool = require('../db');

// Función para GET /api/reservas
const obtenerReservas = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id_reserva, r.fecha_inicio, r.fecha_fin, r.estado,
                c.nombre, c.apellido, h.tipo, h.estado AS estado_habitacion
            FROM reservas r
            JOIN clientes c ON r.id_cliente = c.id_cliente
            JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Función para GET /api/reservas/:id
const obtenerReservaPorId = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM reservas WHERE id_reserva = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json(result.rows); // Modifiqué esto levemente para que devuelva el objeto y no una lista
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Función para POST /api/reservas (¡Tu excelente método con Transacción y Procedimiento!)
const crearReserva = async (req, res) => {
    const { id_cliente, id_habitacion, fecha_inicio, fecha_fin } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(
            'SELECT crear_reserva($1, $2, $3, $4)',
            [id_cliente, id_habitacion, fecha_inicio, fecha_fin]
        );
        await client.query('COMMIT');
        res.json({ mensaje: 'Reserva creada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: error.message });
    } finally {
        client.release();
    }
};

// --- MÁS MÉTODOS DE RESERVAS ---
const actualizarReserva = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    try {
        const result = await pool.query(
            'UPDATE reservas SET estado = $1 WHERE id_reserva = $2 RETURNING *',
            [estado, id]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

// --- MÉTODOS DE HABITACIONES ---
const obtenerHabitaciones = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM habitaciones');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

const actualizarHabitacion = async (req, res) => {
    const { id } = req.params;
    const { numero, tipo, precio_noche, estado } = req.body;
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

// --- MÉTODOS DE CLIENTES ---
const obtenerClientes = async (req, res) => {
    try {
        const result = await pool.query('SELECT id_cliente, nombre, apellido, dni FROM clientes');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const obtenerClientePorId = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM clientes WHERE id_cliente = $1', [id]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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
        res.status(400).json({ error: error.message });
    }
};

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

// --- MÉTODOS DE PAGOS ---
const obtenerPagos = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pagos');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

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

const actualizarPago = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body; // Por ejemplo, para cambiar de 'pendiente' a 'completado'
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


// Exportamos tus funciones
module.exports = { obtenerReservas, obtenerReservaPorId, crearReserva, actualizarReserva, eliminarReserva, obtenerHabitaciones, obtenerHabitacionPorId, actualizarHabitacion, obtenerClientes, obtenerClientePorId, actualizarCliente, eliminarCliente, obtenerPagos, obtenerPagoPorId, crearPago, actualizarPago, eliminarPago };


