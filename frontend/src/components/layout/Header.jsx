import React, { useState, useEffect } from 'react';
import { GrassBlockIcon } from '../ui/MinecraftSprites';
import { useAuth } from '../../context/AuthContext';

export function Header({ onOpenClaimModal }) {
  const { user, isDemoMode, isAdmin, isPlayer, linkedPlayer, logout } = useAuth();
  const [timeStr, setTimeStr] = useState('18:42 ☀️');

  useEffect(() => {
    function updateClock() {
      const d = new Date();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const icon = d.getHours() >= 6 && d.getHours() < 19 ? '☀️' : '🌙';
      setTimeStr(`${hours}:${mins} ${icon}`);
    }
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  const mcHead = linkedPlayer
    ? `https://mc-heads.net/avatar/${linkedPlayer}`
    : 'https://mc-heads.net/avatar/Steve';

  return (
    <header className="mc-top-header">
      {/* Left Branding with Gengar and 3D MC-DESK */}
      <div className="mc-brand-group">
        <div className="mc-gengar-avatar">
          <img src="/assets/gengar.jpg" alt="Gengar MC-Desk" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 className="mc-logo-text">MC-DESK</h1>
            {isDemoMode ? (
              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-pixel)',
                padding: '2px 6px',
                borderRadius: '3px',
                background: 'rgba(147, 51, 234, 0.4)',
                border: '1px solid rgba(168, 85, 247, 0.6)',
                color: '#d8b4fe'
              }}>
                DEMO
              </span>
            ) : (
              <span style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                padding: '2px 6px',
                borderRadius: '4px',
                background: isAdmin ? 'rgba(147, 51, 234, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                border: isAdmin ? '1px solid #a855f7' : '1px solid #10b981',
                color: isAdmin ? '#c084fc' : '#6ee7b7',
                fontWeight: 'bold'
              }}>
                {isAdmin ? '🛡️ ADMIN' : '🎮 JUGADOR'}
              </span>
            )}
          </div>
          <p className="mc-logo-sub">
            {isPlayer && linkedPlayer
              ? `Conectado a ${linkedPlayer} en el servidor`
              : 'Gestiona tu servidor, en un solo lugar'}
          </p>
        </div>
      </div>

      {/* Right User Status, Clock & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* User Profile Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15,23,42,0.7)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '12px'
        }}>
          <img
            src={mcHead}
            alt="Avatar"
            style={{ width: '22px', height: '22px', borderRadius: '4px', objectFit: 'contain' }}
            onError={(e) => { e.target.src = 'https://mc-heads.net/avatar/Steve'; }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '11px', lineHeight: 1.1 }}>
              {isPlayer && linkedPlayer ? linkedPlayer : (user?.displayName || 'Admin')}
            </span>
            <span style={{ color: isAdmin ? '#c084fc' : '#10b981', fontSize: '9px', fontFamily: 'monospace' }}>
              {isAdmin ? '🛡️ Acceso Total' : '🟢 Servidor Vinculado'}
            </span>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenClaimModal}
            className="mc-nav-btn"
            style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
            title="Vincular un servidor"
          >
            <span>➕</span> Agregar Servidor
          </button>
        )}

        <div className="mc-clock-pill">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GrassBlockIcon size={16} />
            <span>MC-DESK</span>
          </div>
          <span style={{ color: '#475569' }}>|</span>
          <span className="time-val">{timeStr}</span>
        </div>

        <button
          onClick={logout}
          title="Cerrar Sesión"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            padding: '5px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.15s ease'
          }}
          className="hover:bg-red-900/40 active:scale-95"
        >
          🚪 Salir
        </button>
      </div>
    </header>
  );
}
