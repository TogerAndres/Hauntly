require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'mc_desk_dev_secret_change_in_production_key_123',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  agentSharedSecret: process.env.AGENT_SHARED_SECRET || 'agent_shared_secret_default',
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',

  // Servidor informativo y conectividad pública
  mcServerName: process.env.MC_SERVER_NAME || 'Minecraft Server',
  mcMinecraftPublicIp: process.env.MC_MINECRAFT_PUBLIC_IP || ''
};
