import React from 'react';

// Texture pack paths
export const HUD_TEXTURES = {
  heart: {
    full: '/assets/minecraft/textures/gui/sprites/hud/heart/full.png',
    half: '/assets/minecraft/textures/gui/sprites/hud/heart/half.png',
    container: '/assets/minecraft/textures/gui/sprites/hud/heart/container.png',
  },
  food: {
    full: '/assets/minecraft/textures/gui/sprites/hud/food_full.png',
    half: '/assets/minecraft/textures/gui/sprites/hud/food_half.png',
    empty: '/assets/minecraft/textures/gui/sprites/hud/food_empty.png',
  },
  armor: {
    full: '/assets/minecraft/textures/gui/sprites/hud/armor_full.png',
    half: '/assets/minecraft/textures/gui/sprites/hud/armor_half.png',
    empty: '/assets/minecraft/textures/gui/sprites/hud/armor_empty.png',
  },
  slot: '/assets/minecraft/textures/gui/sprites/container/slot.png'
};

// Item texture path resolver
export function getItemTextureUrl(name) {
  if (!name) return null;
  const clean = name.replace(/^minecraft:/, '').toLowerCase();

  // Blocks that are held in inventory as block textures
  const blockItems = [
    'cobblestone', 'oak_planks', 'stone', 'dirt', 'bedrock', 
    'sand', 'gravel', 'obsidian', 'tnt', 'bookshelf',
    'crafting_table', 'furnace', 'grass_block'
  ];

  if (clean === 'crossbow') {
    return '/assets/minecraft/textures/item/crossbow_standby.png';
  }

  if (blockItems.includes(clean)) {
    if (clean === 'grass_block') {
      return '/assets/minecraft/textures/block/grass_block_side.png';
    }
    return `/assets/minecraft/textures/block/${clean}.png`;
  }

  if (clean.includes(':')) {
    const parts = clean.split(':');
    const modItem = parts[1];
    if (modItem.includes('book')) return '/assets/minecraft/textures/item/book.png';
    if (modItem.includes('acorn') || modItem.includes('seed')) return '/assets/minecraft/textures/item/wheat_seeds.png';
    return `/assets/minecraft/textures/item/${modItem}.png`;
  }

  return `/assets/minecraft/textures/item/${clean}.png`;
}

// Authentic Minecraft Pixel Heart Component
export function McHeart({ type = 'full', size = 18 }) {
  const heartOverlay = type === 'full' 
    ? HUD_TEXTURES.heart.full 
    : type === 'half' 
    ? HUD_TEXTURES.heart.half 
    : null;

  return (
    <span 
      className="inline-block relative select-none" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        imageRendering: 'pixelated',
        position: 'relative',
        display: 'inline-block'
      }}
    >
      {/* Background Heart Container */}
      <img 
        src={HUD_TEXTURES.heart.container} 
        alt="container" 
        style={{ 
          width: '100%', 
          height: '100%', 
          imageRendering: 'pixelated', 
          display: 'block' 
        }} 
      />
      {/* Red Heart Overlay */}
      {heartOverlay && (
        <img 
          src={heartOverlay} 
          alt={`heart-${type}`} 
          style={{ 
            width: '100%', 
            height: '100%', 
            imageRendering: 'pixelated', 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            display: 'block' 
          }} 
        />
      )}
    </span>
  );
}

// Authentic Minecraft Food Drumstick Component
export function McFood({ type = 'full', size = 18 }) {
  const foodSrc = type === 'full' 
    ? HUD_TEXTURES.food.full 
    : type === 'half' 
    ? HUD_TEXTURES.food.half 
    : HUD_TEXTURES.food.empty;

  return (
    <span 
      className="inline-block select-none" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        imageRendering: 'pixelated',
        display: 'inline-block'
      }}
    >
      <img 
        src={foodSrc} 
        alt={`food-${type}`} 
        style={{ 
          width: '100%', 
          height: '100%', 
          imageRendering: 'pixelated', 
          display: 'block' 
        }} 
      />
    </span>
  );
}

// Grass block icon
export function GrassBlockIcon({ size = 20 }) {
  return (
    <img 
      src="/assets/minecraft/textures/block/grass_block_side.png" 
      alt="Grass Block" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        imageRendering: 'pixelated', 
        display: 'inline-block',
        borderRadius: '2px'
      }} 
    />
  );
}

// Chest block icon
export function ChestBlockIcon({ size = 20 }) {
  return (
    <img 
      src="/assets/minecraft/textures/item/chest.png" 
      alt="Chest" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        imageRendering: 'pixelated', 
        display: 'inline-block' 
      }} 
    />
  );
}

// Pixel Art Inventory Item Icon with texture pack resolver
export function McItemIcon({ name, size = 28 }) {
  const src = getItemTextureUrl(name);

  return (
    <img 
      src={src} 
      alt={name} 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        objectFit: 'contain', 
        imageRendering: 'pixelated',
        filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45))'
      }}
      onError={(e) => {
        // In case an unknown item is passed, fallback gracefully
        e.currentTarget.onerror = null;
        e.currentTarget.src = '/assets/minecraft/textures/item/chest.png';
      }}
    />
  );
}

// Authentic Player Face Avatar component with real Minecraft Skin API
export function McPlayerFace({ username = 'Steve', size = 28 }) {
  const cleanName = encodeURIComponent((username || 'Steve').trim());
  const primaryUrl = `https://mc-heads.net/avatar/${cleanName}/${size}`;
  const fallbackUrl = `https://minotar.net/helm/${cleanName}/${size}.png`;

  return (
    <div 
      className="inline-block overflow-hidden flex-shrink-0"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        borderRadius: '3px',
        border: '1px solid #0f172a',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        backgroundColor: '#27272a',
        flexShrink: 0
      }}
      title={username}
    >
      <img
        src={primaryUrl}
        alt={username}
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src !== fallbackUrl) {
            e.currentTarget.src = fallbackUrl;
          } else {
            // Offline fallback to SVG
            e.currentTarget.style.display = 'none';
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          imageRendering: 'pixelated',
          display: 'block'
        }}
      />
    </div>
  );
}

