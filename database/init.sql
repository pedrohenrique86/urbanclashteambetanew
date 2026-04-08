-- Criação do banco de dados UrbanClash
-- Este arquivo será executado automaticamente quando o container PostgreSQL for iniciado

-- Limpeza inicial para garantir recriação limpa
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS game_config CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clãs
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    faction VARCHAR(50) NOT NULL,
    leader_id UUID REFERENCES users(id) ON DELETE SET NULL, -- <<< CORREÇÃO ADICIONADA AQUI
    member_count INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 40,
    is_recruiting BOOLEAN DEFAULT TRUE,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de perfis de usuário
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES clans(id) ON DELETE SET NULL,
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    faction VARCHAR(50),
    attack NUMERIC DEFAULT 0,
    defense NUMERIC DEFAULT 0,
    focus NUMERIC DEFAULT 0,
    intimidation NUMERIC DEFAULT 0,
    discipline NUMERIC DEFAULT 0,
    critical_chance NUMERIC DEFAULT 0,
    critical_damage NUMERIC DEFAULT 150,
    energy INTEGER DEFAULT 100,
    current_xp INTEGER DEFAULT 0,
    xp_required INTEGER DEFAULT 100,
    action_points INTEGER DEFAULT 20000,
    money INTEGER DEFAULT 1000,
    money_daily_gain INTEGER DEFAULT 0,
    victories INTEGER DEFAULT 0,
    defeats INTEGER DEFAULT 0,
    winning_streak INTEGER DEFAULT 0,
    action_points_reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    UNIQUE(clan_id, user_id),
    UNIQUE(user_id) -- Garante que um usuário não possa estar em mais de um clã
);

-- Tabela de configuração do jogo (chave-valor)
CREATE TABLE game_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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





-- Inserir os 26 clãs iniciais
INSERT INTO clans (name, faction, points, description) VALUES
('Sindicato da Sombra', 'gangsters', 0, 'Onde a lealdade é comprada e a traição é punida.'),
('Navalhas Noturnas', 'gangsters', 0, 'Cortamos o silêncio da noite com o som do aço.'),
('Irmandade do Asfalto', 'gangsters', 0, 'As ruas são nossas, o resto é paisagem.'),
('Cães de Aluguel', 'gangsters', 0, 'Qualquer serviço, qualquer hora. O preço é a sua alma.'),
('Corvos Urbanos', 'gangsters', 0, 'Observamos tudo, pegamos o que queremos.'),
('Víbora de Concreto', 'gangsters', 0, 'Nosso veneno corre pelas veias da cidade.'),
('Mercenários do Neon', 'gangsters', 0, 'Luzes brilhantes, negócios sombrios.'),
('Esquadrão Fantasma', 'gangsters', 0, 'Você nunca nos vê chegando.'),
('Lâminas do Beco', 'gangsters', 0, 'Nascidos na escuridão, mestres da emboscada.'),
('Cartel do Subúrbio', 'gangsters', 0, 'O poder real não precisa de holofotes.'),
('Lobos de Rua', 'gangsters', 0, 'Uma matilha unida pela fome de poder.'),
('Abutres da Metrópole', 'gangsters', 0, 'Lucramos com os restos que os outros deixam.'),
('Titãs de Ferro', 'gangsters', 0, 'Indestrutíveis, implacáveis, inevitáveis.'),
('Baluarte da Justiça', 'guardas', 0, 'A última linha de defesa entre a ordem e o caos.'),
('Sentinelas da Ordem', 'guardas', 0, 'Vigiamos para que outros possam dormir em paz.'),
('Legião Protetora', 'guardas', 0, 'Um por todos e todos pela cidade.'),
('Guardiões do Amanhecer', 'guardas', 0, 'Lutamos pela promessa de um novo dia.'),
('Defensores da Cidade', 'guardas', 0, 'Esta cidade é nossa casa. E nós protegemos nosso lar.'),
('Vigilantes de Aço', 'guardas', 0, 'A lei forjada em combate.'),
('Escudo Cidadão', 'guardas', 0, 'Nossa força vem daqueles que protegemos.'),
('Tropa de Honra', 'guardas', 0, 'Honra acima de tudo, dever acima de todos.'),
('Falcões Urbanos', 'guardas', 0, 'Dos céus, a justiça enxerga longe.'),
('Muralha Protetora', 'guardas', 0, 'Onde a anarquia encontra seu fim.'),
('Vanguarda Cívica', 'guardas', 0, 'Liderando o caminho para um futuro seguro.'),
('Pacificadores', 'guardas', 0, 'A paz é nossa profissão.'),
('Força Unida', 'guardas', 0, 'Juntos, somos inquebráveis.')
ON CONFLICT (name) DO NOTHING;