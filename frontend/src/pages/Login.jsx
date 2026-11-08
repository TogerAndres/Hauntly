import React, { useState } from 'react';
import { GengarLogo } from '../components/ui/GengarLogo';
import { useAuth } from '../context/AuthContext';

export function Login({ onEnterDemo }) {
  const { login, register, switchToDemoRole } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('USER'); // 'USER' | 'ADMIN'
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const cleanMc = minecraftUsername.trim().replace(/[^a-zA-Z0-9_]/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (role === 'USER' && !cleanMc) {
          throw new Error('Debes ingresar tu usuario de Minecraft en el servidor');
        }
        await register(email, displayName || cleanMc, password, role, cleanMc);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Error durante la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail, targetPass) => {
    setIsRegister(false);
    setEmail(targetEmail);
    setPassword(targetPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950/80">
      <div className="mc-card w-full max-w-md p-6 relative border border-slate-800 shadow-2xl">
        {/* Header Mascot */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2 transition-transform hover:scale-110">
            <GengarLogo size={64} />
          </div>
          <h1 className="mc-title-3d text-2xl mb-1 text-slate-100 font-extrabold tracking-tight">MC-DESK</h1>
          <p className="text-gray-400 text-xs">
            {isRegister
              ? 'Crea tu cuenta de acceso conectada a la base de datos'
              : 'Inicia sesión para gestionar el servidor o ver tu HUD de jugador'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/80 border border-red-500/60 text-red-200 text-xs rounded flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Role Selector Tabs (Only in Register mode) */}
        {isRegister && (
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">
              Tipo de Perfil a Crear
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('USER')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  role === 'USER'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🎮</span> Jugador Servidor
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  role === 'ADMIN'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>🛡️</span> Administrador
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
              {role === 'USER'
                ? '🟢 Los jugadores se conectan a un personaje de Minecraft para inspeccionar inventario y comprar en MineMarket.'
                : '🟣 Los administradores tienen acceso global (consola, modos de juego, backups y propiedades).'}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Minecraft Username Field (Required for Players) */}
          {isRegister && role === 'USER' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-emerald-400">
                  Usuario de Minecraft en el Servidor *
                </label>
                {cleanMc && (
                  <span className="text-[10px] text-gray-400 font-mono">
                    avatar: mc-heads.net
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-9 h-9 rounded bg-slate-900 border border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={cleanMc ? `https://mc-heads.net/avatar/${cleanMc}` : 'https://mc-heads.net/avatar/Steve'}
                    alt="Skin Head"
                    className="w-7 h-7 object-contain"
                    onError={(e) => { e.target.src = 'https://mc-heads.net/avatar/Steve'; }}
                  />
                </div>
                <input
                  type="text"
                  required
                  value={minecraftUsername}
                  onChange={(e) => setMinecraftUsername(e.target.value)}
                  placeholder="ej: Steve, Alex, TuNick..."
                  className="w-full bg-slate-900 border border-emerald-500/50 rounded p-2 text-xs text-gray-100 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre Completo o Apodo</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={role === 'USER' ? cleanMc || 'Steve' : 'Administrador'}
                className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mc-btn mc-btn-active w-full justify-center text-xs py-2.5 mt-2 transition-transform active:scale-[0.97]"
          >
            {loading ? 'Procesando...' : isRegister ? 'Crear Cuenta y Vincular' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Quick Test Accounts Helper */}
        <div className="mt-4 p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Accesos Rápidos de Prueba (Base de Datos):
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@mcdesk.io', 'admin123')}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-left transition-all text-[11px] text-gray-200"
            >
              <div className="font-bold text-purple-400">🛡️ Admin Global</div>
              <div className="text-[9px] text-gray-400 font-mono">admin@mcdesk.io</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('steve@mcdesk.io', 'steve123')}
              className="p-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded text-left transition-all text-[11px] text-gray-200"
            >
              <div className="font-bold text-emerald-400">🎮 Jugador Steve</div>
              <div className="text-[9px] text-gray-400 font-mono">steve@mcdesk.io</div>
            </button>
          </div>
        </div>

        {/* Toggle Register / Login / Demo */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800 text-xs text-gray-400">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="hover:text-emerald-400 transition-colors"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>

          <button
            type="button"
            onClick={() => {
              switchToDemoRole('ADMIN');
              if (onEnterDemo) onEnterDemo();
            }}
            className="text-amber-400 font-semibold hover:underline font-mono text-[11px]"
          >
            Modo Demo ➔
          </button>
        </div>
      </div>
    </div>
  );
}
