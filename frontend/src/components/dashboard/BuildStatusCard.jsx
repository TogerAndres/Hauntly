import React from 'react';
import { GrassBlockIcon } from '../ui/MinecraftSprites';
import { useServer } from '../../context/ServerContext';

export function BuildStatusCard() {
  const { currentServer } = useServer();

  return (
    <div className="mc-card" style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GrassBlockIcon size={26} />
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0' }}>
              Build {currentServer?.version || '1.21.4'}
            </div>
            <div style={{ fontSize: '11px', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}></span>
              Servidor estable
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>Software</span>
          <span style={{ fontSize: '12px', color: '#facc15', fontWeight: 600 }}>
            {currentServer?.software || 'Paper'}
          </span>
        </div>
      </div>
    </div>
  );
}
