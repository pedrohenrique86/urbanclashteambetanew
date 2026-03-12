const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

async function checkEmailInAllTables() {
  // Substitua pelo email que você está tentando cadastrar
  const emailToCheck = process.argv[2] || 'email@exemplo.com';
  
  if (process.argv.length < 3) {
    console.log('⚠️  Nenhum email fornecido como argumento. Usando email de exemplo.');
    console.log('💡 Use: node check_email_in_all_tables.js seu-email@exemplo.com');
  } else {
    console.log(`✅ Verificando o email fornecido: ${emailToCheck}`);
  }
  
  try {
    console.log(`🔍 Verificando email '${emailToCheck}' em todas as tabelas...`);
    
    // 1. Verificar na tabela users
    console.log('\n📋 Verificando na tabela users...');
    const usersResult = await pool.query(
      'SELECT id, email, username, is_email_confirmed FROM users WHERE email = $1',
      [emailToCheck]
    );
    
    if (usersResult.rows.length > 0) {
      console.log('✅ Email encontrado na tabela users:');
      console.log(usersResult.rows[0]);
    } else {
      console.log('❌ Email não encontrado na tabela users');
      
      // Verificar se há algum email similar
      const similarEmailsResult = await pool.query(
        'SELECT id, email, username FROM users WHERE email LIKE $1',
        [`%${emailToCheck.split('@')[0]}%`]
      );
      
      if (similarEmailsResult.rows.length > 0) {
        console.log('⚠️  Emails similares encontrados:');
        similarEmailsResult.rows.forEach(row => {
          console.log(`- ${row.email} (ID: ${row.id}, Username: ${row.username})`);
        });
      } else {
        console.log('❌ Nenhum email similar encontrado');
      }
    }
    
    // 2. Verificar se há alguma constraint ou trigger que possa estar causando o problema
    console.log('\n📋 Verificando constraints na tabela users...');
    const constraintsResult = await pool.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE t.relname = 'users'
      AND n.nspname = 'public'
    `);
    
    console.log('Constraints encontradas:');
    constraintsResult.rows.forEach(constraint => {
      console.log(`- ${constraint.conname} (${constraint.contype}): ${constraint.def}`);
    });
    
    // 3. Verificar se há algum índice único para o email
    console.log('\n📋 Verificando índices na tabela users...');
    const indexesResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND schemaname = 'public'
    `);
    
    console.log('Índices encontrados:');
    indexesResult.rows.forEach(index => {
      console.log(`- ${index.indexname}: ${index.indexdef}`);
    });
    
    // 4. Verificar se há algum registro com o email em caixa alta/baixa diferente
    console.log('\n📋 Verificando variações de caixa do email...');
    const caseInsensitiveResult = await pool.query(
      'SELECT id, email, username FROM users WHERE LOWER(email) = LOWER($1)',
      [emailToCheck]
    );
    
    if (caseInsensitiveResult.rows.length > 0) {
      console.log('⚠️  Email encontrado com caixa diferente:');
      caseInsensitiveResult.rows.forEach(row => {
        console.log(`- ID: ${row.id}, Email: ${row.email}, Username: ${row.username}`);
      });
    } else {
      console.log('❌ Nenhuma variação de caixa encontrada');
    }
    
    // 5. Verificar se há algum registro com espaços extras no email
    console.log('\n📋 Verificando variações com espaços...');
    const trimmedResult = await pool.query(
      'SELECT id, email, username FROM users WHERE TRIM(email) = TRIM($1)',
      [emailToCheck]
    );
    
    if (trimmedResult.rows.length > 0 && trimmedResult.rows.length !== caseInsensitiveResult.rows.length) {
      console.log('⚠️  Email encontrado com espaços extras:');
      trimmedResult.rows.forEach(row => {
        console.log(`- ID: ${row.id}, Email: '${row.email}', Username: ${row.username}`);
      });
    } else {
      console.log('❌ Nenhuma variação com espaços encontrada');
    }
    
    // 6. Verificar se há algum registro com o email em outras tabelas
    console.log('\n📋 Verificando tabelas relacionadas...');
    
    // Obter lista de todas as tabelas
    const tablesResult = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);
    
    for (const table of tablesResult.rows) {
      const tableName = table.tablename;
      if (tableName === 'users') continue; // Já verificamos
      
      // Verificar se a tabela tem uma coluna de email
      const columnsResult = await pool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1
        AND column_name LIKE '%email%'
      `, [tableName]);
      
      if (columnsResult.rows.length > 0) {
        console.log(`Verificando tabela ${tableName}...`);
        
        for (const column of columnsResult.rows) {
          const columnName = column.column_name;
          
          // Consultar a tabela para o email
          const query = `SELECT * FROM ${tableName} WHERE ${columnName} = $1`;
          const result = await pool.query(query, [emailToCheck]);
          
          if (result.rows.length > 0) {
            console.log(`⚠️  Email encontrado na tabela ${tableName}, coluna ${columnName}:`);
            console.log(result.rows);
          }
        }
      }
    }
    
    console.log('\n🎯 SUGESTÃO:');
    console.log('Se o email não foi encontrado em nenhuma tabela, pode ser um problema de cache ou de validação no servidor.');
    console.log('Tente reiniciar o servidor backend e limpar o cache do navegador.');
    
  } catch (error) {
    console.error('❌ Erro ao verificar email:', error.message);
  } finally {
    await pool.end();
  }
}

checkEmailInAllTables();