import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';

export function BackupsModal({ isOpen, onClose }) {
  const { currentServer } = useServer();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchBackups = async () => {
    if (!currentServer?.id) return;
    setLoading(true);
    try {
      const res = await api.getBackups(currentServer.id);
      setBackups(res.backups || []);
    } catch (err) {
      console.error('Error al obtener backups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen, currentServer?.id]);

  const handleCreateBackup = async () => {
    setCreating(true);
    setFeedback(null);
    try {
      const res = await api.createBackup(currentServer?.id || 's-1');
      setFeedback({ success: res.success !== false, message: res.message || 'Copia de seguridad generada con éxito.' });
      await fetchBackups();
    } catch (err) {
      setFeedback({ success: false, message: 'Error al generar copia: ' + err.message });
    } finally {
      setCreating(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div 
        className="mc-card w-full max-w-2xl flex flex-col max-h-[85vh]"
        style={{ border: '2px solid #334155', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)' }}
      >
        {/* Header */}
        <div className="mc-card-header flex justify-between items-center pb-3 border-b border-stone-700">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '18px' }}>📦</span>
            <span className="font-bold text-base text-stone-100">
              Copias de Seguridad (Backups) — {currentServer?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleCreateBackup} 
              disabled={creating}
              className="mc-btn text-xs px-3 py-1 font-bold text-emerald-300"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981' }}
              title="Crear un snapshot comprimido de la carpeta world"
            >
              {creating ? '⏳ Creando copia...' : '➕ Crear Backup Ahora'}
            </button>
            <button 
              onClick={onClose} 
              className="mc-btn text-xs px-2 py-1 text-rose-400 hover:text-rose-300"
            >
              ✕ Cerrar
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div 
            className="p-3 mx-4 mt-3 rounded text-xs font-mono"
            style={{
              backgroundColor: feedback.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: feedback.success ? '1px solid #22c55e' : '1px solid #ef4444',
              color: feedback.success ? '#86efac' : '#fca5a5'
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* Backups List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2 text-xs font-mono">
          {loading && backups.length === 0 ? (
            <div className="text-center py-8 text-stone-400">Consultando archivos de respaldo...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <p className="text-sm text-stone-300 mb-1">No hay copias de seguridad aún.</p>
              <p className="text-xs text-stone-500">Pulsa en "Crear Backup Ahora" para generar el primer respaldo de tu mundo.</p>
            </div>
          ) : (
            backups.map((b, idx) => (
              <div 
                key={b.filename || idx}
                className="p-3 rounded border flex items-center justify-between"
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.6)',
                  borderColor: '#334155'
                }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '20px' }}>💾</span>
                  <div>
                    <div className="text-stone-200 font-bold text-xs">{b.filename}</div>
                    <div className="text-stone-500 text-[11px]">Fecha: {b.date}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-stone-800 text-emerald-400 font-bold text-xs border border-stone-700">
                    {b.size}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 flex justify-between items-center text-[11px] text-stone-400">
          <span>Ubicación en host: <code className="text-stone-300">~/backups/</code></span>
          <span>{backups.length} copias disponibles</span>
        </div>
      </div>
    </div>
  );
}
