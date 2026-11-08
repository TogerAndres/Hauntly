import React from 'react';
import { McPlayerFace } from '../ui/MinecraftSprites';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ activeTab, setActiveTab, onOpenConsole, onOpenAudit, onOpenBackups, onOpenSettings }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'inicio', label: 'Inicio', icon: '🏠' },
    { id: 'minemarket', label: 'MineMarket Tienda', icon: '🛒' },
    { id: 'comandos', label: 'Modos de Juego', icon: '🎮' },
    { id: 'jugadores', label: 'Jugadores', icon: '👥' },
    { id: 'inventario', label: 'Inventario', icon: '📦' },
    { id: 'estadisticas', label: 'Estadísticas', icon: '📊' },
    { id: 'consola', label: 'Consola RCON', icon: '📜', action: onOpenConsole },
    { id: 'administracion', label: 'Auditoría & Admin', icon: '🛡️', action: onOpenAudit },
    { id: 'backups', label: 'Copias de Seguridad', icon: '💾', action: onOpenBackups },
    { id: 'configuracion', label: 'Configuración', icon: '⚙️', action: onOpenSettings }
  ];

  return (
    <aside className="mc-sidebar">
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
            className={`mc-nav-btn ${isActive ? 'mc-nav-btn-active' : ''}`}
          >
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        );
      })}

      {/* User Info Card */}
      <div className="mc-user-box">
        <div className="mc-user-row">
          <McPlayerFace username={user?.displayName || 'Roger'} size={32} />
          <div className="mc-user-info">
            <div className="mc-user-name">
              <span>{user?.displayName || 'Roger'}</span>
              <span>👑</span>
              <span className="mc-admin-badge">Admin</span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
              {user?.email || 'roger@mcdesk.io'}
            </div>
          </div>
        </div>

        <button onClick={logout} className="mc-logout-btn">
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
