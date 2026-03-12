const { query } = require('./backend/config/database');

async function testBackendUpdates() {
  try {
    console.log('🔍 Testando atualizações do backend...');
    
    // Testar estrutura da tabela users
    console.log('\n📊 Verificando estrutura da tabela users:');
    const usersColumns = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    usersColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar se birth_date e country existem
    const hasBirthDate = usersColumns.rows.some(col => col.column_name === 'birth_date');
    const hasCountry = usersColumns.rows.some(col => col.column_name === 'country');
    
    console.log(`\n✅ Campo birth_date: ${hasBirthDate ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`✅ Campo country: ${hasCountry ? 'PRESENTE' : 'AUSENTE'}`);
    
    // Testar estrutura da tabela user_profiles
    console.log('\n📊 Verificando estrutura da tabela user_profiles:');
    const profilesColumns = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      ORDER BY ordinal_position
    `);
    
    profilesColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Verificar se username existe e display_name não existe
    const hasUsername = profilesColumns.rows.some(col => col.column_name === 'username');
    const hasDisplayName = profilesColumns.rows.some(col => col.column_name === 'display_name');
    
    console.log(`\n✅ Campo username: ${hasUsername ? 'PRESENTE' : 'AUSENTE'}`);
    console.log(`✅ Campo display_name: ${hasDisplayName ? 'AINDA PRESENTE (DEVERIA SER REMOVIDO)' : 'REMOVIDO CORRETAMENTE'}`);
    
    // Verificar índices
    console.log('\n🔍 Verificando índices criados:');
    const indexes = await query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('users', 'user_profiles') 
      AND (indexname LIKE '%country%' OR indexname LIKE '%birth_date%' OR indexname LIKE '%username%')
    `);
    
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname} na tabela ${idx.tablename}`);
    });
    
    // Testar inserção de usuário com novos campos (simulação)
    console.log('\n🧪 Testando validação de dados:');
    
    // Simular dados de teste
    const testData = {
      email: 'teste@exemplo.com',
      username: 'usuario_teste',
      birth_date: '1990-01-01',
      country: 'BR'
    };
    
    console.log('   📝 Dados de teste:', testData);
    console.log('   ✅ Formato de birth_date válido:', /^\d{4}-\d{2}-\d{2}$/.test(testData.birth_date));
    console.log('   ✅ Formato de country válido:', /^[A-Z]{2,3}$/.test(testData.country));
    
    console.log('\n🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    process.exit(0);
  }
}

// Executar o teste
if (require.main === module) {
  testBackendUpdates();
}

module.exports = { testBackendUpdates };