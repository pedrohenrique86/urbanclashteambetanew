require('dotenv').config({ path: __dirname + '/../.env' });
const { query } = require('../config/database');

async function findItemByCode(code) {
  const res = await query(
    `SELECT id, code, name
     FROM items
     WHERE code = $1
     LIMIT 1`,
    [code]
  );

  return res.rows[0] || null;
}

async function upsertItem(itemConfig) {
  const existing = await findItemByCode(itemConfig.code);

  const payload = {
    code: itemConfig.code,
    name: itemConfig.name,
    description: itemConfig.description,
    type: itemConfig.type,
    rarity: itemConfig.rarity,
    atk: itemConfig.atk || 0,
    def: itemConfig.def || 0,
    foc: itemConfig.foc || 0,
    price: itemConfig.price || 0,
    tradeable: itemConfig.tradeable !== false,
    lootable: itemConfig.lootable !== false,
  };

  if (existing) {
    await query(
      `UPDATE items
       SET
         name = $2,
         description = $3,
         type = $4,
         rarity = $5,
         base_attack_bonus = $6,
         base_defense_bonus = $7,
         base_focus_bonus = $8,
         base_price = $9,
         is_tradeable = $10,
         is_lootable = $11
       WHERE id = $1`,
      [
        existing.id,
        payload.name,
        payload.description,
        payload.type,
        payload.rarity,
        payload.atk,
        payload.def,
        payload.foc,
        payload.price,
        payload.tradeable,
        payload.lootable,
      ]
    );

    return existing.id;
  }

  const inserted = await query(
    `INSERT INTO items (
      code,
      name,
      description,
      type,
      rarity,
      base_attack_bonus,
      base_defense_bonus,
      base_focus_bonus,
      base_price,
      is_tradeable,
      is_lootable
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      payload.code,
      payload.name,
      payload.description,
      payload.type,
      payload.rarity,
      payload.atk,
      payload.def,
      payload.foc,
      payload.price,
      payload.tradeable,
      payload.lootable,
    ]
  );

  return inserted.rows[0].id;
}

async function upsertShopItem({ itemId, currentPrice, basePrice, stock = 9999 }) {
  const existing = await query(
    `SELECT id
     FROM shop_items
     WHERE item_id = $1
       AND season_id IS NULL
       AND currency_type = 'money'
     LIMIT 1`,
    [itemId]
  );

  if (existing.rows.length > 0) {
    await query(
      `UPDATE shop_items
       SET
         current_price = $2,
         base_price = $3,
         price_modifier = 1.0,
         stock = $4,
         is_active = true
       WHERE id = $1`,
      [existing.rows[0].id, currentPrice, basePrice, stock]
    );
    return existing.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO shop_items (
      item_id,
      season_id,
      current_price,
      base_price,
      price_modifier,
      currency_type,
      stock,
      is_active
    )
    VALUES ($1, NULL, $2, $3, 1.0, 'money', $4, true)
    RETURNING id`,
    [itemId, currentPrice, basePrice, stock]
  );

  return inserted.rows[0].id;
}

async function upsertDailyCardPool(card) {
  const existing = await query(
    `SELECT id
     FROM daily_card_pools
     WHERE reward_type = $1
       AND reward_value IS NOT DISTINCT FROM $2
       AND item_id IS NOT DISTINCT FROM $3
     LIMIT 1`,
    [card.t, card.v, card.item || null]
  );

  if (existing.rows.length > 0) {
    await query(
      `UPDATE daily_card_pools
       SET
         weight = $2,
         rarity = $3
       WHERE id = $1`,
      [existing.rows[0].id, card.w, card.r]
    );
    return existing.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO daily_card_pools (
      reward_type,
      reward_value,
      weight,
      rarity,
      item_id
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id`,
    [card.t, card.v, card.w, card.r, card.item || null]
  );

  return inserted.rows[0].id;
}

async function upsertBadge(badge) {
  const existing = await query(
    `SELECT id
     FROM badges
     WHERE name = $1
     LIMIT 1`,
    [badge.n]
  );

  if (existing.rows.length > 0) {
    await query(
      `UPDATE badges
       SET
         description = $2,
         type = $3,
         condition_value = $4,
         is_seasonal = false
       WHERE id = $1`,
      [existing.rows[0].id, badge.d, badge.t, badge.v]
    );
    return existing.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO badges (
      name,
      description,
      type,
      condition_value,
      is_seasonal
    )
    VALUES ($1, $2, $3, $4, false)
    RETURNING id`,
    [badge.n, badge.d, badge.t, badge.v]
  );

  return inserted.rows[0].id;
}

async function upsertGameEvent(ev) {
  const existing = await query(
    `SELECT id
     FROM game_events
     WHERE name = $1
     LIMIT 1`,
    [ev.n]
  );

  if (existing.rows.length > 0) {
    await query(
      `UPDATE game_events
       SET
         description = $2,
         type = $3,
         duration_hours = $4,
         effect_config = $5,
         is_active = true
       WHERE id = $1`,
      [existing.rows[0].id, ev.e.message, ev.ty, ev.d, JSON.stringify(ev.e)]
    );
    return existing.rows[0].id;
  }

  const inserted = await query(
    `INSERT INTO game_events (
      name,
      description,
      type,
      duration_hours,
      effect_config,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, true)
    RETURNING id`,
    [ev.n, ev.e.message, ev.ty, ev.d, JSON.stringify(ev.e)]
  );

  return inserted.rows[0].id;
}

async function seed() {
  console.log('Iniciando Seed de Dados do UrbanClash (Modo Idempotente Profissional)...');

  const itemMap = {};

  const commodities = [
    { code: 'sucata_placa_video', name: 'Sucata de Placa de Vídeo', rarity: 'common', price: 10 },
    { code: 'cabos_cobre', name: 'Cabos de Cobre', rarity: 'common', price: 15 },
    { code: 'chips_defeituosos', name: 'Chips Defeituosos', rarity: 'common', price: 25 },
    { code: 'pecas_drone', name: 'Peças de Drone', rarity: 'common', price: 40 },
    { code: 'fiacao_fibra_otica', name: 'Fiação de Fibra Ótica', rarity: 'common', price: 60 },
    { code: 'baterias_litio', name: 'Baterias de Lítio', rarity: 'rare', price: 85 },
    { code: 'modulos_memoria', name: 'Módulos de Memória', rarity: 'rare', price: 120 },
    { code: 'processadores_basicos', name: 'Processadores Básicos', rarity: 'rare', price: 160 },
    { code: 'biomaterial_bruto', name: 'Biomaterial Bruto', rarity: 'rare', price: 220 },
    { code: 'neuro_chips', name: 'Neuro-Chips', rarity: 'rare', price: 350 },
    { code: 'drives_ouro', name: 'Drives de Ouro', rarity: 'rare', price: 500 },
    { code: 'armazenamento_quantico', name: 'Armazenamento Quântico', rarity: 'rare', price: 750 },
    { code: 'matriz_criptografica', name: 'Matriz Criptográfica', rarity: 'legendary', price: 1200 },
    { code: 'nucleos_ia', name: 'Núcleos de Inteligência Artificial', rarity: 'legendary', price: 2500 },
    { code: 'reator_fusao_portatil', name: 'Reator de Fusão Portátil', rarity: 'legendary', price: 5000 },
  ];

  const weapons = [
    { code: 'soco_ingles_ferro', name: 'Soco Inglês de Ferro', rarity: 'common', atk: 2 },
    { code: 'corrente_bicicleta', name: 'Corrente de Bicicleta', rarity: 'common', atk: 3 },
    { code: 'taco_beisebol_pregos', name: 'Taco de Beisebol com Pregos', rarity: 'common', atk: 4 },
    { code: 'canivete_suico_enferrujado', name: 'Canivete Suíço Enferrujado', rarity: 'common', atk: 5 },
    { code: 'faca_combate', name: 'Faca de Combate', rarity: 'common', atk: 6 },
    { code: 'revolver_38', name: 'Revólver Calibre .38', rarity: 'common', atk: 8 },
    { code: 'submetralhadora_9mm', name: 'Submetralhadora 9mm', rarity: 'rare', atk: 12 },
    { code: 'escopeta_cano_serrado', name: 'Escopeta de Cano Serrado', rarity: 'rare', atk: 15 },
    { code: 'katana_termica', name: 'Espada Katana Térmica', rarity: 'rare', atk: 22 },
    { code: 'rifle_precisao_silenciado', name: 'Rifle de Precisão Silenciado', rarity: 'rare', atk: 28 },
    { code: 'pistola_pulso_eletromagnetico', name: 'Pistola de Pulso Eletromagnético', rarity: 'rare', atk: 35 },
    { code: 'lanca_misseis_tatico', name: 'Lança-Mísseis Tático', rarity: 'legendary', atk: 55 },
    { code: 'lamina_plasma_focada', name: 'Lâmina de Plasma Focada', rarity: 'legendary', atk: 70 },
    { code: 'canhao_quasar_portatil', name: 'Canhão Quasar Portátil', rarity: 'legendary', atk: 95 },
    { code: 'emissor_antimateria', name: 'Emissor de Antimatéria', rarity: 'legendary', atk: 120 },
  ];

  const equips = [
    { code: 'jaqueta_couro_batida', name: 'Jaqueta de Couro Batida', rarity: 'common', def: 2, foc: 0 },
    { code: 'joelheiras_taticas', name: 'Joelheiras Táticas', rarity: 'common', def: 3, foc: 0 },
    { code: 'cotoveleiras_reforcadas', name: 'Cotoveleiras Reforçadas', rarity: 'common', def: 3, foc: 0 },
    { code: 'botas_combate_duras', name: 'Botas de Combate Duras', rarity: 'common', def: 4, foc: 0 },
    { code: 'capuz_filtro_ar', name: 'Capuz com Filtro de Ar', rarity: 'common', def: 2, foc: 2 },
    { code: 'colete_kevlar_militar', name: 'Colete de Kevlar Militar', rarity: 'rare', def: 12, foc: 1 },
    { code: 'exoesqueleto_carga_leve', name: 'Exoesqueleto de Carga Leve', rarity: 'rare', def: 18, foc: 5 },
    { code: 'oculos_visao_noturna_hud', name: 'Óculos de Visão Noturna HUD', rarity: 'rare', def: 5, foc: 15 },
    { code: 'traje_furtivo_fibra_carbono', name: 'Traje Furtivo de Fibra de Carbono', rarity: 'legendary', def: 25, foc: 25 },
    { code: 'armadura_reativa_n7', name: 'Armadura Reativa N7', rarity: 'legendary', def: 55, foc: 20 },
  ];

  const shields = [
    { code: 'tampa_bueiro', name: 'Tampa de Bueiro', rarity: 'common', def: 5 },
    { code: 'pedaco_porta_carro', name: 'Pedaço de Porta de Carro', rarity: 'common', def: 8 },
    { code: 'placa_sinalizacao', name: 'Placa de Sinalização', rarity: 'common', def: 10 },
    { code: 'escudo_policial_acrilico', name: 'Escudo Policial de Acrílico', rarity: 'common', def: 15 },
    { code: 'escudo_choque_tatico', name: 'Escudo de Choque Tático', rarity: 'rare', def: 25 },
    { code: 'escudo_balistico_pesado_t3', name: 'Escudo Balístico Pesado TIER-III', rarity: 'rare', def: 40 },
    { code: 'campo_forca_portatil_v1', name: 'Campo de Força Portátil V1', rarity: 'legendary', def: 75 },
    { code: 'barreira_ions_regenerativa', name: 'Barreira de Íons Regenerativa', rarity: 'legendary', def: 120 },
  ];

  const badges = [
    { n: 'Novato Registrado', t: 'special', v: 1, d: 'Iniciou sua jornada' },
    { n: 'Iniciante Consistente', t: 'login_streak', v: 7, d: 'Logou 7 dias seguidos' },
    { n: 'Viciado em Adrenalina', t: 'login_streak', v: 30, d: 'Logou 30 dias seguidos' },
    { n: 'Gladiador de Beco', t: 'victories', v: 100, d: 'Venceu 100 batalhas' },
    { n: 'Lenda Urbana', t: 'victories', v: 1000, d: 'Venceu 1000 batalhas' },
    { n: 'Saco de Pancadas', t: 'special', v: 50, d: 'Perdeu 50 vezes' },
    { n: 'Lobo das Zonas Sombrias', t: 'special', v: 500, d: 'Participou de 500 negociações no ecossistema' },
    { n: 'Abaixo da Lei', t: 'special', v: 10, d: 'Acabou na prisão 10 vezes' },
    { n: 'Matador de Aluguel', t: 'special', v: 50, d: 'Cumpriu 50 contratos com sucesso' },
    { n: 'Lealdade Absoluta', t: 'faction', v: 30, d: 'Completou 30 dias servindo a atual corporação' },
    { n: 'Acionista Majoritário', t: 'ranking', v: 1000000, d: '1 milhão cash em carteira' },
    { n: 'Acesso Classe A', t: 'special', v: 1, d: 'Adquiriu status VIP ou superior' },
  ];

  const events = [
    {
      n: 'Operação Policial Estendida',
      ty: 'combat',
      d: 24,
      e: { target: 'jail_time_multiplier', modifier: 1.5, message: 'Tempo de prisão base aumentado em 50%.' },
    },
    {
      n: 'Mercado Aquecido',
      ty: 'economy',
      d: 12,
      e: { target: 'commodity_buy_price', modifier: 1.3, message: 'Falta de suprimentos: preços das Commodities subiram 30% nas Lojas Clandestinas.' },
    },
    {
      n: 'Crash da Bolsa',
      ty: 'economy',
      d: 6,
      e: { target: 'commodity_sell_price', modifier: 0.5, message: 'Pânico corporativo: venda de Commodities cai pela metade!' },
    },
    {
      n: 'Vazamento de Dados da Corporação',
      ty: 'combat',
      d: 8,
      e: { target: 'combat_xp_gain', modifier: 1.5, message: 'Informações táticas expostas: vitórias rendem 50% mais XP.' },
    },
    {
      n: 'Brecha no Sistema Bancário',
      ty: 'economy',
      d: 4,
      e: { target: 'mission_reward', modifier: 2.0, message: 'Sistema em colapso. Recompensas de moedas dobradas nas missões de Contrato.' },
    },
    {
      n: 'Aumento na Tarifa de Energia',
      ty: 'bonus',
      d: 12,
      e: { target: 'energy_regen_rate', modifier: 0.8, message: 'A central de distribuição cortou o suprimento. Regeneração de energia caiu consideravelmente.' },
    },
    {
      n: 'Festival Neon',
      ty: 'bonus',
      d: 48,
      e: { target: 'daily_card_drop', modifier: 1.2, message: 'As taxas de aparição de cartas diárias premium aumentaram em toda a rede.' },
    },
    {
      n: 'Tempestade Eletromagnética',
      ty: 'combat',
      d: 6,
      e: { target: 'equipment_stats', modifier: 0.7, message: 'Interferência ferrenha. Bônus de todos os Equipamentos reduzidos globalmente.' },
    },
    {
      n: 'Abertura das Fronteiras Táticas',
      ty: 'economy',
      d: 72,
      e: { target: 'shop_buy_price', modifier: 0.8, message: 'Contrabandistas furaram os bloqueios. Desconto de 20% em TODO O SHOP!' },
    },
  ];

  try {
    await query('BEGIN');

    for (const c of commodities) {
      const id = await upsertItem({
        code: c.code,
        name: c.name,
        description: `Mercadoria base do tipo ${c.rarity}.`,
        type: 'consumable',
        rarity: c.rarity,
        price: c.price,
      });

      itemMap[c.code] = id;

      await upsertShopItem({
        itemId: id,
        currentPrice: c.price,
        basePrice: c.price,
        stock: 9999,
      });
    }

    for (const w of weapons) {
      itemMap[w.code] = await upsertItem({
        code: w.code,
        name: w.name,
        description: `Arma de fogo ou corte (${w.rarity}) com foco em poder destrutivo.`,
        type: 'weapon',
        rarity: w.rarity,
        atk: w.atk,
        price: w.atk * 100,
        tradeable: false,
      });
    }

    for (const e of equips) {
      itemMap[e.code] = await upsertItem({
        code: e.code,
        name: e.name,
        description: 'Traje ou suporte modular focando em defesa e destreza.',
        type: 'equipment',
        rarity: e.rarity,
        def: e.def,
        foc: e.foc,
        price: (e.def + e.foc) * 120,
        tradeable: false,
      });
    }

    for (const s of shields) {
      itemMap[s.code] = await upsertItem({
        code: s.code,
        name: s.name,
        description: 'Proteção defensiva dedicada para resistir a disparos diretos.',
        type: 'shield',
        rarity: s.rarity,
        def: s.def,
        price: s.def * 110,
        tradeable: false,
      });
    }

    const cards = [
      { t: 'money', v: 200, w: 200, r: 'common' },
      { t: 'money', v: 500, w: 100, r: 'rare' },
      { t: 'money', v: 2500, w: 30, r: 'legendary' },
      { t: 'xp', v: 10, w: 150, r: 'common' },
      { t: 'xp', v: 50, w: 40, r: 'rare' },
      { t: 'action_points', v: 5, w: 100, r: 'common' },
      { t: 'action_points', v: 20, w: 20, r: 'rare' },
    ];

    if (itemMap.soco_ingles_ferro) {
      cards.push({
        t: 'item',
        v: null,
        w: 60,
        r: 'common',
        item: itemMap.soco_ingles_ferro,
      });
    }

    if (itemMap.neuro_chips) {
      cards.push({
        t: 'item',
        v: null,
        w: 10,
        r: 'rare',
        item: itemMap.neuro_chips,
      });
    }

    for (const c of cards) {
      await upsertDailyCardPool(c);
    }

    for (const b of badges) {
      await upsertBadge(b);
    }

    for (const ev of events) {
      await upsertGameEvent(ev);
    }

    await query('COMMIT');
    console.log('🚀 Seed concluída com sucesso.');
  } catch (e) {
    await query('ROLLBACK');
    console.error('Erro na seed:', e);
    process.exitCode = 1;
  } finally {
    process.exit();
  }
}

seed();