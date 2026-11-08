import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';

export function ServerPropertiesModal({ isOpen, onClose }) {
  const { currentServer, refresh } = useServer();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  // Settings State matching Image 5
  const [settings, setSettings] = useState({
    'max-players': '10',
    'gamemode': 'survival',
    'difficulty': 'hard',
    'white-list': 'false',
    'online-mode': 'false', // false = Cracked enabled
    'allow-flight': 'true',
    'force-gamemode': 'false',
    'spawn-protection': '0',
    'require-resource-pack': 'false',
    'resource-pack': '',
    'resource-pack-prompt': '',
    'pvp': 'true',
    'hardcore': 'false',
    'view-distance': '12',
    'simulation-distance': '8',
    'motd': '§6§l-----[ §e§lPorristas Ingenieros §6§l]-----'
  });

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, currentServer?.id]);

  const loadSettings = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await api.getServerSettings(currentServer?.id || 's-1');
      if (res && res.properties && Object.keys(res.properties).length > 0) {
        setSettings(prev => ({
          ...prev,
          ...res.properties
        }));
      }
    } catch (err) {
      console.warn('Could not fetch remote server.properties, using current defaults:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const updateProp = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: String(val) }));
  };

  const handleSave = async (restart = false) => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await api.updateServerSettings(currentServer?.id || 's-1', settings);
      
      if (restart) {
        await api.sendCommand(currentServer?.id || 's-1', 'reload');
        setStatusMsg({ success: true, text: '¡Propiedades guardadas y recarga enviada al servidor!' });
      } else {
        setStatusMsg({ success: true, text: res.message || 'Propiedades guardadas con éxito en server.properties.' });
      }
      setTimeout(() => refresh(), 2500);
    } catch (err) {
      setStatusMsg({ success: false, text: 'Error al guardar: ' + err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  // Helper toggle switch
  const renderToggle = (key, currentValue, onChangeVal) => {
    const isOn = currentValue === 'true';
    return (
      <div 
        onClick={() => onChangeVal(isOn ? 'false' : 'true')}
        style={{
          width: '56px',
          height: '28px',
          backgroundColor: '#26303a',
          borderRadius: '4px',
          padding: '2px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOn ? 'flex-end' : 'flex-start',
          transition: 'all 0.15s ease',
          userSelect: 'none'
        }}
        title={`Clic para cambiar (Actualmente: ${isOn ? 'Activado' : 'Desactivado'})`}
      >
        <div style={{
          width: '24px',
          height: '24px',
          backgroundColor: isOn ? '#10b981' : '#ef4444',
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '13px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
        }}>
          {isOn ? '✓' : '✕'}
        </div>
      </div>
    );
  };

  // Helper Stepper Counter
  const renderStepper = (key, icon, min = 0, max = 100) => {
    const val = parseInt(settings[key] || '0', 10);
    const inc = () => updateProp(key, Math.min(max, val + 1));
    const dec = () => updateProp(key, Math.max(min, val - 1));

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#26303a',
        borderRadius: '4px',
        color: '#ffffff',
        overflow: 'hidden',
        height: '32px'
      }}>
        {icon && <span style={{ padding: '0 8px', fontSize: '13px' }}>{icon}</span>}
        <input 
          type="number"
          value={val}
          onChange={(e) => updateProp(key, Math.max(min, Math.min(max, parseInt(e.target.value, 10) || 0)))}
          style={{
            width: '42px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            textAlign: 'center',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #374151' }}>
          <button 
            type="button" 
            onClick={inc}
            style={{
              background: '#334155',
              border: 'none',
              color: '#ffffff',
              padding: '0 6px',
              fontSize: '10px',
              cursor: 'pointer',
              lineHeight: '16px'
            }}
          >
            +
          </button>
          <button 
            type="button" 
            onClick={dec}
            style={{
              background: '#1e293b',
              border: 'none',
              color: '#ffffff',
              padding: '0 6px',
              fontSize: '10px',
              cursor: 'pointer',
              lineHeight: '16px'
            }}
          >
            -
          </button>
        </div>
      </div>
    );
  };

  // Helper Card Box matching Image 5
  const renderSettingCard = (title, controlElement, subtextKey, subtextVal) => {
    return (
      <div style={{
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Upper White/Light Area */}
        <div style={{
          backgroundColor: '#eef2f6',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: '48px'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#1e293b'
          }}>
            {title}
          </span>
          <div>
            {controlElement}
          </div>
        </div>

        {/* Lower Dark Monospace Bar */}
        <div style={{
          backgroundColor: '#161c22',
          padding: '4px 14px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#94a3b8',
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          {subtextKey}={subtextVal}
        </div>
      </div>
    );
  };

  // Cracked toggle calculation:
  // In server.properties: online-mode=false means Cracked is ON (pirate accounts allowed).
  // online-mode=true means Cracked is OFF (original accounts only).
  const isCracked = settings['online-mode'] === 'false';
  const toggleCracked = () => {
    updateProp('online-mode', isCracked ? 'true' : 'false');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-4xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#242c34',
          borderRadius: '8px',
          border: '2px solid #3d4a57',
          boxShadow: '0 20px 40px rgba(0,0,0,0.85)'
        }}
      >
        {/* Header matching Image 5 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #334155',
          paddingBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1e252d',
              border: '1px solid #475569',
              borderRadius: '4px',
              padding: '4px 8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#38bdf8',
              fontWeight: 'bold'
            }}>
              &lt; / &gt;
            </span>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '20px',
              fontWeight: '800',
              color: '#f8fafc',
              letterSpacing: '-0.3px'
            }}>
              server.properties
            </span>
          </div>

          <button 
            onClick={onClose}
            className="mc-btn text-xs px-3 py-1"
            style={{ color: '#cbd5e1' }}
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Status / Feedback Banner */}
        {statusMsg && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            backgroundColor: statusMsg.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            border: statusMsg.success ? '1px solid #22c55e' : '1px solid #ef4444',
            color: statusMsg.success ? '#86efac' : '#fca5a5'
          }}>
            {statusMsg.text}
          </div>
        )}

        {/* 2-Columns Grid of Properties Cards (Exact replica of Image 5) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '14px'
        }}>
          {/* 1. Slots */}
          {renderSettingCard(
            'Slots',
            renderStepper('max-players', '👥', 1, 100),
            'max-players',
            settings['max-players'] || '10'
          )}

          {/* 2. Gamemode */}
          {renderSettingCard(
            'Gamemode',
            <select
              value={settings['gamemode'] || 'survival'}
              onChange={(e) => updateProp('gamemode', e.target.value)}
              style={{
                backgroundColor: '#26303a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="survival">Survival</option>
              <option value="creative">Creative</option>
              <option value="adventure">Adventure</option>
              <option value="spectator">Spectator</option>
            </select>,
            'gamemode',
            settings['gamemode'] || 'survival'
          )}

          {/* 3. Difficulty */}
          {renderSettingCard(
            'Difficulty',
            <select
              value={settings['difficulty'] || 'hard'}
              onChange={(e) => updateProp('difficulty', e.target.value)}
              style={{
                backgroundColor: '#26303a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="peaceful">Peaceful</option>
              <option value="easy">Easy</option>
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>,
            'difficulty',
            settings['difficulty'] || 'hard'
          )}

          {/* 4. Whitelist */}
          {renderSettingCard(
            'Whitelist',
            renderToggle('white-list', settings['white-list'], (v) => updateProp('white-list', v)),
            'white-list',
            settings['white-list'] || 'false'
          )}

          {/* 5. Cracked */}
          {renderSettingCard(
            'Cracked',
            <div 
              onClick={toggleCracked}
              style={{
                width: '56px',
                height: '28px',
                backgroundColor: '#26303a',
                borderRadius: '4px',
                padding: '2px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCracked ? 'flex-end' : 'flex-start',
                transition: 'all 0.15s ease',
                userSelect: 'none'
              }}
              title={isCracked ? 'Cuentas No-Premium/Piratas permitidas' : 'Solo cuentas Premium'}
            >
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: isCracked ? '#10b981' : '#ef4444',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '13px'
              }}>
                {isCracked ? '✓' : '✕'}
              </div>
            </div>,
            'online-mode',
            settings['online-mode'] || 'false'
          )}

          {/* 6. Fly */}
          {renderSettingCard(
            'Fly',
            renderToggle('allow-flight', settings['allow-flight'], (v) => updateProp('allow-flight', v)),
            'allow-flight',
            settings['allow-flight'] || 'true'
          )}

          {/* 7. Force Gamemode */}
          {renderSettingCard(
            'Force Gamemode',
            renderToggle('force-gamemode', settings['force-gamemode'], (v) => updateProp('force-gamemode', v)),
            'force-gamemode',
            settings['force-gamemode'] || 'false'
          )}

          {/* 8. Spawn Protection */}
          {renderSettingCard(
            'Spawn Protection',
            renderStepper('spawn-protection', '🛡️', 0, 64),
            'spawn-protection',
            settings['spawn-protection'] || '0'
          )}

          {/* 9. Resource pack required */}
          {renderSettingCard(
            'Resource pack required',
            renderToggle('require-resource-pack', settings['require-resource-pack'], (v) => updateProp('require-resource-pack', v)),
            'require-resource-pack',
            settings['require-resource-pack'] || 'false'
          )}

          {/* 10. Resource pack */}
          <div style={{
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              backgroundColor: '#eef2f6',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '48px',
              gap: '12px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap' }}>
                Resource pack
              </span>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#26303a',
                borderRadius: '4px',
                padding: '2px 6px',
                flex: 1,
                maxWidth: '280px'
              }}>
                <span style={{ fontSize: '13px', marginRight: '6px' }}>📄</span>
                <input 
                  type="text"
                  value={settings['resource-pack'] || ''}
                  onChange={(e) => updateProp('resource-pack', e.target.value)}
                  placeholder="https://example.com/pack.zip"
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                <button 
                  type="button" 
                  title="Copiar o cargar enlace"
                  style={{ background: '#3b82f6', border: 'none', borderRadius: '3px', color: '#fff', padding: '2px 6px', fontSize: '11px', cursor: 'pointer' }}
                >
                  ⬆
                </button>
              </div>
            </div>
            <div style={{
              backgroundColor: '#161c22',
              padding: '4px 14px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              resource-pack={settings['resource-pack'] || ''}
            </div>
          </div>

          {/* 11. Resource pack prompt */}
          <div style={{
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 3px 6px rgba(0,0,0,0.35)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              backgroundColor: '#eef2f6',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '48px',
              gap: '12px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', whiteSpace: 'nowrap' }}>
                Resource pack prompt
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, maxWidth: '280px' }}>
                <span style={{ fontSize: '12px' }}>✏️</span>
                <div style={{
                  backgroundImage: "url('/assets/minecraft/textures/block/dirt.png')",
                  backgroundSize: '24px 24px',
                  imageRendering: 'pixelated',
                  borderRadius: '4px',
                  padding: '3px',
                  flex: 1,
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)'
                }}>
                  <input 
                    type="text"
                    value={settings['resource-pack-prompt'] || ''}
                    onChange={(e) => updateProp('resource-pack-prompt', e.target.value)}
                    placeholder="Mensaje de confirmación..."
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      padding: '3px 6px',
                      borderRadius: '2px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{
              backgroundColor: '#161c22',
              padding: '4px 14px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: '#94a3b8'
            }}>
              resource-pack-prompt="{settings['resource-pack-prompt'] || ''}"
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '2px solid #334155',
          paddingTop: '16px',
          marginTop: '8px'
        }}>
          <button 
            type="button"
            onClick={loadSettings}
            disabled={loading || saving}
            className="mc-btn text-xs px-3 py-2"
          >
            {loading ? 'Cargando...' : '🔄 Restaurar desde servidor'}
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="mc-btn mc-btn-active text-xs px-4 py-2"
            >
              {saving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="mc-btn text-xs px-4 py-2"
              style={{ backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#3b82f6' }}
              title="Guarda y envía comando /reload a la consola"
            >
              ⚡ Guardar y Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
