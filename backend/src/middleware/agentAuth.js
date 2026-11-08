const db = require('../db');

async function authenticateAgent(req, res, next) {
  const agentToken = req.headers['x-agent-token'];

  if (!agentToken) {
    return res.status(401).json({ error: 'Agent Authentication Error: Missing X-Agent-Token header' });
  }

  let server = null;
  if (db.pool) {
    const resServer = await db.query('SELECT * FROM servers WHERE agent_token = $1', [agentToken]);
    if (resServer && resServer.rows.length > 0) {
      server = resServer.rows[0];
    }
  } else {
    server = db.memoryStore.servers.find(s => s.agent_token === agentToken);
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
