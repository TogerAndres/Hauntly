import React from 'react';
import { McPlayerFace } from '../ui/MinecraftSprites';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ activeTab, setActiveTab, onOpenConsole, onOpenAudit, onOpenBackups, onOpenSettings }) {
  const { user, isAdmin, isPlayer, linkedPlayer, logout } = useAuth();

  const allNavItems = [
    { id: 'inicio', label: isPlayer ? 'Mi HUD & Estado' : 'Inicio / Métricas', icon: '🏠', public: true },
    { id: 'minemarket', label: 'MineMarket Tienda', icon: '🛒', public: true },
    { id: 'inventario', label: isPlayer ? 'Mi Inventario' : 'Inventario', icon: '📦', public: true },
    { id: 'estadisticas', label: isPlayer ? 'Mis Estadísticas' : 'Estadísticas', icon: '📊', public: true },
    { id: 'jugadores', label: 'Jugadores Conectados', icon: '👥', adminOnly: true },
    { id: 'comandos', label: 'Modos de Juego', icon: '🎮', adminOnly: true },
    { id: 'consola', label: 'Consola RCON', icon: '📜', action: onOpenConsole, adminOnly: true },
    { id: 'administracion', label: 'Auditoría Servidor', icon: '🛡️', action: onOpenAudit, adminOnly: true },
    { id: 'backups', label: 'Copias de Seguridad', icon: '💾', action: onOpenBackups, adminOnly: true },
    { id: 'configuracion', label: 'server.properties', icon: '⚙️', action: onOpenSettings, adminOnly: true }
  ];

  // Filter items based on role
  const navItems = allNavItems.filter(item => {
    if (isAdmin) return true;
    return item.public;
  });

  const mcName = isPlayer && linkedPlayer ? linkedPlayer : (user?.displayName || 'Roger');

  return (
    <aside className="mc-sidebar">
      {/* Role Banner */}
      <div style={{
        padding: '8px 12px',
        marginBottom: '8px',
        background: isAdmin ? 'rgba(147, 51, 234, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        border: isAdmin ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '6px',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span style={{ color: isAdmin ? '#c084fc' : '#6ee7b7', fontWeight: 'bold' }}>
          {isAdmin ? '🛡️ VISTA OPERADOR' : '🎮 VISTA JUGADOR'}
        </span>
        <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
          {isAdmin ? 'Sin límites' : `@${linkedPlayer || 'Steve'}`}
        </span>
      </div>

      {/* Navigation Buttons */}
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              if (item.action) {
                item.action();
              } else {
                setActiveTab(item.id);
              }
            }}
            className={`mc-nav-btn ${isActive ? 'mc-nav-btn-active' : ''} transition-transform active:scale-[0.97]`}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* User Info Card */}
      <div className="mc-user-box mt-auto">
        <div className="mc-user-row">
          <McPlayerFace username={mcName} size={32} />
          <div className="mc-user-info">
            <div className="mc-user-name">
              <span>{mcName}</span>
              {isAdmin ? (
                <>
                  <span>👑</span>
                  <span className="mc-admin-badge">Admin</span>
                </>
              ) : (
                <span style={{
                  fontSize: '9px',
                  background: 'rgba(16, 185, 129, 0.25)',
                  color: '#34d399',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace'
                }}>
                  Player
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              {user?.email || 'usuario@mcdesk.io'}
            </div>
          </div>
        </div>

        <button onClick={logout} className="mc-logout-btn transition-transform active:scale-[0.97]">
          <span>🚪</span> Cerrar sesión
        </button>
      </div>

      {/* Lurking Creeper Sprite */}
      <div className="mc-creeper-peeking" title="Shhhhh...">
        <img src="/assets/creeper.jpg" alt="Creeper" />
      </div>
    </aside>
  );
}
