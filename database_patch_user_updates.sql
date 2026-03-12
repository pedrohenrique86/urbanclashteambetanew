-- Patch para PostgreSQL: Atualização das tabelas users e user_profiles
-- Data: 2024
-- Descrição: Adiciona campos de data de nascimento e país na tabela users,
--            e substitui display_name por username na tabela user_profiles

-- ============================================================================
-- PARTE 1: Atualizar tabela users
-- ============================================================================

-- Adicionar colunas de data de nascimento e país na tabela users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS country VARCHAR(3); -- Código ISO 3166-1 alpha-2 (ex: BR, US, etc)

-- Adicionar comentários para documentação
COMMENT ON COLUMN users.birth_date IS 'Data de nascimento do usuário';
COMMENT ON COLUMN users.country IS 'Código do país de residência (ISO 3166-1 alpha-2)';

-- ============================================================================
-- PARTE 2: Atualizar tabela user_profiles
-- ============================================================================

-- Verificar se a coluna username já existe na tabela user_profiles
DO $$
BEGIN
    -- Se a coluna username não existir, criar ela
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN username VARCHAR(50);
    END IF;
END $$;

-- Migrar dados de display_name para username (se display_name existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'display_name'
    ) THEN
        -- Copiar dados de display_name para username onde username está vazio
        UPDATE user_profiles 
        SET username = display_name 
        WHERE username IS NULL AND display_name IS NOT NULL;
        
        -- Remover a coluna display_name
        ALTER TABLE user_profiles DROP COLUMN display_name;
    END IF;
END $$;

-- Adicionar restrições na nova coluna username
ALTER TABLE user_profiles 
ALTER COLUMN username SET NOT NULL;

-- Adicionar índice único para username se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'user_profiles' 
        AND indexname = 'user_profiles_username_unique'
    ) THEN
        CREATE UNIQUE INDEX user_profiles_username_unique ON user_profiles(username);
    END IF;
END $$;

-- Adicionar comentário para documentação
COMMENT ON COLUMN user_profiles.username IS 'Nome de usuário único do jogador';

-- ============================================================================
-- PARTE 3: Atualizar índices e constraints
-- ============================================================================

-- Criar índice para country na tabela users (para consultas por país)
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);

-- Criar índice para birth_date na tabela users (para consultas por idade)
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users(birth_date);

-- ============================================================================
-- PARTE 4: Verificações finais
-- ============================================================================

-- Verificar estrutura das tabelas após as alterações
DO $$
BEGIN
    RAISE NOTICE 'Patch aplicado com sucesso!';
    RAISE NOTICE 'Tabela users agora inclui: birth_date, country';
    RAISE NOTICE 'Tabela user_profiles: display_name foi substituído por username';
END $$;

-- Mostrar estrutura atual das tabelas (opcional - para verificação)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' 
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_profiles' 
-- ORDER BY ordinal_position;