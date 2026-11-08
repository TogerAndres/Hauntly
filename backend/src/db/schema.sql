-- ==============================================================================
-- MC-Desk Database Schema (PostgreSQL / Supabase)
-- NORMALIZED TO THIRD NORMAL FORM (3NF)
-- ==============================================================================

-- Enable cryptographic extensions for UUID generation and secure hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. SECURITY & ACCESS CONTROL (3NF)
-- ------------------------------------------------------------------------------

-- 1.1 Roles Lookup Table (Eliminates transitive role dependencies in users)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,       -- 'OWNER', 'ADMIN', 'USER'
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (code, name, description) VALUES
    ('OWNER', 'Propietario', 'Acceso total sin restricciones al sistema y servidores'),
    ('ADMIN', 'Administrador', 'Gestión de servidores, consola, backups y tienda'),
    ('USER', 'Jugador', 'Perfil de usuario conectado a su personaje de Minecraft')
ON CONFLICT (code) DO NOTHING;

-- 1.2 Users Table (Atomic attributes, dependent solely on surrogate PK)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON UPDATE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user authentication lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- ------------------------------------------------------------------------------
-- 2. SERVERS & METRICS (3NF)
-- ------------------------------------------------------------------------------

-- 2.1 Server Statuses Lookup Table
CREATE TABLE IF NOT EXISTS server_statuses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,       -- 'ONLINE', 'SLEEPING', 'STARTING', 'OFFLINE'
    label VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#10b981'
);

INSERT INTO server_statuses (code, label, color) VALUES
    ('ONLINE', '🟢 Activo / Online', '#10b981'),
    ('SLEEPING', '💤 En Reposo (Sleep Starter)', '#8b5cf6'),
    ('STARTING', '🟡 Iniciando', '#f59e0b'),
    ('OFFLINE', '🔴 Desconectado', '#ef4444'),
    ('UNKNOWN', '⚪ Desconocido', '#64748b')
ON CONFLICT (code) DO NOTHING;

-- 2.2 Minecraft Server Platforms (Paper, Forge, Fabric, Purpur)
CREATE TABLE IF NOT EXISTS server_platforms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL        -- 'Forge', 'Paper', 'Fabric', 'Spigot', 'Purpur'
);

INSERT INTO server_platforms (name) VALUES
    ('Forge'), ('Paper'), ('Fabric'), ('Purpur'), ('Spigot'), ('Vanilla')
ON CONFLICT (name) DO NOTHING;

-- 2.3 Servers Table (Static configuration and ownership)
CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 25565,
    platform_id INTEGER REFERENCES server_platforms(id) ON UPDATE CASCADE,
    version VARCHAR(30) NOT NULL DEFAULT '1.20.1',
    status_id INTEGER NOT NULL DEFAULT 4 REFERENCES server_statuses(id) ON UPDATE CASCADE,
    max_players INTEGER NOT NULL DEFAULT 20,
    claim_code VARCHAR(50) UNIQUE,
    claim_code_expires TIMESTAMPTZ,
    agent_token VARCHAR(255) UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_ping_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_claim_code ON servers(claim_code);

-- 2.4 Server Telemetry Metrics (Dynamic time-series separated from static server config)
CREATE TABLE IF NOT EXISTS server_metrics (
    id BIGSERIAL PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    online_players INTEGER NOT NULL DEFAULT 0,
    tps NUMERIC(4, 2) NOT NULL DEFAULT 20.00,
    cpu_usage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    ram_usage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    cpu_temp VARCHAR(20) DEFAULT 'N/D',
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_server_metrics_server_date ON server_metrics(server_id, recorded_at DESC);

-- 2.5 Server Membership & Permissions (RBAC per server)
CREATE TABLE IF NOT EXISTS server_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON UPDATE CASCADE,
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_server_member UNIQUE (server_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 3. MINECRAFT PLAYERS, INVENTORIES & PROFILES (3NF)
-- ------------------------------------------------------------------------------

-- 3.1 Players Table (In-game identity on a specific server)
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    uuid VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    skin_url TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_server_player UNIQUE (server_id, uuid)
);

CREATE INDEX IF NOT EXISTS idx_players_server_username ON players(server_id, LOWER(username));
CREATE INDEX IF NOT EXISTS idx_players_uuid ON players(uuid);

-- 3.2 Web User to Minecraft Player Link (Resolves Player vs User relation in 3NF)
CREATE TABLE IF NOT EXISTS user_minecraft_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_player_profile UNIQUE (user_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_minecraft_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_player ON user_minecraft_profiles(player_id);

-- 3.3 Player Live Vitals (Separated from player metadata to eliminate update anomalies)
CREATE TABLE IF NOT EXISTS player_vitals (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    ping INTEGER DEFAULT 0,
    health NUMERIC(4, 1) NOT NULL DEFAULT 20.0,
    food INTEGER NOT NULL DEFAULT 20,
    level INTEGER NOT NULL DEFAULT 0,
    experience INTEGER NOT NULL DEFAULT 0,
    armor INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Player Inventory Slots (Normalized to 1NF: Atomic rows instead of monolithic JSONB)
CREATE TABLE IF NOT EXISTS player_inventory_slots (
    id BIGSERIAL PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    slot_index INTEGER NOT NULL CHECK (slot_index >= 0 AND slot_index <= 45),
    item_key VARCHAR(80) NOT NULL,          -- 'diamond_sword', 'golden_apple'
    item_count INTEGER NOT NULL DEFAULT 1 CHECK (item_count > 0 AND item_count <= 64),
    display_name VARCHAR(120),
    enchantments JSONB,                     -- Optional metadata
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_player_inventory_slot UNIQUE (player_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_inventory_player ON player_inventory_slots(player_id);

-- 3.5 Player Statistics (Cumulative in-game metrics)
CREATE TABLE IF NOT EXISTS player_statistics (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    playtime_minutes INTEGER NOT NULL DEFAULT 0,
    blocks_mined INTEGER NOT NULL DEFAULT 0,
    mobs_killed INTEGER NOT NULL DEFAULT 0,
    deaths INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. MINEMARKET DIGITAL STORE & TRANSACTIONS (3NF)
-- ------------------------------------------------------------------------------

-- 4.1 Store Categories Lookup Table (Eliminates transitive item type dependencies)
CREATE TABLE IF NOT EXISTS store_categories (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,       -- 'RANGO', 'KIT', 'LLAVE', 'COSMETICO', 'MONEDA'
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) NOT NULL DEFAULT 'diamond',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO store_categories (code, name, icon, display_order) VALUES
    ('RANGO', 'Rangos VIP', 'emerald', 1),
    ('KIT', 'Kits de Combate', 'netherite_sword', 2),
    ('LLAVE', 'Llaves de Crates', 'tripwire_hook', 3),
    ('COSMETICO', 'Cosméticos & Efectos', 'amethyst_shard', 4),
    ('MONEDA', 'Monedas de Economía', 'gold_ingot', 5)
ON CONFLICT (code) DO NOTHING;

-- 4.2 Store Items Table
CREATE TABLE IF NOT EXISTS store_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES store_categories(id) ON UPDATE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    price_cop NUMERIC(12, 2) NOT NULL CHECK (price_cop >= 0),
    stock INTEGER NOT NULL DEFAULT 100 CHECK (stock >= 0),
    server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
    command_template TEXT NOT NULL,          -- 'give {player} diamond 64'
    icon_key VARCHAR(80) NOT NULL DEFAULT 'diamond',
    seller_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_items_category ON store_items(category_id);
CREATE INDEX IF NOT EXISTS idx_store_items_active ON store_items(is_active);

-- 4.3 Store Deliveries / Purchases (Audit trail of digital transactions)
CREATE TABLE IF NOT EXISTS store_deliveries (
    id BIGSERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES store_items(id) ON UPDATE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    target_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    target_player_gamertag VARCHAR(64) NOT NULL,
    executed_command TEXT NOT NULL,
    price_cop NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED' CHECK (status IN ('PENDING', 'DELIVERED', 'FAILED')),
    delivery_output TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_buyer ON store_deliveries(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON store_deliveries(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. AUDIT TRAIL & SYSTEM LOGGING (3NF)
-- ------------------------------------------------------------------------------

-- 5.1 Audit Action Types Table
CREATE TABLE IF NOT EXISTS audit_action_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,       -- 'USER_LOGIN', 'USER_REGISTERED', 'STEALTH_GAMEMODE'
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'WARN', 'CRITICAL'))
);

INSERT INTO audit_action_types (code, severity) VALUES
    ('USER_LOGIN', 'INFO'),
    ('USER_LOGIN_FAILED', 'WARN'),
    ('USER_REGISTERED', 'INFO'),
    ('GAMEMODE_CHANGED', 'INFO'),
    ('CONSOLE_COMMAND', 'WARN'),
    ('BACKUP_CREATED', 'INFO'),
    ('PROPERTIES_UPDATED', 'WARN'),
    ('MINEMARKET_PURCHASE', 'INFO'),
    ('MINEMARKET_ITEM_CREATED', 'INFO'),
    ('MINEMARKET_ITEM_DELETED', 'WARN')
ON CONFLICT (code) DO NOTHING;

-- 5.2 Audit Logs Table (Direct references, no redundant user_email)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type_id INTEGER NOT NULL REFERENCES audit_action_types(id) ON UPDATE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,                          -- Specific contextual metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_server_time ON audit_logs(server_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action_type_id);

-- ------------------------------------------------------------------------------
-- 6. VIEWS FOR BACKWARD COMPATIBILITY & ULTRA-FAST QUERIES
-- ------------------------------------------------------------------------------

-- View: Denormalized User Profile with Linked Minecraft Account
CREATE OR REPLACE VIEW v_user_profiles AS
SELECT 
    u.id,
    u.email,
    u.display_name,
    r.code AS role,
    p.username AS minecraft_username,
    p.uuid AS minecraft_uuid,
    COALESCE(p.skin_url, 'https://mc-heads.net/avatar/' || COALESCE(p.username, 'Steve')) AS avatar_url,
    u.is_active,
    u.created_at,
    u.updated_at
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN user_minecraft_profiles ump ON u.id = ump.user_id AND ump.is_primary = TRUE
LEFT JOIN players p ON ump.player_id = p.id;

-- View: Complete Player Details with Live Vitals
CREATE OR REPLACE VIEW v_players_with_vitals AS
SELECT 
    p.id,
    p.server_id,
    p.uuid,
    p.username,
    COALESCE(p.skin_url, 'https://mc-heads.net/avatar/' || p.username) AS skin_url,
    v.is_online,
    v.ping,
    v.health,
    v.food,
    v.level,
    v.experience,
    v.armor,
    s.playtime_minutes,
    s.blocks_mined,
    s.mobs_killed,
    s.deaths,
    p.last_seen
FROM players p
LEFT JOIN player_vitals v ON p.id = v.player_id
LEFT JOIN player_statistics s ON p.id = s.player_id;
