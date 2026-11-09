const rateLimit = require('express-rate-limit');

// Strict rate limit for login / register attempts (15 min window, 20 attempts)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de autenticación. Por seguridad, espera 15 minutos.'
  }
});

// General API rate limit (1 min window, 120 requests)
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de solicitudes superado. Por favor espera un momento.'
  }
});

// Agent rate limit (1 min window, 180 requests = up to 3 requests per second)
const agentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de telemetría de Agent excedido. Por favor ajusta la frecuencia.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  agentLimiter
};
