const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. Buscamos el token en el header 'Authorization'
    const authHeader = req.header('Authorization');
    
    // Si no hay header, lo rebotamos
    if (!authHeader) {
        return res.status(401).json({ error: 'Acceso denegado: No se envió el token' });
    }

    // 2. Verificamos que empiece con "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ error: 'Formato de token inválido. Debe ser: Bearer <token>' });
    }

    // 3. Separamos la palabra "Bearer" del token real (el que empieza con eyJ)
    const token = authHeader.split(' ')[1];

    try {
        // 4. Verificamos que el token sea auténtico usando tu secreto
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verificado; // Guardamos los datos del usuario en la petición
        next(); // ¡Le abrimos la puerta para que pase a la ruta!
    } catch (error) {
        res.status(401).json({ error: 'Token no válido o expirado' });
    }
};

module.exports = verificarToken;

// --- EJEMPLO DE USO EN UNA RUTA PROTEGIDA ---
// router.get('/ruta-protegida', verificarToken, (req, res) => {
//     res.json({ mensaje: '¡Accediste a una ruta protegida!', usuario: req.usuario });
// });