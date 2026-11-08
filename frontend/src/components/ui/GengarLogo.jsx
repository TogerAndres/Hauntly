import React from 'react';

export function GengarLogo({ size = 48, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="gengarShade" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="70%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.5"/>
        </filter>
      </defs>

      {/* Spikes / Ears */}
      <path
        d="M20 28 L12 8 L32 18 Z M40 18 L50 4 L60 18 Z M68 18 L88 8 L80 28 Z"
        fill="#5b21b6"
        stroke="#2e1065"
        strokeWidth="2.5"
      />
      
      {/* Side arm spikes */}
      <path
        d="M8 48 L0 44 L10 58 Z M92 48 L100 44 L90 58 Z"
        fill="#5b21b6"
        stroke="#2e1065"
        strokeWidth="2.5"
      />

      {/* Main Body */}
      <ellipse
        cx="50"
        cy="56"
        rx="40"
        ry="36"
        fill="url(#gengarShade)"
        stroke="#2e1065"
        strokeWidth="3.5"
        filter="url(#shadow)"
      />

      {/* Feet */}
      <ellipse cx="32" cy="90" rx="10" ry="6" fill="#4c1d95" stroke="#2e1065" strokeWidth="2" />
      <ellipse cx="68" cy="90" rx="10" ry="6" fill="#4c1d95" stroke="#2e1065" strokeWidth="2" />

      {/* Eyes (Sinister Red Slits) */}
      <polygon points="26,38 42,48 28,52" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
      <circle cx="34" cy="46" r="2" fill="#ffffff" />

      <polygon points="74,38 58,48 72,52" fill="#ef4444" stroke="#991b1b" strokeWidth="1.5" />
      <circle cx="66" cy="46" r="2" fill="#ffffff" />

      {/* Evil Grin & Teeth */}
      <path
        d="M24 64 Q50 82 76 64 Q50 72 24 64 Z"
        fill="#ffffff"
        stroke="#2e1065"
        strokeWidth="2.5"
      />
      {/* Teeth dividers */}
      <path
        d="M34 66 L36 74 M44 68 L46 76 M54 68 L54 76 M64 66 L62 74"
        stroke="#2e1065"
        strokeWidth="2"
      />
    </svg>
  );
}
