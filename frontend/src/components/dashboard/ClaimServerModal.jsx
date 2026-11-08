import React, { useState } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';

export function ClaimServerModal({ isOpen, onClose }) {
  const { refresh } = useServer();
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
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
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
      // Demo simulated claim
      const mockClaimCode = 'MC-DESK-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      setClaimData({
        server: { name: formData.name, host: formData.host, minecraft_ip: formData.minecraft_ip },
        claimInstructions: {
          claimCode: mockClaimCode
        }
      });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (claimData?.claimInstructions?.claimCode) {
      navigator.clipboard.writeText(claimData.claimInstructions.claimCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="mc-card w-full max-w-lg p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <span className="font-bold text-sm text-gray-200">Reclamar y Vincular Servidor</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2 py-0.5 mc-btn text-xs"
          >
            ✕ Cerrar
          </button>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                placeholder="ej: Porristas Ingenieros"
                className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1">IP de Red / Host Local</label>
                <input
                  type="text"
                  required
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="ej: mc.tudominio.com o 192.168.1.50"
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

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                IP / Dominio Público de Minecraft (para unirse)
              </label>
              <input
                type="text"
                value={formData.minecraft_ip}
                onChange={(e) => setFormData({ ...formData, minecraft_ip: e.target.value })}
                placeholder="ej: mc.tudominio.com"
                className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Esta es la dirección pública que verán y copiarán los jugadores para conectarse en Minecraft.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Software</label>
                <select
                  value={formData.software}
                  onChange={(e) => setFormData({ ...formData, software: e.target.value })}
                  className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value="Paper">Paper</option>
                  <option value="Purpur">Purpur</option>
                  <option value="Forge">Forge</option>
                  <option value="Fabric">Fabric</option>
                  <option value="Spigot">Spigot</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Versión</label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.21.4"
                  className="w-full bg-slate-900 border border-gray-700 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="mc-btn text-xs">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="mc-btn mc-btn-active text-xs">
                {loading ? 'Generando token...' : 'Continuar y Generar Token ➔'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded text-center">
              <div className="text-xs text-gray-400 mb-1">Código de Vinculación de Servidor</div>
              <div className="font-mono text-xl font-bold text-amber-300 tracking-wider my-1 select-all">
                {claimData?.claimInstructions?.claimCode}
              </div>
              <button 
                onClick={handleCopyCode}
                className="mc-btn text-xs px-3 py-1 mt-1"
              >
                {copied ? '¡Código Copiado! ✓' : '📋 Copiar Código'}
              </button>
            </div>

            <div className="text-xs text-gray-300 flex flex-col gap-2">
              <div className="font-semibold text-gray-200">Pasos para verificar tu servidor:</div>
              <ol className="list-decimal pl-5 flex flex-col gap-1.5 text-gray-300">
                <li>Descarga o copia la carpeta <code className="bg-slate-900 px-1 py-0.5 rounded text-emerald-400">server-agent</code> en tu servidor Linux de Minecraft.</li>
                <li>Pega el código anterior en <code className="bg-slate-900 px-1 py-0.5 rounded text-amber-300">config.json</code> en el campo <code className="text-amber-300">&quot;claim_code&quot;</code>.</li>
                <li>Ejecuta el Agent: <code className="bg-slate-900 px-1 py-0.5 rounded">python3 agent.py</code> (o instala como servicio con <code className="bg-slate-900 px-1 py-0.5 rounded">sudo ./install.sh</code>).</li>
              </ol>
            </div>

            <div className="mt-2 flex justify-end">
              <button onClick={onClose} className="mc-btn mc-btn-active text-xs px-4">
                Entendido / Finalizar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
