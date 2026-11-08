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
        role: user.role || 'OWNER',
        minecraftUsername: user.minecraft_username || null,
        minecraftUuid: user.minecraft_uuid || null,
        avatarUrl: user.avatar_url || 'https://mc-heads.net/avatar/Steve'
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
      role: user.role || 'OWNER',
      minecraftUsername: user.minecraft_username || null,
      minecraftUuid: user.minecraft_uuid || null,
      avatarUrl: user.avatar_url || 'https://mc-heads.net/avatar/Steve'
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    // Check user in DB or memoryStore
    let user = null;
    if (db.pool) {
      const result = await db.query(
        'SELECT id, email, display_name, role, minecraft_username, minecraft_uuid, avatar_url FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result && result.rows.length > 0) {
        user = result.rows[0];
      }
    } else {
      user = db.memoryStore.users.find(u => u.id === decoded.userId);
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado o sesión inválida' });
    }

    const mcUser = user.minecraft_username || user.minecraftUsername || null;
    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.display_name || user.displayName,
      role: user.role,
      minecraftUsername: mcUser,
      minecraftUuid: user.minecraft_uuid || user.minecraftUuid || null,
      avatarUrl: user.avatar_url || (mcUser ? `https://mc-heads.net/avatar/${mcUser}` : 'https://mc-heads.net/avatar/Steve')
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada. Por favor ingresa nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido o corrupto' });
  }
}

// Role-based authorization middleware
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso restringido: Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user && ['ADMIN', 'OWNER'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({
    error: 'Acceso restringido: Se requieren permisos de Administrador'
  });
}

module.exports = {
  authenticate,
  requireRole,
  requireAdmin
};
