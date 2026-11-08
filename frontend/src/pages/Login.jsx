import React, { useState } from 'react';
import { GengarLogo } from '../components/ui/GengarLogo';
import { useAuth } from '../context/AuthContext';

export function Login({ onEnterDemo }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, displayName, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Error durante la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="mc-card w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-2 transition-transform hover:scale-110">
            <GengarLogo size={64} />
          </div>
          <h1 className="mc-title-3d text-2xl mb-1">MC-DESK</h1>
          <p className="text-gray-400 text-xs">
            {isRegister ? 'Crea tu cuenta de administrador' : 'Inicia sesión para gestionar tus servidores'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-950/60 border border-red-500/50 text-red-200 text-xs rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre de Usuario</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Steve"
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
              placeholder="admin@ejemplo.com"
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
            className="mc-btn mc-btn-active w-full justify-center text-xs py-2.5 mt-2"
          >
            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Toggle Register / Login */}
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
            onClick={onEnterDemo}
            className="text-amber-400 font-semibold hover:underline font-mono text-[11px]"
          >
            Explorar en Modo Demo ➔
          </button>
        </div>
      </div>
    </div>
  );
}
