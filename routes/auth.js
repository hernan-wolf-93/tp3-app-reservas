require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- RUTAS DE AUTENTICACIÓN ---

// Endpoint de Registro de Usuario
router.post('/register', async (req, res) => {
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
router.post('/login', async (req, res) => {
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

module.exports = router;