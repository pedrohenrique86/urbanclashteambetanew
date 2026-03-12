-- Adicionar coluna money_daily_gain à tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS money_daily_gain INTEGER DEFAULT 0;

-- Atualizar todos os usuários existentes para ter 0 de ganho diário inicial
UPDATE user_profiles 
SET money_daily_gain = 0 
WHERE money_daily_gain IS NULL;

-- Verificar as alterações
SELECT 
    username,
    faction,
    money,
    money_daily_gain,
    created_at
FROM user_profiles 
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Coluna money_daily_gain adicionada com sucesso!' as status;