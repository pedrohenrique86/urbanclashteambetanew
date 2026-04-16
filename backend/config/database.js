const { Pool } = require("pg");

// Configuração do pool de conexões PostgreSQL
const isProduction = process.env.NODE_ENV === "production";

let poolConfig;

// A lógica agora decide a configuração ANTES de criar o Pool.
if (process.env.DATABASE_URL) {
  // Configuração para produção ou desenvolvimento com Neon (requer SSL)
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    // Garante que SSL seja usado, como exigido pelo Neon/Render.
    // Adiciona 'mode: require' para ser explícito e remover o aviso de segurança.
    ssl: {
      rejectUnauthorized: false,
      mode: "require",
    },
  };
} else {
  // Fallback para configuração local
  console.warn(
    "⚠️ AVISO: DATABASE_URL não encontrada. Usando fallback para configuração local do PostgreSQL.",
  );
  poolConfig = {
    user: "postgres",
    password: "W0rdPr355@@",
    host: "localhost",
    port: 5433,
    database: "urbanclash",
    ssl: false,
  };
}

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 600000, // 10 minutos
  connectionTimeoutMillis: 10000, // 10 segundos
  allowExitOnIdle: process.env.NODE_ENV !== "production", // Permite que o processo saia se apenas o pool estiver ativo (útil em dev)
});

// Função para conectar ao banco
async function connectDB() {
  console.log(
    "🏁 Iniciando processo de conexão e seeding do banco de dados...",
  );

  let client;
  try {
    client = await pool.connect();
    console.log("🔗 Testando conexão com PostgreSQL...");

    await client.query("SELECT NOW()");
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com PostgreSQL:", error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
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
    if (result.rowCount > 0) {
      console.log(
        `🧹 Limpeza de sessões: ${result.rowCount} sessões expiradas removidas do banco`,
      );
    }
  } catch (error) {
    console.error("❌ Erro ao limpar sessões expiradas:", error.message);
  }
}

// Função para limpar mensagens de chat antigas (24h)
async function cleanExpiredChatMessages() {
  try {
    const result = await query(
      "DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '24 hours'",
    );
    if (result.rowCount > 0) {
      console.log(
        `🧹 Limpeza de Chat: ${result.rowCount} mensagens expiradas (24h+) removidas do banco`,
      );
    }
  } catch (error) {
    console.error("❌ Erro ao limpar mensagens de chat expiradas:", error.message);
  }
}

// Limpar sessões e mensagens expiradas a cada hora
setInterval(async () => {
  await cleanExpiredSessions();
  await cleanExpiredChatMessages();
}, 60 * 60 * 1000);

// Graceful shutdown function (to be called from server.js)
async function closePool() {
  console.log("🛑 Fechando pool de conexões PostgreSQL...");
  await pool.end();
}

// Função para popular a tabela de clãs, garantindo exatamente 26 clãs.
async function seedClans() {
  try {
    const tableClansExists = await tableExists("clans");
    if (!tableClansExists) {
      console.log("ℹ️ Tabela 'clans' não encontrada. O seeding será ignorado.");
      return;
    }

    console.log(
      "ℹ️ Resetando e populando a tabela de clãs com 26 clãs padrão...",
    );

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
          "Eles atacam a elite da cidade, especializando-se em chantagem e espionagem corporativa.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Rust-Heart Syndicate",
        description:
          "Uma equipe corajosa que controla a sucata e as peças do mercado negro do distrito industrial.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Midnight Phantoms",
        description:
          "Conhecidos por assaltos tão perfeitos que é como se nunca tivessem acontecido.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Crimson Tide Cartel",
        description:
          "Eles gerenciam o fluxo de mercadorias ilícitas através dos canais da cidade.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Alchemists",
        description:
          "Um grupo misterioso que fabrica e distribui drogas de rua para melhorar o desempenho.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Shadow Weavers",
        description:
          "Eles manipulam a política da cidade nos bastidores, movendo os pauzinhos que ninguém mais vê.",
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
          "Uma unidade fortemente blindada que atua como o escudo imóvel da cidade contra o crime organizado.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Cerulean Wardens",
        description:
          "Eles patrulham os canais e portos da cidade, impedindo o contrabando e a entrada ilegal.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Vigilant Knights",
        description:
          "Uma delegacia conhecida por seus detetives incorruptíveis e alta taxa de resolução de casos de grande repercussão.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Bastion",
        description:
          "Eles mantêm a prisão de alta segurança da cidade e são especialistas em conter os criminosos mais perigosos.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Phoenix Division",
        description:
          "Uma unidade especial dedicada a reconstruir e proteger distritos após grandes conflitos.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Shield of Veritas",
        description:
          "Uma divisão de assuntos internos que garante que todos os guardas operem com honra e integridade.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
    ];

    await transaction(async (client) => {
      // 1. Limpa a tabela de clãs
      await client.query("DELETE FROM clans");
      console.log("🗑️ Tabela 'clans' limpa.");

      // 2. Insere todos os 26 clãs
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
      console.log(`✅ ${clansToInsert.length} clãs inseridos com sucesso.`);
    });
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
  cleanExpiredChatMessages,
  closePool,
  seedClans,
};