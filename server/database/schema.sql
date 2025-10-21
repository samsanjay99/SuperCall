-- Users table with 10-digit UID
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid VARCHAR(10) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Create index on UID for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Call logs table
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caller_uid VARCHAR(10) NOT NULL,
    callee_uid VARCHAR(10) NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL CHECK (status IN ('missed', 'accepted', 'declined', 'busy', 'failed')),
    duration_seconds INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for call logs
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_callee ON call_logs(callee_id, start_time DESC);

-- Devices table for push notifications (future use)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
    push_token VARCHAR(500),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);