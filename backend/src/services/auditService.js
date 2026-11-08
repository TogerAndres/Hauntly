const db = require('../db');

async function logAudit({ serverId = null, userId = null, userEmail = 'system', action, details = {}, ipAddress = null }) {
  try {
    const timestamp = new Date().toISOString();
    if (db.pool) {
      await db.query(
        `INSERT INTO audit_logs (server_id, user_id, user_email, action, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [serverId, userId, userEmail, action, JSON.stringify(details), ipAddress, timestamp]
      );
    } else {
      db.memoryStore.audit_logs.unshift({
        id: `a-${Date.now()}`,
        server_id: serverId,
        user_id: userId,
        user_email: userEmail,
        action,
        details,
        ip_address: ipAddress,
        created_at: timestamp
      });
    }
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = {
  logAudit
};
