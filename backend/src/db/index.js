const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config');

let pool = null;

if (config.databaseUrl) {
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
} else {
  console.log('📦 Base de datos local: almacenamiento persistente en data/store.json.');
}

const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

// In-memory store for fallback/demo/zero-config persistence
const memoryStore = {
  users: [
    {
      id: 'u-1',
      email: 'roger@mcdesk.io',
      display_name: 'Roger',
      password_hash: '$2a$10$X8m1U7V0h3X7a8s1d4f2g.8r9t0y1u2i3o4p5a6s7d8f9g0h1j2k', // 'admin123'
      role: 'OWNER',
      created_at: new Date().toISOString()
    }
  ],
  servers: [
    {
      id: 's-1',
      name: 'UAO Friends',
      host: 'play.midominio.com',
      port: 25565,
      software: 'Paper',
      version: '1.21.4',
      status: 'ONLINE',
      max_players: 20,
      online_players: 7,
      tps: 19.8,
      uptime: '2d 14h 32m',
      cpu_usage: 24.5,
      ram_usage: 52.8,
      cpu_temp: '64.0°C',
      claim_code: 'MC-DESK-8F42-X92K',
      claim_code_expires: null,
      agent_token: 'agent-token-secure-12345',
      is_verified: true,
      owner_id: 'u-1',
      last_ping_at: new Date().toISOString()
    }
  ],
  players: [
    {
      id: 'p-1',
      server_id: 's-1',
      uuid: 'ed8c3876-d6c0-31f3-88b7-0deca5d9f0cd',
      username: 'Roger',
      skin_url: 'https://minotar.net/skin/Roger',
      is_online: true,
      ping: 32,
      health: 20.0,
      food: 18,
      level: 27,
      experience: 3420,
      armor: 10,
      inventory: [
        { slot: 0, item: 'diamond_sword', count: 1, name: 'Espada de Diamante' },
        { slot: 1, item: 'bow', count: 1, name: 'Arco' },
        { slot: 2, item: 'diamond_axe', count: 1, name: 'Hacha de Diamante' },
        { slot: 3, item: 'crossbow', count: 1, name: 'Ballesta' },
        { slot: 4, item: 'cobblestone', count: 64, name: 'Adoquín' },
        { slot: 5, item: 'oak_planks', count: 32, name: 'Madera de Roble' },
        { slot: 6, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 9, item: 'bread', count: 16, name: 'Pan' },
        { slot: 10, item: 'ender_pearl', count: 8, name: 'Perla de Ender' },
        { slot: 11, item: 'golden_apple', count: 3, name: 'Manzana Dorada' },
        { slot: 12, item: 'carrot', count: 12, name: 'Zanahoria' },
        { slot: 13, item: 'red_bed', count: 1, name: 'Cama Roja' },
        { slot: 14, item: 'ender_chest', count: 1, name: 'Cofre de Ender' },
        { slot: 15, item: 'chest', count: 2, name: 'Cofre' }
      ],
      stats: {
        playtime_minutes: 3752,
        blocks_mined: 12450,
        mobs_killed: 847,
        deaths: 12
      }
    },
    { 
      id: 'p-2', 
      server_id: 's-1', 
      uuid: 'u-2', 
      username: 'Alex', 
      is_online: true, 
      ping: 48, 
      health: 20, 
      food: 20, 
      level: 63, 
      experience: 8400,
      armor: 15,
      role: 'VIP',
      inventory: [
        { slot: 0, item: 'netherite_sword', count: 1, name: 'Espada de Netherite' },
        { slot: 1, item: 'bow', count: 1, name: 'Arco Poder V' },
        { slot: 2, item: 'diamond_pickaxe', count: 1, name: 'Pico de Diamante' },
        { slot: 3, item: 'golden_apple', count: 16, name: 'Manzana Dorada' },
        { slot: 4, item: 'golden_carrot', count: 32, name: 'Zanahoria Dorada' },
        { slot: 5, item: 'ender_pearl', count: 16, name: 'Perlas de Ender' },
        { slot: 6, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 7, item: 'arrow', count: 64, name: 'Flechas' },
        { slot: 8, item: 'totem_of_undying', count: 1, name: 'Tótem de la Inmortalidad' },
        { slot: 9, item: 'cooked_beef', count: 64, name: 'Filete Cocinado' },
        { slot: 10, item: 'elytra', count: 1, name: 'Élitros' },
        { slot: 11, item: 'firework_rocket', count: 64, name: 'Cohetes de Fuegos Artificiales' },
        { slot: 12, item: 'netherite_chestplate', count: 1, name: 'Peto de Netherite' },
        { slot: 13, item: 'ender_chest', count: 1, name: 'Cofre de Ender' }
      ],
      stats: { playtime_minutes: 5820, blocks_mined: 24100, mobs_killed: 1620, deaths: 8 }
    },
    { 
      id: 'p-3', 
      server_id: 's-1', 
      uuid: 'u-3', 
      username: 'Santi', 
      is_online: true, 
      ping: 64, 
      health: 18, 
      food: 16, 
      level: 38, 
      experience: 4100,
      armor: 8,
      role: 'Jugador',
      inventory: [
        { slot: 0, item: 'iron_sword', count: 1, name: 'Espada de Hierro' },
        { slot: 1, item: 'shield', count: 1, name: 'Escudo' },
        { slot: 2, item: 'iron_pickaxe', count: 1, name: 'Pico de Hierro' },
        { slot: 3, item: 'bread', count: 32, name: 'Pan' },
        { slot: 4, item: 'torch', count: 64, name: 'Antorchas' },
        { slot: 5, item: 'cobblestone', count: 64, name: 'Adoquín' },
        { slot: 6, item: 'coal', count: 24, name: 'Carbón' },
        { slot: 7, item: 'oak_planks', count: 48, name: 'Madera de Roble' },
        { slot: 8, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 9, item: 'iron_ingot', count: 14, name: 'Lingote de Hierro' },
        { slot: 10, item: 'chest', count: 4, name: 'Cofre' },
        { slot: 11, item: 'red_bed', count: 1, name: 'Cama Roja' },
        { slot: 12, item: 'cooked_porkchop', count: 12, name: 'Chuleta Cocinada' },
        { slot: 13, item: 'apple', count: 8, name: 'Manzanas' }
      ],
      stats: { playtime_minutes: 2430, blocks_mined: 8900, mobs_killed: 430, deaths: 19 }
    },
    { 
      id: 'p-4', 
      server_id: 's-1', 
      uuid: 'u-4', 
      username: 'Valen', 
      is_online: true, 
      ping: 77, 
      health: 16, 
      food: 14, 
      level: 42, 
      experience: 5200,
      armor: 12,
      role: 'Arquero',
      inventory: [
        { slot: 0, item: 'bow', count: 1, name: 'Arco de Precisión' },
        { slot: 1, item: 'crossbow', count: 1, name: 'Ballesta Pesada' },
        { slot: 2, item: 'arrow', count: 64, name: 'Flechas' },
        { slot: 3, item: 'spectral_arrow', count: 16, name: 'Flechas Espectrales' },
        { slot: 4, item: 'diamond_sword', count: 1, name: 'Espada de Diamante' },
        { slot: 5, item: 'golden_carrot', count: 24, name: 'Zanahoria Dorada' },
        { slot: 6, item: 'potion', count: 3, name: 'Poción de Velocidad' },
        { slot: 7, item: 'ender_pearl', count: 12, name: 'Perlas de Ender' },
        { slot: 8, item: 'red_bed', count: 1, name: 'Cama Roja' },
        { slot: 9, item: 'bread', count: 20, name: 'Pan' },
        { slot: 10, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 11, item: 'feather', count: 32, name: 'Plumas' },
        { slot: 12, item: 'flint', count: 28, name: 'Pedernal' },
        { slot: 13, item: 'target', count: 2, name: 'Diana' }
      ],
      stats: { playtime_minutes: 3100, blocks_mined: 9500, mobs_killed: 980, deaths: 15 }
    },
    { 
      id: 'p-5', 
      server_id: 's-1', 
      uuid: 'u-5', 
      username: 'Toger', 
      is_online: true, 
      ping: 91, 
      health: 20, 
      food: 19, 
      level: 25, 
      experience: 3100,
      armor: 6,
      role: 'Pescador',
      inventory: [
        { slot: 0, item: 'fishing_rod', count: 1, name: 'Caña con Suerte Marina' },
        { slot: 1, item: 'cooked_salmon', count: 32, name: 'Salmón Asado' },
        { slot: 2, item: 'salmon', count: 20, name: 'Salmón Crudo' },
        { slot: 3, item: 'oak_boat', count: 2, name: 'Barca de Roble' },
        { slot: 4, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 5, item: 'compass', count: 1, name: 'Brújula' },
        { slot: 6, item: 'lead', count: 2, name: 'Riendas' },
        { slot: 7, item: 'clock_00', count: 1, name: 'Reloj' },
        { slot: 8, item: 'iron_sword', count: 1, name: 'Espada de Hierro' },
        { slot: 9, item: 'bread', count: 18, name: 'Pan' },
        { slot: 10, item: 'campfire', count: 2, name: 'Hoguera' },
        { slot: 11, item: 'barrel', count: 4, name: 'Barril' },
        { slot: 12, item: 'kelp', count: 45, name: 'Algas' },
        { slot: 13, item: 'nautilus_shell', count: 3, name: 'Caparazón de Nautilo' }
      ],
      stats: { playtime_minutes: 1850, blocks_mined: 4200, mobs_killed: 210, deaths: 9 }
    },
    { 
      id: 'p-6', 
      server_id: 's-1', 
      uuid: 'u-6', 
      username: 'Luna', 
      is_online: true, 
      ping: 110, 
      health: 14, 
      food: 12, 
      level: 19, 
      experience: 2100,
      armor: 4,
      role: 'Minera',
      inventory: [
        { slot: 0, item: 'diamond_pickaxe', count: 1, name: 'Pico Eficiencia IV' },
        { slot: 1, item: 'iron_pickaxe', count: 2, name: 'Pico de Hierro' },
        { slot: 2, item: 'torch', count: 64, name: 'Antorchas' },
        { slot: 3, item: 'redstone', count: 64, name: 'Redstone' },
        { slot: 4, item: 'lapis_lazuli', count: 42, name: 'Lapislázuli' },
        { slot: 5, item: 'iron_ore', count: 36, name: 'Mineral de Hierro' },
        { slot: 6, item: 'gold_ore', count: 18, name: 'Mineral de Oro' },
        { slot: 7, item: 'diamond', count: 7, name: 'Diamantes' },
        { slot: 8, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 9, item: 'cobblestone', count: 64, name: 'Adoquín' },
        { slot: 10, item: 'bread', count: 14, name: 'Pan' },
        { slot: 11, item: 'amethyst_shard', count: 16, name: 'Fragmentos de Amatista' },
        { slot: 12, item: 'furnace', count: 3, name: 'Horno' },
        { slot: 13, item: 'chest', count: 2, name: 'Cofre' }
      ],
      stats: { playtime_minutes: 2100, blocks_mined: 18500, mobs_killed: 340, deaths: 22 }
    },
    { 
      id: 'p-7', 
      server_id: 's-1', 
      uuid: 'u-7', 
      username: 'Cris', 
      is_online: true, 
      ping: 142, 
      health: 20, 
      food: 18, 
      level: 31, 
      experience: 3600,
      armor: 10,
      role: 'Explorador',
      inventory: [
        { slot: 0, item: 'trident', count: 1, name: 'Tridente con Lealtad' },
        { slot: 1, item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
        { slot: 2, item: 'diamond_sword', count: 1, name: 'Espada de Diamante' },
        { slot: 3, item: 'cooked_cod', count: 32, name: 'Bacalao Cocinado' },
        { slot: 4, item: 'prismarine_shard', count: 24, name: 'Fragmentos de Prismarina' },
        { slot: 5, item: 'sea_lantern', count: 8, name: 'Linterna Marina' },
        { slot: 6, item: 'heart_of_the_sea', count: 1, name: 'Corazón del Mar' },
        { slot: 7, item: 'ender_pearl', count: 6, name: 'Perlas de Ender' },
        { slot: 8, item: 'spyglass', count: 1, name: 'Catalejo' },
        { slot: 9, item: 'golden_apple', count: 2, name: 'Manzana Dorada' },
        { slot: 10, item: 'shield', count: 1, name: 'Escudo' },
        { slot: 11, item: 'red_bed', count: 1, name: 'Cama Roja' },
        { slot: 12, item: 'chest', count: 2, name: 'Cofre' },
        { slot: 13, item: 'oak_boat', count: 1, name: 'Barca de Roble' }
      ],
      stats: { playtime_minutes: 2800, blocks_mined: 7600, mobs_killed: 610, deaths: 14 }
    }
  ],
  commands: [],
  audit_logs: [
    {
      id: 'a-1',
      server_id: 's-1',
      user_email: 'roger@mcdesk.io',
      action: 'SERVER_CLAIMED',
      details: { message: 'Servidor verificado mediante MC-Desk Agent' },
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ]
};

async function query(text, params = []) {
  if (pool) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv !== 'production') {
      console.log('Executed query', { text: text.slice(0, 80), duration, rows: res.rowCount });
    }
    return res;
  }
  return null;
}

function initPersistence() {
  if (config.databaseUrl) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf8');
      const data = JSON.parse(content);
      if (Array.isArray(data.users)) memoryStore.users = data.users;
      if (Array.isArray(data.servers)) memoryStore.servers = data.servers;
      if (Array.isArray(data.players)) memoryStore.players = data.players;
      if (Array.isArray(data.commands)) memoryStore.commands = data.commands;
      if (Array.isArray(data.audit_logs)) memoryStore.audit_logs = data.audit_logs;
      console.log(`[DB] 💾 Datos persistentes cargados (${memoryStore.servers.length} servidores, ${memoryStore.players.length} jugadores).`);
    } else {
      saveStore();
    }
  } catch (err) {
    console.warn('[DB] No se pudo cargar data/store.json:', err.message);
  }
}

let saveTimeout = null;
function saveStore() {
  if (config.databaseUrl) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB] Error al persistir store.json:', err.message);
    }
  }, 150);
}

// Initialize on startup
initPersistence();

module.exports = {
  query,
  pool,
  memoryStore,
  saveStore
};
