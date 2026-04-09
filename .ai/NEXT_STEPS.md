Resumo de Tarefa: Refatoração do Sistema de Ranking - UrbanClash
1. Objetivo Principal
O objetivo é refatorar o sistema de ranking do backend e frontend para torná-lo mais robusto, performático e estável. A implementação atual sofre de lógica de cache descentralizada, condições de corrida (race conditions) e um sistema de atualização em tempo real (SSE) ineficiente.

2. Problemas Identificados
Lógica de Cache Descentralizada: Os arquivos backend/routes/users.js e backend/routes/clans.js possuem lógicas de cache duplicadas e independentes.
Condições de Corrida: Múltiplos processos do servidor podem tentar gerar o mesmo cache simultaneamente após uma reinicialização ou expiração, causando picos de carga no banco de dados e potenciais erros 503 (Service Unavailable) se o cache não for gerado a tempo.
Falta de "Cache Warmup": As páginas que consomem apenas uma parte do ranking (como a Home Page, que mostra o Top 10) não têm seu cache aquecido, dependendo do aquecimento do ranking completo (Top 26).
SSE Ineficiente: O frontend (frontend/src/hooks/useRankingCache.ts) escuta por eventos granulares de atualização (ranking:player:update, etc.), o que o torna complexo e frágil. A nova abordagem usará eventos de "snapshot", onde o backend apenas notifica que o ranking mudou, e o frontend busca os dados atualizados.
3. Arquitetura da Nova Solução
Serviço de Cache Centralizado: Criar um novo arquivo, backend/services/rankingCacheService.js, para conter toda a lógica de cache.
Estratégia "Stale-While-Revalidate":
Servir dados de cache "velhos" (stale) para o usuário imediatamente, enquanto uma nova versão é gerada em background.
Isso garante respostas rápidas e alta disponibilidade.
Distributed Lock com Redis:
Usar o comando SET NX do Redis para criar um "lock" (trava).
Apenas o processo do servidor que conseguir o "lock" será responsável por gerar uma entrada de cache que não existe, evitando a condição de corrida. Os outros processos aguardarão e lerão o cache gerado pelo primeiro.
Cache Warmup: O agendador de atualização de cache (cron de 10 minutos) também irá pré-aquecer os rankings parciais (Top 10) usados pela Home Page.
Eventos SSE de Snapshot: O backend passará a emitir eventos simples como ranking:snapshot:users:gangsters:26 quando um ranking for atualizado. O frontend irá escutar esses eventos para forçar uma nova busca de dados, simplificando drasticamente a lógica do lado do cliente.
4. Progresso Atual
Passo 1: Criação do Serviço de Cache Centralizado (CONCLUÍDO)

O arquivo rankingCacheService.js foi criado com toda a lógica necessária.

Código do arquivo c:\Users\PC NOVO\Documents\Projetos\urbanclashteambetanew\backend\services\rankingCacheService.js:


javascript
const crypto = require("crypto");
const redisClient = require("../config/redisClient");
const sseService = require("./sseService");

// --- Configuração do Cache ---
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const STALE_TTL_MS = 2 * 60 * 1000; // 2 minutos (tempo que um cache "velho" pode ser servido enquanto um novo é buscado)
const LOCK_TTL_MS = 30 * 1000; // 30 segundos (tempo máximo que um refresh pode ficar "travado")
const RETRY_DELAY_MS = 250; // Tempo de espera para tentar ler o cache novamente se estiver sendo gerado por outro processo

/**
 * Computa um ETag para os dados fornecidos.
 * @param {any} data - Os dados para gerar o ETag.
 * @returns {string} O ETag no formato W/"<hash>".
 */
function computeETag(data) {
  if (!data) {
    return `W/"${crypto.createHash("sha1").update("null").digest("hex")}"`;
  }
  const hash = crypto.createHash("sha1").update(JSON.stringify(data)).digest("hex");
  return `W/"${hash}"`;
}

/**
 * Busca e parseia uma entrada de cache do Redis.
 * @param {string} cacheKey - A chave do cache.
 * @returns {Promise<object|null>} O objeto do cache ou null.
 */
async function getParsedCacheEntry(cacheKey) {
  const cached = await redisClient.getAsync(cacheKey);
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (e) {
    console.error(`❌ Falha ao fazer parse do cache para a chave ${cacheKey}. Invalidando.`, e);
    await redisClient.del(cacheKey);
    return null;
  }
}

/**
 * Define uma entrada de cache no Redis e notifica via SSE.
 * @param {string} cacheKey - A chave do cache.
 * @param {any} data - Os dados a serem cacheados.
 * @param {string} sseEventName - O nome do evento SSE para notificação.
 * @returns {Promise<object>} A nova entrada de cache.
 */
async function setCacheEntry(cacheKey, data, sseEventName) {
  const etag = computeETag(data);
  const entry = { data, etag, timestamp: Date.now() };
  await redisClient.setAsync(cacheKey, JSON.stringify(entry), "PX", CACHE_TTL_MS);
  console.log(`✅ Cache atualizado e SSE emitido para ${sseEventName}`);
  sseService.broadcast(sseEventName, { source: "cache-refresh" });
  return entry;
}

/**
 * Garante que o ranking esteja fresco, aplicando a estratégia stale-while-revalidate com distributed lock.
 * @param {string} cacheKey - A chave do cache.
 * @param {Function} refreshFunction - A função que busca os dados frescos.
 * @param {string} sseEventName - O nome do evento SSE.
 * @returns {Promise<object|null>} A entrada de cache.
 */
async function ensureFreshRanking(cacheKey, refreshFunction, sseEventName) {
  const lockKey = `lock:${cacheKey}`;
  let cacheEntry = await getParsedCacheEntry(cacheKey);

  // 1. Cache existe
  if (cacheEntry) {
    const isStale = Date.now() - cacheEntry.timestamp > STALE_TTL_MS;
    // 1a. Cache está "velho" (stale)? Inicia refresh em background sem bloquear a resposta.
    if (isStale) {
      const lockAcquired = await redisClient.setAsync(lockKey, "locked", "PX", LOCK_TTL_MS, "NX");
      if (lockAcquired) {
        console.log(`🔄 Cache para ${cacheKey} está stale. Atualizando em background...`);
        // Não usamos await aqui para não bloquear a requisição do usuário
        refreshFunction()
          .then(newData => setCacheEntry(cacheKey, newData, sseEventName))
          .catch(err => console.error(`❌ Erro ao refrescar cache em background para ${cacheKey}:`, err))
          .finally(() => redisClient.del(lockKey));
      }
    }
    // Retorna o cache (stale ou não) imediatamente
    return cacheEntry;
  }

  // 2. Cache não existe. É preciso gerar.
  const lockAcquired = await redisClient.setAsync(lockKey, "locked", "PX", LOCK_TTL_MS, "NX");

  // 2a. Consegui o lock. Sou o responsável por gerar o cache.
  if (lockAcquired) {
    console.log(`CACHE MISS & LOCK ACQUIRED: Gerando cache para ${cacheKey}...`);
    try {
      const newData = await refreshFunction();
      return await setCacheEntry(cacheKey, newData, sseEventName);
    } catch (err) {
      console.error(`❌ Erro ao buscar dados frescos para ${cacheKey}:`, err);
      await redisClient.del(lockKey); // Limpa o lock em caso de erro
      return null; // Evita cachear um erro
    }
  }

  // 2b. Não consegui o lock. Outro processo está gerando. Espero um pouco e tento ler de novo.
  console.log(`CACHE MISS & LOCK FAILED: Aguardando outro processo gerar o cache para ${cacheKey}...`);
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
  return getParsedCacheEntry(cacheKey); // Tenta ler o que o outro processo (esperançosamente) gerou
}

/**
 * Dispara um refresh forçado do cache, usado pelo agendador (cron).
 * @param {string} cacheKey - A chave do cache.
 * @param {Function} refreshFunction - A função que busca os dados frescos.
 * @param {string} sseEventName - O nome do evento SSE.
 */
async function triggerRefresh(cacheKey, refreshFunction, sseEventName) {
  const lockKey = `lock:${cacheKey}`;
  const lockAcquired = await redisClient.setAsync(lockKey, "locked", "PX", LOCK_TTL_MS, "NX");

  if (lockAcquired) {
    try {
      console.log(`CRON: Disparando refresh para ${cacheKey}`);
      const newData = await refreshFunction();
      await setCacheEntry(cacheKey, newData, sseEventName);
    } catch (err) {
      console.error(`❌ Erro no refresh agendado para ${cacheKey}:`, err);
    } finally {
      await redisClient.del(lockKey);
    }
  } else {
    console.log(`CRON: Refresh para ${cacheKey} já em andamento, pulando.`);
  }
}

module.exports = {
  ensureFreshRanking,
  triggerRefresh,
  computeETag,
};
5. Próximo Passo Imediato
Passo 2: Refatoração da Rota de Usuários (users.js)

A próxima ação é modificar o arquivo c:\Users\PC NOVO\Documents\Projetos\urbanclashteambetanew\backend\routes\users.js para:

Remover a lógica de cache antiga.
Importar e usar o rankingCacheService.
Atualizar o agendador de refresh para incluir o "warmup" da Home Page e usar a nova função triggerRefresh.
Simplificar a rota GET /rankings para usar a nova função ensureFreshRanking.
A IA deve propor uma modificação (usando a ferramenta de diff) para este arquivo.

6. Passos Futuros (Após o Passo 2)
Refatorar backend/routes/clans.js: Aplicar a mesma lógica de refatoração do passo 2.
Refatorar frontend/src/hooks/useRankingCache.ts: Modificar o hook para remover os listeners SSE granulares e adicionar um único listener para os eventos de "snapshot", que irá simplesmente forçar um refresh dos dados.
Validação Final: Testar todo o fluxo para garantir que os rankings são exibidos corretamente, atualizam em tempo real (via snapshot) e que o sistema está estável.