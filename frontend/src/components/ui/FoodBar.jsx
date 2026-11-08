import React from 'react';

export function FoodBar({ value = 20, max = 20 }) {
  const totalIcons = 10;
  const currentFood = Math.max(0, Math.min(max, value));
  const fullShanks = Math.floor(currentFood / 2);

  const shanks = [];
  for (let i = 0; i < totalIcons; i++) {
    if (i < fullShanks) {
      shanks.push('full');
    } else {
      shanks.push('empty');
    }
  }

  return (
    <div className="flex items-center gap-0.5" title={`Comida: ${currentFood} / ${max}`}>
      {shanks.map((type, idx) => (
        <span key={idx} className="inline-block transition-transform hover:scale-125 select-none" style={{ fontSize: '13px' }}>
          {type === 'full' ? '🍗' : '🦴'}
        </span>
      ))}
    </div>
  );
}
