-- Adicionar novas colunas de dinheiro e estatísticas de combate à tabela user_profiles

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS money INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS victories INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS defeats INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS winning_streak INTEGER DEFAULT 0;

-- Atualizar todos os usuários existentes para ter 1000 de dinheiro inicial
UPDATE user_profiles 
SET money = 1000 
WHERE money IS NULL OR money = 0;

-- Verificar as alterações
SELECT 
    display_name,
    faction,
    money,
    victories,
    defeats,
    winning_streak,
    action_points,
    current_xp
FROM user_profiles 
LIMIT 5;