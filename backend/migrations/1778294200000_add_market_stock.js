/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // Adicionar coluna de estoque do mercado
  pgm.addColumn('items', {
    market_stock: { type: 'integer', default: 0 }
  });

  // Inicializar o estoque dos itens da Bolsa Sombria com 5000
  const codes = [
    'cabos_cobre', 'placas_mae_queimadas', 'sucata_placa_video', 'chips_defeituosos',
    'baterias_litio', 'fiacao_fibra_otica', 'pecas_drone', 'modulos_memoria',
    'motores_passo_precisao', 'processadores_basicos', 'biomaterial_bruto',
    'sensores_otica_avancada', 'neuro_chips', 'circuitos_integrados_raros', 'drives_ouro'
  ];
  
  pgm.sql(`UPDATE items SET market_stock = 5000 WHERE code IN (${codes.map(c => `'${c}'`).join(',')})`);
};

exports.down = (pgm) => {
  pgm.dropColumn('items', 'market_stock');
};
