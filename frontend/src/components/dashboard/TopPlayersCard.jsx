import React from 'react';
import { McPlayerFace } from '../ui/MinecraftSprites';
import { useServer } from '../../context/ServerContext';

export function TopPlayersCard() {
  const { topPlayers } = useServer();

  return (
    <div className="mc-card">
      {/* Header */}
      <div className="mc-card-header">
        <span style={{ fontSize: '18px' }}>🏆</span>
        <span>Top Jugadores</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {topPlayers.map((tp, idx) => (
          <div 
            key={idx} 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.06)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: 'monospace', color: '#94a3b8', width: '16px' }}>
                {tp.rank || idx + 1}.
              </span>
              <McPlayerFace username={tp.username} size={22} />
              <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{tp.username}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: '11px', color: '#facc15' }}>
              Nivel {tp.level}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
