-- Script para remover a coluna username da tabela user_profiles
-- O username deve vir da tabela users, não de user_profiles

BEGIN;

-- Verificar se a coluna username existe na tabela user_profiles
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'username'
    ) THEN
        -- Remover a coluna username da tabela user_profiles
        ALTER TABLE user_profiles DROP COLUMN username;
        RAISE NOTICE 'Coluna username removida da tabela user_profiles';
    ELSE
        RAISE NOTICE 'Coluna username não existe na tabela user_profiles';
    END IF;
END $$;

COMMIT;

-- Verificar a estrutura final da tabela user_profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;