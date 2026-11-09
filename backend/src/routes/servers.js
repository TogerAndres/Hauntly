const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const config = require('../config');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

function generateClaimCode() {
  const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `MC-DESK-${p1}-${p2}`;
}

const minecraftBridge = require('../services/minecraftBridge');

// 1. List user's servers with live telemetry
router.get('/', authenticate, async (req, res) => {
  try {
    const live = await minecraftBridge.fetchLiveServerData().catch(() => null);
    let servers = [];

    if (live && live.server) {
      servers = [live.server];
    } else if (db.pool) {
      const result = await db.query(
        `SELECT s.*, sm.role as member_role 
         FROM servers s
         LEFT JOIN server_members sm ON s.id = sm.server_id AND sm.user_id = $1
         WHERE s.owner_id = $1 OR sm.user_id = $1
         ORDER BY s.created_at DESC`,
        [req.user.id]
      );
      servers = result ? result.rows : [];
    } else {
      servers = db.memoryStore.servers.filter(s => s.owner_id === req.user.id || req.user.role === 'OWNER');
    }

    res.json({ servers });
  } catch (err) {
    console.error('Error fetching servers:', err);
    res.status(500).json({ error: 'Error al obtener servidores' });
  }
});

// 2. Create new server (Start Claim flow)
router.post('/', authenticate, async (req, res) => {
  const { name, host, port = 25565, software = 'Paper', version = '1.21.4', minecraft_ip } = req.body;

  if (!name || !host) {
    return res.status(400).json({ error: 'Nombre e IP/Host del servidor son requeridos' });
  }

  const claimCode = generateClaimCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const publicMinecraftIp = (minecraft_ip || host || config.mcMinecraftPublicIp || 'mc.ejemplo.com').trim();

  try {
    let server = null;
    if (db.pool) {
      const insert = await db.query(
        `INSERT INTO servers (name, host, port, software, version, claim_code, claim_code_expires, owner_id, status, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OFFLINE', false) RETURNING *`,
        [name.trim(), host.trim(), parseInt(port, 10), software, version, claimCode, expiresAt, req.user.id]
      );
      server = insert.rows[0];
      server.minecraft_ip = publicMinecraftIp;
    } else {
      server = {
        id: `s-${Date.now()}`,
        name: name.trim(),
        host: host.trim(),
        minecraft_ip: publicMinecraftIp,
        public_host: publicMinecraftIp,
        port: parseInt(port, 10),
        software,
        version,
        status: 'OFFLINE',
        max_players: 20,
        online_players: 0,
        tps: 20.0,
        uptime: '0s',
        cpu_usage: 0.0,
        ram_usage: 0.0,
        cpu_temp: 'N/D',
        claim_code: claimCode,
        claim_code_expires: expiresAt.toISOString(),
        agent_token: null,
        is_verified: false,
        owner_id: req.user.id,
        created_at: new Date().toISOString()
      };
      db.memoryStore.servers.push(server);
    }

    await logAudit({
      serverId: server.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SERVER_CREATED_PENDING_CLAIM',
      details: { name: server.name, host: server.host, claimCode }
    });

    res.status(201).json({
      message: 'Servidor registrado. Configura el MC-Desk Agent con el token de vinculación.',
      server,
      claimInstructions: {
        claimCode,
        step1: 'Instala el MC-Desk Agent en tu servidor de Minecraft.',
        step2: `Configura "claim_code": "${claimCode}" en el archivo config.json del Agent.`,
        step3: 'Inicia el Agent. El servidor se verificará automáticamente por HTTPS.'
      }
    });
  } catch (err) {
    console.error('Error creating server:', err);
    res.status(500).json({ error: 'Error al registrar el servidor' });
  }
});

// 3. Get single server details with live telemetry
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const live = await minecraftBridge.fetchLiveServerData(id).catch(() => null);
    if (live && live.server) {
      return res.json({ server: live.server });
    }

    let server = null;
    if (db.pool) {
      const result = await db.query('SELECT * FROM servers WHERE id = $1', [id]);
      if (result && result.rows.length > 0) server = result.rows[0];
    } else {
      server = db.memoryStore.servers.find(s => s.id === id);
    }

    if (!server) {
      return res.status(404).json({ error: 'Servidor no encontrado' });
    }

    res.json({ server });
  } catch (err) {
    console.error('Error fetching server details:', err);
    res.status(500).json({ error: 'Error al consultar servidor' });
  }
});

// 4. Wake / Start Server
router.post('/:id/wake', authenticate, async (req, res) => {
  try {
    const result = await minecraftBridge.wakeRemoteServer(req.params.id);
    await logAudit({
      serverId: req.params.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'WAKE_SERVER',
      details: result
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Error al despertar el servidor: ' + err.message });
  }
});

// 5. Claim / Pair Server via Token generated in the Minecraft console
router.post('/claim-by-token', authenticate, async (req, res) => {
  const { token, pairingCode } = req.body;
  const rawCode = (pairingCode || token || '').trim().toUpperCase();

  if (!rawCode) {
    return res.status(400).json({ error: 'Código o token de vinculación requerido' });
  }

  try {
    let server = null;
    if (db.pool) {
      const result = await db.query(
        'SELECT * FROM servers WHERE claim_code = $1',
        [rawCode]
      );
      if (result && result.rows.length > 0) server = result.rows[0];
    } else {
      server = db.memoryStore.servers.find(s => s.claim_code && s.claim_code.toUpperCase() === rawCode);
    }

    if (!server) {
      return res.status(404).json({ error: 'Código de vinculación no encontrado o inválido. Asegúrate de copiarlo tal como aparece en la consola.' });
    }

    if (server.claim_code_expires && new Date(server.claim_code_expires) < new Date()) {
      return res.status(410).json({ error: 'El código de vinculación ha expirado. Ejecuta el agente nuevamente para generar uno nuevo.' });
    }

    // Generate persistent agent token if not present
    const agentToken = server.agent_token || `mca_${crypto.randomBytes(32).toString('hex')}`;

    if (db.pool) {
      await db.query(
        `UPDATE servers
         SET owner_id = $1,
             is_verified = true,
             agent_token = $2,
             status = 'ONLINE',
             updated_at = NOW()
         WHERE id = $3`,
        [req.user.id, agentToken, server.id]
      );
      server.owner_id = req.user.id;
      server.is_verified = true;
      server.agent_token = agentToken;
      server.status = 'ONLINE';
    } else {
      server.owner_id = req.user.id;
      server.is_verified = true;
      server.agent_token = agentToken;
      server.status = 'ONLINE';
      db.saveStore?.();
    }

    await logAudit({
      serverId: server.id,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SERVER_CLAIMED_BY_TOKEN',
      details: { serverName: server.name, host: server.host, codeUsed: rawCode },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `¡Servidor "${server.name}" conectado exitosamente a tu cuenta!`,
      server: {
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        software: server.software,
        version: server.version,
        status: server.status,
        is_verified: true
      }
    });
  } catch (err) {
    console.error('Error claiming server by token:', err);
    res.status(500).json({ error: 'Error interno al vincular servidor con token' });
  }
});

// 6. Regenerate claim code
router.post('/:id/regenerate-claim', authenticate, async (req, res) => {
  const { id } = req.params;
  const newCode = generateClaimCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  try {
    if (db.pool) {
      await db.query(
        'UPDATE servers SET claim_code = $1, claim_code_expires = $2 WHERE id = $3 AND owner_id = $4',
        [newCode, expiresAt, id, req.user.id]
      );
    } else {
      const s = db.memoryStore.servers.find(s => s.id === id && s.owner_id === req.user.id);
      if (s) {
        s.claim_code = newCode;
        s.claim_code_expires = expiresAt.toISOString();
      }
    }

    res.json({ claimCode: newCode });
  } catch (err) {
    res.status(500).json({ error: 'Error al regenerar código' });
  }
});

module.exports = router;
