import React from 'react';
import { useServer } from '../../context/ServerContext';

export function QuickStatsCard({ player }) {
  const { currentServer, selectedPlayer } = useServer();
  const p = player || selectedPlayer;
  const pStats = p?.stats || {
    playtime_minutes: 3752,
    blocks_mined: 12450,
    mobs_killed: 847,
    deaths: 12
  };

  const playtimeStr = pStats.playtime_minutes 
    ? `${Math.floor(pStats.playtime_minutes / 1440)}d ${Math.floor((pStats.playtime_minutes % 1440) / 60)}h ${pStats.playtime_minutes % 60}m`
    : (currentServer?.uptime || '2d 14h 32m');

  const stats = [
    { label: 'Tiempo en el servidor', value: playtimeStr },
    { label: 'Bloques minados', value: Number(pStats.blocks_mined || 12450).toLocaleString() },
    { label: 'Mobs eliminados', value: Number(pStats.mobs_killed || 847).toLocaleString() },
    { label: 'Muertes', value: pStats.deaths ?? 12, color: '#f87171' },
    { label: 'TPS del servidor', value: currentServer?.tps || '19.8', color: '#4ade80' }
  ];

  return (
    <div className="mc-card">
      {/* Header */}
      <div className="mc-card-header">
        <span style={{ fontSize: '18px' }}>🏆</span>
        <span>Estadísticas rápidas</span>
      </div>

      <div className="mc-quick-stats-list">
        {stats.map((s, idx) => (
          <div key={idx} className="mc-quick-stat-item">
            <span className="stat-label">{s.label}</span>
            <span className="stat-value" style={{ color: s.color || '#f1f5f9' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
