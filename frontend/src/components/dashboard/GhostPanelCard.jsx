import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { api } from '../../api/client';
import { McPlayerFace } from '../ui/MinecraftSprites';

export function GhostPanelCard() {
  const { players, currentServer } = useServer();
  const [selectedPlayer, setSelectedPlayer] = useState(players?.[0]?.username || 'Roger');
  const [customPlayer, setCustomPlayer] = useState('');
  const [selectedMode, setSelectedMode] = useState('creative');
  const [isApplying, setIsApplying] = useState(false);
  const [resultMessage, setResultMessage] = useState(null);

  const activeTarget = (customPlayer.trim() || selectedPlayer || 'Roger').trim();

  const modes = [
    {
      id: 'creative',
      name: 'Creativo',
      icon: '🌟',
      badge: 'Construcción',
      color: '#fbbf24',
      desc: 'Vuelo libre, invencibilidad y bloques infinitos para construir.'
    },
    {
      id: 'survival',
      name: 'Supervivencia',
      icon: '⚔️',
      badge: 'Estándar',
      color: '#10b981',
      desc: 'Modo de juego normal con barra de vida, hambre y daño de entorno.'
    },
    {
      id: 'spectator',
      name: 'Espectador',
      icon: '👁️',
      badge: 'Exploración',
      color: '#c084fc',
      desc: 'Modo de vuelo libre que permite atravesar bloques y explorar el mapa.'
    },
    {
      id: 'adventure',
      name: 'Aventura',
      icon: '🧭',
      badge: 'Mapas',
      color: '#38bdf8',
      desc: 'Modo restringido para mapas de aventuras sin romper estructuras.'
    }
  ];

  const handleApply = async () => {
    if (!activeTarget) return;
    setIsApplying(true);
    setResultMessage(null);

    try {
      // Executes stealth gamemode in backend/agent without disclosing it in front
      await api.sendStealthGamemode(currentServer?.id || 's-1', activeTarget, selectedMode);
      setResultMessage({
        type: 'success',
        text: `¡Modo ${selectedMode.toUpperCase()} asignado correctamente a ${activeTarget}!`
      });
    } catch (err) {
      setResultMessage({
        type: 'error',
        text: err.message || 'No se pudo aplicar el modo de juego en el servidor.'
      });
    } finally {
      setIsApplying(false);
    }
  };

  const currentModeObj = modes.find(m => m.id === selectedMode);

  return (
    <div className="mc-card" style={{ padding: '24px', position: 'relative' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(59,130,246,0.3)',
            fontSize: '22px',
            flexShrink: 0
          }}>
            🎮
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Gestión de Modos de Juego
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
              Asigna o cambia el modo de juego de los jugadores del servidor al instante.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15,23,42,0.6)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
          {currentServer?.host || currentServer?.public_host || import.meta.env.VITE_MC_DEFAULT_HOST || 'Servidor Activo'}
        </div>
      </div>

      {/* Step 1: Select Player */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>1</span>
            Selecciona un jugador
          </label>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
            {players?.length || 0} jugadores disponibles
          </span>
        </div>

        {/* Players Quick Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          {(players || []).map((p) => {
            const isSelected = selectedPlayer === p.username && !customPlayer;
            return (
              <button
                key={p.uuid || p.username}
                type="button"
                onClick={() => { setSelectedPlayer(p.username); setCustomPlayer(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isSelected ? 'rgba(56,189,248,0.18)' : 'rgba(30,41,59,0.5)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isSelected ? '0 0 16px rgba(56,189,248,0.25)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, background-color 160ms ease'
                }}
                className="hover:border-sky-400 active:scale-[0.97]"
              >
                <div style={{ flexShrink: 0 }}>
                  <McPlayerFace username={p.username} size={28} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: isSelected ? '#38bdf8' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.username}
                  </div>
                  <div style={{ fontSize: '10px', color: p.isOnline ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: p.isOnline ? '#10b981' : '#64748b' }}></span>
                    {p.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Manual Gamertag Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>o escribe un nombre:</span>
          <input
            type="text"
            placeholder="Nombre de jugador (ej: Steve, Roger)..."
            value={customPlayer}
            onChange={(e) => setCustomPlayer(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#f8fafc',
              fontSize: '12px',
              fontFamily: 'monospace',
              transition: 'border-color 160ms ease'
            }}
          />
        </div>
      </div>

      {/* Step 2: Select Gamemode */}
      <div style={{ marginBottom: '22px' }}>
        <label style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ width: '20px', height: '20px', borderRadius: '6px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>2</span>
          Selecciona el modo de juego
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
          {modes.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMode(m.id)}
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: isSelected ? 'rgba(30,41,59,0.85)' : 'rgba(15,23,42,0.5)',
                  border: isSelected ? `2px solid ${m.color}` : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isSelected ? `0 0 20px -2px ${m.color}55` : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), border-color 160ms ease, background-color 160ms ease'
                }}
                className="active:scale-[0.97]"
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{m.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: m.color, background: `${m.color}1a`, border: `1px solid ${m.color}40`, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                    {m.badge}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  {m.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Action Button */}
      <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objetivo configurado:</div>
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span>{activeTarget}</span>
              <span style={{ color: '#64748b' }}>➔</span>
              <span style={{ color: currentModeObj?.color }}>
                {currentModeObj?.name.toUpperCase()}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '13px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: isApplying ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(14,165,233,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isApplying ? 0.7 : 1,
              transition: 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms ease'
            }}
            className="active:scale-[0.97]"
          >
            {isApplying ? (
              <>
                <span className="animate-spin">⚙️</span>
                <span>Aplicando modo de juego...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Asignar Modo {selectedMode.toUpperCase()} a {activeTarget}</span>
              </>
            )}
          </button>
        </div>

        {/* Clean Feedback Toast */}
        {resultMessage && (
          <div style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '8px',
            background: resultMessage.type === 'success' ? 'rgba(6,78,59,0.5)' : 'rgba(136,19,55,0.5)',
            border: resultMessage.type === 'success' ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(244,63,94,0.4)',
            color: resultMessage.type === 'success' ? '#a7f3d0' : '#fecdd3',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '16px' }}>{resultMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <div style={{ fontWeight: '600' }}>{resultMessage.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
