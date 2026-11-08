import React from 'react';

export function SignalBars({ ping = 32 }) {
  let color = '#22c55e'; // green
  if (ping > 90) color = '#eab308'; // yellow
  if (ping > 140) color = '#ef4444'; // red

  return (
    <div className="flex items-center gap-1.5" title={`Latencia: ${ping} ms`}>
      <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
        <rect x="0" y="9" width="2" height="3" fill={color} />
        <rect x="3" y="6" width="2" height="6" fill={color} />
        <rect x="6" y="3" width="2" height="9" fill={color} />
        <rect x="9" y="0" width="2" height="12" fill={ping > 150 ? '#4b5563' : color} />
        <rect x="12" y="0" width="2" height="12" fill={ping > 100 ? '#4b5563' : color} />
      </svg>
      <span style={{ color, fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-pixel)' }}>
        {ping} ms
      </span>
    </div>
  );
}
