const { Pool } = require("pg");
const path = require("path");
// 1. Carrega o .env padrão
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// 2. Se for produção, sobrepõe com .env.production
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ 
    path: path.join(__dirname, "../.env.production"),
    override: true 
  });
}

// Configuração do pool de conexões PostgreSQL
const isProduction = process.env.NODE_ENV === "production";

let poolConfig;

// Seleção inteligente da URL de conexão (DATABASE_URL > DATABASE_URL_PROD > DATABASE_URL_DEV)
const databaseUrl = process.env.DATABASE_URL || 
                   (isProduction ? process.env.DATABASE_URL_PROD : process.env.DATABASE_URL_DEV);

if (databaseUrl) {
  const dbHost = databaseUrl.split('@')[1]?.split('/')[0] || 'unknown';
  console.log(`🔌 [Database] Conectando ao host: ${dbHost}`);
  console.log(`🚀 [Database] Ambiente: ${process.env.NODE_ENV || 'não definido'}`);

  // Configuração para produção ou desenvolvimento com Neon/Cloud (requer SSL)
  poolConfig = {
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
    // SÊNIOR: Cancela queries que demoram mais de 8s (evita travar o backend inteiro)
    statement_timeout: 8000,
    query_timeout: 10000,
  };
} else {
  if (isProduction) {
    throw new Error("❌ ERRO FATAL: Nenhuma variável de banco de dados (DATABASE_URL ou DATABASE_URL_PROD) encontrada em produção.");
  }
  
  // Fallback para configuração local apenas em desenvolvimento
  console.warn(
    "⚠️ AVISO: Nenhuma DATABASE_URL encontrada no .env. Usando fallback localhost:5433.",
  );
  poolConfig = {
    user: "postgres",
    password: "W0rdPr355@@",
    host: "localhost",
    port: 5433,
    database: "urbanclash",
    ssl: false,
    statement_timeout: 8000,
    query_timeout: 10000,
  };
}

// SÊNIOR FIX: Pool unificado — usa o poolConfig já montado acima.
// idleTimeoutMillis aumentado de 1s → 30s para permitir que o Neon entre
// em auto-suspend quando não há jogadores ativos.
// max reduzido de 20 → 10 em prod: o sistema é Redis-first, raramente usa
// mais de 3-4 conexões simultâneas no ciclo de 10 minutos.
const pool = new Pool({
  ...poolConfig,
  max: isProduction ? 10 : 3,
  idleTimeoutMillis: 30000,      // 30s ociosa antes de fechar (era 1s!)
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,         // Permite que o processo Node.js encerre se só o pool estiver ativo
});

// SÊNIOR: Monitoramento de conexões para caçar vazamentos que impedem o sono do Neon
// SÊNIOR: Impede que o Node.js "crashe" devido a quedas de conexões TCP ociosas
pool.on("error", (err, client) => {
  if (err.message.includes("terminating connection due to idle timeout")) return;
  console.error("⚠️ [Database] Erro no Pool:", err.message);
});

// Função para conectar ao banco
async function connectDB() {
  console.log("🏁 Conectando ao PostgreSQL...");

  let client;
  try {
    client = await pool.connect();
    await client.query("SELECT NOW()");
    
    // SÊNIOR: Desativado o check automático de migrações no boot para economizar CU.
    // As tabelas já foram criadas e não precisam ser verificadas em todo restart.
    // await runPlayerStatusMigrations(true);
    
    return true;
  } catch (error) {
    console.error("❌ Erro ao conectar com PostgreSQL:", error.message);
    throw error;
  } finally {
    if (client) client.release();
  }
}

// Função para executar queries
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    
    // Log apenas para queries lentas em produção (>1s)
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn("⚠️ Query Lenta:", { text: text.substring(0, 100), duration: `${duration}ms` });
    }
    return res;
  } catch (error) {
    console.error("❌ Erro na query:", { text: text.substring(0, 200), error: error.message });
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

// Função para executar as limpezas de manutenção
async function runMaintenanceOperations() {
  console.log("🧹 Iniciando operações de manutenção (Sessões e Chat)...");
  await Promise.allSettled([
    cleanExpiredChatMessages()
  ]);
  console.log("✅ Operações de manutenção concluídas.");
}

// Mas mantém o agendamento horário
// SÊNIOR: Removido o setInterval solto para evitar acordar o Neon fora do ciclo controlado.
// Esta função agora é exportada e chamada pelo rankingCacheService.js
// que já possui travas de segurança baseadas em jogadores online.

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

// MIGRATION SENIOR: Idempotente para Sistema de Status
async function runPlayerStatusMigrations(silent = false) {
  if (!silent) console.log("🛠️ Verificando migrações de Status do Jogador...");
  try {
    // 1. Colunas em user_profiles
    await query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='status') THEN
          ALTER TABLE user_profiles ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'livre';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='status_ends_at') THEN
          ALTER TABLE user_profiles ADD COLUMN status_ends_at TIMESTAMPTZ NULL;
        END IF;
      END $$;
    `);

    // 2. Tabela player_status_logs
    await query(`
      CREATE TABLE IF NOT EXISTS player_status_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Índices (idempotentes via IF NOT EXISTS)
    await query(`CREATE INDEX IF NOT EXISTS idx_status_logs_user_id ON player_status_logs(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_status_logs_status ON player_status_logs(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_status_logs_composite ON player_status_logs(user_id, ended_at);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_status_logs_started_at ON player_status_logs(started_at);`);

    if (!silent) console.log("✅ Verificação básica de tabelas de Status concluída.");
  } catch (error) {
    console.error("❌ Erro na verificação de Status:", error.message);
  }
}

module.exports = {
  pool,
  query,
  transaction,
  connectDB,
  tableExists,
  cleanExpiredChatMessages,
  closePool,
  seedClans,
  runPlayerStatusMigrations,
};