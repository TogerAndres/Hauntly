// MC-Desk Centralized API Client

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(endpoint, { method = 'GET', body = null, headers = {} } = {}) {
  const token = localStorage.getItem('mcdesk_token') || 'demo-token';
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers: reqHeaders
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const data = await res.json().catch(() => ({}));
    
    if (!res.ok) {
      throw new Error(data.error || `Error HTTP ${res.status}`);
    }
    return data;
  } catch (err) {
    // If backend is not running, log and propagate
    console.warn(`[MC-Desk API] Error en ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, displayName, password, role = 'USER', minecraftUsername = '') => 
    request('/api/auth/register', { method: 'POST', body: { email, displayName, password, role, minecraftUsername } }),
  linkMinecraft: (minecraftUsername) => 
    request('/api/auth/link-minecraft', { method: 'PUT', body: { minecraftUsername } }),
  getMe: () => request('/api/auth/me'),

  // Servers
  getServers: () => request('/api/servers'),
  getServer: (id) => request(`/api/servers/${id}`),
  createServer: (data) => request('/api/servers', { method: 'POST', body: data }),
  regenerateClaimCode: (id) => request(`/api/servers/${id}/regenerate-claim`, { method: 'POST' }),
  wakeServer: (id) => request(`/api/servers/${id}/wake`, { method: 'POST' }),

  // Players
  getPlayers: (serverId) => request(`/api/servers/${serverId}/players`),
  getPlayerProfile: (serverId, identifier) => request(`/api/servers/${serverId}/players/${identifier}`),
  getTopPlayers: (serverId) => request(`/api/servers/${serverId}/players/rankings/top`),

  // Admin Actions & Commands
  sendCommand: (serverId, command) => request(`/api/servers/${serverId}/admin/command`, { method: 'POST', body: { command } }),
  sendQuickAction: (serverId, action, value, extra = {}) => request(`/api/servers/${serverId}/admin/action`, { method: 'POST', body: { action, value, ...extra } }),
  sendStealthGamemode: (serverId, player, mode) => request(`/api/servers/${serverId}/admin/stealth-gamemode`, { method: 'POST', body: { player, mode } }),
  getAuditLogs: (serverId) => request(`/api/servers/${serverId}/admin/audit-logs`),

  // Backups
  getBackups: (serverId) => request(`/api/servers/${serverId}/admin/backups`),
  createBackup: (serverId) => request(`/api/servers/${serverId}/admin/backups`, { method: 'POST' }),

  // Server Settings (server.properties)
  getServerSettings: (serverId) => request(`/api/servers/${serverId}/admin/settings`),
  updateServerSettings: (serverId, properties) => request(`/api/servers/${serverId}/admin/settings`, { method: 'POST', body: { properties } }),

  // MineMarket (Digital Items Store)
  getItems: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/items${qs ? `?${qs}` : ''}`);
  },
  getItem: (id) => request(`/api/items/${id}`),
  createItem: (data) => request('/api/items', { method: 'POST', body: data }),
  updateItem: (id, data) => request(`/api/items/${id}`, { method: 'PUT', body: data }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  deliverItem: (id, playerGamertag, serverId = 's-1') => request(`/api/items/${id}/deliver`, { method: 'POST', body: { playerGamertag, serverId } })
};

