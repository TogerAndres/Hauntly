import React, { useState } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';
import { KeyRound, Terminal, Copy, Check, Server, Sparkles, AlertCircle } from 'lucide-react';

export function ClaimServerModal({ isOpen, onClose }) {
  const { refresh } = useServer();
  const [activeTab, setActiveTab] = useState('token'); // 'token' | 'manual'

  // Token Claim State
  const [pairingToken, setPairingToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState(null);
  const [tokenSuccess, setTokenSuccess] = useState(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  // Manual Form State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    minecraft_ip: import.meta.env.VITE_MC_DEFAULT_HOST || '',
    port: 25565,
    software: 'Forge',
    version: '1.20.1'
  });
  const [claimData, setClaimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentBackendUrl = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '');
  const installCmd = `curl -sSL ${currentBackendUrl}/install.sh | bash`;

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(installCmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleClaimByToken = async (e) => {
    e.preventDefault();
    const clean = pairingToken.trim().toUpperCase();
    if (!clean) {
      setTokenError('Por favor introduce el código o token de vinculación.');
      return;
    }

    setTokenLoading(true);
    setTokenError(null);
    setTokenSuccess(null);

    try {
      const res = await api.claimServerByToken(clean);
      setTokenSuccess(res.message || '¡Servidor conectado exitosamente!');
      refresh();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setTokenError(err.message || 'Código de vinculación no encontrado o inválido.');
    } finally {
      setTokenLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.host) {
      setError('Por favor completa el nombre y la IP del servidor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createServer(formData);
      setClaimData(res);
      setStep(2);
      refresh();
    } catch (err) {
      setError(err.message || 'Error al registrar el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="mc-card w-full max-w-lg p-5 border border-slate-800 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <div>
              <h2 className="font-bold text-sm text-gray-100">Vincular Servidor de Minecraft</h2>
              <p className="text-[11px] text-gray-400">Conecta tu servidor al panel MC-Desk para ver telemetría y HUD en vivo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2.5 py-1 mc-btn text-xs"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('token')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'token'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <KeyRound size={14} />
            <span>Conectar con Token (Consola)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'manual'
                ? 'bg-purple-950/80 border-purple-500 text-purple-300 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Server size={14} />
            <span>Registro Manual</span>
          </button>
        </div>

        {/* TAB 1: CONNECT BY TOKEN (RECOMMENDED 1-COMMAND SETUP) */}
        {activeTab === 'token' && (
          <div className="flex flex-col gap-3.5">
            {tokenError && (
              <div className="p-2.5 bg-red-950/80 border border-red-500/60 text-red-200 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle size={15} className="flex-shrink-0 text-red-400" />
                <span>{tokenError}</span>
              </div>
            )}

            {tokenSuccess && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
                <Sparkles size={15} className="flex-shrink-0 text-emerald-400" />
                <span>{tokenSuccess}</span>
              </div>
            )}

            {/* Step 1: Run Command in Terminal */}
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-300 flex items-center gap-1.5">
                  <Terminal size={13} className="text-emerald-400" />
                  <span>Paso 1: Ejecuta este comando en la terminal de tu servidor:</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyCmd}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30"
                >
                  {copiedCmd ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedCmd ? '¡Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px] text-emerald-300 select-all break-all">
                {installCmd}
              </div>

              <p className="text-[10px] text-gray-400 mt-1.5">
                💡 O ejecuta directamente: <code className="text-gray-300">python3 server-agent/agent.py</code>
              </p>
            </div>

            {/* Step 2: Paste Token */}
            <form onSubmit={handleClaimByToken} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Paso 2: Introduce el código que apareció en la consola:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={pairingToken}
                    onChange={(e) => setPairingToken(e.target.value)}
                    placeholder="ej: MC-DESK-4B12-9A8C"
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 text-xs text-amber-300 font-mono font-bold tracking-wider focus:outline-none focus:border-emerald-500 shadow-inner uppercase"
                  />
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  El agente mostrará un código de 8 a 16 caracteres listo para emparejar.
                </span>
              </div>

              <div className="mt-1 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="mc-btn text-xs">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={tokenLoading}
                  className="mc-btn mc-btn-active text-xs flex items-center gap-1.5 py-2 px-4"
                >
                  <KeyRound size={13} />
                  <span>{tokenLoading ? 'Verificando...' : 'Conectar Servidor'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MANUAL REGISTRATION (LEGACY FLOW) */}
        {activeTab === 'manual' && (
          <div>
            {step === 1 ? (
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
                {error && (
                  <div className="p-2 bg-red-900/50 border border-red-500/50 text-red-200 text-xs rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Nombre del Servidor</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="ej: Servidor Survival Forge"
                    className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1">IP de Red / Host</label>
                    <input
                      type="text"
                      required
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      placeholder="ej: 127.0.0.1 o mc.tudominio.com"
                      className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Puerto</label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Software</label>
                    <select
                      value={formData.software}
                      onChange={(e) => setFormData({ ...formData, software: e.target.value })}
                      className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value="Forge">Forge</option>
                      <option value="Fabric">Fabric</option>
                      <option value="Paper">Paper</option>
                      <option value="Purpur">Purpur</option>
                      <option value="Spigot">Spigot</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">Versión</label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.20.1"
                      className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={onClose} className="mc-btn text-xs">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="mc-btn mc-btn-active text-xs">
                    {loading ? 'Generando...' : 'Generar Claim Code ➔'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded text-center">
                  <div className="text-xs text-gray-400 mb-1">Código de Vinculación</div>
                  <div className="font-mono text-xl font-bold text-amber-300 tracking-wider my-1 select-all">
                    {claimData?.claimInstructions?.claimCode}
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(claimData?.claimInstructions?.claimCode || '');
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="mc-btn text-xs px-3 py-1 mt-1"
                  >
                    {copiedCode ? '¡Código Copiado! ✓' : '📋 Copiar Código'}
                  </button>
                </div>

                <div className="text-xs text-gray-300 flex flex-col gap-2">
                  <div className="font-semibold text-gray-200">Ejecuta en tu servidor:</div>
                  <code className="bg-slate-900 p-2 rounded text-emerald-300 font-mono block select-all">
                    python3 server-agent/agent.py --claim {claimData?.claimInstructions?.claimCode}
                  </code>
                </div>

                <div className="mt-2 flex justify-end">
                  <button onClick={onClose} className="mc-btn mc-btn-active text-xs px-4">
                    Entendido / Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
