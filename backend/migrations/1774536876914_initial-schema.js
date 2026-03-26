/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Extensões
  pgm.createExtension("uuid-ossp", { ifNotExists: true });
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  // Tabela: users
  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    email: { type: "varchar(255)", unique: true, notNull: true },
    password_hash: { type: "varchar(255)", notNull: true },
    username: { type: "varchar(50)", unique: true, notNull: true },
    birth_date: { type: "date" },
    country: { type: "varchar(3)" },
    is_email_confirmed: { type: "boolean", default: false },
    email_confirmation_token: { type: "varchar(255)" },
    password_reset_token: { type: "varchar(255)" },
    password_reset_expires: { type: "timestamp" },
    is_admin: { type: "boolean", default: false },
    created_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
  });

  // Tabela: clans
  pgm.createTable("clans", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    name: { type: "varchar(100)", unique: true, notNull: true },
    description: { type: "text" },
    faction: { type: "varchar(50)", notNull: true },
    leader_id: { type: "uuid", references: '"users"', onDelete: "SET NULL" },
    member_count: { type: "integer", default: 0 },
    max_members: { type: "integer", default: 40 },
    is_recruiting: { type: "boolean", default: true },
    points: { type: "integer", default: 0 },
    created_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
  });

  // Tabela: user_profiles
  pgm.createTable("user_profiles", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    user_id: { type: "uuid", references: '"users"', onDelete: "CASCADE" },
    clan_id: { type: "uuid", references: '"clans"', onDelete: "SET NULL" },
    display_name: { type: "varchar(100)" },
    avatar_url: { type: "text" },
    bio: { type: "text" },
    level: { type: "integer", default: 1 },
    experience_points: { type: "integer", default: 0 },
    faction: { type: "varchar(50)" },
    attack: { type: "numeric", default: 0 },
    defense: { type: "numeric", default: 0 },
    focus: { type: "numeric", default: 0 },
    intimidation: { type: "numeric", default: 0 },
    discipline: { type: "numeric", default: 0 },
    critical_chance: { type: "numeric", default: 0 },
    critical_damage: { type: "numeric", default: 150 },
    energy: { type: "integer", default: 100 },
    current_xp: { type: "integer", default: 0 },
    xp_required: { type: "integer", default: 100 },
    action_points: { type: "integer", default: 20000 },
    money: { type: "integer", default: 1000 },
    money_daily_gain: { type: "integer", default: 0 },
    victories: { type: "integer", default: 0 },
    defeats: { type: "integer", default: 0 },
    winning_streak: { type: "integer", default: 0 },
    action_points_reset_time: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
    created_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
    updated_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
  });

  // Tabela: clan_members
  pgm.createTable("clan_members", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    clan_id: { type: "uuid", references: '"clans"', onDelete: "CASCADE" },
    user_id: { type: "uuid", references: '"users"', onDelete: "CASCADE" },
    role: { type: "varchar(50)", default: "member" },
    joined_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
  });
  pgm.addConstraint("clan_members", "unique_clan_user", { unique: ["clan_id", "user_id"] });

  // Tabela: game_config
  pgm.createTable("game_config", {
    key: { type: "varchar(255)", primaryKey: true },
    value: { type: "text", notNull: true },
    description: { type: "text" },
    updated_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
  });

  // Tabela: user_sessions
  pgm.createTable("user_sessions", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("uuid_generate_v4()") },
    user_id: { type: "uuid", references: '"users"', onDelete: "CASCADE" },
    token_hash: { type: "varchar(255)", notNull: true },
    expires_at: { type: "timestamp", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("CURRENT_TIMESTAMP") },
  });

  // Índices
  pgm.createIndex("users", "email");
  pgm.createIndex("users", "username");
  pgm.createIndex("user_profiles", "user_id");
  pgm.createIndex("clans", "faction");
  pgm.createIndex("clan_members", "clan_id");
  pgm.createIndex("clan_members", "user_id");
  pgm.createIndex("user_sessions", "user_id");
  pgm.createIndex("user_sessions", "expires_at");

  // Função e Triggers para updated_at
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_clans_updated_at BEFORE UPDATE ON clans
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);

  // Função e Trigger para member_count
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_clan_member_count()
    RETURNS TRIGGER AS $$
    BEGIN
        IF TG_OP = 'INSERT' THEN
            UPDATE clans SET member_count = member_count + 1 WHERE id = NEW.clan_id;
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE clans SET member_count = member_count - 1 WHERE id = OLD.clan_id;
            RETURN OLD;
        END IF;
        RETURN NULL;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_clan_member_count_trigger
        AFTER INSERT OR DELETE ON clan_members
        FOR EACH ROW EXECUTE FUNCTION update_clan_member_count();
  `);

  // Inserir clãs iniciais
  pgm.sql(`
    INSERT INTO clans (name, faction, points, description) VALUES
    ('Sindicato da Sombra', 'gangsters', 1100, 'Onde a lealdade é comprada e a traição é punida.'),
    ('Navalhas Noturnas', 'gangsters', 1250, 'Cortamos o silêncio da noite com o som do aço.'),
    ('Irmandade do Asfalto', 'gangsters', 950, 'As ruas são nossas, o resto é paisagem.'),
    ('Cães de Aluguel', 'gangsters', 1500, 'Qualquer serviço, qualquer hora. O preço é a sua alma.'),
    ('Corvos Urbanos', 'gangsters', 1300, 'Observamos tudo, pegamos o que queremos.'),
    ('Víbora de Concreto', 'gangsters', 1150, 'Nosso veneno corre pelas veias da cidade.'),
    ('Mercenários do Neon', 'gangsters', 1400, 'Luzes brilhantes, negócios sombrios.'),
    ('Esquadrão Fantasma', 'gangsters', 1600, 'Você nunca nos vê chegando.'),
    ('Lâminas do Beco', 'gangsters', 900, 'Nascidos na escuridão, mestres da emboscada.'),
    ('Cartel do Subúrbio', 'gangsters', 1700, 'O poder real não precisa de holofotes.'),
    ('Lobos de Rua', 'gangsters', 1200, 'Uma matilha unida pela fome de poder.'),
    ('Abutres da Metrópole', 'gangsters', 1050, 'Lucramos com os restos que os outros deixam.'),
    ('Titãs de Ferro', 'gangsters', 1800, 'Indestrutíveis, implacáveis, inevitáveis.'),
    ('Baluarte da Justiça', 'guardas', 1120, 'A última linha de defesa entre a ordem e o caos.'),
    ('Sentinelas da Ordem', 'guardas', 1280, 'Vigiamos para que outros possam dormir em paz.'),
    ('Legião Protetora', 'guardas', 980, 'Um por todos e todos pela cidade.'),
    ('Guardiões do Amanhecer', 'guardas', 1550, 'Lutamos pela promessa de um novo dia.'),
    ('Defensores da Cidade', 'guardas', 1350, 'Esta cidade é nossa casa. E nós protegemos nosso lar.'),
    ('Vigilantes de Aço', 'guardas', 1180, 'A lei forjada em combate.'),
    ('Escudo Cidadão', 'guardas', 1450, 'Nossa força vem daqueles que protegemos.'),
    ('Tropa de Honra', 'guardas', 1650, 'Honra acima de tudo, dever acima de todos.'),
    ('Falcões Urbanos', 'guardas', 930, 'Dos céus, a justiça enxerga longe.'),
    ('Muralha Protetora', 'guardas', 1750, 'Onde a anarquia encontra seu fim.'),
    ('Vanguarda Cívica', 'guardas', 1220, 'Liderando o caminho para um futuro seguro.'),
    ('Pacificadores', 'guardas', 1080, 'A paz é nossa profissão.'),
    ('Força Unida', 'guardas', 1850, 'Juntos, somos inquebráveis.')
    ON CONFLICT (name) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("user_sessions", { cascade: true });
  pgm.dropTable("game_config", { cascade: true });
  pgm.dropTable("clan_members", { cascade: true });
  pgm.dropTable("user_profiles", { cascade: true });
  pgm.dropTable("clans", { cascade: true });
  pgm.dropTable("users", { cascade: true });
  
  pgm.sql(`
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS update_clan_member_count() CASCADE;
  `);
};