const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticateAgent } = require('../middleware/agentAuth');
const { agentLimiter } = require('../middleware/rateLimiter');
const { logAudit } = require('../services/auditService');

router.use(agentLimiter);

// 0. Public Ping / Connectivity Check (Allows installer and Agent to verify Render connectivity)
router.get('/ping', (req, res) => {
  res.json({
    status: 'online',
    service: 'MC-Desk Agent API',
    cloud: 'render-ready',
    version: '1.2.0',
    timestamp: new Date().toISOString()
  });
});

function generateClaimCode() {
  const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MC-DESK-${p1}-${p2}`;
}

// 0.1 Server-Initiated Auto-Registration (Generates pairing token to print in server console)
router.post('/register-init', async (req, res) => {
  const {
    serverName = 'Mi Servidor Minecraft',
    host = '127.0.0.1',
    port = 25565,
    software = 'Forge',
    version = '1.20.1',
    systemInfo = {}
  } = req.body;

  try {
    const pairingCode = generateClaimCode();
    const pairingSecret = `mcp_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const serverId = `s-${Date.now()}`;

    let server = null;
    if (db.pool) {
      const adminUser = await db.query("SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE code = 'ADMIN' OR code = 'OWNER' LIMIT 1) LIMIT 1");
      const defaultOwnerId = adminUser.rows?.[0]?.id || null;

      const result = await db.query(
        `INSERT INTO servers (id, name, host, port, software, version, claim_code, claim_code_expires, status, is_verified, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'STARTING', false, $9)
         RETURNING *`,
        [serverId, serverName.trim(), host.trim(), parseInt(port, 10), software, version, pairingCode, expiresAt, defaultOwnerId]
      );
      server = result.rows[0];
    } else {
      server = {
        id: serverId,
        name: serverName.trim(),
        host: host.trim(),
        port: parseInt(port, 10),
        software,
        version,
        status: 'STARTING',
        max_players: 20,
        online_players: 0,
        tps: 20.0,
        uptime: '0s',
        cpu_usage: 0.0,
        ram_usage: 0.0,
        cpu_temp: 'N/D',
        claim_code: pairingCode,
        claim_code_expires: expiresAt.toISOString(),
        pairing_secret: pairingSecret,
        agent_token: null,
        is_verified: false,
        owner_id: db.memoryStore.users?.[0]?.id || 'u-admin',
        created_at: new Date().toISOString()
      };
      if (!db.memoryStore.servers) db.memoryStore.servers = [];
      db.memoryStore.servers.push(server);
      db.saveStore?.();
    }

    res.json({
      success: true,
      pairingCode,
      pairingSecret,
      expiresAt: expiresAt.toISOString(),
      pollIntervalSeconds: 2,
      message: 'Token de vinculación generado. Muéstralo en la consola de Minecraft.'
    });
  } catch (err) {
    console.error('Error in agent register-init:', err);
    res.status(500).json({ error: 'Error al inicializar registro de servidor' });
  }
});

// 0.2 Check if server was claimed from the Web Panel
router.post('/pairing-status', async (req, res) => {
  const { pairingCode } = req.body;

  if (!pairingCode) {
    return res.status(400).json({ error: 'pairingCode es requerido' });
  }

  try {
    let server = null;
    if (db.pool) {
      const resServer = await db.query(
        'SELECT id, name, is_verified, agent_token, owner_id FROM servers WHERE claim_code = $1',
        [pairingCode.trim().toUpperCase()]
      );
      if (resServer && resServer.rows.length > 0) server = resServer.rows[0];
    } else {
      server = db.memoryStore.servers.find(s => s.claim_code && s.claim_code.toUpperCase() === pairingCode.trim().toUpperCase());
    }

    if (!server) {
      return res.status(404).json({ error: 'Código de emparejamiento no encontrado' });
    }

    if (server.is_verified && server.agent_token) {
      return res.json({
        paired: true,
        agentToken: server.agent_token,
        serverId: server.id,
        serverName: server.name,
        message: '¡Servidor vinculado exitosamente desde el panel web!'
      });
    }

    res.json({
      paired: false,
      status: 'WAITING_FOR_USER_CLAIM',
      message: 'Esperando a que el usuario introduzca el código en el panel web.'
    });
  } catch (err) {
    console.error('Error in pairing-status check:', err);
    res.status(500).json({ error: 'Error al consultar estado de emparejamiento' });
  }
});

// 1. Initial Agent Claim / Verification Handshake (Public with claimCode)
router.post('/verify', async (req, res) => {
  const { claimCode, agentVersion = '1.0.0', serverInfo = {} } = req.body;

  if (!claimCode) {
    return res.status(400).json({ error: 'Código de vinculación (claimCode) requerido' });
  }

  try {
    let server = null;
    if (db.pool) {
      const result = await db.query(
        'SELECT * FROM servers WHERE claim_code = $1',
        [claimCode.trim().toUpperCase()]
      );
      if (result && result.rows.length > 0) server = result.rows[0];
    } else {
      server = db.memoryStore.servers.find(s => s.claim_code === claimCode.trim().toUpperCase());
    }

    if (!server) {
      return res.status(404).json({ error: 'Código de vinculación no válido' });
    }

    if (server.claim_code_expires && new Date(server.claim_code_expires) < new Date()) {
      return res.status(410).json({ error: 'El código de vinculación ha expirado. Genera uno nuevo en el panel.' });
    }

    // Generate secure persistent Agent Token
    const agentToken = `mca_${crypto.randomBytes(32).toString('hex')}`;

    if (db.pool) {
      await db.query(
        `UPDATE servers 
         SET is_verified = true,
             agent_token = $1,
             claim_code = NULL,
             software = COALESCE($2, software),
             version = COALESCE($3, version),
             last_ping_at = NOW(),
             status = 'ONLINE'
         WHERE id = $4`,
        [agentToken, serverInfo.software || 'Paper', serverInfo.version || '1.21.4', server.id]
      );
    } else {
      server.is_verified = true;
      server.agent_token = agentToken;
      server.claim_code = null;
      server.status = 'ONLINE';
      server.last_ping_at = new Date().toISOString();
      if (serverInfo.software) server.software = serverInfo.software;
      if (serverInfo.version) server.version = serverInfo.version;
    }

    await logAudit({
      serverId: server.id,
      action: 'AGENT_VERIFIED_SUCCESSFULLY',
      details: { agentVersion, host: server.host }
    });

    res.json({
      message: '¡Servidor vinculado y verificado exitosamente!',
      serverId: server.id,
      serverName: server.name,
      agentToken
    });
  } catch (err) {
    console.error('Agent verification error:', err);
    res.status(500).json({ error: 'Error durante la verificación del Agent' });
  }
});

const { resolveCommand } = require('../services/commandQueue');

// 2. Heartbeat Telemetry Ping (Requires X-Agent-Token)
router.post('/telemetry', authenticateAgent, async (req, res) => {
  const server = req.agentServer;
  const {
    status = 'ONLINE',
    onlinePlayers = 0,
    maxPlayers = 20,
    tps = 20.0,
    uptime = '0s',
    cpuUsage = 0.0,
    ramUsage = 0.0,
    cpuTemp = 'N/D',
    players = [],
    serverProperties = null,
    backups = null
  } = req.body;

  try {
    const now = new Date().toISOString();

    // Update server status
    if (db.pool) {
      await db.query(
        `UPDATE servers
         SET status = $1,
             online_players = $2,
             max_players = $3,
             tps = $4,
             uptime = $5,
             cpu_usage = $6,
             ram_usage = $7,
             cpu_temp = $8,
             last_ping_at = NOW()
         WHERE id = $9`,
        [status, onlinePlayers, maxPlayers, tps, uptime, cpuUsage, ramUsage, cpuTemp, server.id]
      );

      // Sync players
      for (const p of players) {
        await db.query(
          `INSERT INTO players (server_id, uuid, username, skin_url, is_online, ping, health, food, level, experience, armor, inventory, last_seen)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
           ON CONFLICT (server_id, uuid) DO UPDATE 
           SET username = EXCLUDED.username,
               is_online = EXCLUDED.is_online,
               ping = EXCLUDED.ping,
               health = EXCLUDED.health,
               food = EXCLUDED.food,
               level = EXCLUDED.level,
               experience = EXCLUDED.experience,
               armor = EXCLUDED.armor,
               inventory = EXCLUDED.inventory,
               last_seen = NOW()`,
          [
            server.id,
            p.uuid || p.username,
            p.username,
            p.skinUrl || `https://minotar.net/skin/${p.username}`,
            p.isOnline !== undefined ? p.isOnline : true,
            p.ping || 0,
            p.health || 20.0,
            p.food || 20,
            p.level || 0,
            p.experience || 0,
            p.armor || 0,
            JSON.stringify(p.inventory || [])
          ]
        );
      }
    } else {
      server.status = status;
      server.online_players = onlinePlayers;
      server.max_players = maxPlayers;
      server.tps = tps;
      server.uptime = uptime;
      server.cpu_usage = cpuUsage;
      server.ram_usage = ramUsage;
      server.cpu_temp = cpuTemp;
      server.last_ping_at = now;
      if (serverProperties) server.server_properties = serverProperties;
      if (backups) server.backups = backups;

      // Update in-memory players if sent
      if (players.length > 0) {
        db.memoryStore.players = players.map(p => ({
          id: `p-${p.username}`,
          server_id: server.id,
          uuid: p.uuid || p.username,
          username: p.username,
          is_online: p.isOnline !== undefined ? p.isOnline : true,
          isToday: p.isToday || false,
          ping: p.ping || 30,
          health: p.health || 20,
          food: p.food || 20,
          level: p.level || 1,
          armor: p.armor || 0,
          role: p.role || 'Jugador',
          inventory: p.inventory || [],
          stats: p.stats || { playtime_minutes: 0, blocks_mined: 0, mobs_killed: 0, deaths: 0 }
        }));
      }

      db.saveStore?.();
    }

    // Check for pending commands to dispatch to the Agent
    let pendingCommands = [];
    if (db.pool) {
      const cmdRes = await db.query(
        `SELECT id, command FROM server_commands 
         WHERE server_id = $1 AND status = 'PENDING' 
         ORDER BY created_at ASC LIMIT 5`,
        [server.id]
      );
      pendingCommands = cmdRes.rows;
      if (pendingCommands.length > 0) {
        const ids = pendingCommands.map(c => c.id);
        await db.query(`UPDATE server_commands SET status = 'SENT' WHERE id = ANY($1)`, [ids]);
      }
    } else {
      if (!db.memoryStore.commands) db.memoryStore.commands = [];
      pendingCommands = db.memoryStore.commands.filter(c => c.server_id === server.id && c.status === 'PENDING');
      pendingCommands.forEach(c => (c.status = 'SENT'));
      if (pendingCommands.length > 0) db.saveStore?.();
    }

    res.json({
      acknowledged: true,
      pendingCommands: pendingCommands.map(c => ({ id: c.id, command: c.command }))
    });
  } catch (err) {
    console.error('Telemetry error:', err);
    res.status(500).json({ error: 'Error procesando telemetría' });
  }
});

// 3. Report command execution result
router.post('/command-result', authenticateAgent, async (req, res) => {
  const { commandId, response = '', status = 'EXECUTED' } = req.body;

  try {
    if (db.pool) {
      await db.query(
        `UPDATE server_commands
         SET response = $1, status = $2, executed_at = NOW()
         WHERE id = $3`,
        [typeof response === 'object' ? JSON.stringify(response) : response, status, commandId]
      );
    } else {
      if (!db.memoryStore.commands) db.memoryStore.commands = [];
      const cmd = db.memoryStore.commands.find(c => c.id === commandId);
      if (cmd) {
        cmd.response = response;
        cmd.status = status;
        db.saveStore?.();
      }
    }

    // Notify any waiting command resolvers synchronously
    resolveCommand(commandId, response);

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating command result:', err);
    res.status(500).json({ error: 'Error al actualizar resultado de comando' });
  }
});

// 4. Quick Poll for Pending Commands (Optional fast-loop alternative to telemetry)
router.get('/commands', authenticateAgent, async (req, res) => {
  const server = req.agentServer;
  let pendingCommands = [];
  try {
    if (db.pool) {
      const cmdRes = await db.query(
        `SELECT id, command FROM server_commands 
         WHERE server_id = $1 AND status = 'PENDING' 
         ORDER BY created_at ASC LIMIT 5`,
        [server.id]
      );
      pendingCommands = cmdRes.rows;
      if (pendingCommands.length > 0) {
        const ids = pendingCommands.map(c => c.id);
        await db.query(`UPDATE server_commands SET status = 'SENT' WHERE id = ANY($1)`, [ids]);
      }
    } else {
      if (!db.memoryStore.commands) db.memoryStore.commands = [];
      pendingCommands = db.memoryStore.commands.filter(c => c.server_id === server.id && c.status === 'PENDING');
      pendingCommands.forEach(c => (c.status = 'SENT'));
      if (pendingCommands.length > 0) db.saveStore?.();
    }

    res.json({
      commands: pendingCommands.map(c => ({ id: c.id, command: c.command }))
    });
  } catch (err) {
    console.error('Error polling commands:', err);
    res.status(500).json({ error: 'Error al consultar comandos pendientes' });
  }
});

module.exports = router;
