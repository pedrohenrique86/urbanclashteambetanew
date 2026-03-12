-- Atualizar a função para incluir money_daily_gain na criação de novos usuários
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.user_profiles (user_id, username, faction, level, xp, money, money_daily_gain)
  values (new.id, 
         coalesce(new.raw_user_meta_data->>'username', 'Usuário'), 
         coalesce(new.raw_user_meta_data->>'faction', 'guardas'),
         1,
         0,
         100,
         0);
  return new;
end;
$$ language plpgsql security definer;

SELECT 'Função handle_new_user_profile atualizada com sucesso!' as status;