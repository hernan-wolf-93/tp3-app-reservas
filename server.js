require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

app.post('/api/clientes', async (req, res) => {
    const { nombre, apellido, dni, password_hash } = req.body;

    try {
    const result = await pool.query(
        'INSERT INTO clientes (nombre, apellido, dni, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
        [nombre, apellido, dni, password_hash]
    );

    res.json(result.rows[0]);

    } catch (error) {
    if (error.code === '23505') {
    return res.status(400).json({ error: 'El DNI ya existe' });
    }
    res.status(500).json({ error: 'Error del servidor' });
}
});

// --- RUTAS DE AUTENTICACIÓN ---

// Endpoint de Registro de Usuario
app.post('/api/auth/register', async (req, res) => {
    const { nombre, apellido, dni, password } = req.body; 
    
    try {
        // 1. Hashear (encriptar) la contraseña usando bcryptjs
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // 2. Guardar el cliente en la base de datos con la contraseña encriptada
        const result = await pool.query(
            'INSERT INTO clientes (nombre, apellido, dni, password_hash) VALUES ($1, $2, $3, $4) RETURNING id_cliente, nombre, apellido, dni',
            [nombre, apellido, dni, password_hash]
        );

        // Respondemos sin devolver el password_hash por seguridad
        res.status(201).json({ 
            mensaje: 'Cliente registrado con éxito', 
            cliente: result.rows 
        });
    } catch (error) {
        // Si el DNI ya existe, PostgreSQL tirará un error que capturamos aquí
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de Login de Usuario
app.post('/api/auth/login', async (req, res) => {
    const { dni, password } = req.body;

    console.log('DNI recibido:', dni);
    console.log('Password recibido:', password);

    try {
        const result = await pool.query('SELECT * FROM clientes WHERE dni = $1', [dni]);

        console.log('Resultado query:', result.rows);
        console.log('password_hash:', result.rows[0]?.password_hash);

        // Si no encuentra el DNI, cortamos acá
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado)' });
        }

        const cliente = result.rows[0];
        console.log('Datos del cliente:', cliente);
        console.log('password_hash:', cliente.password_hash);

        // 2. Comparar la contraseña enviada con la contraseña encriptada (hash) de la BD
        const passwordValida = await bcrypt.compare(password, cliente.password_hash);

        // Si las contraseñas no coinciden, cortamos acá
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas (contraseña incorrecta)' });
        }

        // 3. Generar el Token JWT
        // Usamos una clave secreta para firmarlo. 
        const token = jwt.sign(
            { id_cliente: cliente.id_cliente, dni: cliente.dni }, // Payload: los datos que guardamos dentro del token
            process.env.JWT_SECRET, // Firma secreta
            { expiresIn: '2h' } // Tiempo de validez del token
        );

        // 4. Devolver el token al usuario
        res.json({
            mensaje: 'Login exitoso',
            token: token
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes', async (req, res) => {
    try {
        const result = await pool.query('SELECT id_cliente, nombre, apellido, dni FROM clientes');
        res.json(result.rows);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;

    try {
    const result = await pool.query(
        'SELECT * FROM clientes WHERE id_cliente = $1',
        [id]
    );

    res.json(result.rows[0]);

    } catch (error) {
    res.status(500).json({ error: error.message });
    }
});

app.put('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, dni } = req.body;

    try {
    const result = await pool.query(
      'UPDATE clientes SET nombre = $1, apellido = $2, dni = $3 WHERE id_cliente = $4 RETURNING *',
        [nombre, apellido, dni, id]
    );

    res.json(result.rows[0]);

    } catch (error) {
    res.status(400).json({ error: error.message });
    }
});

app.delete('/api/clientes/:id', async (req, res) => {
    const { id } = req.params;

    try {
    const result = await pool.query(
        'DELETE FROM clientes WHERE id_cliente = $1 RETURNING *',
        [id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    }

    res.json({ mensaje: 'Cliente eliminado', cliente: result.rows[0] });

    } catch (error) {
    res.status(400).json({ error: error.message });
    }
});

app.post('/api/reservas', async (req, res) => {
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
});

app.get('/api/reservas', async (req, res) => {
    try {
    const result = await pool.query(`
        SELECT 
            r.id_reserva,
            r.fecha_inicio,
            r.fecha_fin,
            r.estado,
            c.nombre,
            c.apellido,
            h.tipo,
            h.estado AS estado_habitacion
        FROM reservas r
        JOIN clientes c ON r.id_cliente = c.id_cliente
        JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
    `);

    res.json(result.rows);

    } catch (error) {
    res.status(500).json({ error: error.message });
    }
});

// Obtener una reserva específica por ID
app.get('/api/reservas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM reservas WHERE id_reserva = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar el estado de una reserva (ej: confirmada, cancelada)
app.put('/api/reservas/:id', async (req, res) => {
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
});

// Eliminar una reserva
app.delete('/api/reservas/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM reservas WHERE id_reserva = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Reserva no encontrada' });
        res.json({ mensaje: 'Reserva eliminada', reserva: result.rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener todas las habitaciones
app.get('/api/habitaciones', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM habitaciones');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Obtener una habitación por ID
app.get('/api/habitaciones/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM habitaciones WHERE id_habitacion = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Habitación no encontrada' });
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar una habitación
app.put('/api/habitaciones/:id', async (req, res) => {
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
});

app.listen(3000, () => {
    console.log('Servidor corriendo en puerto 3000');
});