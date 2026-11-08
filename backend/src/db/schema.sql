-- =========================================================
-- MC-Desk Database Schema (PostgreSQL / Supabase)
-- =========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'OWNER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Servers Table
CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 25565,
    software VARCHAR(50) DEFAULT 'Paper',
    version VARCHAR(50) DEFAULT '1.21.4',
    status VARCHAR(20) NOT NULL DEFAULT 'OFFLINE' CHECK (status IN ('ONLINE', 'STARTING', 'OFFLINE', 'STOPPING', 'UNKNOWN')),
    max_players INTEGER NOT NULL DEFAULT 20,
    online_players INTEGER NOT NULL DEFAULT 0,
    tps NUMERIC(4, 2) DEFAULT 20.00,
    uptime VARCHAR(50) DEFAULT '0s',
    cpu_usage NUMERIC(5, 2) DEFAULT 0.0,
    ram_usage NUMERIC(5, 2) DEFAULT 0.0,
    cpu_temp VARCHAR(20) DEFAULT 'N/D',
    claim_code VARCHAR(50) UNIQUE,
    claim_code_expires TIMESTAMPTZ,
    agent_token VARCHAR(255) UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_ping_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Server Members Table (RBAC per server)
CREATE TABLE IF NOT EXISTS server_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('OWNER', 'ADMIN', 'VIEWER')),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_server_member UNIQUE (server_id, user_id)
);

-- 4. Players Table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    uuid VARCHAR(64) NOT NULL,
    username VARCHAR(64) NOT NULL,
    skin_url TEXT,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    ping INTEGER DEFAULT 0,
    health NUMERIC(4, 1) DEFAULT 20.0,
    food INTEGER DEFAULT 20,
    level INTEGER DEFAULT 0,
    experience INTEGER DEFAULT 0,
    armor INTEGER DEFAULT 0,
    inventory JSONB DEFAULT '[]'::jsonb,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_server_player UNIQUE (server_id, uuid)
);

-- 5. Player Statistics Table
CREATE TABLE IF NOT EXISTS player_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE UNIQUE,
    playtime_minutes INTEGER DEFAULT 0,
    blocks_mined INTEGER DEFAULT 0,
    mobs_killed INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Server Commands Queue Table
CREATE TABLE IF NOT EXISTS server_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    command TEXT NOT NULL,
    response TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'EXECUTED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_claim ON servers(claim_code);
CREATE INDEX IF NOT EXISTS idx_servers_token ON servers(agent_token);
CREATE INDEX IF NOT EXISTS idx_players_server ON players(server_id);
CREATE INDEX IF NOT EXISTS idx_players_online ON players(server_id, is_online);
CREATE INDEX IF NOT EXISTS idx_commands_status ON server_commands(server_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_server ON audit_logs(server_id, created_at DESC);
