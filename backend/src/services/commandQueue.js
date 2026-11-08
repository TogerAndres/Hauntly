const { EventEmitter } = require('events');
const crypto = require('crypto');
const db = require('../db');

const commandBus = new EventEmitter();
commandBus.setMaxListeners(100);

// In-memory store for fast resolution
const pendingResolvers = new Map();

/**
 * Dispatch a command to a server via Agent Queue.
 * If the agent responds within timeoutMs, resolves with the agent's real response.
 */
async function enqueueCommand(serverId, rawCommand, timeoutMs = 7000) {
  const commandId = `cmd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const record = {
    id: commandId,
    server_id: serverId,
    command: rawCommand,
    status: 'PENDING',
    created_at: new Date().toISOString()
  };

  if (db.pool) {
    try {
      await db.query(
        `INSERT INTO server_commands (id, server_id, command, status, created_at)
         VALUES ($1, $2, $3, 'PENDING', NOW())`,
        [commandId, serverId, rawCommand]
      );
    } catch (e) {
      console.error('[CommandQueue] Error inserting command to DB:', e.message);
    }
  } else {
    if (!db.memoryStore.commands) db.memoryStore.commands = [];
    db.memoryStore.commands.push(record);
    db.saveStore?.();
  }

  // Promise that waits for agent execution
  return new Promise((resolve) => {
    let timer = null;

    const onResult = (resultData) => {
      if (timer) clearTimeout(timer);
      pendingResolvers.delete(commandId);
      resolve({
        success: resultData.success !== false,
        command: rawCommand,
        output: resultData.output || [],
        message: resultData.message || 'Comando ejecutado por el Agent.'
      });
    };

    timer = setTimeout(() => {
      commandBus.removeListener(`cmd:${commandId}`, onResult);
      pendingResolvers.delete(commandId);
      // Even if timed out waiting for sync response, it will be executed when agent next pings
      resolve({
        success: true,
        queued: true,
        command: rawCommand,
        message: `Comando /${rawCommand.replace(/^[/]/, '')} encolado para el Agent.`
      });
    }, timeoutMs);

    pendingResolvers.set(commandId, onResult);
    commandBus.once(`cmd:${commandId}`, onResult);
  });
}

function resolveCommand(commandId, responsePayload) {
  let parsed = {};
  try {
    parsed = typeof responsePayload === 'string' ? JSON.parse(responsePayload) : (responsePayload || {});
  } catch (_) {
    parsed = { message: String(responsePayload) };
  }

  if (pendingResolvers.has(commandId)) {
    commandBus.emit(`cmd:${commandId}`, parsed);
  }
}

module.exports = {
  enqueueCommand,
  resolveCommand
};
