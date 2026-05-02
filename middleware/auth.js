const jwt = require('jsonwebtoken');

// Middleware de autenticación: se ejecuta ANTES del controlador en las rutas protegidas.
// Su trabajo es validar el token JWT y, si es válido, dejar pasar la solicitud (next()).
// Si algo falla, corta el flujo y responde con error sin llegar nunca al controlador.
const verificarToken = (req, res, next) => {
    // Buscamos el token en el header 'Authorization' de la solicitud HTTP
    const authHeader = req.header('Authorization');
    
    // Si no hay header de autorización, rechazamos con 401 (No autorizado)
    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado: No se envió el token' });
    }

    // El estándar Bearer exige el formato: "Bearer <token>"
    // Si no cumple ese formato, rechazamos con 400 (Solicitud mal formada)
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ error: 'Formato de token inválido. Debe ser: Bearer <token>' });
    }

    // Separamos "Bearer" del token real con split(' ') y tomamos el índice [1]
    // Ejemplo: "Bearer eyJhbGci..." → ["Bearer", "eyJhbGci..."] → tomamos [1]
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify() hace dos cosas a la vez:
        // 1. Comprueba que el token fue firmado con nuestro JWT_SECRET (auténtico)
        // 2. Comprueba que no esté expirado
        // Si todo está bien, devuelve el payload (los datos que guardamos al hacer login)
        const verificado = jwt.verify(token, process.env.JWT_SECRET);

        // Adjuntamos el payload decodificado a req.user para que el controlador
        // siguiente pueda acceder a los datos del usuario (ej: req.user.id_cliente)
        req.user = verificado;

        next(); // Pasamos el control al siguiente middleware o al controlador de la ruta
    } catch (error) {
        // jwt.verify() lanza una excepción si el token es inválido o expiró
        res.status(401).json({ error: 'Token no válido o expirado' });
    }
};

module.exports = verificarToken;

// --- EJEMPLO DE USO EN UNA RUTA PROTEGIDA ---
// Al poner verificarToken como segundo argumento, Express lo ejecuta primero.
// Solo si next() es llamado, se ejecuta el callback final con la lógica de la ruta.
// router.get('/ruta-protegida', verificarToken, (req, res) => {
//     res.json({ mensaje: '¡Accediste a una ruta protegida!', usuario: req.user });
// });