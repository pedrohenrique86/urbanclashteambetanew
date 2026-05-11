-- SCHEMA COMPLETO URBANCLASH (Sintaxe SQLite/libSQL)

-- Desativar verificação de chaves estrangeiras para limpeza
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS pgmigrations;
DROP TABLE IF EXISTS clans;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS active_contracts;
DROP TABLE IF EXISTS clan_members;
DROP TABLE IF EXISTS game_config;
DROP TABLE IF EXISTS player_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS daily_card_pools;
DROP TABLE IF EXISTS factions;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS player_daily_cards;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS player_inventory;
DROP TABLE IF EXISTS card_rewards;
DROP TABLE IF EXISTS raffles;
DROP TABLE IF EXISTS raffle_tickets;
DROP TABLE IF EXISTS raffle_rewards;
DROP TABLE IF EXISTS shop_items;
DROP TABLE IF EXISTS price_history;
DROP TABLE IF EXISTS game_events;
DROP TABLE IF EXISTS active_events;
DROP TABLE IF EXISTS map_territories;
DROP TABLE IF EXISTS territory_battles;
DROP TABLE IF EXISTS territory_contributions;
DROP TABLE IF EXISTS wallet_transactions;
DROP TABLE IF EXISTS season_rankings;
DROP TABLE IF EXISTS player_status_logs;

PRAGMA foreign_keys = ON;

-- 1. Users
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    username TEXT UNIQUE NOT NULL,
    birth_date TEXT,
    country TEXT,
    is_email_confirmed INTEGER DEFAULT 0,
    email_confirmation_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TEXT,
    google_id TEXT UNIQUE,
    is_admin INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Factions
CREATE TABLE factions (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    description TEXT,
    color_hex TEXT,
    total_score INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clans
CREATE TABLE clans (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    faction TEXT NOT NULL,
    faction_id INTEGER REFERENCES factions(id),
    leader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    member_count INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 40,
    is_recruiting INTEGER DEFAULT 1,
    points INTEGER DEFAULT 0,
    season_score INTEGER DEFAULT 0,
    territory_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Profiles
CREATE TABLE user_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    clan_id TEXT REFERENCES clans(id) ON DELETE SET NULL,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    level INTEGER DEFAULT 1,
    total_xp INTEGER DEFAULT 0,
    faction TEXT,
    faction_id INTEGER REFERENCES factions(id),
    attack REAL DEFAULT 0,
    defense REAL DEFAULT 0,
    focus REAL DEFAULT 0,
    instinct REAL DEFAULT 0,
    intimidation REAL DEFAULT 0,
    discipline REAL DEFAULT 0,
    critical_chance REAL DEFAULT 0,
    critical_damage REAL DEFAULT 150,
    energy INTEGER DEFAULT 100,
    energy_updated_at TEXT,
    action_points INTEGER DEFAULT 20000,
    last_ap_reset TEXT,
    money INTEGER DEFAULT 1000,
    premium_coins INTEGER DEFAULT 0,
    merit INTEGER DEFAULT 0,
    corruption INTEGER DEFAULT 0,
    toxicity INTEGER DEFAULT 0,
    victories INTEGER DEFAULT 0,
    defeats INTEGER DEFAULT 0,
    winning_streak INTEGER DEFAULT 0,
    login_streak INTEGER DEFAULT 0,
    last_login_date TEXT,
    status TEXT NOT NULL DEFAULT 'Operacional',
    status_ends_at TEXT NULL,
    training_ends_at TEXT NULL,
    active_training_type TEXT,
    daily_training_count INTEGER DEFAULT 0,
    last_training_reset TEXT,
    recovery_ends_at TEXT,
    shield_ends_at TEXT,
    last_daily_special_at TEXT,
    season_score INTEGER DEFAULT 0,
    total_playtime_minutes INTEGER DEFAULT 0,
    pending_interception TEXT, -- JSON
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Items
CREATE TABLE items (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    rarity TEXT,
    base_price INTEGER DEFAULT 0,
    market_stock INTEGER DEFAULT 0,
    base_attack_bonus REAL DEFAULT 0,
    base_defense_bonus REAL DEFAULT 0,
    base_focus_bonus REAL DEFAULT 0,
    base_energy_bonus INTEGER DEFAULT 0,
    is_tradeable INTEGER DEFAULT 1,
    is_lootable INTEGER DEFAULT 1,
    icon_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Player Inventory
CREATE TABLE player_inventory (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    is_equipped INTEGER DEFAULT 0,
    slot TEXT,
    durability INTEGER,
    acquired_via TEXT,
    source_ref_id TEXT,
    acquired_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Clan Members
CREATE TABLE clan_members (
    id TEXT PRIMARY KEY,
    clan_id TEXT REFERENCES clans(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 8. Game Config
CREATE TABLE game_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 9. Player Status Logs
CREATE TABLE player_status_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 10. Seasons
CREATE TABLE seasons (
    id INTEGER PRIMARY KEY,
    number INTEGER,
    name TEXT,
    starts_at TEXT,
    ends_at TEXT,
    is_active INTEGER DEFAULT 0,
    winning_faction_id INTEGER REFERENCES factions(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 11. Active Contracts
CREATE TABLE active_contracts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    territory_id TEXT,
    type TEXT,
    status TEXT,
    prep_vigiar_seguranca INTEGER DEFAULT 0,
    prep_hackear_cameras INTEGER DEFAULT 0,
    prep_preparar_rota INTEGER DEFAULT 0,
    execution_ends_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. Badges
CREATE TABLE badges (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    type TEXT,
    condition_value INTEGER,
    is_seasonal INTEGER DEFAULT 0,
    icon_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_badges (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    badge_id TEXT REFERENCES badges(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id),
    earned_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 13. Daily Cards
CREATE TABLE daily_card_pools (
    id TEXT PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id),
    reward_type TEXT,
    reward_value INTEGER,
    item_id TEXT REFERENCES items(id),
    rarity TEXT,
    weight INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE player_daily_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id),
    presented_at TEXT,
    expires_at TEXT,
    card_option_1 TEXT, -- JSON
    card_option_2 TEXT, -- JSON
    card_option_3 TEXT, -- JSON
    chosen_option INTEGER,
    chosen_at TEXT
);

CREATE TABLE card_rewards (
    id TEXT PRIMARY KEY,
    daily_card_id TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reward_type TEXT,
    reward_value INTEGER,
    item_id TEXT REFERENCES items(id),
    rarity TEXT,
    delivered INTEGER DEFAULT 0,
    delivered_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 14. Raffles
CREATE TABLE raffles (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    ticket_cost INTEGER,
    prize_pool TEXT, -- JSON
    max_tickets_per_user INTEGER,
    total_tickets_sold INTEGER DEFAULT 0,
    starts_at TEXT,
    ends_at TEXT,
    is_active INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE raffle_tickets (
    id TEXT PRIMARY KEY,
    raffle_id TEXT REFERENCES raffles(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER,
    purchased_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE raffle_rewards (
    id TEXT PRIMARY KEY,
    raffle_id TEXT REFERENCES raffles(id),
    ticket_id TEXT REFERENCES raffle_tickets(id),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reward_type TEXT,
    reward_value INTEGER,
    item_id TEXT REFERENCES items(id),
    rarity TEXT,
    drawn_at TEXT,
    delivered INTEGER DEFAULT 0,
    delivered_at TEXT
);

-- 15. Shop
CREATE TABLE shop_items (
    id TEXT PRIMARY KEY,
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    season_id INTEGER REFERENCES seasons(id),
    currency_type TEXT,
    base_price INTEGER,
    current_price INTEGER,
    price_modifier REAL DEFAULT 1.0,
    stock INTEGER DEFAULT -1,
    is_active INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_item_id TEXT REFERENCES shop_items(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES items(id),
    old_price INTEGER,
    new_price INTEGER,
    old_modifier REAL,
    new_modifier REAL,
    active_event_id TEXT,
    change_reason TEXT,
    changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 16. Events
CREATE TABLE game_events (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    type TEXT,
    effect_config TEXT, -- JSON
    duration_hours INTEGER,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE active_events (
    id TEXT PRIMARY KEY,
    event_id TEXT REFERENCES game_events(id),
    season_id INTEGER REFERENCES seasons(id),
    faction_id INTEGER REFERENCES factions(id),
    started_at TEXT,
    ends_at TEXT,
    triggered_by TEXT,
    is_resolved INTEGER DEFAULT 0
);

-- 17. Map & Territories
CREATE TABLE map_territories (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    region TEXT,
    income_bonus INTEGER DEFAULT 0,
    defense_bonus REAL DEFAULT 0,
    map_x REAL,
    map_y REAL,
    controlling_faction_id INTEGER REFERENCES factions(id),
    contested INTEGER DEFAULT 0,
    heat INTEGER DEFAULT 0,
    protected_until TEXT,
    last_conquered_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE territory_battles (
    id TEXT PRIMARY KEY,
    territory_id TEXT REFERENCES map_territories(id),
    season_id INTEGER REFERENCES seasons(id),
    attacking_faction_id INTEGER,
    defending_faction_id INTEGER,
    attacker_score INTEGER DEFAULT 0,
    defender_score INTEGER DEFAULT 0,
    winner_faction_id INTEGER,
    is_resolved INTEGER DEFAULT 0,
    starts_at TEXT,
    ends_at TEXT
);

CREATE TABLE territory_contributions (
    id TEXT PRIMARY KEY,
    battle_id TEXT REFERENCES territory_battles(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    faction_id INTEGER,
    score_contributed INTEGER DEFAULT 0,
    action_points_spent INTEGER DEFAULT 0,
    contributed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 18. Wallet
CREATE TABLE wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER,
    balance_before INTEGER,
    balance_after INTEGER,
    operation_type TEXT,
    currency_type TEXT,
    ref_entity_type TEXT,
    ref_entity_id TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 19. Season Rankings
CREATE TABLE season_rankings (
    id TEXT PRIMARY KEY,
    season_id INTEGER REFERENCES seasons(id),
    user_id TEXT REFERENCES users(id),
    faction_id INTEGER REFERENCES factions(id),
    final_score INTEGER,
    rank_position INTEGER,
    victories INTEGER,
    defeats INTEGER,
    territories_contributed INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_clans_faction ON clans(faction);
CREATE INDEX idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX idx_player_inventory_user_id ON player_inventory(user_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);

-- SÊNIOR: Índices de Alta Performance (Otimização de Queries Lentas)
CREATE INDEX idx_user_profiles_recovery_status ON user_profiles(faction, status, status_ends_at);
CREATE INDEX idx_user_profiles_ranking_performance ON user_profiles(level DESC, total_xp DESC);
CREATE INDEX idx_user_profiles_faction_ranking ON user_profiles(faction, level DESC, total_xp DESC);
