-- Remove o trigger automático de criação de perfil
-- Isso permite que apenas a API do backend crie perfis com stats corretos

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- Comentário: Agora os perfis serão criados apenas via API do backend
-- com os valores corretos baseados na facção escolhida