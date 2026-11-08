import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';

export function AuditLogsModal({ isOpen, onClose }) {
  const { currentServer } = useServer();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    if (!currentServer?.id) return;
    setLoading(true);
    try {
      const res = await api.getAuditLogs(currentServer.id);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Error al cargar auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, currentServer?.id]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="mc-card w-full max-w-3xl flex flex-col max-h-[85vh]"
        style={{ border: '2px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}
      >
        {/* Header */}
        <div className="mc-card-header flex justify-between items-center pb-3 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <span className="font-bold text-base text-stone-100">
              Registro de Seguridad y Auditoría — {currentServer?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchLogs} 
              disabled={loading}
              className="mc-btn text-xs px-2 py-1"
              title="Recargar logs"
            >
              🔄 Refrescar
            </button>
            <button 
              onClick={onClose} 
              className="mc-btn text-xs px-2 py-1 text-rose-400 hover:text-rose-300"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2 text-xs font-mono">
          {loading && logs.length === 0 ? (
            <div className="text-center py-8 text-stone-400">Cargando eventos de seguridad...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-stone-400">No hay registros de auditoría aún.</div>
          ) : (
            logs.map((log, idx) => {
              const isBlocked = log.action?.includes('BLOCKED') || log.action?.includes('SECURITY');
              const isCmd = log.action === 'CONSOLE_COMMAND';
              const dateStr = log.created_at ? new Date(log.created_at).toLocaleTimeString() : '--:--';
              
              return (
                <div 
                  key={log.id || idx}
                  className="p-2 rounded border flex flex-col gap-1"
                  style={{
                    backgroundColor: isBlocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(30, 41, 59, 0.6)',
                    borderColor: isBlocked ? '#ef4444' : '#334155'
                  }}
                >
                  <div className="flex items-center justify-between text-stone-400">
                    <span className="flex items-center gap-2">
                      <span className="text-stone-500">[{dateStr}]</span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor: isBlocked ? '#ef4444' : isCmd ? '#3b82f6' : '#10b981',
                          color: '#fff'
                        }}
                      >
                        {log.action}
                      </span>
                      <span className="text-stone-300 font-semibold">{log.user_email || 'roger@mcdesk.io'}</span>
                    </span>
                    <span className="text-stone-500 text-[10px]">IP: {log.ip_address || 'local'}</span>
                  </div>

                  {log.details && (
                    <div className="pl-4 text-stone-300 text-[11px] break-all">
                      {log.details.command && (
                        <span>Comando: <code className="text-emerald-400 font-bold">/{log.details.command}</code></span>
                      )}
                      {log.details.rejectedCommand && (
                        <span className="text-rose-400 font-bold">Bloqueado: <code>{log.details.rejectedCommand}</code> ({log.details.reason})</span>
                      )}
                      {log.details.targetPlayer && (
                        <span>Jugador afectado: <b className="text-amber-300">{log.details.targetPlayer}</b></span>
                      )}
                      {log.details.message && <span>{log.details.message}</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 flex justify-between items-center text-[11px] text-stone-400">
          <span>Inmutabilidad de eventos garantizada con firma y timestamp</span>
          <span>Mostrando {logs.length} registros</span>
        </div>
      </div>
    </div>
  );
}
