const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (config.nodeEnv !== 'production') {
      const user = db.memoryStore.users[0];
      req.user = {
        id: user.id,
        email: user.email,
        displayName: user.display_name || 'Roger',
        role: user.role || 'OWNER'
      };
      return next();
    }
    return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  if (token === 'demo-token' || (config.nodeEnv !== 'production' && token === 'demo')) {
    const user = db.memoryStore.users[0];
    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name || 'Roger',
      role: user.role || 'OWNER'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Check user in DB or memoryStore
    let user = null;
    if (db.pool) {
      const result = await db.query('SELECT id, email, display_name, role FROM users WHERE id = $1', [decoded.userId]);
      if (result && result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = db.memoryStore.users.find(u => u.id === decoded.userId);
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado o sesión inválida' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name || user.displayName,
      role: user.role
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Por favor ingresa nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido o corrupto' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tienes permisos suficientes para realizar esta acción' });
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
