-- Auth Service PostgreSQL Schema
-- Migration from MongoDB to PostgreSQL for serverless architecture

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - main authentication data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_verified BOOLEAN DEFAULT FALSE,
    reset_password_token VARCHAR(255),
    reset_password_expires_at TIMESTAMP WITH TIME ZONE,
    verification_token VARCHAR(255),
    verification_token_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table - for refresh token management (optional for future)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON user_sessions(is_active);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON user_sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired tokens function
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Clear expired verification tokens
    UPDATE users 
    SET verification_token = NULL, 
        verification_token_expires_at = NULL
    WHERE verification_token_expires_at < NOW();
    
    -- Clear expired reset password tokens
    UPDATE users 
    SET reset_password_token = NULL, 
        reset_password_expires_at = NULL
    WHERE reset_password_expires_at < NOW();
    
    -- Deactivate expired sessions
    UPDATE user_sessions 
    SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE;
END;
$$ language 'plpgsql';

-- Sample data for testing (remove in production)
-- INSERT INTO users (email, password_hash, name, is_verified) VALUES 
-- ('test@example.com', '$2b$10$example_hash', 'Test User', true);

-- Grant permissions (adjust based on your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_lambda_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_lambda_user;
