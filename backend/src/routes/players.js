const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const minecraftBridge = require('../services/minecraftBridge');

// 1. List connected & recent players for a server
router.get('/', authenticate, async (req, res) => {
  const { serverId } = req.params;

  try {
    const live = await minecraftBridge.fetchLiveServerData(serverId).catch(() => null);
    if (live && live.players && live.players.length > 0) {
      return res.json({ players: live.players });
    }

    let players = [];
    if (db.pool) {
      const result = await db.query(
        `SELECT p.*, s.playtime_minutes, s.blocks_mined, s.mobs_killed, s.deaths
         FROM players p
         LEFT JOIN player_statistics s ON p.id = s.player_id
         WHERE p.server_id = $1
         ORDER BY p.is_online DESC, p.level DESC`,
        [serverId]
      );
      players = result ? result.rows : [];
    } else {
      players = db.memoryStore.players.filter(p => p.server_id === serverId);
    }

    res.json({ players });
  } catch (err) {
    console.error('Error fetching players:', err);
    res.status(500).json({ error: 'Error al consultar jugadores' });
  }
});

// 2. Get player profile by username or uuid (supports 'me' for logged-in player)
router.get('/:identifier', authenticate, async (req, res) => {
  const { serverId, identifier } = req.params;
  const targetId = (identifier === 'me' ? req.user.minecraftUsername : identifier) || '';

  if (!targetId) {
    return res.status(404).json({ error: 'No hay jugador vinculado a esta cuenta' });
  }

  try {
    const live = await minecraftBridge.fetchLiveServerData(serverId).catch(() => null);
    if (live && live.players) {
      const p = live.players.find(
        x => x.uuid === targetId || x.username.toLowerCase() === targetId.toLowerCase()
      );
      if (p) return res.json({ player: p });
    }

    let player = null;
    if (db.pool) {
      const result = await db.query(
        `SELECT p.*, s.playtime_minutes, s.blocks_mined, s.mobs_killed, s.deaths
         FROM players p
         LEFT JOIN player_statistics s ON p.id = s.player_id
         WHERE p.server_id = $1 AND (p.uuid = $2 OR LOWER(p.username) = LOWER($2))`,
        [serverId, targetId]
      );
      if (result && result.rows.length > 0) player = result.rows[0];
    } else {
      player = db.memoryStore.players.find(
        p => (p.server_id === serverId || !p.server_id) && (p.uuid === targetId || p.username.toLowerCase() === targetId.toLowerCase())
      );
    }

    if (!player) {
      return res.status(404).json({ error: 'Jugador no encontrado' });
    }

    res.json({ player });
  } catch (err) {
    console.error('Error fetching player profile:', err);
    res.status(500).json({ error: 'Error al consultar perfil del jugador' });
  }
});

// 3. Leaderboard Top players
router.get('/rankings/top', authenticate, async (req, res) => {
  const { serverId } = req.params;

  try {
    const live = await minecraftBridge.fetchLiveServerData(serverId).catch(() => null);
    if (live && live.players) {
      const top = [...live.players]
        .sort((a, b) => (b.level || 0) - (a.level || 0))
        .map((p, idx) => ({
          rank: idx + 1,
          username: p.username,
          level: p.level,
          blocks_mined: p.stats?.blocks_mined || 0,
          playtime_minutes: p.stats?.playtime_minutes || 0
        }));
      return res.json({ topPlayers: top });
    }

    let top = [];
    if (db.pool) {
      const result = await db.query(
        `SELECT p.username, p.uuid, p.level, p.skin_url, s.playtime_minutes, s.blocks_mined
         FROM players p
         LEFT JOIN player_statistics s ON p.id = s.player_id
         WHERE p.server_id = $1
         ORDER BY p.level DESC
         LIMIT 10`,
        [serverId]
      );
      top = result ? result.rows : [];
    } else {
      top = db.memoryStore.players
        .filter(p => p.server_id === serverId)
        .sort((a, b) => (b.level || 0) - (a.level || 0))
        .slice(0, 10);
    }

    res.json({ topPlayers: top });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar ranking' });
  }
});

module.exports = router;
