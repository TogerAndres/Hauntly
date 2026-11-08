import React from 'react';

export function HeartsBar({ value = 20, max = 20 }) {
  const totalHearts = 10;
  const currentHp = Math.max(0, Math.min(max, value));
  const fullHearts = Math.floor(currentHp / 2);
  const hasHalfHeart = currentHp % 2 >= 1;

  const hearts = [];
  for (let i = 0; i < totalHearts; i++) {
    if (i < fullHearts) {
      hearts.push('full');
    } else if (i === fullHearts && hasHalfHeart) {
      hearts.push('half');
    } else {
      hearts.push('empty');
    }
  }

  return (
    <div className="flex items-center gap-0.5" title={`Vida: ${currentHp} / ${max}`}>
      {hearts.map((type, idx) => (
        <span key={idx} className="inline-block transition-transform hover:scale-125 select-none" style={{ fontSize: '13px' }}>
          {type === 'full' ? '❤️' : type === 'half' ? '💔' : '🖤'}
        </span>
      ))}
    </div>
  );
}
