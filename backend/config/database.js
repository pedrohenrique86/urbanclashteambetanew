const { Pool } = require("pg");

// Configuração do pool de conexões PostgreSQL
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Fallback para configuração local se DATABASE_URL não estiver definida
if (!process.env.DATABASE_URL) {
  Object.assign(pool.options, {
    user: "postgres",
    password: "W0rdPr355@@",
    host: "localhost",
    port: 5432,
    database: "urbanclash",
  });
}

// Função para conectar ao banco
async function connectDB() {
  console.log(
    "🏁 Iniciando processo de conexão e seeding do banco de dados...",
  );
  try {
    const client = await pool.connect();
    console.log("🔗 Testando conexão com PostgreSQL...");

    await client.query("SELECT NOW()");
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com PostgreSQL:", error.message);
    throw error;
  }
}

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("📊 Query executada:", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("❌ Erro na query:", { text, error: error.message });
    throw error;
  }
}

// Função para transações
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Função para verificar se uma tabela existe
async function tableExists(tableName) {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName],
    );
    return result.rows[0].exists;
  } catch (error) {
    console.error(`❌ Erro ao verificar tabela ${tableName}:`, error.message);
    return false;
  }
}

// Função para limpar sessões expiradas
async function cleanExpiredSessions() {
  try {
    const result = await query(
      "DELETE FROM user_sessions WHERE expires_at < NOW()",
    );
    console.log(
      `🧹 Limpeza de sessões: ${result.rowCount} sessões expiradas removidas`,
    );
  } catch (error) {
    console.error("❌ Erro ao limpar sessões expiradas:", error.message);
  }
}

// Limpar sessões expiradas a cada hora
setInterval(cleanExpiredSessions, 60 * 60 * 1000);

// Graceful shutdown function (to be called from server.js)
async function closePool() {
  console.log("🛑 Fechando pool de conexões PostgreSQL...");
  await pool.end();
}

// Função para popular a tabela de clãs se estiver vazia
async function seedClans() {
  try {
    const tableClansExists = await tableExists("clans");
    if (!tableClansExists) {
      console.log("ℹ️ Tabela 'clans' não encontrada. O seeding será ignorado.");
      return;
    }

    const clansExist = await query("SELECT COUNT(*) FROM clans");
    if (clansExist.rows[0].count > 0) {
      console.log("ℹ️ Tabela de clãs já populada. Nenhuma ação necessária.");
      return;
    }

    console.log("ℹ️ Populando a tabela de clãs com dados iniciais...");

    const clansToInsert = [
      // --- GANGSTERS (13) ---
      {
        name: "Sindicato da Névoa",
        description:
          "Controlam as docas e o contrabando sob o véu da neblina matinal.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Consórcio Escarlate",
        description:
          "Uma aliança de agiotas e apostadores que opera nos cassinos de luxo.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Irmandade do Asfalto",
        description:
          "Dominam as rotas de transporte da cidade, nada entra ou sai sem a sua permissão.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Quimera Urbana",
        description:
          "Especialistas em falsificação e roubos de alta tecnologia.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Víbora de Ébano",
        description:
          "Um grupo matriarcal conhecido por sua rede de informantes e uso de venenos.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Legião do Submundo",
        description:
          "Mercenários que oferecem seus serviços para quem pagar mais, sem fazer perguntas.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Titãs de Concreto",
        description:
          "Famosos pela extorsão em grandes canteiros de obras e pela força bruta.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Gilded Vultures",
        description:
          "They prey on the city's elite, specializing in blackmail and corporate espionage.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Rust-Heart Syndicate",
        description:
          "A gritty crew that controls the industrial district's scrap metal and black market parts.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Midnight Phantoms",
        description:
          "Known for heists that are so clean, it's as if they were never there.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Crimson Tide Cartel",
        description:
          "They manage the flow of illicit goods through the city's waterways.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Alchemists",
        description:
          "A mysterious group that manufactures and distributes performance-enhancing street drugs.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Shadow Weavers",
        description:
          "They manipulate city politics from behind the scenes, pulling strings no one else sees.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },

      // --- GUARDAS (13) ---
      {
        name: "Baluarte da Aurora",
        description:
          "A primeira linha de defesa da cidade, patrulham incansavelmente do amanhecer ao anoitecer.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Sentinelas de Aço",
        description:
          "Uma força de intervenção rápida equipada com a mais alta tecnologia de combate.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Égide da Metrópole",
        description:
          "Protegem os cidadãos e a infraestrutura crítica contra ameaças internas.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Falcões da Ordem",
        description:
          "Unidade de vigilância aérea e perseguição, os olhos da lei nos céus.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Vanguarda Cívica",
        description:
          "Especialistas em mediação de conflitos e proteção de testemunhas.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Legião da Justiça",
        description:
          "Detetives de elite que resolvem os casos mais complexos da cidade.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Guardiões do Zênite",
        description:
          "Protegem os distritos mais altos e ricos da cidade, uma força de elite impecável.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Aegis Corps",
        description:
          "A heavily armored unit that acts as the city's immovable shield against organized crime.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Cerulean Wardens",
        description:
          "They patrol the city's waterways and ports, preventing smuggling and illegal entry.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Vigilant Knights",
        description:
          "A precinct known for its incorruptible detectives and high-profile case-solving rate.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Bastion",
        description:
          "They maintain the city's high-security prison and are experts in containing the most dangerous criminals.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Phoenix Division",
        description:
          "A special unit dedicated to rebuilding and securing districts after major conflicts.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Shield of Veritas",
        description:
          "An internal affairs division ensuring that all guards operate with honor and integrity.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
    ];

    // Usar a função de transação para garantir a atomicidade
    await transaction(async (client) => {
      for (const clan of clansToInsert) {
        await client.query(
          "INSERT INTO clans (name, description, faction, leader_id, max_members, is_recruiting) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            clan.name,
            clan.description,
            clan.faction,
            clan.leader_id,
            clan.max_members,
            clan.is_recruiting,
          ],
        );
      }
    });

    console.log(`✅ ${clansToInsert.length} clãs inseridos com sucesso.`);
  } catch (error) {
    console.error("❌ Erro ao popular a tabela de clãs:", error.message);
    // Não relançar o erro para não impedir o início da aplicação
  }
}

module.exports = {
  pool,
  query,
  transaction,
  connectDB,
  tableExists,
  cleanExpiredSessions,
  closePool,
  seedClans, // Exporta a nova função
};
