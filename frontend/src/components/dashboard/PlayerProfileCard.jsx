import React, { useState } from 'react';
import { GrassBlockIcon, McHeart, McFood } from '../ui/MinecraftSprites';
import { useServer } from '../../context/ServerContext';
import { api } from '../../api/client';

export function PlayerProfileCard({ player }) {
  const { currentServer, selectedPlayer, refresh } = useServer();
  const [actionFeedback, setActionFeedback] = useState(null);
  const [executing, setExecuting] = useState(false);

  const p = player || selectedPlayer || {
    username: 'Roger',
    role: 'Admin',
    health: 20,
    food: 18,
    level: 27,
    armor: 10,
    experience: 3420
  };

  // 10 Hearts visual with full, half, empty calculation
  const hp = p.health ?? 20;
  const hearts = Array.from({ length: 10 }, (_, i) => {
    const remaining = hp - i * 2;
    if (remaining >= 2) return 'full';
    if (remaining === 1) return 'half';
    return 'empty';
  });

  // 10 Food drumsticks visual with full, half, empty calculation
  const food = p.food ?? 18;
  const foods = Array.from({ length: 10 }, (_, i) => {
    const remaining = food - i * 2;
    if (remaining >= 2) return 'full';
    if (remaining === 1) return 'half';
    return 'empty';
  });

  const handleAction = async (actionType, extra = {}) => {
    if (!p.username) return;
    setExecuting(true);
    setActionFeedback(null);
    try {
      const res = await api.sendQuickAction(currentServer?.id || 's-1', actionType, p.username, {
        player: p.username,
        ...extra
      });
      setActionFeedback({ success: res.success !== false, message: res.message || `Acción '${actionType}' enviada.` });
      setTimeout(() => refresh(), 2500);
    } catch (err) {
      setActionFeedback({ success: false, message: 'Error: ' + err.message });
    } finally {
      setExecuting(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const title = p.username === 'Roger' ? 'Tu perfil' : `Perfil de ${p.username}`;

  return (
    <div className="mc-card">
      {/* Header */}
      <div className="mc-card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GrassBlockIcon size={18} />
          <span>{title}</span>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
          UUID: {p.uuid ? p.uuid.substring(0, 8) + '...' : 'local'}
        </span>
      </div>

      <div className="mc-profile-split">
        {/* Left: 3D Player Avatar & Stats */}
        <div className="mc-profile-left">
          {/* 3D Minecraft Character Avatar with real Mojang skin resolution */}
          <div className="mc-avatar-3d-box" title={`Skin 3D de ${p.username}`}>
            <img 
              src={`https://mc-heads.net/body/${encodeURIComponent(p.username)}/right`} 
              alt={p.username}
              onError={(e) => {
                if (e.currentTarget.src.includes('mc-heads.net')) {
                  e.currentTarget.src = `https://minotar.net/armor/bust/${encodeURIComponent(p.username)}/100.png`;
                }
              }}
              style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            />
          </div>

          {/* Stats Lines */}
          <div className="mc-profile-stats">
            <div className="mc-profile-header-row">
              <span className="mc-profile-name">{p.username}</span>
              <span>👑</span>
              <span className="mc-admin-badge">{p.role || 'Jugador'}</span>
            </div>

            {/* Health */}
            <div className="mc-stat-line">
              <span className="lbl">❤️ Vida:</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {hearts.map((type, i) => (
                  <McHeart key={i} type={type} />
                ))}
              </div>
              <span className="val">{p.health} / 20</span>
            </div>

            {/* Food */}
            <div className="mc-stat-line">
              <span className="lbl">🍗 Comida:</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {foods.map((type, i) => (
                  <McFood key={i} type={type} />
                ))}
              </div>
              <span className="val">{p.food} / 20</span>
            </div>

            {/* Level */}
            <div className="mc-stat-line">
              <span className="lbl">🟢 Nivel:</span>
              <span className="val" style={{ color: '#4ade80', fontFamily: 'var(--font-pixel)' }}>{p.level}</span>
            </div>

            {/* Armor */}
            <div className="mc-stat-line">
              <span className="lbl">🛡️ Armadura:</span>
              <span className="val">{p.armor}</span>
            </div>

            {/* Exp */}
            <div className="mc-stat-line">
              <span className="lbl">✨ Experiencia:</span>
              <span className="val">{(p.experience || 0).toLocaleString()}</span>
            </div>

            {/* Moderation Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              <button 
                onClick={() => handleAction('heal')} 
                disabled={executing}
                className="mc-btn text-xs" 
                style={{ padding: '3px 8px', fontSize: '10px' }}
                title="Sanar vida al máximo"
              >
                💖 Sanar
              </button>
              <button 
                onClick={() => handleAction('feed')} 
                disabled={executing}
                className="mc-btn text-xs" 
                style={{ padding: '3px 8px', fontSize: '10px' }}
                title="Llenar barra de comida"
              >
                🍗 Alimentar
              </button>
              <button 
                onClick={() => handleAction('teleport_spawn')} 
                disabled={executing}
                className="mc-btn text-xs" 
                style={{ padding: '3px 8px', fontSize: '10px' }}
                title="Teletransportar al punto de spawn"
              >
                📍 Spawn
              </button>
              <button 
                onClick={() => handleAction('give', { item: 'golden_apple', count: 4 })} 
                disabled={executing}
                className="mc-btn text-xs" 
                style={{ padding: '3px 8px', fontSize: '10px' }}
                title="Entregar 4 Manzanas Doradas"
              >
                🍏 +4 Manzanas
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`¿Expulsar a ${p.username} del servidor?`)) {
                    handleAction('kick');
                  }
                }} 
                disabled={executing}
                className="mc-btn text-xs" 
                style={{ padding: '3px 8px', fontSize: '10px', color: '#f87171' }}
                title="Expulsar jugador de la sesión actual"
              >
                🚪 Kick
              </button>
            </div>

            {/* Action execution feedback banner */}
            {actionFeedback && (
              <div 
                style={{ 
                  marginTop: '8px', 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px',
                  backgroundColor: actionFeedback.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  border: actionFeedback.success ? '1px solid #22c55e' : '1px solid #ef4444',
                  color: actionFeedback.success ? '#86efac' : '#fca5a5',
                  fontFamily: 'monospace'
                }}
              >
                {actionFeedback.message}
              </div>
            )}
          </div>
        </div>

        {/* Right: Gengar Inspirational Quote Box */}
        <div className="mc-quote-box">
          <img src="/assets/gengar.jpg" alt="Gengar Mascot" />
          <p className="mc-quote-text">
            &ldquo;Los grandes servidores no se construyen solos.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
