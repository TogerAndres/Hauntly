const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const { enqueueCommand } = require('../services/commandQueue');
const minecraftBridge = require('../services/minecraftBridge');

const TIPOS_ITEM = ['RANGO', 'KIT', 'LLAVE', 'COSMETICO', 'MONEDA'];

// Helper to get or initialize items collection
function getItemsStore() {
  if (!db.memoryStore.items) {
    db.memoryStore.items = [
      {
        id_item: 1,
        nombre: 'Rango VIP Esmeralda',
        descripcion: 'Vuelo en lobby, prefijo VIP brillante en chat y acceso a 3 hogares (/sethome).',
        tipo: 'RANGO',
        precio: 15000,
        stock: 50,
        servidor: 'Forge 1.20.1',
        comando: 'lp user {player} parent set vip',
        icono: 'emerald',
        id_vendedor: 'u-1',
        activo: true,
        fecha_creacion: new Date().toISOString()
      },
      {
        id_item: 2,
        nombre: 'Kit Maestro de Netherite',
        descripcion: 'Armadura completa de Netherite con Protección IV y Espada con Filo V.',
        tipo: 'KIT',
        precio: 12000,
        stock: 30,
        servidor: 'Forge 1.20.1',
        comando: 'give {player} netherite_sword{Enchantments:[{id:"sharpness",lvl:5s}]} 1',
        icono: 'netherite_sword',
        id_vendedor: 'u-1',
        activo: true,
        fecha_creacion: new Date().toISOString()
      },
      {
        id_item: 3,
        nombre: 'Llave Legendaria del Vacío',
        descripcion: 'Abre el cofre legendario en el spawn con recompensas ultra raras.',
        tipo: 'LLAVE',
        precio: 5000,
        stock: 120,
        servidor: 'Forge 1.20.1',
        comando: 'give {player} tripwire_hook{display:{Name:\'{"text":"Llave Legendaria","color":"gold"}\'}} 1',
        icono: 'tripwire_hook',
        id_vendedor: 'u-1',
        activo: true,
        fecha_creacion: new Date().toISOString()
      },
      {
        id_item: 4,
        nombre: 'Bolsa de 10,000 Monedas',
        descripcion: 'Dinero virtual transferido instantáneamente a tu balance de economía in-game.',
        tipo: 'MONEDA',
        precio: 8000,
        stock: 999,
        servidor: 'Forge 1.20.1',
        comando: 'eco give {player} 10000',
        icono: 'gold_ingot',
        id_vendedor: 'u-1',
        activo: true,
        fecha_creacion: new Date().toISOString()
      }
    ];
    db.saveStore?.();
  }
  return db.memoryStore.items;
}

// 1. GET /api/items — List all active items (Public / Authenticated)
router.get('/', (req, res) => {
  const { tipo, q, servidor } = req.query;
  const items = getItemsStore();

  let filtered = items.filter(i => i.activo !== false);

  if (tipo && tipo.trim() !== '') {
    filtered = filtered.filter(i => i.tipo.toUpperCase() === tipo.trim().toUpperCase());
  }

  if (q && q.trim() !== '') {
    const term = q.trim().toLowerCase();
    filtered = filtered.filter(i => 
      i.nombre.toLowerCase().includes(term) || 
      i.descripcion.toLowerCase().includes(term) ||
      (i.servidor && i.servidor.toLowerCase().includes(term))
    );
  }

  if (servidor && servidor.trim() !== '') {
    filtered = filtered.filter(i => i.servidor && i.servidor.toLowerCase() === servidor.trim().toLowerCase());
  }

  res.json({
    items: filtered,
    total: filtered.length,
    tipos_disponibles: TIPOS_ITEM
  });
});

// 2. GET /api/items/:id — Get item detail
router.get('/:id', (req, res) => {
  const items = getItemsStore();
  const item = items.find(i => String(i.id_item) === String(req.params.id));
  if (!item) {
    return res.status(404).json({ error: 'Ítem digital no encontrado' });
  }
  res.json({ item });
});

// 3. POST /api/items — Create digital item (Requires Admin)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { nombre, descripcion, tipo, precio, stock = 100, servidor, comando, icono } = req.body;

  if (!nombre || !descripcion || !tipo || precio === undefined) {
    return res.status(400).json({ error: 'Faltan campos obligatorios (nombre, descripcion, tipo, precio)' });
  }

  const numPrecio = Number(precio);
  if (isNaN(numPrecio) || numPrecio <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número mayor a 0' });
  }

  const tipoNormalizado = String(tipo).toUpperCase().trim();
  if (!TIPOS_ITEM.includes(tipoNormalizado)) {
    return res.status(400).json({ error: `El tipo debe ser uno de: ${TIPOS_ITEM.join(', ')}` });
  }

  const items = getItemsStore();
  const nextId = items.length > 0 ? Math.max(...items.map(i => i.id_item || 0)) + 1 : 1;

  const newItem = {
    id_item: nextId,
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    tipo: tipoNormalizado,
    precio: numPrecio,
    stock: Math.max(0, parseInt(stock, 10) || 0),
    servidor: (servidor || 'Minecraft Server').trim(),
    comando: (comando || `give {player} diamond 1`).trim(),
    icono: icono || (tipoNormalizado === 'RANGO' ? 'emerald' : tipoNormalizado === 'LLAVE' ? 'tripwire_hook' : 'diamond'),
    id_vendedor: req.user.id,
    activo: true,
    fecha_creacion: new Date().toISOString()
  };

  items.push(newItem);
  db.saveStore?.();

  await logAudit({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'MINEMARKET_ITEM_CREATED',
    details: { id: newItem.id_item, nombre: newItem.nombre, precio: newItem.precio }
  });

  res.status(201).json({
    message: 'Ítem digital creado exitosamente en MineMarket',
    item: newItem
  });
});

// 4. PUT /api/items/:id — Update digital item
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const items = getItemsStore();
  const idx = items.findIndex(i => String(i.id_item) === String(req.params.id));
  if (idx === -1) {
    return res.status(404).json({ error: 'Ítem no encontrado' });
  }

  const existing = items[idx];
  const { nombre, descripcion, tipo, precio, stock, servidor, comando, icono } = req.body;

  if (tipo && !TIPOS_ITEM.includes(String(tipo).toUpperCase().trim())) {
    return res.status(400).json({ error: `Tipo inválido. Opciones: ${TIPOS_ITEM.join(', ')}` });
  }

  items[idx] = {
    ...existing,
    ...(nombre ? { nombre: nombre.trim() } : {}),
    ...(descripcion ? { descripcion: descripcion.trim() } : {}),
    ...(tipo ? { tipo: String(tipo).toUpperCase().trim() } : {}),
    ...(precio !== undefined ? { precio: Number(precio) } : {}),
    ...(stock !== undefined ? { stock: Math.max(0, parseInt(stock, 10)) } : {}),
    ...(servidor ? { servidor: servidor.trim() } : {}),
    ...(comando ? { comando: comando.trim() } : {}),
    ...(icono ? { icono: icono.trim() } : {}),
    fecha_actualizacion: new Date().toISOString()
  };

  db.saveStore?.();

  res.json({
    message: 'Ítem actualizado correctamente',
    item: items[idx]
  });
});

// 5. DELETE /api/items/:id — Soft delete digital item
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const items = getItemsStore();
  const item = items.find(i => String(i.id_item) === String(req.params.id));
  if (!item) {
    return res.status(404).json({ error: 'Ítem no encontrado' });
  }

  item.activo = false;
  db.saveStore?.();

  await logAudit({
    userId: req.user.id,
    userEmail: req.user.email,
    action: 'MINEMARKET_ITEM_DELETED',
    details: { id: item.id_item, nombre: item.nombre }
  });

  res.json({ success: true, message: `Ítem "${item.nombre}" deshabilitado del catálogo` });
});

// 6. POST /api/items/:id/deliver — Purchase / Deliver Item in Minecraft
router.post('/:id/deliver', authenticate, async (req, res) => {
  const { id } = req.params;
  const { playerGamertag, serverId = 's-1' } = req.body;

  let targetPlayer = playerGamertag;

  // REGLA: Los usuarios normales (USER) solo pueden recibir entregas a su propio jugador vinculado en el servidor
  if (req.user.role === 'USER') {
    if (!req.user.minecraftUsername) {
      return res.status(400).json({
        error: 'Tu cuenta web no está vinculada a ningún jugador de Minecraft en el servidor. Vincula tu cuenta primero.'
      });
    }
    targetPlayer = req.user.minecraftUsername;
  } else {
    // Los administradores pueden elegir cualquier jugador o usar el suyo
    targetPlayer = playerGamertag || req.user.minecraftUsername || 'Steve';
  }

  if (!targetPlayer || typeof targetPlayer !== 'string' || targetPlayer.trim().length === 0) {
    return res.status(400).json({ error: 'El Gamertag del jugador de Minecraft es obligatorio para la entrega' });
  }

  const cleanPlayer = targetPlayer.trim().replace(/[^a-zA-Z0-9_]/g, '');
  const items = getItemsStore();
  const item = items.find(i => String(i.id_item) === String(id) && i.activo !== false);

  if (!item) {
    return res.status(404).json({ error: 'Ítem digital no encontrado o no disponible' });
  }

  if (item.stock <= 0) {
    return res.status(400).json({ error: 'El ítem se encuentra agotado' });
  }

  // Build the command replacing {player} placeholder
  const rawCommand = (item.comando || 'give {player} diamond 1').replace(/\{player\}/gi, cleanPlayer);
  const cleanCmd = rawCommand.replace(/^[/]/, '').trim();

  try {
    let execResult = null;

    // Check if server is agent-based or legacy bridge
    const srv = db.memoryStore.servers.find(s => s.id === serverId);
    const isAgentActive = srv && srv.agent_token && srv.last_ping_at &&
      (Date.now() - new Date(srv.last_ping_at).getTime() < 120000);

    if (isAgentActive) {
      execResult = await enqueueCommand(serverId, cleanCmd);
    } else {
      execResult = await minecraftBridge.executeRemoteCommand(cleanCmd);
    }

    // Decrement stock
    item.stock = Math.max(0, item.stock - 1);
    db.saveStore?.();

    // Audit log
    await logAudit({
      serverId,
      userId: req.user.id,
      userEmail: req.user.email,
      action: 'MINEMARKET_ITEM_DELIVERED',
      details: {
        itemId: item.id_item,
        itemName: item.nombre,
        targetPlayer: cleanPlayer,
        executedCommand: cleanCmd,
        result: execResult
      }
    });

    res.json({
      success: true,
      message: `¡${item.nombre} entregado con éxito a ${cleanPlayer}!`,
      item: { id_item: item.id_item, nombre: item.nombre, remaining_stock: item.stock },
      deliveredTo: cleanPlayer,
      executedCommand: cleanCmd,
      output: execResult?.output || []
    });
  } catch (err) {
    console.error('[MineMarket] Error delivering item:', err);
    res.status(500).json({ error: `Error al ejecutar la entrega en el servidor: ${err.message}` });
  }
});

module.exports = router;
