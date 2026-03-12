const { query } = require('./backend/config/database');

async function updateUserCreationFunction() {
  try {
    console.log('🔧 Atualizando função handle_new_user_profile...');
    
    await query(`
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
    `);
    
    console.log('✅ Função handle_new_user_profile atualizada com sucesso!');
    console.log('🎉 Novos usuários agora terão money_daily_gain = 0 por padrão!');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar função:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  updateUserCreationFunction()
    .then(() => {
      console.log('✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro:', error.message);
      process.exit(1);
    });
}

module.exports = { updateUserCreationFunction };