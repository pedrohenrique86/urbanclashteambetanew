# 🔍 Análise Completa do Fluxo do Cronômetro

## 📊 Visão Geral da Arquitetura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    PostgreSQL   │────▶│     Redis       │────▶│   Backend API   │────▶ Frontend
│   (Fonte Real)  │     │   (Cache Rápido)│     │  (Node/Express) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                        │                       │
        │                        │                       │
        ▼                        ▼                       ▼
   game_config:           game:state              /api/time
   - game_start_time      - status                /api/game/state
   - game_duration        - remainingTime         /api/admin/*
   - is_countdown_active  - serverTime
   - is_paused
```

---

## 🔄 FLUXO DE LEITURA (Frontend consulta cronômetro)

### Passo 1: Frontend solicita dados

```typescript
// src/hooks/useGameTimer.ts
const response = await fetch(`${API_BASE_URL}/time`);
```

### Passo 2: Backend recebe requisição

```javascript
// backend/routes/time.js
router.get("/", async (req, res) => {
  const gameState = await getGameState(); // ← Chama service
  res.json({ serverTime, gameState });
});
```

### Passo 3: GameStateService - Tenta Redis primeiro

```javascript
// backend/services/gameStateService.js
async function getGameState() {
  // 3.1: Tenta buscar do Redis (Cache HIT)
  const cachedState = await safeRedisGet("game:state");
  if (cachedState) {
    return JSON.parse(cachedState); // ← Retorna imediatamente (~1-2ms)
  }

  // 3.2: Cache MISS - Busca do PostgreSQL
  console.log("📦 Cache MISS: Buscando estado do PostgreSQL");
  const rawConfig = await getGameStateFromDB();

  // 3.3: Calcula estado derivado
  const gameState = calculateGameState(rawConfig);

  // 3.4: Popula Redis para próximas requisições
  await safeRedisSet("game:state", JSON.stringify(gameState), "EX", 3600);

  return gameState;
}
```

### Passo 4: Cálculo do Estado (business logic)

```javascript
function calculateGameState(rawConfig) {
  const now = new Date();

  // Dados brutos do banco
  const startTime = rawConfig.game_start_time;
  const isCountdownActive = rawConfig.is_countdown_active;
  const duration = rawConfig.game_duration || 1728000; // 20 dias
  const isPaused = rawConfig.is_paused;

  // Lógica de status
  let status = "stopped";
  let remainingTime = 0;

  if (startTime) {
    const startDate = new Date(startTime);
    const endTime = new Date(startDate.getTime() + duration * 1000);

    if (isPaused) {
      status = "paused";
    } else if (isCountdownActive) {
      if (now >= endTime) {
        status = "finished";
        remainingTime = 0;
      } else {
        status = "running";
        remainingTime = Math.floor((endTime - now) / 1000);
      }
    } else if (now < startDate) {
      status = "scheduled"; // Agendado para futuro
      remainingTime = duration;
    }
  }

  return {
    status, // 'stopped' | 'scheduled' | 'running' | 'paused' | 'finished'
    isActive: status === "running",
    isPaused,
    startTime,
    endTime: endTime?.toISOString(),
    duration,
    remainingTime, // ← Enviado para frontend calcular
    serverTime: now.toISOString(),
  };
}
```

### Passo 5: Redis (Camada de Cache)

```
Chave: game:state
Valor: {
  "status": "running",
  "isActive": true,
  "startTime": "2024-03-21T10:00:00Z",
  "duration": 1728000,
  "remainingTime": 1500000,
  "serverTime": "2024-03-21T10:05:00Z"
}
TTL: 3600 segundos (1 hora)
```

### Passo 6: PostgreSQL (Fonte Oficial)

```sql
-- Tabela game_config
SELECT key, value FROM game_config;

-- Resultado:
-- key                    | value
-- -----------------------+---------------------
-- game_start_time        | 2024-03-21T10:00:00Z
-- game_duration          | 1728000
-- is_countdown_active    | true
-- is_paused              | false
```

### Passo 7: Frontend recebe e processa

```typescript
// Resposta da API:
{
  serverTime: "2024-03-21T10:05:00Z",
  gameState: {
    status: "running",
    remainingTime: 1500000,  // segundos
    // ... outros campos
  }
}

// useGameTimer processa:
// - Salva remainingTime em uma ref (não causa re-render)
// - Inicia setInterval de 1 segundo
// - Decrementa localmente: remainingTime--
// - A cada 5 minutos: sincroniza com servidor
```

### Passo 8: Renderização do Cronômetro

```typescript
// Valores calculados localmente a cada segundo:
const localRemainingTime = remainingTimeRef.current; // ex: 1499995
const formattedTime = formatTime(localRemainingTime); // "17d 08:33:15"
const progress = (localRemainingTime / duration) * 100; // 86.5%

// UI:
<div className="timer">{formattedTime}</div>  // "17d 08:33:15"
<div className="progress-bar" style={{ width: `${progress}%` }} />
```

---

## ✏️ FLUXO DE ESCRITA (Admin inicia/para o jogo)

### Cenário: Admin inicia o jogo

### Passo 1: Admin chama API

```bash
POST /api/admin/schedule
{
  "startTime": "2024-03-21T10:00:00Z",
  "duration": 1728000  // 20 dias em segundos
}
```

### Passo 2: Backend valida e processa

```javascript
// backend/routes/admin.js
router.post("/schedule", authenticateToken, isAdmin, async (req, res) => {
  const { startTime, duration } = req.body;
  const result = await startGame(startTime, duration);
  res.json({ success: true, gameState: result });
});
```

### Passo 3: GameStateService atualiza PostgreSQL

```javascript
// backend/services/gameStateService.js
async function startGame(startTime, durationSeconds) {
  // Transação atômica
  await query('BEGIN');

  // Atualiza game_config
  await query(
    `INSERT INTO game_config (key, value, updated_at) VALUES
     ('game_start_time', $1, NOW()),
     ('game_duration', $2, NOW()),
     ('is_countdown_active', 'true', NOW())
     ON CONFLICT (key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW()`,
    [startTime, String(durationSeconds)]
  );

  await query('COMMIT');

  // Invalida cache Redis
  await invalidateGameStateCache();

  return { success: true, status: 'running', ... };
}
```

### Passo 4: Invalidação do Cache

```javascript
async function invalidateGameStateCache() {
  await safeRedisDel("game:state");
  await safeRedisDel("game:status");
  console.log("🗑️ Cache invalidado");
}
```

### Passo 5: Próxima leitura busca do banco

```
1. Frontend faz GET /api/time
2. Redis: MISS (cache foi invalidado)
3. PostgreSQL: SELECT game_config ← Busca dados atualizados
4. Redis: SET game:state ← Popula cache novamente
5. Frontend: Recebe novo estado
```

---

## ⏰ FLUXO DE AUTO-START (Verificação periódica)

### Backend verifica a cada 30 segundos:

```javascript
// backend/server.js
setInterval(async () => {
  const started = await checkAutoStart();
  if (started) console.log("🎮 Jogo iniciado automaticamente");
}, 30000);
```

### Lógica de auto-start:

```javascript
async function checkAutoStart() {
  const state = await getGameState();

  // Se está agendado e passou do horário
  if (state.status === "scheduled" && state.startTime) {
    const startDate = new Date(state.startTime);
    if (new Date() >= startDate) {
      // Ativa countdown automaticamente
      await query(
        `INSERT INTO game_config (key, value) 
         VALUES ('is_countdown_active', 'true')
         ON CONFLICT (key) DO UPDATE SET value = 'true'`,
      );
      await invalidateGameStateCache();
      return true; // Jogo iniciou
    }
  }
  return false;
}
```

---

## 📈 Diagrama de Tempo

```
TEMPO →

Admin agenda jogo para 10:00
    │
    ▼
┌──────────┐    ┌──────────┐    ┌──────────┐
│ 09:59:30 │────│ 10:00:00 │────│ 10:00:30 │
│ Verific  │    │ HORA DO  │    │ Verific  │
│ scheduled│    │  INÍCIO  │    │  inicia  │
└──────────┘    └──────────┘    └──────────┘
                      │
                      ▼
              is_countdown_active = true
                      │
                      ▼
              Cache Redis INVALIDADO
                      │
                      ▼
              Próxima requisição:
              → Cache MISS
              → Busca do PostgreSQL
              → Status: 'running'
```

---

## 🎯 Estratégia de Cache

### Cache-Aside Pattern (Lazy Loading)

```
1. Requisição chega
2. Verifica Redis (rápido: ~1-2ms)
3. Se HIT: retorna imediatamente
4. Se MISS: busca do PostgreSQL (~10-20ms)
5. Salva no Redis para próximas requisições
6. Retorna dados
```

### Invalidação

- Escrita no PostgreSQL → Invalida Redis
- TTL de segurança: 1 hora
- Próxima leitura repopula o cache

---

## 🔢 Métricas de Performance

| Operação      | Com Redis | Sem Redis (DB) |
| ------------- | --------- | -------------- |
| GET /api/time | ~2-5ms    | ~15-25ms       |
| Cache HIT     | ~1-2ms    | -              |
| Cache MISS    | ~20-30ms  | ~15-25ms       |

---

## 🛡️ Resiliência (Fallbacks)

```
Se Redis falhar:
  → Busca direto do PostgreSQL
  → Sistema continua funcionando

Se PostgreSQL falhar:
  → Retorna erro 500
  → Frontend mostra estado offline

Se sincronização atrasar:
  → Frontend usa cálculo local
  → Corrige na próxima sincronização (5min)
```

---

## 📝 Resumo do Fluxo Completo

1. **Dados oficiais** ficam no **PostgreSQL** (`game_config`)
2. **Cache rápido** fica no **Redis** (`game:state`)
3. **Backend** orquestra leitura/escrita com consistência
4. **Frontend** recebe dados e calcula cronômetro localmente
5. **Sincronização** a cada 5 minutos corrige drift
6. **Admin** escreve no PostgreSQL e invalida cache
7. **Auto-start** verifica a cada 30s se é hora de iniciar

---

**Arquitetura escalável, resiliente e de alta performance!** 🚀
