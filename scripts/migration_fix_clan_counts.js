require("dotenv").config({ path: "./backend/.env" });
const { query, transaction } = require('../backend/config/database');

async function runMigration() {
  console.log('Iniciando migração para corrigir contagem de membros e duplicatas...');

  try {
    await transaction(async (client) => {
      // 1. Identificar e remover membros duplicados, mantendo o mais antigo
      console.log('Passo 1: Removendo membros duplicados...');
      const duplicatesResult = await client.query(`
        DELETE FROM clan_members
        WHERE id IN (
          SELECT id FROM (
            SELECT 
              id,
              ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY joined_at ASC) as rn
            FROM clan_members
          ) t
          WHERE t.rn > 1
        );
      `);
      console.log(`  - ${duplicatesResult.rowCount} membro(s) duplicado(s) removido(s).`);

      // 2. Recalcular o member_count para cada clã
      console.log('Passo 2: Recalculando member_count de todos os clãs...');
      const updateCountsResult = await client.query(`
        WITH clan_member_counts AS (
          SELECT 
            clan_id, 
            COUNT(user_id) as actual_count
          FROM clan_members
          GROUP BY clan_id
        )
        UPDATE clans
        SET member_count = COALESCE(cmc.actual_count, 0)
        FROM clan_member_counts cmc
        WHERE clans.id = cmc.clan_id AND clans.member_count != cmc.actual_count;
      `);
      console.log(`  - ${updateCountsResult.rowCount} clã(s) tiveram sua contagem de membros corrigida.`);

      // 3. Corrigir clãs que ficaram com contagem > 0 mas sem membros
      console.log('Passo 3: Corrigindo clãs com contagem incorreta (sem membros)...');
       const zeroOutResult = await client.query(`
        UPDATE clans
        SET member_count = 0
        WHERE member_count > 0 AND id NOT IN (SELECT DISTINCT clan_id FROM clan_members);
      `);
      console.log(`  - ${zeroOutResult.rowCount} clã(s) zerados por não terem mais membros.`);
    });

    console.log('\nMigração concluída com sucesso!');
    console.log('O banco de dados agora está consistente em relação à contagem de membros e duplicatas.');

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    console.error('   Detalhes:', error);
    console.error('A transação foi revertida. Nenhuma alteração foi aplicada.');
    process.exit(1); // Termina o processo com erro
  } finally {
    // A conexão com o banco de dados é gerenciada pelo pool, então não precisamos fechá-la aqui.
    // Se o pool for configurado para fechar, adicione a lógica aqui.
  }
}

// Executa a função de migração
runMigration();