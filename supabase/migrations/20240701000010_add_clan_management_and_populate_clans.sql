-- Add clan management fields to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN clan_joined_at timestamp with time zone,
ADD COLUMN clan_left_at timestamp with time zone;

-- Insert 12 clans for gangsters faction
INSERT INTO public.clans (name, faction) VALUES
('Lobos da Noite', 'gangsters'),
('Night Wolves', 'gangsters'),
('Serpentes Negras', 'gangsters'),
('Black Serpents', 'gangsters'),
('Corvos Urbanos', 'gangsters'),
('Urban Ravens', 'gangsters'),
('Sombras do Crime', 'gangsters'),
('Crime Shadows', 'gangsters'),
('Punhos de Ferro', 'gangsters'),
('Iron Fists', 'gangsters'),
('Dragões Vermelhos', 'gangsters'),
('Red Dragons', 'gangsters');

-- Insert 13 clans for guards faction
INSERT INTO public.clans (name, faction) VALUES
('Guardiões da Paz', 'guardas'),
('Peace Guardians', 'guardas'),
('Escudo Dourado', 'guardas'),
('Golden Shield', 'guardas'),
('Águias da Justiça', 'guardas'),
('Justice Eagles', 'guardas'),
('Leões da Lei', 'guardas'),
('Law Lions', 'guardas'),
('Sentinelas Azuis', 'guardas'),
('Blue Sentinels', 'guardas'),
('Defensores da Ordem', 'guardas'),
('Order Defenders', 'guardas'),
('Cavaleiros da Honra', 'guardas');

-- Create function to validate clan changes
CREATE OR REPLACE FUNCTION validate_clan_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If joining a clan
  IF NEW.clan_id IS NOT NULL AND OLD.clan_id IS NULL THEN
    -- Check if user has waited 6 hours since leaving last clan
    IF OLD.clan_left_at IS NOT NULL AND 
       OLD.clan_left_at + INTERVAL '6 hours' > NOW() THEN
      RAISE EXCEPTION 'Você deve esperar 6 horas após sair de um clã para entrar em outro';
    END IF;
    
    -- Check clan capacity (40 players max)
    IF (SELECT COUNT(*) FROM user_profiles WHERE clan_id = NEW.clan_id) >= 40 THEN
      RAISE EXCEPTION 'Este clã já atingiu a capacidade máxima de 40 jogadores';
    END IF;
    
    -- Set join timestamp
    NEW.clan_joined_at = NOW();
    NEW.clan_left_at = NULL;
    
  -- If leaving a clan
  ELSIF NEW.clan_id IS NULL AND OLD.clan_id IS NOT NULL THEN
    -- Check if user has been in clan for at least 24 hours
    IF OLD.clan_joined_at IS NOT NULL AND 
       OLD.clan_joined_at + INTERVAL '24 hours' > NOW() THEN
      RAISE EXCEPTION 'Você deve permanecer no clã por pelo menos 24 horas antes de sair';
    END IF;
    
    -- Set leave timestamp
    NEW.clan_left_at = NOW();
    NEW.clan_joined_at = OLD.clan_joined_at;
    
  -- If changing clans directly
  ELSIF NEW.clan_id IS NOT NULL AND OLD.clan_id IS NOT NULL AND NEW.clan_id != OLD.clan_id THEN
    -- Check if user has been in current clan for at least 24 hours
    IF OLD.clan_joined_at IS NOT NULL AND 
       OLD.clan_joined_at + INTERVAL '24 hours' > NOW() THEN
      RAISE EXCEPTION 'Você deve permanecer no clã por pelo menos 24 horas antes de trocar';
    END IF;
    
    -- Check clan capacity for new clan
    IF (SELECT COUNT(*) FROM user_profiles WHERE clan_id = NEW.clan_id) >= 40 THEN
      RAISE EXCEPTION 'Este clã já atingiu a capacidade máxima de 40 jogadores';
    END IF;
    
    -- Set new join timestamp and clear leave timestamp
    NEW.clan_joined_at = NOW();
    NEW.clan_left_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for clan change validation
CREATE TRIGGER validate_clan_change_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  WHEN (OLD.clan_id IS DISTINCT FROM NEW.clan_id)
  EXECUTE FUNCTION validate_clan_change();

-- Create function to get clan member count
CREATE OR REPLACE FUNCTION get_clan_member_count(clan_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM user_profiles WHERE clan_id = clan_uuid);
END;
$$ LANGUAGE plpgsql;

-- Create view for clan statistics
CREATE OR REPLACE VIEW clan_stats AS
SELECT 
  c.id,
  c.name,
  c.faction,
  c.score,
  COUNT(up.id) as member_count,
  40 - COUNT(up.id) as available_slots,
  c.created_at,
  c.updated_at
FROM clans c
LEFT JOIN user_profiles up ON c.id = up.clan_id
GROUP BY c.id, c.name, c.faction, c.score, c.created_at, c.updated_at
ORDER BY c.faction, c.score DESC;

-- Grant permissions
GRANT SELECT ON clan_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_clan_member_count(uuid) TO authenticated;