/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // Remover os itens de "drogas" que foram adicionados anteriormente por engano
  const oldCodes = [
    'neon_dust', 'glitch', 'overclock', 'neuro_stim', 'static',
    'chrome_spark', 'neural_spike', 'binary_blaze', 'void', 'signal',
    'cyber_haze', 'data_rush', 'synapse', 'ghost', 'zero_day'
  ];
  pgm.sql(`DELETE FROM items WHERE code IN (${oldCodes.map(c => `'${c}'`).join(',')})`);

  const items = [
    { code: 'cabos_cobre', name: 'Cabos de Cobre', description: 'Fios de cobre comuns retirados de instalações velhas.', type: 'consumable', rarity: 'common', base_price: 10 },
    { code: 'placas_mae_queimadas', name: 'Placas-mãe Queimadas', description: 'Circuitos básicos que podem conter metais simples.', type: 'consumable', rarity: 'common', base_price: 25 },
    { code: 'sucata_placa_video', name: 'Sucata de Placa de Vídeo', description: 'Componentes eletrônicos de baixo valor para reciclagem.', type: 'consumable', rarity: 'common', base_price: 50 },
    { code: 'chips_defeituosos', name: 'Chips Defeituosos', description: 'Circuitos integrados com pequenas falhas de fabricação.', type: 'consumable', rarity: 'common', base_price: 100 },
    { code: 'baterias_litio', name: 'Baterias de Lítio', description: 'Células de energia padrão usadas em dispositivos móveis.', type: 'consumable', rarity: 'common', base_price: 250 },
    { code: 'fiacao_fibra_otica', name: 'Fiação de Fibra Ótica', description: 'Cabos de alta velocidade para transmissão de dados.', type: 'consumable', rarity: 'rare', base_price: 500 },
    { code: 'pecas_drone', name: 'Peças de Drone', description: 'Motores e hélices de drones civis de vigilância.', type: 'consumable', rarity: 'rare', base_price: 1200 },
    { code: 'modulos_memoria', name: 'Módulos de Memória', description: 'Pentes de RAM de alto desempenho recuperados.', type: 'consumable', rarity: 'rare', base_price: 2500 },
    { code: 'motores_passo_precisao', name: 'Motores de Passo de Precisão', description: 'Motores usados em robótica de precisão.', type: 'consumable', rarity: 'rare', base_price: 6000 },
    { code: 'processadores_basicos', name: 'Processadores Básicos', description: 'CPUs de nível industrial para processamento estável.', type: 'consumable', rarity: 'rare', base_price: 15000 },
    { code: 'biomaterial_bruto', name: 'Biomaterial Bruto', description: 'Matéria orgânica sintética para reparos biônicos complexos.', type: 'consumable', rarity: 'epic', base_price: 35000 },
    { code: 'sensores_otica_avancada', name: 'Sensores de Ótica Avançada', description: 'Lentes e sensores de precisão para sistemas HUD militares.', type: 'consumable', rarity: 'epic', base_price: 75000 },
    { code: 'neuro_chips', name: 'Neuro-Chips', description: 'Interface neural avançada para conexões de rede direta.', type: 'consumable', rarity: 'epic', base_price: 120000 },
    { code: 'circuitos_integrados_raros', name: 'Circuitos Integrados Raros', description: 'Chips de edições limitadas com funções criptográficas.', type: 'consumable', rarity: 'legendary', base_price: 180000 },
    { code: 'drives_ouro', name: 'Drives de Ouro', description: 'Dispositivos de armazenamento blindados com conectores de ouro maciço.', type: 'consumable', rarity: 'legendary', base_price: 250000 }
  ];

  items.forEach(item => {
    pgm.sql(`
      INSERT INTO items (id, code, name, description, type, rarity, base_price, is_tradeable, is_lootable)
      VALUES (gen_random_uuid(), '${item.code}', '${item.name}', '${item.description}', '${item.type}', '${item.rarity}', ${item.base_price}, true, true)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        rarity = EXCLUDED.rarity,
        base_price = EXCLUDED.base_price
    `);
  });
};

exports.down = (pgm) => {
  const codes = [
    'placas_mae_queimadas', 'sensores_otica_avancada', 'motores_passo_precisao', 'circuitos_integrados_raros'
  ];
  pgm.sql(`DELETE FROM items WHERE code IN (${codes.map(c => `'${c}'`).join(',')})`);
};
