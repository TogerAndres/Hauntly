const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const path = require('path');
const fs = require('fs');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const playerRoutes = require('./routes/players');
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agent');
const itemRoutes = require('./routes/items');

const app = express();

// Security and Logging Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://mc-heads.net", "https://crafatar.com"],
        connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "http://11.11.19.108:*", "http://100.78.40.92:*"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server agent)
    if (!origin) return callback(null, true);
    if (config.frontendOrigin === '*' || config.frontendOrigin === origin) {
      return callback(null, true);
    }
    // Allow localhost during dev
    if (config.nodeEnv !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    return callback(new Error('Bloqueado por política CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// General Rate Limiting for all /api endpoints
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'MC-Desk API'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'MC-Desk API',
    version: '1.0.0',
    documentation: '/api/docs',
    status: 'online'
  });
});

// Public Agent Installer Downloads
app.get('/install.sh', (req, res) => {
  const installPath = path.join(__dirname, '../../server-agent/install.sh');
  if (fs.existsSync(installPath)) {
    res.setHeader('Content-Type', 'text/x-shellscript');
    return res.sendFile(installPath);
  }
  res.status(404).send('# Error: install.sh no encontrado');
});

app.get('/agent.py', (req, res) => {
  const agentPath = path.join(__dirname, '../../server-agent/agent.py');
  if (fs.existsSync(agentPath)) {
    res.setHeader('Content-Type', 'text/x-python');
    return res.sendFile(agentPath);
  }
  res.status(404).send('# Error: agent.py no encontrado');
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/servers/:serverId/players', playerRoutes);
app.use('/api/servers/:serverId/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/items', itemRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler (Sanitizes stack traces and database internal errors)
app.use((err, req, res, next) => {
  console.error('[MC-Desk Error]', err);
  const statusCode = err.status || 500;
  const isProd = config.nodeEnv === 'production';

  res.status(statusCode).json({
    error: isProd && statusCode === 500 ? 'Ocurrió un error interno en el servidor' : (err.message || 'Error interno'),
    ...(!isProd && { stack: err.stack, details: err.details })
  });
});

// Server Initialization (Only listen when executed directly, allowing clean test importing)
const PORT = config.port;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`   🚀 MC-Desk Backend corriendo en puerto ${PORT}`);
    console.log(`   Ambiente: ${config.nodeEnv}`);
    console.log(`   Frontend permitido: ${config.frontendOrigin}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
