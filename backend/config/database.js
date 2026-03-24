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
      {
        name: "Yakuza",
        description:
          "A organização criminosa mais temida do Japão, conhecida por sua disciplina rígida e códigos de honra.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Bratva",
        description:
          "A máfia russa, famosa por sua brutalidade e operações em larga escala no mercado negro.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Cartel de Medellín",
        description:
          "O infame cartel colombiano, mestre do tráfico e da intimidação.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Cosa Nostra",
        description:
          "A máfia ítalo-americana, com um longo histórico de controle sobre o crime organizado nos EUA.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Triads",
        description:
          "As sociedades secretas chinesas, envolvidas em tudo, desde a extorsão até o contrabando.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Peaky Blinders",
        description:
          "Uma gangue de rua de Birmingham, Inglaterra, conhecida por seu estilo e ambição implacável.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Sopranos",
        description:
          "A família criminosa de Nova Jersey, mestres em equilibrar a vida familiar com os negócios da máfia.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Irish Mob",
        description:
          "A máfia irlandesa, conhecida por sua tenacidade e controle sobre os sindicatos.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Yardies",
        description:
          "Gangues jamaicanas envolvidas no tráfico de drogas e violência.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Crips",
        description:
          "Uma das gangues de rua mais notórias de Los Angeles, identificada pela cor azul.",
        faction: "gangsters",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "SWAT",
        description:
          "A unidade de elite da polícia, especializada em operações táticas de alto risco.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "GIGN",
        description:
          "A força de intervenção da Gendarmaria Francesa, uma das melhores unidades antiterroristas do mundo.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Spetsnaz",
        description:
          "As forças especiais russas, conhecidas por seu treinamento rigoroso e eficácia letal.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "BOPE",
        description:
          "O Batalhão de Operações Policiais Especiais do Rio de Janeiro, famoso por sua atuação em favelas.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "GSG 9",
        description:
          "A unidade de contraterrorismo da Polícia Federal Alemã, criada após o massacre de Munique em 1972.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "SAS",
        description:
          "O Serviço Aéreo Especial Britânico, uma das mais antigas e respeitadas forças especiais do mundo.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "Navy SEALs",
        description:
          "A principal força de operações especiais da Marinha dos EUA, capaz de operar em qualquer ambiente.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "JTF2",
        description:
          "A força-tarefa de operações especiais do Canadá, conhecida por sua discrição e eficácia.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "GROM",
        description:
          "A unidade de elite da Polônia, especializada em uma variedade de missões, incluindo guerra não convencional.",
        faction: "guardas",
        leader_id: null,
        max_members: 40,
        is_recruiting: true,
      },
      {
        name: "The Untouchables",
        description:
          "O lendário grupo de agentes federais que derrubou Al Capone em Chicago.",
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
