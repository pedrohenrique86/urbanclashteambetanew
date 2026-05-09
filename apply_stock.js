const { query } = require("./backend/config/database");

const codes = [
  'cabos_cobre', 'placas_mae_queimadas', 'sucata_placa_video', 'chips_defeituosos',
  'baterias_litio', 'fiacao_fibra_otica', 'pecas_drone', 'modulos_memoria',
  'motores_passo_precisao', 'processadores_basicos', 'biomaterial_bruto',
  'sensores_otica_avancada', 'neuro_chips', 'circuitos_integrados_raros', 'drives_ouro'
];

async function applyStock() {
  console.log("Iniciando aplicação de estoque global...");
  try {
    // Adicionar coluna se não existir
    await query("ALTER TABLE items ADD COLUMN IF NOT EXISTS market_stock INTEGER DEFAULT 0");
    console.log("Coluna market_stock garantida.");

    // Inicializar estoque
    await query(`UPDATE items SET market_stock = 5000 WHERE code IN (${codes.map(c => `'${c}'`).join(',')})`);
    console.log("Estoque inicial de 5000 definido para itens especiais.");

    console.log("Sucesso.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

applyStock();
