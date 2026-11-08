require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'mc_desk_dev_secret_change_in_production_key_123',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  agentSharedSecret: process.env.AGENT_SHARED_SECRET || 'agent_shared_secret_default',
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',

  // Configuración de conexión remota al Servidor Minecraft (SSH Bridge)
  mcRemoteHost: process.env.MC_REMOTE_HOST || '',
  mcRemoteUser: process.env.MC_REMOTE_USER || 'mcadmin',
  mcRemotePass: process.env.MC_REMOTE_PASS || '',
  mcServerDir: process.env.MC_SERVER_DIR || '/home/mcadmin/minecraft',
  mcBackupsDir: process.env.MC_BACKUPS_DIR || '/home/mcadmin/backups',
  mcCollectorScript: process.env.MC_COLLECTOR_SCRIPT || '/home/mcadmin/mc_desk_collector.py',
  mcSocketPath: process.env.MC_SOCKET_PATH || '/tmp/ssh_mux_mcserver',
  mcServerName: process.env.MC_SERVER_NAME || 'Minecraft Server',
  mcMinecraftPublicIp: process.env.MC_MINECRAFT_PUBLIC_IP || ''
};
