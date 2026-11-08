import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useServer } from '../../context/ServerContext';
import { useAuth } from '../../context/AuthContext';
import { McItemIcon, McPlayerFace } from '../ui/MinecraftSprites';

const TIPOS_ITEM = ['TODOS', 'RANGO', 'KIT', 'LLAVE', 'COSMETICO', 'MONEDA'];

const TIPO_COLORES = {
  RANGO: { bg: 'rgba(234, 179, 8, 0.15)', text: '#facc15', border: 'rgba(234, 179, 8, 0.4)' },
  KIT: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' },
  LLAVE: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' },
  COSMETICO: { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.4)' },
  MONEDA: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.4)' }
};

export function MineMarketView() {
  const { players, currentServer } = useServer();
  const { user, isAdmin, isPlayer, linkedPlayer } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);

  // Delivery Modal State
  const [deliverModalItem, setDeliverModalItem] = useState(null);
  const [targetPlayer, setTargetPlayer] = useState(isPlayer && linkedPlayer ? linkedPlayer : (players?.[0]?.username || 'Steve'));
  const [isDelivering, setIsDelivering] = useState(false);

  // Create/Edit Item Modal State
  const [editItemModal, setEditItemModal] = useState(null); // null | 'nuevo' | item object
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'RANGO',
    precio: '',
    stock: 100,
    servidor: currentServer?.name || 'Forge 1.20.1',
    comando: 'lp user {player} parent set vip',
    icono: 'emerald'
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filtroTipo !== 'TODOS') params.tipo = filtroTipo;
      if (busqueda.trim()) params.q = busqueda.trim();
      const res = await api.getItems(params);
      if (res?.items) {
        setItems(res.items);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filtroTipo, busqueda]);

  const handleDeliver = async () => {
    if (!deliverModalItem || !targetPlayer) return;
    setIsDelivering(true);
    setMensaje(null);

    try {
      const res = await api.deliverItem(deliverModalItem.id_item, targetPlayer, currentServer?.id || 's-1');
      setMensaje({
        type: 'success',
        text: `¡${deliverModalItem.nombre} entregado exitosamente a ${targetPlayer} in-game!`,
        details: res.executedCommand ? `Comando ejecutado: /${res.executedCommand}` : null
      });
      setDeliverModalItem(null);
      await fetchItems();
    } catch (err) {
      setMensaje({
        type: 'error',
        text: err.message || 'Error al ejecutar la entrega del ítem en el servidor.'
      });
    } finally {
      setIsDelivering(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editItemModal === 'nuevo') {
        await api.createItem({
          ...formData,
          precio: Number(formData.precio),
          stock: Number(formData.stock)
        });
        setMensaje({ type: 'success', text: `Ítem "${formData.nombre}" publicado en MineMarket` });
      } else if (editItemModal?.id_item) {
        await api.updateItem(editItemModal.id_item, {
          ...formData,
          precio: Number(formData.precio),
          stock: Number(formData.stock)
        });
        setMensaje({ type: 'success', text: `Ítem "${formData.nombre}" actualizado correctamente` });
      }
      setEditItemModal(null);
      await fetchItems();
    } catch (err) {
      alert(`Error al guardar ítem: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de deshabilitar "${nombre}" de la tienda?`)) return;
    try {
      await api.deleteItem(id);
      setMensaje({ type: 'success', text: `Ítem "${nombre}" retirado del catálogo.` });
      await fetchItems();
    } catch (err) {
      alert(`Error al eliminar ítem: ${err.message}`);
    }
  };

  const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="mc-card" style={{ padding: '24px', position: 'relative' }}>
      {/* Top Banner / Store Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(245,158,11,0.3)',
            fontSize: '22px'
          }}>
            🛒
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              MineMarket — Tienda de Servidores
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)', fontFamily: 'monospace' }}>
                TRANSACCIONAL
              </span>
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '3px 0 0 0' }}>
              Comercialización y entrega automatizada de ítems digitales, rangos y recompensas in-game.
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setFormData({
                nombre: '',
                descripcion: '',
                tipo: 'RANGO',
                precio: 10000,
                stock: 50,
                servidor: currentServer?.name || 'Forge 1.20.1',
                comando: 'give {player} diamond 64',
                icono: 'diamond'
              });
              setEditItemModal('nuevo');
            }}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '12px',
              padding: '9px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>➕</span>
            <span>Publicar Ítem Digital</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {mensaje && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '8px',
          background: mensaje.type === 'success' ? 'rgba(6,78,59,0.6)' : 'rgba(136,19,55,0.6)',
          border: mensaje.type === 'success' ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(244,63,94,0.5)',
          color: mensaje.type === 'success' ? '#a7f3d0' : '#fecdd3',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontWeight: '700' }}>{mensaje.text}</div>
            {mensaje.details && <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px', fontFamily: 'monospace' }}>{mensaje.details}</div>}
          </div>
          <button onClick={() => setMensaje(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        {/* Categories Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {TIPOS_ITEM.map((tipo) => {
            const isSelected = filtroTipo === tipo;
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltroTipo(tipo)}
                style={{
                  background: isSelected ? '#38bdf8' : 'rgba(30,41,59,0.7)',
                  color: isSelected ? '#0b0d14' : '#cbd5e1',
                  fontWeight: isSelected ? '800' : '600',
                  fontSize: '11px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tipo}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input
            type="search"
            placeholder="Buscar ítem o comando..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15,23,42,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              padding: '6px 12px 6px 30px',
              color: '#f8fafc',
              fontSize: '12px'
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '7px', fontSize: '12px', color: '#64748b' }}>🔍</span>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>
          Cargando catálogo de MineMarket...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', background: 'rgba(15,23,42,0.4)', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>No se encontraron ítems en esta categoría</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Crea tu primer ítem digital con el botón "+ Publicar Ítem Digital".</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {items.map((item) => {
            const colorCfg = TIPO_COLORES[item.tipo] || { bg: 'rgba(255,255,255,0.1)', text: '#ffffff', border: 'rgba(255,255,255,0.2)' };
            const isOutOfStock = item.stock <= 0;

            return (
              <div
                key={item.id_item}
                style={{
                  background: 'rgba(15,23,42,0.65)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div>
                  {/* Top Row: Type Badge & Stock */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: colorCfg.bg,
                      color: colorCfg.text,
                      border: `1px solid ${colorCfg.border}`,
                      textTransform: 'uppercase'
                    }}>
                      {item.tipo}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: isOutOfStock ? '#f87171' : '#34d399',
                      background: isOutOfStock ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: `1px solid ${isOutOfStock ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`
                    }}>
                      {isOutOfStock ? 'AGOTADO' : `Stock: ${item.stock}`}
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: 'rgba(30,41,59,0.8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.08)'
                    }}>
                      <McItemIcon name={item.icono || (item.tipo === 'RANGO' ? 'emerald' : 'diamond')} size={26} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                        {item.nombre}
                      </h3>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Servidor: <span style={{ color: '#94a3b8' }}>{item.servidor || 'Minecraft'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                    {item.descripcion}
                  </p>

                  {/* In-game command tag */}
                  <div style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    color: '#a5b4fc',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    border: '1px solid rgba(99,102,241,0.2)'
                  }} title={item.comando}>
                    ⌨️ /{item.comando}
                  </div>
                </div>

                {/* Footer: Price & Deliver Action */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Precio</div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#38bdf8' }}>
                      {formatCOP(item.precio)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliverModalItem(item);
                        setTargetPlayer(players?.[0]?.username || 'Roger');
                      }}
                      disabled={isOutOfStock}
                      style={{
                        background: isOutOfStock ? '#475569' : 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '11px',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                        boxShadow: isOutOfStock ? 'none' : '0 2px 8px rgba(14,165,233,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>⚡</span>
                      <span>Entregar</span>
                    </button>

                    {/* Admin Actions */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          nombre: item.nombre,
                          descripcion: item.descripcion,
                          tipo: item.tipo,
                          precio: item.precio,
                          stock: item.stock,
                          servidor: item.servidor,
                          comando: item.comando,
                          icono: item.icono || 'diamond'
                        });
                        setEditItemModal(item);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        color: '#cbd5e1',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id_item, item.nombre)}
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Entregar / Comprar Ítem in-game */}
      {deliverModalItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div 
            className="mc-modal-dialog"
            style={{
              background: '#131622',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>⚡</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                  Entregar Ítem a un Jugador
                </h3>
              </div>
              <button onClick={() => setDeliverModalItem(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            {/* Selected item summary */}
            <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <McItemIcon name={deliverModalItem.icono || 'diamond'} size={32} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc' }}>{deliverModalItem.nombre}</div>
                <div style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '600' }}>{formatCOP(deliverModalItem.precio)}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                  /{deliverModalItem.comando.replace('{player}', targetPlayer)}
                </div>
              </div>
            </div>

            {/* Target Player Selection */}
            <div style={{ marginBottom: '18px' }}>
              {isPlayer ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <McPlayerFace username={linkedPlayer || 'Steve'} size={28} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#6ee7b7' }}>
                      Entrega directa a: {linkedPlayer || 'Steve'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Beneficio exclusivo para tu cuenta vinculada en el servidor.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                    Selecciona el jugador que recibirá el beneficio:
                  </label>

                  {/* Online Players Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                    {(players || []).map((p) => {
                      const isSel = targetPlayer === p.username;
                      return (
                        <button
                          key={p.uuid || p.username}
                          type="button"
                          onClick={() => setTargetPlayer(p.username)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isSel ? 'rgba(56,189,248,0.2)' : 'rgba(30,41,59,0.6)',
                            border: isSel ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                            color: isSel ? '#38bdf8' : '#e2e8f0',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <McPlayerFace username={p.username} size={16} />
                          <span>{p.username}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Gamertag Input */}
                  <input
                    type="text"
                    placeholder="O escribe Gamertag exacto..."
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(15,23,42,0.8)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeliverModalItem(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeliver}
                disabled={isDelivering || !targetPlayer.trim()}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: isDelivering ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isDelivering ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    <span>Ejecutando en Minecraft...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Confirmar Entrega In-Game</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Publicar / Editar Ítem Digital */}
      {editItemModal !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <form
            onSubmit={handleSaveItem}
            className="mc-modal-dialog"
            style={{
              background: '#131622',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '12px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#f8fafc', margin: 0 }}>
                {editItemModal === 'nuevo' ? '➕ Publicar Nuevo Ítem en MineMarket' : '✏️ Editar Ítem Digital'}
              </h3>
              <button type="button" onClick={() => setEditItemModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Nombre del Ítem Digital *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="ej: Rango VIP Diamante, Kit Minero, Llave Boss..."
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Descripción Comercial *
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe los beneficios que recibe el jugador..."
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Tipo de Ítem *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc', fontSize: '12px' }}
                  >
                    {TIPOS_ITEM.filter(t => t !== 'TODOS').map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Icono / Sprite
                  </label>
                  <input
                    type="text"
                    value={formData.icono}
                    onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                    placeholder="emerald, diamond_sword, tripwire_hook..."
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Precio en Pesos COP ($) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    placeholder="15000"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                    Stock Disponible *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="50"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                  Comando de Consola In-Game * (Usa <code style={{ color: '#38bdf8' }}>{'{player}'}</code> como variable)
                </label>
                <input
                  type="text"
                  required
                  value={formData.comando}
                  onChange={(e) => setFormData({ ...formData, comando: e.target.value })}
                  placeholder="lp user {player} parent set vip  O  give {player} diamond 64"
                  style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '8px 12px', color: '#a5b4fc', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setEditItemModal(null)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: '700',
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {editItemModal === 'nuevo' ? 'Publicar Ítem' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
