-- Adicionar novas colunas de combate à tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN energy INTEGER DEFAULT 100,
ADD COLUMN current_xp INTEGER DEFAULT 0,
ADD COLUMN xp_required INTEGER DEFAULT 100,
ADD COLUMN action_points INTEGER DEFAULT 20000,
ADD COLUMN attack INTEGER DEFAULT 0,
ADD COLUMN defense INTEGER DEFAULT 0,
ADD COLUMN focus INTEGER DEFAULT 0,
ADD COLUMN intimidation DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN discipline DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN critical_damage DECIMAL(5,2) DEFAULT 150.00,
ADD COLUMN critical_chance DECIMAL(5,2) DEFAULT 10.00,
ADD COLUMN action_points_reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Comentários explicativos
COMMENT ON COLUMN user_profiles.energy IS 'Energia do jogador (padrão: 100)';
COMMENT ON COLUMN user_profiles.current_xp IS 'XP atual do jogador';
COMMENT ON COLUMN user_profiles.xp_required IS 'XP necessário para próximo nível';
COMMENT ON COLUMN user_profiles.action_points IS 'Pontos de ação diários (reset às 00:00)';
COMMENT ON COLUMN user_profiles.attack IS 'Atributo de ataque';
COMMENT ON COLUMN user_profiles.defense IS 'Atributo de defesa';
COMMENT ON COLUMN user_profiles.focus IS 'Atributo de foco (afeta crítico)';
COMMENT ON COLUMN user_profiles.intimidation IS 'Redução de defesa inimiga (%)';
COMMENT ON COLUMN user_profiles.discipline IS 'Redução de dano recebido (%)';
COMMENT ON COLUMN user_profiles.critical_damage IS 'Multiplicador de dano crítico (%)';
COMMENT ON COLUMN user_profiles.critical_chance IS 'Chance de dano crítico (%)';
COMMENT ON COLUMN user_profiles.action_points_reset_time IS 'Último reset dos pontos de ação';