import React, { useState } from 'react';
import { GengarLogo } from '../components/ui/GengarLogo';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Check, X, Shield, Gamepad2, ArrowRight } from 'lucide-react';

export function Login({ onEnterDemo }) {
  const { login, register, switchToDemoRole } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('USER'); // 'USER' | 'ADMIN'
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  const cleanMc = minecraftUsername.trim().replace(/[^a-zA-Z0-9_]/g, '');

  // Live password policy checks
  const policyChecks = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Al menos 1 mayúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Al menos 1 minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Al menos 1 número (0-9)', met: /[0-9]/.test(password) },
    { label: 'Al menos 1 símbolo especial (!@#$%)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password) }
  ];

  const isPasswordStrong = policyChecks.every(c => c.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrorDetails([]);
    setLoading(true);

    try {
      if (isRegister) {
        if (role === 'USER' && !cleanMc) {
          throw new Error('Debes ingresar tu nombre de usuario de Minecraft en el servidor');
        }
        if (!isPasswordStrong) {
          throw new Error('Por favor cumple con todos los requisitos de seguridad de la contraseña');
        }
        await register(email, displayName || cleanMc, password, role, cleanMc);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Error durante la autenticación');
      if (err.details && Array.isArray(err.details)) {
        setErrorDetails(err.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail, targetPass) => {
    setIsRegister(false);
    setEmail(targetEmail);
    setPassword(targetPass);
    setError(null);
    setErrorDetails([]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="mc-card w-full max-w-md p-6 relative border border-slate-800/80 shadow-2xl backdrop-blur-sm z-10">
        {/* Header Mascot */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-2 transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <GengarLogo size={64} />
          </div>
          <h1 className="mc-title-3d text-2xl mb-1 text-slate-100 font-extrabold tracking-tight">MC-DESK</h1>
          <p className="text-gray-400 text-xs">
            {isRegister
              ? 'Crea tu cuenta segura vinculada a tu identidad de juego'
              : 'Accede al panel para administrar el servidor o monitorear tu HUD'}
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-500/70 text-red-200 text-xs rounded-lg shadow-inner">
            <div className="flex items-center gap-2 font-bold mb-1">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            {errorDetails.length > 0 && (
              <ul className="list-disc list-inside mt-1.5 space-y-0.5 text-[11px] text-red-300/90 pl-1">
                {errorDetails.map((det, idx) => (
                  <li key={idx}>{det}</li>
                ))}
              </ul>
            )}
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
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  role === 'USER'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950'
                    : 'bg-slate-900/90 border-slate-800 text-gray-400 hover:text-gray-200 hover:border-slate-700'
                }`}
              >
                <Gamepad2 size={15} />
                <span>Jugador</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                  role === 'ADMIN'
                    ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-sm shadow-purple-950'
                    : 'bg-slate-900/90 border-slate-800 text-gray-400 hover:text-gray-200 hover:border-slate-700'
                }`}
              >
                <Shield size={15} />
                <span>Administrador</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
              {role === 'USER'
                ? '🟢 Los jugadores se vinculan a su personaje de Minecraft para ver su inventario y comprar en MineMarket.'
                : '🟣 Los administradores tienen acceso global (consola remota, modos de juego, backups y propiedades).'}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
                <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-inner">
                  <img
                    src={cleanMc ? `https://mc-heads.net/avatar/${cleanMc}` : 'https://mc-heads.net/avatar/Steve'}
                    alt="Skin Head"
                    className="w-8 h-8 object-contain"
                    onError={(e) => { e.target.src = 'https://mc-heads.net/avatar/Steve'; }}
                  />
                </div>
                <input
                  type="text"
                  required
                  value={minecraftUsername}
                  onChange={(e) => setMinecraftUsername(e.target.value)}
                  placeholder="ej: Steve, Alex, TuGamertag..."
                  className="w-full bg-slate-900/90 border border-emerald-500/50 rounded-lg p-2.5 text-xs text-gray-100 focus:outline-none focus:border-emerald-400 font-mono shadow-inner transition-colors"
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
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-purple-400 font-mono shadow-inner transition-colors"
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
              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-400 font-mono shadow-inner transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-300">Contraseña</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-200 text-[11px] flex items-center gap-1 transition-colors"
              >
                {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPassword ? 'Ocultar' : 'Mostrar'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-400 font-mono shadow-inner transition-colors pr-9"
              />
            </div>

            {/* Live Password Strength Indicator (Only in Register mode) */}
            {isRegister && (
              <div className="mt-2 p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Requisitos de Seguridad (Empresarial):
                  </span>
                  <span className={`text-[10px] font-bold ${isPasswordStrong ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isPasswordStrong ? '✓ Contraseña Segura' : 'Incompleta'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {policyChecks.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                      {item.met ? (
                        <Check size={11} className="text-emerald-400 flex-shrink-0" />
                      ) : (
                        <X size={11} className="text-slate-500 flex-shrink-0" />
                      )}
                      <span className={item.met ? 'text-emerald-300' : 'text-slate-400'}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mc-btn mc-btn-active w-full justify-center text-xs py-2.5 mt-1 transition-all active:scale-[0.98] shadow-md flex items-center gap-2"
          >
            {loading ? (
              <span>Procesando...</span>
            ) : isRegister ? (
              <>
                <span>Crear Cuenta y Vincular</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight size={14} />
              </>
            )}
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
              className={`p-2 rounded text-left transition-all text-[11px] border ${
                email === 'admin@mcdesk.io'
                  ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-gray-200'
              }`}
            >
              <div className="font-bold text-purple-400 flex items-center gap-1">
                <Shield size={12} /> Admin Global
              </div>
              <div className="text-[9px] text-gray-400 font-mono mt-0.5">admin@mcdesk.io</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('steve@mcdesk.io', 'steve123')}
              className={`p-2 rounded text-left transition-all text-[11px] border ${
                email === 'steve@mcdesk.io'
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-gray-200'
              }`}
            >
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <Gamepad2 size={12} /> Jugador Steve
              </div>
              <div className="text-[9px] text-gray-400 font-mono mt-0.5">steve@mcdesk.io</div>
            </button>
          </div>
        </div>

        {/* Toggle Register / Login / Demo */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/80 text-xs text-gray-400">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setErrorDetails([]);
            }}
            className="hover:text-emerald-400 transition-colors font-medium"
          >
            {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>

          <button
            type="button"
            onClick={() => {
              switchToDemoRole('ADMIN');
              if (onEnterDemo) onEnterDemo();
            }}
            className="text-amber-400 font-semibold hover:underline font-mono text-[11px] flex items-center gap-1"
          >
            <span>Modo Demo</span>
            <span>➔</span>
          </button>
        </div>
      </div>
    </div>
  );
}
