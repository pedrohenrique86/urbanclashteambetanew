-- Script para remover triggers de clãs conforme solicitado

-- Remover trigger de validação de mudança de clã
DROP TRIGGER IF EXISTS validate_clan_change_trigger ON user_profiles;

-- Remover função de validação de mudança de clã
DROP FUNCTION IF EXISTS validate_clan_change();

-- Remover trigger de atualização de contagem de membros
DROP TRIGGER IF EXISTS update_clan_member_count_trigger ON clan_members;

-- Remover função de atualização de contagem de membros
DROP FUNCTION IF EXISTS update_clan_member_count();

-- Remover função de contagem de membros
DROP FUNCTION IF EXISTS get_clan_member_count(uuid);

-- Remover view de estatísticas de clãs
DROP VIEW IF EXISTS clan_stats;

-- Manter apenas o trigger de updated_at para clãs (este é útil)
-- CREATE TRIGGER update_clans_updated_at BEFORE UPDATE ON clans
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Triggers de clãs removidos com sucesso!' as status;