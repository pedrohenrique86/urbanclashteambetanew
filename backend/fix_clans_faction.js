const { query } = require("./config/database");

async function fixFactionNames() {
  try {
    console.log("Iniciando correção de nomes de facção na tabela clans...");
    
    // 🔥 Corrigir RENEGADOS
    const resRenegados = await query(`
      UPDATE clans 
      SET faction = 'renegados' 
      WHERE LOWER(TRIM(faction)) IN ('gangsters', 'gangster', 'renegado')
    `);
    console.log(`Clãs de Renegados atualizados: ${resRenegados.rowCount}`);

    // 🛡️ Corrigir GUARDIÕES
    const resGuardioes = await query(`
      UPDATE clans 
      SET faction = 'guardioes' 
      WHERE LOWER(TRIM(faction)) IN ('guardas', 'guarda', 'guardiao', 'guardiões', 'guardião')
    `);
    console.log(`Clãs de Guardiões atualizados: ${resGuardioes.rowCount}`);

    console.log("Correção concluída com sucesso.");
  } catch (err) {
    console.error("Erro ao corrigir nomes de facção:", err);
  } finally {
    process.exit();
  }
}

fixFactionNames();
