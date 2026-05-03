require('dotenv').config(); // Carga las variables de entorno desde el archivo .env
const express = require('express');
const router = express.Router(); // Router independiente: sus rutas se montan bajo un prefijo en app.js
const pool = require('../db');
const bcrypt = require('bcryptjs'); // Librería para hashear y comparar contraseñas de forma segura
const jwt = require('jsonwebtoken'); // Librería para generar y verificar tokens JWT

// --- RUTAS DE AUTENTICACIÓN ---

// POST /api/auth/register — Registra un nuevo cliente en el sistema
router.post('/register', async (req, res) => {
    const { nombre, apellido, dni, password } = req.body; 
    
    try {
        // El salt es un valor aleatorio que se mezcla con la contraseña antes de hashear.
        // El número 10 es el "costo": cuántas rondas de encriptación se aplican.
        // Más alto = más seguro pero más lento. 10 es el estándar recomendado.
        const salt = await bcrypt.genSalt(10);

        // hash() combina la contraseña en texto plano con el salt y genera el hash final.
        // Este hash es lo que se guarda en la BD: la contraseña original NUNCA se almacena.
        const password_hash = await bcrypt.hash(password, salt);

        // RETURNING omite password_hash para no devolverlo en la respuesta
        const result = await pool.query(
            'INSERT INTO clientes (nombre, apellido, dni, password_hash) VALUES ($1, $2, $3, $4) RETURNING id_cliente, nombre, apellido, dni',
            [nombre, apellido, dni, password_hash]
        );

        res.status(201).json({ // 201 Created: indica que se creó un recurso nuevo
            mensaje: 'Cliente registrado con éxito', 
            cliente: result.rows 
        });
    } catch (error) {
        // PostgreSQL lanza un error si el DNI ya existe (restricción UNIQUE en la tabla).
        // Ese mensaje llega al cliente para informar el conflicto.
        res.status(500).json({ error: error.message });
    }
});

// POST /api/auth/login — Autentica un cliente y devuelve un token JWT
router.post('/login', async (req, res) => {
    const { dni, password } = req.body;

    // Logs de depuración: útiles durante el desarrollo para verificar qué llega al servidor.
    // En producción deberían eliminarse para no exponer datos sensibles en los logs.
    console.log('DNI recibido:', dni);
    console.log('Password recibido:', password);

    try {
        // Buscamos al cliente por DNI para obtener su hash y demás datos
        const result = await pool.query('SELECT * FROM clientes WHERE dni = $1', [dni]);

        console.log('Resultado query:', result.rows);
        console.log('password_hash:', result.rows[0]?.password_hash); // ?. evita error si no hay resultado

        if (result.rows.length === 0) {
            // DNI no encontrado: respondemos con 401 (No autorizado)
            // Nota: en producción conviene un mensaje genérico como "Credenciales inválidas"
            // para no revelar si el DNI existe o no en el sistema
            return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado)' });
        }

        const cliente = result.rows[0];

        // bcrypt.compare() hashea la contraseña recibida y la compara con el hash guardado.
        // No es posible "desencriptar" el hash: la comparación siempre se hace en esta dirección.
        const passwordValida = await bcrypt.compare(password, cliente.password_hash);

        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales inválidas (contraseña incorrecta)' });
        }

        // Credenciales válidas: generamos el token JWT con jwt.sign()
        const token = jwt.sign(
            // Payload: datos que viajan dentro del token y estarán disponibles en req.user
            // tras pasar por el middleware verificarToken. NO incluir datos sensibles acá.
            { id_cliente: cliente.id_cliente, dni: cliente.dni },
            process.env.JWT_SECRET, // Clave secreta para firmar: si cambia, todos los tokens quedan inválidos
            { expiresIn: '2h' }     // El token expira en 2 horas: el usuario deberá volver a loguearse
        );

        // Devolvemos el token al frontend, que lo guardará en localStorage
        res.json({
            mensaje: 'Login exitoso',
            token: token
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; // Exportamos el router para montarlo en app.js con un prefijo