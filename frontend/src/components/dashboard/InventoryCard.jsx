import React from 'react';
import { ChestBlockIcon, McItemIcon } from '../ui/MinecraftSprites';
import { useServer, DEFAULT_ROGER_INVENTORY } from '../../context/ServerContext';

export function InventoryCard({ player }) {
  const { selectedPlayer } = useServer();
  const p = player || selectedPlayer;
  const rawItems = p?.inventory && p.inventory.length > 0 ? p.inventory : DEFAULT_ROGER_INVENTORY;

  // Build a 14-slot array (2 rows of 7 slots)
  const slots = Array.from({ length: 14 }, (_, idx) => {
    const found = rawItems.find(it => it.slot === idx || it.slot === (idx >= 7 ? idx + 2 : idx));
    const fallback = rawItems[idx];
    const item = found || fallback;
    if (!item) return null;
    return {
      name: item.item || item.name,
      label: item.name || item.item?.replace(/_/g, ' '),
      count: item.count || 1
    };
  });

  const row1 = slots.slice(0, 7);
  const row2 = slots.slice(7, 14);

  const title = p?.username === 'Roger' ? 'Tu inventario' : `Inventario de ${p?.username || 'Jugador'}`;

  return (
    <div className="mc-card">
      {/* Header */}
      <div className="mc-card-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ChestBlockIcon size={18} />
          <span>{title}</span>
        </div>
        <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
          {rawItems.length} items
        </span>
      </div>

      <div className="mc-inventory-board">
        {/* Row 1 */}
        <div className="mc-inventory-row">
          {row1.map((item, i) => (
            <div key={`r1-${i}`} className="mc-slot" title={item ? `${item.label} (${item.count})` : 'Ranura vacía'}>
              {item && (
                <>
                  <McItemIcon name={item.name} size={28} />
                  {item.count > 1 && <span className="mc-slot-count">{item.count}</span>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Row 2 */}
        <div className="mc-inventory-row">
          {row2.map((item, i) => (
            <div key={`r2-${i}`} className="mc-slot" title={item ? `${item.label} (${item.count})` : 'Ranura vacía'}>
              {item && (
                <>
                  <McItemIcon name={item.name} size={28} />
                  {item.count > 1 && <span className="mc-slot-count">{item.count}</span>}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

