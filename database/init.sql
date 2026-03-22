-- Criação do banco de dados UrbanClash
-- Este arquivo será executado automaticamente quando o container PostgreSQL for iniciado

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    birth_date DATE,
    country VARCHAR(3),
    is_email_confirmed BOOLEAN DEFAULT FALSE,
    email_confirmation_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de perfis de usuário
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    faction VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clãs
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    faction VARCHAR(50) NOT NULL,
    leader_id UUID REFERENCES users(id),
    member_count INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 40,
    is_recruiting BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de membros do clã
CREATE TABLE clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- member, officer, leader
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clan_id, user_id)
);

-- Tabela de sessões (para gerenciar tokens JWT)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_clans_faction ON clans(faction);
CREATE INDEX idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clans_updated_at BEFORE UPDATE ON clans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar member_count automaticamente
CREATE OR REPLACE FUNCTION update_clan_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE clans SET member_count = member_count + 1 WHERE id = NEW.clan_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clans SET member_count = member_count - 1 WHERE id = OLD.clan_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clan_member_count_trigger
    AFTER INSERT OR DELETE ON clan_members
    FOR EACH ROW EXECUTE FUNCTION update_clan_member_count();

-- Dados iniciais de exemplo
INSERT INTO clans (name, description, faction, max_members) VALUES
('Família Corleone', 'Clã tradicional focado em negócios e território', 'gangsters', 40),
('Cartel dos Irmãos', 'Especialistas em operações de alto risco', 'gangsters', 40),
('Máfia Siciliana', 'Veteranos com experiência em estratégias urbanas', 'gangsters', 40),
('Força Tática', 'Unidade de elite especializada em combate urbano', 'guardas', 40),
('Esquadrão Alpha', 'Operações especiais e missões de resgate', 'guardas', 40),
('Batalhão Central', 'Força principal de manutenção da ordem', 'guardas', 40);