import React, { useState, useEffect } from 'react';
import { GrassBlockIcon } from '../ui/MinecraftSprites';
import { useAuth } from '../../context/AuthContext';

export function Header({ onOpenClaimModal }) {
  const { isDemoMode } = useAuth();
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
            {isDemoMode && (
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
            )}
          </div>
          <p className="mc-logo-sub">Gestiona tu servidor, en un solo lugar</p>
        </div>
      </div>

      {/* Right Clock & Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onOpenClaimModal}
          className="mc-nav-btn"
          style={{ padding: '6px 12px', fontSize: '12px', width: 'auto' }}
          title="Vincular un servidor"
        >
          <span>➕</span> Agregar Servidor
        </button>

        <div className="mc-clock-pill">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GrassBlockIcon size={16} />
            <span>MC-DESK</span>
          </div>
          <span style={{ color: '#475569' }}>|</span>
          <span className="time-val">{timeStr}</span>
        </div>
      </div>
    </header>
  );
}
