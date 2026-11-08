import React, { useState } from 'react';
import { GrassBlockIcon } from '../ui/MinecraftSprites';
import { useServer } from '../../context/ServerContext';
import { api } from '../../api/client';

export function ServerStatusCard() {
  const { currentServer, refresh } = useServer();
  const [copied, setCopied] = useState(false);
  const [waking, setWaking] = useState(false);
  const [wakeMsg, setWakeMsg] = useState(null);

  const isOnline = currentServer?.status === 'ONLINE';
  const minecraftIp = currentServer?.minecraft_ip || currentServer?.public_host || import.meta.env.VITE_MC_DEFAULT_HOST || 'mc.ejemplo.com';
  const onlineCount = currentServer?.online_players ?? 0;
  const isChunky = currentServer?.is_chunky_running;
  const remMin = currentServer?.remaining_minutes ?? 35;
  const idleMin = currentServer?.idle_minutes ?? 0;

  const handleCopyIp = () => {
    navigator.clipboard.writeText(minecraftIp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWakeServer = async () => {
    setWaking(true);
    setWakeMsg(null);
    try {
      const res = await api.wakeServer(currentServer?.id || 's-1');
      setWakeMsg(res.message || '¡Paquete de inicio enviado!');
      setTimeout(() => refresh(), 3000);
    } catch (err) {
      setWakeMsg('Error al despertar: ' + err.message);
    } finally {
      setWaking(false);
    }
  };

  return (
    <div className="mc-card">
      {/* Header */}
      <div className="mc-card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GrassBlockIcon size={18} />
          <span>{currentServer?.name || 'Estado del servidor'}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#a7f3d0', fontFamily: 'monospace' }}>
          {currentServer?.software || 'Forge 1.20.1'}
        </div>
      </div>

      <div className="mc-status-row">
        {/* Left Column: Big Status & Stats boxes */}
        <div>
          <div className="mc-online-title" style={{ gap: '10px' }}>
            <div 
              className="mc-online-indicator" 
              style={{
                backgroundColor: isOnline ? 'var(--mc-green-glow)' : '#facc15',
                boxShadow: isOnline ? '0 0 16px var(--mc-green-glow)' : '0 0 16px #facc15'
              }}
            />
            <span style={{ color: isOnline ? 'var(--mc-green-glow)' : '#facc15', fontSize: '20px' }}>
              {isOnline ? 'ONLINE' : 'EN REPOSO (zZ)'}
            </span>

            {!isOnline && (
              <button
                onClick={handleWakeServer}
                disabled={waking}
                className="mc-btn mc-btn-active text-xs"
                style={{ padding: '4px 10px', marginLeft: 'auto', fontSize: '11px' }}
                title="Despertar e iniciar Minecraft en el servidor"
              >
                {waking ? 'Iniciando...' : '⚡ Despertar'}
              </button>
            )}
          </div>

          {wakeMsg && (
            <div style={{ fontSize: '11px', color: '#a7f3d0', marginBottom: '8px', fontFamily: 'monospace' }}>
              {wakeMsg}
            </div>
          )}

          {/* Auto-Shutdown Timer Badge */}
          {isOnline && (
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                marginBottom: '10px',
                fontFamily: 'monospace',
                backgroundColor: onlineCount > 0 
                  ? 'rgba(34, 197, 94, 0.15)' 
                  : isChunky 
                  ? 'rgba(56, 189, 248, 0.15)' 
                  : remMin <= 5 
                  ? 'rgba(239, 68, 68, 0.2)' 
                  : 'rgba(250, 204, 21, 0.15)',
                border: `1px solid ${
                  onlineCount > 0 
                    ? 'rgba(34, 197, 94, 0.4)' 
                    : isChunky 
                    ? 'rgba(56, 189, 248, 0.4)' 
                    : remMin <= 5 
                    ? 'rgba(239, 68, 68, 0.5)' 
                    : 'rgba(250, 204, 21, 0.4)'
                }`,
                color: onlineCount > 0 
                  ? '#86efac' 
                  : isChunky 
                  ? '#7dd3fc' 
                  : remMin <= 5 
                  ? '#fca5a5' 
                  : '#fde047'
              }}
            >
              <span>⏳</span>
              <span>
                {onlineCount > 0 
                  ? 'Auto-apagado cancelado: Jugadores activos' 
                  : isChunky 
                  ? 'Auto-apagado pausado: Chunky precargando mapa' 
                  : `Cierre automático: Faltan ${remMin} min (inactivo ${idleMin}/35 min)`}
              </span>
            </div>
          )}

          <div className="mc-stat-boxes">
            <div className="mc-stat-box">
              <span style={{ fontSize: '14px' }}>👥</span>
              <div className="mc-stat-box-val">
                {onlineCount} / {currentServer?.max_players || 10}
              </div>
              <div className="mc-stat-box-lbl">Jugadores</div>
            </div>

            <div className="mc-stat-box">
              <span style={{ fontSize: '14px' }}>⚙️</span>
              <div className="mc-stat-box-val" style={{ color: '#38bdf8' }}>
                {currentServer?.cpu_usage ?? 0.0}%
              </div>
              <div className="mc-stat-box-lbl">CPU ({currentServer?.cpu_temp || '46°C'})</div>
            </div>

            <div className="mc-stat-box">
              <span style={{ fontSize: '14px' }}>💾</span>
              <div className="mc-stat-box-val" style={{ color: '#a855f7' }}>
                {currentServer?.ram_usage ?? 8.5}%
              </div>
              <div className="mc-stat-box-lbl">RAM Host</div>
            </div>
          </div>
        </div>

        {/* Right Column: World Preview & Server IP */}
        <div>
          <div className="mc-world-preview">
            <img src="/assets/island.jpg" alt="Minecraft World Preview" />
          </div>

          <div className="mc-ip-pill" onClick={handleCopyIp} title="Clic para copiar la IP pública para unirse a Minecraft">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px' }}>🔗</span>
              <span className="mc-ip-text">{minecraftIp}</span>
            </div>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {copied ? '¡Copiado!' : 'IP Minecraft'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
