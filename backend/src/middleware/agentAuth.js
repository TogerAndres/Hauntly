const db = require('../db');
const { timingSafeEqual } = require('./security');

/**
 * Middleware for authenticating MC-Desk Server Agent daemon requests.
 * Uses timing-attack resistant comparisons for agent tokens.
 */
async function authenticateAgent(req, res, next) {
  const agentToken = req.headers['x-agent-token'];

  if (!agentToken || typeof agentToken !== 'string') {
    return res.status(401).json({ error: 'Agent Authentication Error: Missing or invalid X-Agent-Token header' });
  }

  let server = null;
  if (db.pool) {
    const resServer = await db.query('SELECT * FROM servers WHERE agent_token = $1', [agentToken]);
    if (resServer && resServer.rows.length > 0) {
      server = resServer.rows[0];
    }
  } else {
    server = (db.memoryStore.servers || []).find(s => s.agent_token && timingSafeEqual(s.agent_token, agentToken));
  }

  if (!server) {
    return res.status(403).json({ error: 'Agent Authentication Error: Invalid or revoked Agent Token' });
  }

  req.agentServer = server;
  next();
}

module.exports = {
  authenticateAgent
};
