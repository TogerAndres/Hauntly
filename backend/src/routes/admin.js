const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

// Verify caller has admin/owner rights on this server
async function checkServerAdmin(req, res, next) {
  const { serverId } = req.params;
  const userId = req.user.id;

  try {
    let hasAccess = false;
    let role = null;

    if (db.pool) {
      const serverRes = await db.query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);
      if (serverRes && serverRes.rows.length > 0) {
        if (serverRes.rows[0].owner_id === userId) {
          hasAccess = true;
          role = 'OWNER';
        }
      }
      if (!hasAccess) {
        const memRes = await db.query(
          'SELECT role FROM server_members WHERE server_id = $1 AND user_id = $2',
          [serverId, userId]
        );
        if (memRes && memRes.rows.length > 0 && ['OWNER', 'ADMIN'].includes(memRes.rows[0].role)) {
          hasAccess = true;
          role = memRes.rows[0].role;
        }
      }
    } else {
      const s = db.memoryStore.servers.find(srv => srv.id === serverId);
      if (s && (s.owner_id === userId || req.user.role === 'OWNER')) {
        hasAccess = true;
        role = 'OWNER';
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Permisos insuficientes para administrar este servidor' });
    }

    req.serverRole = role;
    next();
  } catch (err) {
    console.error('Error verifying server admin:', err);
    res.status(500).json({ error: 'Error al verificar permisos' });
  }
}

router.use(authenticate, checkServerAdmin);

const minecraftBridge = require('../services/minecraftBridge');
const { enqueueCommand } = require('../services/commandQueue');

// Helper to determine if server should use Agent queue or fallback Bridge
async function runServerCommand(serverId, cmd) {
  let server = null;
  if (db.pool) {
    const res = await db.query('SELECT * FROM servers WHERE id = $1', [serverId]);
    if (res && res.rows.length > 0) server = res.rows[0];
  } else {
    server = db.memoryStore.servers.find(s => s.id === serverId);
  }

  const isAgentActive = server && server.agent_token && server.last_ping_at &&
    (Date.now() - new Date(server.last_ping_at).getTime() < 120000);

  if (isAgentActive) {
    return await enqueueCommand(serverId, cmd);
  }

  // Fallback to direct SSH Bridge for local/legacy dev
  return await minecraftBridge.executeRemoteCommand(cmd);
}

// Forbidden shell control characters to prevent shell injection / breakout
const FORBIDDEN_SHELL_PATTERNS = /[;&|`$><\\]/;

// 1. Send Command to Console with strict sanitization
router.post('/command', async (req, res) => {
  const { serverId } = req.params;
  const { command } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Comando requerido' });
  }

  const cleanCmd = command.trim().replace(/^[/]/, ''); // remove leading slash

  if (cleanCmd.length === 0) {
    return res.status(400).json({ error: 'El comando no puede estar vacío' });
  }

  if (cleanCmd.length > 250) {
    return res.status(400).json({ error: 'Comando demasiado largo (máximo 250 caracteres)' });
  }

  // Security: Check for forbidden shell metacharacters
  if (FORBIDDEN_SHELL_PATTERNS.test(cleanCmd)) {
    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SECURITY_BLOCKED_COMMAND',
      details: { rejectedCommand: cleanCmd, reason: 'Caracteres de shell inválidos' },
      ipAddress: req.ip || req.connection?.remoteAddress
    });
    return res.status(400).json({ error: 'Comando bloqueado por seguridad: contiene caracteres de shell inválidos (; & | ` $ > < \\)' });
  }

  try {
    // Execute live via Agent or Bridge
    const execResult = await runServerCommand(serverId, cleanCmd);

    // Audit log with IP address
    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'CONSOLE_COMMAND',
      details: { command: cleanCmd, result: execResult },
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      message: execResult.message || `Comando /${cleanCmd} ejecutado.`,
      output: execResult.output || [],
      success: execResult.success !== false
    });
  } catch (err) {
    console.error('Error executing command:', err);
    res.status(500).json({ error: 'Error al procesar comando: ' + err.message });
  }
});

// 2. Quick World & Player Moderation Actions with live execution
router.post('/action', async (req, res) => {
  const { serverId } = req.params;
  const { action, value, player, count, item } = req.body;

  const targetPlayer = (player || value || '').toString().trim().replace(/[^a-zA-Z0-9_]/g, '');
  let cmd = '';

  switch (action) {
    // World controls
    case 'time':
      cmd = `time set ${value === 'night' ? 'night' : 'day'}`;
      break;
    case 'weather':
      cmd = `weather ${value === 'rain' ? 'rain' : 'clear'}`;
      break;
    case 'difficulty':
      cmd = `difficulty ${['peaceful', 'easy', 'normal', 'hard'].includes(value) ? value : 'hard'}`;
      break;
    case 'save':
      cmd = 'save-all';
      break;

    // Player moderation actions
    case 'heal':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido para sanar' });
      cmd = `effect give ${targetPlayer} minecraft:instant_health 1 255`;
      break;
    case 'feed':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido para alimentar' });
      cmd = `effect give ${targetPlayer} minecraft:saturation 1 255`;
      break;
    case 'teleport_spawn':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido para teletransportar' });
      cmd = `teleport ${targetPlayer} 0 100 0`;
      break;
    case 'op':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido' });
      cmd = `op ${targetPlayer}`;
      break;
    case 'deop':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido' });
      cmd = `deop ${targetPlayer}`;
      break;
    case 'kick':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido para expulsar' });
      cmd = `kick ${targetPlayer} "Expulsado por la administración de MC-Desk"`;
      break;
    case 'ban':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido para banear' });
      cmd = `ban ${targetPlayer} "Sancionado permanentemente mediante MC-Desk"`;
      break;
    case 'pardon':
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido para desbanear' });
      cmd = `pardon ${targetPlayer}`;
      break;
    case 'give': {
      if (!targetPlayer) return res.status(400).json({ error: 'Jugador requerido' });
      const cleanItem = (item || 'bread').toString().trim().replace(/[^a-zA-Z0-9_:]/g, '');
      const safeCount = Math.max(1, Math.min(64, parseInt(count) || 1));
      cmd = `give ${targetPlayer} ${cleanItem} ${safeCount}`;
      break;
    }
    default:
      return res.status(400).json({ error: `Acción rápida '${action}' no reconocida` });
  }

  try {
    // Execute live on the server
    const execResult = await minecraftBridge.executeRemoteCommand(cmd);

    // Audit log
    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: `QUICK_ACTION_${action.toUpperCase()}`,
      details: { command: cmd, targetPlayer, result: execResult },
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      message: execResult.message || `Acción '${action}' ejecutada correctamente: /${cmd}`,
      output: execResult.output || [],
      success: execResult.success !== false
    });
  } catch (err) {
    console.error(`Error in admin action ${action}:`, err);
    res.status(500).json({ error: `Error al ejecutar acción '${action}': ` + err.message });
  }
});

// 2.1 Stealth Gamemode Controller (Ghost Panel Zero-Trace)
router.post('/stealth-gamemode', async (req, res) => {
  const { serverId } = req.params;
  const { player, mode = 'survival' } = req.body;

  if (!player || typeof player !== 'string' || player.trim().length === 0) {
    return res.status(400).json({ error: 'Nombre del jugador requerido' });
  }

  const cleanPlayer = player.trim().replace(/[^a-zA-Z0-9_]/g, '');
  const cleanMode = ['survival', 'creative', 'spectator', 'adventure'].includes(mode.toLowerCase())
    ? mode.toLowerCase()
    : 'survival';

  try {
    let result = null;

    // Check if server is agent-active
    const srv = db.memoryStore.servers.find(s => s.id === serverId);
    const isAgentActive = srv && srv.agent_token && srv.last_ping_at &&
      (Date.now() - new Date(srv.last_ping_at).getTime() < 120000);

    if (isAgentActive) {
      result = await enqueueCommand(serverId, `__ACTION__:STEALTH_GAMEMODE ${cleanPlayer} ${cleanMode}`);
    } else {
      result = await minecraftBridge.executeStealthGamemode(cleanPlayer, cleanMode);
    }

    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'STEALTH_GAMEMODE_CHANGE',
      details: { player: cleanPlayer, mode: cleanMode, stealth: true, result },
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: result.success !== false,
      player: cleanPlayer,
      mode: cleanMode,
      message: result.message || `Modo ${cleanMode.toUpperCase()} aplicado a ${cleanPlayer} sin dejar rastros en logs ni consola.`
    });
  } catch (err) {
    console.error('Error in stealth gamemode:', err);
    res.status(500).json({ error: 'Error al aplicar modo silencioso: ' + err.message });
  }
});

// 3. Audit Logs for this server
router.get('/audit-logs', async (req, res) => {
  const { serverId } = req.params;

  try {
    let logs = [];
    if (db.pool) {
      const result = await db.query(
        'SELECT * FROM audit_logs WHERE server_id = $1 ORDER BY created_at DESC LIMIT 50',
        [serverId]
      );
      logs = result ? result.rows : [];
    } else {
      logs = db.memoryStore.audit_logs.filter(l => l.server_id === serverId).slice(0, 50);
    }

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar logs de auditoría' });
  }
});

// 4. List World Backups
router.get('/backups', async (req, res) => {
  const { serverId } = req.params;

  try {
    const backups = await minecraftBridge.listRemoteBackups();
    res.json({ backups });
  } catch (err) {
    console.error('Error fetching backups:', err);
    res.status(500).json({ error: 'Error al consultar copias de seguridad' });
  }
});

// 5. Trigger World Backup Creation
router.post('/backups', async (req, res) => {
  const { serverId } = req.params;

  try {
    const result = await minecraftBridge.createRemoteBackup();

    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'WORLD_BACKUP_CREATED',
      details: { result },
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: result.success !== false,
      message: result.message || 'Copia de seguridad del mundo creada exitosamente.'
    });
  } catch (err) {
    console.error('Error creating backup:', err);
    res.status(500).json({ error: 'Error al generar copia de seguridad: ' + err.message });
  }
});

// 6. Get Server Properties (server.properties)
router.get('/settings', async (req, res) => {
  const { serverId } = req.params;

  try {
    const properties = await minecraftBridge.getServerProperties();
    res.json({ properties });
  } catch (err) {
    console.error('Error fetching server settings:', err);
    res.status(500).json({ error: 'Error al obtener server.properties' });
  }
});

// 7. Update Server Properties (server.properties)
router.post('/settings', async (req, res) => {
  const { serverId } = req.params;
  const { properties } = req.body;

  if (!properties || typeof properties !== 'object') {
    return res.status(400).json({ error: 'Objeto de propiedades requerido' });
  }

  try {
    const result = await minecraftBridge.updateServerProperties(properties);

    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'SERVER_PROPERTIES_UPDATED',
      details: { updatedKeys: Object.keys(properties), result },
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: result.success !== false,
      message: result.message || 'Propiedades actualizadas correctamente.',
      properties
    });
  } catch (err) {
    console.error('Error updating server settings:', err);
    res.status(500).json({ error: 'Error al guardar server.properties: ' + err.message });
  }
});

module.exports = router;

