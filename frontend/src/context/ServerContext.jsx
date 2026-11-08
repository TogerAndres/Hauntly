import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const ServerContext = createContext(null);

export const DEMO_SERVER = {
  id: 's-demo',
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
  cpu_usage: 26.5,
  ram_usage: 50.8,
  cpu_temp: '64.0°C',
  is_verified: true
};

export const DEFAULT_ROGER_INVENTORY = [
  { item: 'diamond_sword', count: 1, name: 'Espada de Diamante' },
  { item: 'bow', count: 1, name: 'Arco' },
  { item: 'diamond_axe', count: 1, name: 'Hacha de Diamante' },
  { item: 'crossbow', count: 1, name: 'Ballesta' },
  { item: 'cobblestone', count: 64, name: 'Adoquín' },
  { item: 'oak_planks', count: 32, name: 'Madera de Roble' },
  { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
  { item: 'bread', count: 16, name: 'Pan' },
  { item: 'ender_pearl', count: 8, name: 'Perla de Ender' },
  { item: 'golden_apple', count: 3, name: 'Manzana Dorada' },
  { item: 'carrot', count: 12, name: 'Zanahoria' },
  { item: 'red_bed', count: 1, name: 'Cama Roja' },
  { item: 'ender_chest', count: 1, name: 'Cofre de Ender' },
  { item: 'chest', count: 1, name: 'Cofre' }
];

export const DEMO_PLAYERS = [
  { 
    username: 'Roger', 
    isOnline: true, 
    ping: 32, 
    health: 20, 
    food: 18, 
    level: 27, 
    experience: 3420, 
    armor: 10, 
    role: 'Admin',
    inventory: DEFAULT_ROGER_INVENTORY,
    stats: { playtime_minutes: 3752, blocks_mined: 12450, mobs_killed: 847, deaths: 12 }
  },
  { 
    username: 'Alex', 
    isOnline: true, 
    ping: 48, 
    health: 20, 
    food: 20, 
    level: 63, 
    experience: 8400, 
    armor: 15,
    role: 'VIP',
    inventory: [
      { item: 'netherite_sword', count: 1, name: 'Espada de Netherite' },
      { item: 'bow', count: 1, name: 'Arco Poder V' },
      { item: 'diamond_pickaxe', count: 1, name: 'Pico de Diamante' },
      { item: 'golden_apple', count: 16, name: 'Manzana Dorada' },
      { item: 'golden_carrot', count: 32, name: 'Zanahoria Dorada' },
      { item: 'ender_pearl', count: 16, name: 'Perlas de Ender' },
      { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
      { item: 'arrow', count: 64, name: 'Flechas' },
      { item: 'totem_of_undying', count: 1, name: 'Tótem' },
      { item: 'cooked_beef', count: 64, name: 'Filete' },
      { item: 'elytra', count: 1, name: 'Élitros' },
      { item: 'firework_rocket', count: 64, name: 'Cohetes' },
      { item: 'netherite_chestplate', count: 1, name: 'Peto' },
      { item: 'ender_chest', count: 1, name: 'Cofre de Ender' }
    ],
    stats: { playtime_minutes: 5820, blocks_mined: 24100, mobs_killed: 1620, deaths: 8 }
  },
  { 
    username: 'Santi', 
    isOnline: true, 
    ping: 64, 
    health: 18, 
    food: 16, 
    level: 38, 
    experience: 4100, 
    armor: 8,
    role: 'Jugador',
    inventory: [
      { item: 'iron_sword', count: 1, name: 'Espada de Hierro' },
      { item: 'shield', count: 1, name: 'Escudo' },
      { item: 'iron_pickaxe', count: 1, name: 'Pico de Hierro' },
      { item: 'bread', count: 32, name: 'Pan' },
      { item: 'torch', count: 64, name: 'Antorchas' },
      { item: 'cobblestone', count: 64, name: 'Adoquín' },
      { item: 'coal', count: 24, name: 'Carbón' },
      { item: 'oak_planks', count: 48, name: 'Madera de Roble' },
      { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
      { item: 'iron_ingot', count: 14, name: 'Hierro' },
      { item: 'chest', count: 4, name: 'Cofre' },
      { item: 'red_bed', count: 1, name: 'Cama Roja' },
      { item: 'cooked_porkchop', count: 12, name: 'Chuleta' },
      { item: 'apple', count: 8, name: 'Manzanas' }
    ],
    stats: { playtime_minutes: 2430, blocks_mined: 8900, mobs_killed: 430, deaths: 19 }
  },
  { 
    username: 'Valen', 
    isOnline: true, 
    ping: 77, 
    health: 16, 
    food: 14, 
    level: 42, 
    experience: 5200, 
    armor: 12,
    role: 'Arquero',
    inventory: [
      { item: 'bow', count: 1, name: 'Arco de Precisión' },
      { item: 'crossbow', count: 1, name: 'Ballesta Pesada' },
      { item: 'arrow', count: 64, name: 'Flechas' },
      { item: 'spectral_arrow', count: 16, name: 'Flechas Espectrales' },
      { item: 'diamond_sword', count: 1, name: 'Espada de Diamante' },
      { item: 'golden_carrot', count: 24, name: 'Zanahoria Dorada' },
      { item: 'potion', count: 3, name: 'Poción' },
      { item: 'ender_pearl', count: 12, name: 'Perlas' },
      { item: 'red_bed', count: 1, name: 'Cama Roja' },
      { item: 'bread', count: 20, name: 'Pan' },
      { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
      { item: 'feather', count: 32, name: 'Plumas' },
      { item: 'flint', count: 28, name: 'Pedernal' },
      { item: 'target', count: 2, name: 'Diana' }
    ],
    stats: { playtime_minutes: 3100, blocks_mined: 9500, mobs_killed: 980, deaths: 15 }
  },
  { 
    username: 'Toger', 
    isOnline: true, 
    ping: 91, 
    health: 20, 
    food: 19, 
    level: 25, 
    experience: 3100, 
    armor: 6,
    role: 'Pescador',
    inventory: [
      { item: 'fishing_rod', count: 1, name: 'Caña' },
      { item: 'cooked_salmon', count: 32, name: 'Salmón Asado' },
      { item: 'salmon', count: 20, name: 'Salmón Crudo' },
      { item: 'oak_boat', count: 2, name: 'Barca' },
      { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
      { item: 'compass', count: 1, name: 'Brújula' },
      { item: 'lead', count: 2, name: 'Riendas' },
      { item: 'clock_00', count: 1, name: 'Reloj' },
      { item: 'iron_sword', count: 1, name: 'Espada de Hierro' },
      { item: 'bread', count: 18, name: 'Pan' },
      { item: 'campfire', count: 2, name: 'Hoguera' },
      { item: 'barrel', count: 4, name: 'Barril' },
      { item: 'kelp', count: 45, name: 'Algas' },
      { item: 'nautilus_shell', count: 3, name: 'Caparazón' }
    ],
    stats: { playtime_minutes: 1850, blocks_mined: 4200, mobs_killed: 210, deaths: 9 }
  },
  { 
    username: 'Luna', 
    isOnline: true, 
    ping: 110, 
    health: 14, 
    food: 12, 
    level: 19, 
    experience: 2100, 
    armor: 4,
    role: 'Minera',
    inventory: [
      { item: 'diamond_pickaxe', count: 1, name: 'Pico Diamante' },
      { item: 'iron_pickaxe', count: 2, name: 'Pico Hierro' },
      { item: 'torch', count: 64, name: 'Antorchas' },
      { item: 'redstone', count: 64, name: 'Redstone' },
      { item: 'lapis_lazuli', count: 42, name: 'Lapislázuli' },
      { item: 'iron_ore', count: 36, name: 'Mineral Hierro' },
      { item: 'gold_ore', count: 18, name: 'Mineral Oro' },
      { item: 'diamond', count: 7, name: 'Diamantes' },
      { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
      { item: 'cobblestone', count: 64, name: 'Adoquín' },
      { item: 'bread', count: 14, name: 'Pan' },
      { item: 'amethyst_shard', count: 16, name: 'Amatista' },
      { item: 'furnace', count: 3, name: 'Horno' },
      { item: 'chest', count: 2, name: 'Cofre' }
    ],
    stats: { playtime_minutes: 2100, blocks_mined: 18500, mobs_killed: 340, deaths: 22 }
  },
  { 
    username: 'Cris', 
    isOnline: true, 
    ping: 142, 
    health: 20, 
    food: 18, 
    level: 31, 
    experience: 3600, 
    armor: 10,
    role: 'Explorador',
    inventory: [
      { item: 'trident', count: 1, name: 'Tridente' },
      { item: 'water_bucket', count: 1, name: 'Cubo con Agua' },
      { item: 'diamond_sword', count: 1, name: 'Espada de Diamante' },
      { item: 'cooked_cod', count: 32, name: 'Bacalao' },
      { item: 'prismarine_shard', count: 24, name: 'Prismarina' },
      { item: 'sea_lantern', count: 8, name: 'Linterna' },
      { item: 'heart_of_the_sea', count: 1, name: 'Corazón del Mar' },
      { item: 'ender_pearl', count: 6, name: 'Perlas' },
      { item: 'spyglass', count: 1, name: 'Catalejo' },
      { item: 'golden_apple', count: 2, name: 'Manzana Dorada' },
      { item: 'shield', count: 1, name: 'Escudo' },
      { item: 'red_bed', count: 1, name: 'Cama Roja' },
      { item: 'chest', count: 2, name: 'Cofre' },
      { item: 'oak_boat', count: 1, name: 'Barca' }
    ],
    stats: { playtime_minutes: 2800, blocks_mined: 7600, mobs_killed: 610, deaths: 14 }
  }
];

export const DEMO_TOP_PLAYERS = [
  { rank: 1, username: 'Steve', level: 87 },
  { rank: 2, username: 'Alex', level: 63 },
  { rank: 3, username: 'Roger', level: 51 },
  { rank: 4, username: 'Valen', level: 42 },
  { rank: 5, username: 'Santi', level: 38 }
];

export function ServerProvider({ children }) {
  const { isDemoMode } = useAuth();
  const [currentServer, setCurrentServer] = useState(DEMO_SERVER);
  const [servers, setServers] = useState([DEMO_SERVER]);
  const [players, setPlayers] = useState(DEMO_PLAYERS);
  const [selectedPlayer, setSelectedPlayer] = useState(DEMO_PLAYERS[0]);
  const [topPlayers, setTopPlayers] = useState(DEMO_TOP_PLAYERS);
  const [loading, setLoading] = useState(false);

  const fetchServerData = async (serverId = 's-1', isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [srvRes, plyRes, topRes] = await Promise.all([
        api.getServer(serverId).catch(() => ({ server: DEMO_SERVER })),
        api.getPlayers(serverId).catch(() => ({ players: DEMO_PLAYERS })),
        api.getTopPlayers(serverId).catch(() => ({ topPlayers: DEMO_TOP_PLAYERS }))
      ]);

      if (srvRes?.server) {
        setCurrentServer(srvRes.server);
      }
      if (plyRes?.players && plyRes.players.length > 0) {
        setPlayers(plyRes.players);
        // Maintain or update selected player
        setSelectedPlayer(prev => {
          if (!prev) return plyRes.players[0];
          const found = plyRes.players.find(p => p.username === prev.username);
          return found || plyRes.players[0];
        });
      }
      if (topRes?.topPlayers) {
        setTopPlayers(topRes.topPlayers);
      }
    } catch (err) {
      console.warn('Live backend query fallback to local state:', err.message);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    // Immediate initial fetch with loading state
    fetchServerData('s-1', true);
    // Real-time polling every 2 seconds for instant updates
    const interval = setInterval(() => fetchServerData(currentServer?.id || 's-1', false), 2000);
    return () => clearInterval(interval);
  }, [currentServer?.id]);

  return (
    <ServerContext.Provider
      value={{
        currentServer,
        setCurrentServer,
        servers,
        setServers,
        players,
        selectedPlayer,
        setSelectedPlayer,
        topPlayers,
        loading,
        refresh: () => fetchServerData(currentServer?.id || 's-1')
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  return useContext(ServerContext);
}
