require('dotenv').config({ path: __dirname + '/../.env' });
const { query } = require('../config/database');

async function getItemId(name) {
  const res = await query('SELECT id FROM items WHERE name = $1 LIMIT 1', [name]);
  return res.rows.length > 0 ? res.rows[0].id : null;
}

async function getOrInsertItem(itemConfig) {
  let id = await getItemId(itemConfig.name);

  if (!id) {
    const res = await query(
      `INSERT INTO items (
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        itemConfig.name,
        itemConfig.description,
        itemConfig.type,
        itemConfig.rarity,
        itemConfig.atk || 0,
        itemConfig.def || 0,
        itemConfig.foc || 0,
        itemConfig.price || 0,
        itemConfig.tradeable !== false,
        itemConfig.lootable !== false,
      ]
    );

    id = res.rows[0].id;
  }

  return id;
}

async function seed() {
  console.log('Iniciando Seed de Dados do UrbanClash (Modo Idempotente)...');

  const itemMap = {};

  // 1. COMMODITIES (Mapeado como 'consumable' para atender CONSTRAINT chk_items_type)
  // Raridades ajustadas (common, rare, legendary) para atender CONSTRAINT chk_items_rarity
  const commodities = [
    { name: 'Sucata de Placa de Vídeo', rarity: 'common', price: 10 },
    { name: 'Cabos de Cobre', rarity: 'common', price: 15 },
    { name: 'Chips Defeituosos', rarity: 'common', price: 25 },
    { name: 'Peças de Drone', rarity: 'common', price: 40 },
    { name: 'Fiação de Fibra Ótica', rarity: 'common', price: 60 },
    { name: 'Baterias de Lítio', rarity: 'rare', price: 85 },
    { name: 'Módulos de Memória', rarity: 'rare', price: 120 },
    { name: 'Processadores Básicos', rarity: 'rare', price: 160 },
    { name: 'Biomaterial Bruto', rarity: 'rare', price: 220 },
    { name: 'Neuro-Chips', rarity: 'rare', price: 350 },
    { name: 'Drives de Ouro', rarity: 'rare', price: 500 },
    { name: 'Armazenamento Quântico', rarity: 'rare', price: 750 },
    { name: 'Matriz Criptográfica', rarity: 'legendary', price: 1200 },
    { name: 'Núcleos de Inteligência Artificial', rarity: 'legendary', price: 2500 },
    { name: 'Reator de Fusão Portátil', rarity: 'legendary', price: 5000 },
  ];

  try {
    for (const c of commodities) {
      const id = await getOrInsertItem({
        name: c.name,
        description: `Mercadoria base do tipo ${c.rarity}.`,
        type: 'consumable',
        rarity: c.rarity,
        price: c.price,
      });

      itemMap[c.name] = id;

      const shopExist = await query(
        `SELECT id
         FROM shop_items
         WHERE item_id = $1
           AND season_id IS NULL
           AND currency_type = 'money'
         LIMIT 1`,
        [id]
      );

      if (shopExist.rows.length === 0) {
        await query(
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
          VALUES ($1, NULL, $2, $3, 1.0, 'money', 9999, true)`,
          [id, c.price, c.price]
        );
      }
    }

    console.log('✔️ Commodities e Shop Items (15) processados.');

    const weapons = [
      { name: 'Soco Inglês de Ferro', rarity: 'common', atk: 2 },
      { name: 'Corrente de Bicicleta', rarity: 'common', atk: 3 },
      { name: 'Taco de Beisebol com Pregos', rarity: 'common', atk: 4 },
      { name: 'Canivete Suíço Enferrujado', rarity: 'common', atk: 5 },
      { name: 'Faca de Combate', rarity: 'common', atk: 6 },
      { name: 'Revólver Calibre .38', rarity: 'common', atk: 8 },
      { name: 'Submetralhadora 9mm', rarity: 'rare', atk: 12 },
      { name: 'Escopeta de Cano Serrado', rarity: 'rare', atk: 15 },
      { name: 'Espada Katana Térmica', rarity: 'rare', atk: 22 },
      { name: 'Rifle de Precisão Silenciado', rarity: 'rare', atk: 28 },
      { name: 'Pistola de Pulso Eletromagnético', rarity: 'rare', atk: 35 },
      { name: 'Lança-Mísseis Tático', rarity: 'legendary', atk: 55 },
      { name: 'Lâmina de Plasma Focada', rarity: 'legendary', atk: 70 },
      { name: 'Canhão Quasar Portátil', rarity: 'legendary', atk: 95 },
      { name: 'Emissor de Antimatéria', rarity: 'legendary', atk: 120 },
    ];

    for (const w of weapons) {
      itemMap[w.name] = await getOrInsertItem({
        name: w.name,
        description: `Arma de fogo ou corte (${w.rarity}) com foco em poder destrutivo.`,
        type: 'weapon',
        rarity: w.rarity,
        atk: w.atk,
        price: w.atk * 100,
        tradeable: false,
      });
    }

    const equips = [
      { name: 'Jaqueta de Couro Batida', rarity: 'common', def: 2, foc: 0 },
      { name: 'Joelheiras Táticas', rarity: 'common', def: 3, foc: 0 },
      { name: 'Cotoveleiras Reforçadas', rarity: 'common', def: 3, foc: 0 },
      { name: 'Botas de Combate Duras', rarity: 'common', def: 4, foc: 0 },
      { name: 'Capuz com Filtro de Ar', rarity: 'common', def: 2, foc: 2 },
      { name: 'Colete de Kevlar Militar', rarity: 'rare', def: 12, foc: 1 },
      { name: 'Exoesqueleto de Carga Leve', rarity: 'rare', def: 18, foc: 5 },
      { name: 'Óculos de Visão Noturna HUD', rarity: 'rare', def: 5, foc: 15 },
      { name: 'Traje Furtivo de Fibra de Carbono', rarity: 'legendary', def: 25, foc: 25 },
      { name: 'Armadura Reativa N7', rarity: 'legendary', def: 55, foc: 20 },
    ];

    for (const e of equips) {
      itemMap[e.name] = await getOrInsertItem({
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

    const shields = [
      { name: 'Tampa de Bueiro', rarity: 'common', def: 5 },
      { name: 'Pedaço de Porta de Carro', rarity: 'common', def: 8 },
      { name: 'Placa de Sinalização', rarity: 'common', def: 10 },
      { name: 'Escudo Policial de Acrílico', rarity: 'common', def: 15 },
      { name: 'Escudo de Choque Tático', rarity: 'rare', def: 25 },
      { name: 'Escudo Balístico Pesado TIER-III', rarity: 'rare', def: 40 },
      { name: 'Campo de Força Portátil V1', rarity: 'legendary', def: 75 },
      { name: 'Barreira de Íons Regenerativa', rarity: 'legendary', def: 120 },
    ];

    for (const s of shields) {
      itemMap[s.name] = await getOrInsertItem({
        name: s.name,
        description: 'Proteção defensiva dedicada para resistir a disparos diretos.',
        type: 'shield',
        rarity: s.rarity,
        def: s.def,
        price: s.def * 110,
        tradeable: false,
      });
    }

    console.log('✔️ Armas (15), Equipamentos (10) e Escudos (8) processados.');

    const cards = [
      { t: 'money', v: 200, w: 200, r: 'common' },
      { t: 'money', v: 500, w: 100, r: 'rare' },
      { t: 'money', v: 2500, w: 30, r: 'legendary' },
      { t: 'xp', v: 10, w: 150, r: 'common' },
      { t: 'xp', v: 50, w: 40, r: 'rare' },
      { t: 'action_points', v: 5, w: 100, r: 'common' },
      { t: 'action_points', v: 20, w: 20, r: 'rare' },
    ];

    if (itemMap['Soco Inglês de Ferro']) {
      cards.push({
        t: 'item',
        v: null,
        w: 60,
        r: 'common',
        item: itemMap['Soco Inglês de Ferro'],
      });
    }

    if (itemMap['Neuro-Chips']) {
      cards.push({
        t: 'item',
        v: null,
        w: 10,
        r: 'rare',
        item: itemMap['Neuro-Chips'],
      });
    }

    for (const c of cards) {
      const exist = await query(
        `SELECT id FROM daily_card_pools
         WHERE reward_type = $1
           AND reward_value IS NOT DISTINCT FROM $2
           AND item_id IS NOT DISTINCT FROM $3
         LIMIT 1`,
        [c.t, c.v, c.item || null]
      );

      if (exist.rows.length === 0) {
        await query(
          `INSERT INTO daily_card_pools (
            reward_type,
            reward_value,
            weight,
            rarity,
            item_id
          )
          VALUES ($1, $2, $3, $4, $5)`,
          [c.t, c.v, c.w, c.r, c.item || null]
        );
      }
    }

    console.log('✔️ Cartas Diárias processadas.');

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

    for (const b of badges) {
      await query(
        `INSERT INTO badges (name, description, type, condition_value, is_seasonal)
         VALUES ($1, $2, $3, $4, false)
         ON CONFLICT (name) DO NOTHING`,
        [b.n, b.d, b.t, b.v]
      );
    }

    console.log('✔️ Badges sincronizadas.');

    const events = [
      {
        n: 'Operação Policial Estendida',
        ty: 'combat',
        d: 24,
        e: {
          target: 'jail_time_multiplier',
          modifier: 1.5,
          message: 'Tempo de prisão base aumentado em 50%.',
        },
      },
      {
        n: 'Mercado Aquecido',
        ty: 'economy',
        d: 12,
        e: {
          target: 'commodity_buy_price',
          modifier: 1.3,
          message: 'Falta de suprimentos: preços das Commodities subiram 30% nas Lojas Clandestinas.',
        },
      },
      {
        n: 'Crash da Bolsa',
        ty: 'economy',
        d: 6,
        e: {
          target: 'commodity_sell_price',
          modifier: 0.5,
          message: 'Pânico corporativo: venda de Commodities cai pela metade!',
        },
      },
      {
        n: 'Vazamento de Dados da Corporação',
        ty: 'combat',
        d: 8,
        e: {
          target: 'combat_xp_gain',
          modifier: 1.5,
          message: 'Informações táticas expostas: vitórias rendem 50% mais XP.',
        },
      },
      {
        n: 'Brecha no Sistema Bancário',
        ty: 'economy',
        d: 4,
        e: {
          target: 'mission_reward',
          modifier: 2.0,
          message: 'Sistema em colapso. Recompensas de moedas dobradas nas missões de Contrato.',
        },
      },
      {
        n: 'Aumento na Tarifa de Energia',
        ty: 'bonus',
        d: 12,
        e: {
          target: 'energy_regen_rate',
          modifier: 0.8,
          message: 'A central de distribuição cortou o suprimento. Regeneração de energia caiu consideravelmente.',
        },
      },
      {
        n: 'Festival Neon',
        ty: 'bonus',
        d: 48,
        e: {
          target: 'daily_card_drop',
          modifier: 1.2,
          message: 'As taxas de aparição de cartas diárias premium aumentaram em toda a rede.',
        },
      },
      {
        n: 'Tempestade Eletromagnética',
        ty: 'combat',
        d: 6,
        e: {
          target: 'equipment_stats',
          modifier: 0.7,
          message: 'Interferência ferrenha. Bônus de todos os Equipamentos reduzidos globalmente.',
        },
      },
      {
        n: 'Abertura das Fronteiras Táticas',
        ty: 'economy',
        d: 72,
        e: {
          target: 'shop_buy_price',
          modifier: 0.8,
          message: 'Contrabandistas furaram os bloqueios. Desconto de 20% em TODO O SHOP!',
        },
      },
    ];

    for (const ev of events) {
      await query(
        `INSERT INTO game_events (name, description, type, duration_hours, effect_config, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (name) DO NOTHING`,
        [ev.n, ev.e.message, ev.ty, ev.d, JSON.stringify(ev.e)]
      );
    }

    console.log('✔️ Eventos Base integrados.');
    console.log('🚀 PASSO 3 CONCLUÍDO! Banco de dados preparado (Segurança Idempotente ativada)!');
  } catch (e) {
    console.error('Erro na seed:', e);
  } finally {
    process.exit(0);
  }
}

seed();