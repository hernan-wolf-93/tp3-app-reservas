const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    // 1. Buscamos el token en el header "Authorization"
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(403).json({ error: 'Acceso denegado: No se envió el token' });
    }

    // 2. El formato esperado por tu TP es "Bearer <token>", así que lo separamos [3]
    const token = authHeader.split(' ')[4];

    if (!token) {
        return res.status(403).json({ error: 'Formato de token inválido' });
    }

    try {
        // 3. Verificamos si el token es real y no fue falsificado usando tu palabra secreta
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        req.usuario = payload; // Guardamos los datos del cliente logueado para usarlos después
        next(); // ¡El token es válido! Dejamos pasar la petición a la ruta
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};  

module.exports = verificarToken;

// --- EJEMPLO DE USO EN UNA RUTA PROTEGIDA ---
// router.get('/ruta-protegida', verificarToken, (req, res) => {
//     res.json({ mensaje: '¡Accediste a una ruta protegida!', usuario: req.usuario });
// });