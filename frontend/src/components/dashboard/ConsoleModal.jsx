import React, { useState } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';

export function ConsoleModal({ isOpen, onClose }) {
  const { currentServer } = useServer();
  const [command, setCommand] = useState('');
  const [logs, setLogs] = useState([
    { time: '18:40:02', text: '[Server thread/INFO]: ModernFix reached bootstrap stage', type: 'info' },
    { time: '18:41:15', text: '[Server thread/INFO]: Loading dimension minecraft:overworld', type: 'info' },
    { time: '18:42:00', text: '[Server thread/INFO]: Done! For help, type "help"', type: 'success' },
    { time: '18:42:15', text: '[Server thread/INFO]: Roger joined the game', type: 'player' }
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendCommand = async (e) => {
    e?.preventDefault();
    if (!command.trim()) return;

    const cmdToSend = command.trim();
    const now = new Date().toLocaleTimeString();

    // Add local log
    setLogs((prev) => [...prev, { time: now, text: `> ${cmdToSend}`, type: 'input' }]);
    setCommand('');
    setLoading(true);

    try {
      const res = await api.sendCommand(currentServer?.id || 's-1', cmdToSend);
      if (res.output && Array.isArray(res.output) && res.output.length > 0) {
        setLogs((prev) => [
          ...prev,
          ...res.output.map(line => ({ time: now, text: line, type: 'info' }))
        ]);
      }
      setLogs((prev) => [
        ...prev,
        { time: now, text: res.message || `Comando /${cmdToSend} enviado`, type: res.success ? 'success' : 'error' }
      ]);
    } catch (err) {
      setLogs((prev) => [...prev, { time: now, text: `Error: ${err.message}`, type: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCmd = (quick) => {
    setCommand(quick);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="mc-card w-full max-w-2xl p-4 flex flex-col gap-3 max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>📜</span>
            <span className="font-bold text-sm text-gray-200">MC-Desk Console — Consola de Comandos</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2 py-0.5 rounded mc-btn text-xs"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Quick Command Pills */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {['time set day', 'time set night', 'weather clear', 'save-all', 'list', 'tps', 'difficulty hard'].map((c) => (
            <button
              key={c}
              onClick={() => handleQuickCmd(c)}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-gray-300 border border-gray-700 font-mono text-[11px]"
            >
              /{c}
            </button>
          ))}
        </div>

        {/* Console Log Feed */}
        <div className="bg-black/90 p-3 rounded font-mono text-xs text-gray-300 h-64 overflow-y-auto flex flex-col gap-1 border border-gray-800 shadow-inner">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 select-none">[{log.time}]</span>
              <span 
                className={
                  log.type === 'input' 
                    ? 'text-amber-400 font-bold' 
                    : log.type === 'error' 
                    ? 'text-red-400' 
                    : log.type === 'success' 
                    ? 'text-emerald-400' 
                    : 'text-gray-300'
                }
              >
                {log.text}
              </span>
            </div>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendCommand} className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-500 font-mono text-sm">&gt;</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Escribe un comando... (ej: time set day, kick Steve)"
              className="w-full bg-slate-900 border border-gray-700 rounded py-2 pl-7 pr-3 text-sm text-gray-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="mc-btn mc-btn-active text-xs px-4"
          >
            {loading ? 'Enviando...' : 'Enviar comando'}
          </button>
        </form>
      </div>
    </div>
  );
}
