require('dotenv').config(); // Lee el archivo .env y carga las variables en process.env
const { Pool } = require('pg'); // Pool es la clase de 'pg' (node-postgres) para manejar conexiones

// Creamos el pool de conexiones usando las variables de entorno definidas en .env
// Un pool mantiene varias conexiones abiertas y las reutiliza, evitando abrir/cerrar
// una conexión nueva en cada consulta (más eficiente y rápido)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Las credenciales vienen del .env y nunca se escriben directamente en el código
    // Esto es importante: el .env NO se sube al repositorio (está en .gitignore)
});

module.exports = pool; // Exportamos el pool para usarlo en cualquier parte del proyecto