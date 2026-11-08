import React from 'react';
import { McPlayerFace, McHeart, McFood } from '../ui/MinecraftSprites';
import { SignalBars } from '../ui/SignalBars';
import { useServer } from '../../context/ServerContext';

export function ConnectedPlayersList() {
  const { players, currentServer, selectedPlayer, setSelectedPlayer } = useServer();

  const onlinePlayers = players.filter(p => p.isOnline);
  const offlinePlayers = players.filter(p => !p.isOnline);
  const maxCap = currentServer?.max_players || 10;

  const renderPlayerRow = (p, idx, isOnline) => {
    const hp = p.health ?? 20;
    const food = p.food ?? 18;
    const isSelected = selectedPlayer?.username === p.username;

    return (
      <div 
        key={p.username || idx} 
        className={`mc-player-row ${isSelected ? 'mc-player-row-selected' : ''}`}
        onClick={() => setSelectedPlayer(p)}
        style={{
          cursor: 'pointer',
          borderColor: isSelected ? 'var(--mc-green-glow)' : undefined,
          background: isSelected ? 'rgba(34, 197, 94, 0.12)' : undefined,
          opacity: isOnline ? 1 : 0.82
        }}
        title={`Clic para inspeccionar inventario y estadísticas de ${p.username}`}
      >
        <div className="mc-player-left">
          <McPlayerFace username={p.username} size={30} />
          <div className="mc-player-details">
            <div className="mc-player-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{p.username}</span>
              {p.role && (
                <span style={{ fontSize: '10px', color: p.role === 'Admin' ? '#4ade80' : '#38bdf8', fontFamily: 'monospace' }}>
                  [{p.role}]
                </span>
              )}
            </div>
            {/* Hearts & Food */}
            <div className="mc-hud-bars">
              <div style={{ display: 'flex', gap: '1px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const rem = hp - i * 2;
                  const type = rem >= 2 ? 'full' : rem === 1 ? 'half' : 'empty';
                  return <McHeart key={i} type={type} size={10} />;
                })}
              </div>
            </div>
            <div className="mc-hud-bars" style={{ marginTop: '1px' }}>
              <div style={{ display: 'flex', gap: '1px' }}>
                {Array.from({ length: 10 }).map((_, i) => {
                  const rem = food - i * 2;
                  const type = rem >= 2 ? 'full' : rem === 1 ? 'half' : 'empty';
                  return <McFood key={i} type={type} size={10} />;
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Latency Signal or Offline Status */}
        {isOnline ? (
          <SignalBars ping={p.ping || 28} />
        ) : (
          <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
            Desconectado
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="mc-card">
      {/* Header */}
      <div className="mc-card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>👥</span>
          <span>Jugadores conectados</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: onlinePlayers.length > 0 ? '#4ade80' : '#94a3b8' }}>
          {onlinePlayers.length} / {maxCap}
        </span>
      </div>

      {/* Players List */}
      <div className="mc-players-list">
        {onlinePlayers.length > 0 ? (
          onlinePlayers.map((p, idx) => renderPlayerRow(p, idx, true))
        ) : (
          <div style={{
            padding: '10px 8px',
            textAlign: 'center',
            background: 'rgba(0, 0, 0, 0.35)',
            borderRadius: '6px',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
            marginBottom: '4px'
          }}>
            <span style={{ fontSize: '16px', display: 'block', marginBottom: '2px' }}>💤</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>No hay jugadores conectados ahora</span>
          </div>
        )}

        {/* Recent / Registered Players Section */}
        {offlinePlayers.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#94a3b8', 
              fontFamily: 'monospace',
              padding: '2px 4px 6px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <span>Jugadores registrados ({offlinePlayers.length}):</span>
              <span style={{ fontSize: '10px', color: '#64748b' }}>Clic para ver perfil</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {offlinePlayers.map((p, idx) => renderPlayerRow(p, idx, false))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

