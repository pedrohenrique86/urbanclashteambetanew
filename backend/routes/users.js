const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { query, transaction } = require("../config/database");
const { authenticateToken, requireOperational } = require("../middleware/auth");
const { lockPlayerAction } = require("../middleware/lockMiddleware");
const ActionPointsService = require("../services/actionPointsService");
const redisClient = require("../config/redisClient");
const { getGameState } = require("../services/gameStateService");
const sseService = require("../services/sseService");
const rankingCacheService = require("../services/rankingCacheService");
const playerStateService = require("../services/playerStateService");
const gameLogic = require("../utils/gameLogic");

const router = express.Router();

// =========================
// Helpers
// =========================
function buildSafeUsername({ requestedUsername, userId, userFromDb }) {
  const candidate = (
    requestedUsername ||
    userFromDb?.username ||
    userFromDb?.email?.split("@")[0] ||
    `user_${String(userId).replace(/-/g, "").slice(0, 12)}`
  )
    ?.toString()
    .trim();

  if (!candidate) {
    throw new Error("Falha ao gerar username válido");
  }

  return candidate;
}

function sanitizeBirthDate(birthDate) {
  if (!birthDate || ["null", "undefined", "Invalid Date", ""].includes(String(birthDate))) {
    return null;
  }
  return typeof birthDate === 'string' && birthDate.includes('T') ? birthDate.split('T')[0] : birthDate;
}

async function refreshUserRankingCaches() {
  try {
    await Promise.allSettled([
      rankingCacheService.warmupRankings(), // SÊNIOR: Warmup unificado é mais eficiente
    ]);
  } catch (_) { }
}


// =========================
// SSE Ranking
// =========================
router.get("/rankings/subscribe", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Content-Encoding": "identity",
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("\n");

  sseService.subscribe(res, "ranking");

  res.write(
    `event: connection_established\ndata: ${JSON.stringify({
      message: "Conectado ao ranking em tempo real.",
    })}\n\n`,
  );

  // Keep-alive: envia comentário SSE a cada 15s para evitar timeout de proxies (mobile)
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_) {
      clearInterval(pingInterval);
    }
  }, 15_000);

  // Previne crash do servidor quando mobile troca de rede (WiFi↔4G)
  res.on("error", () => {
    clearInterval(pingInterval);
    sseService.unsubscribe(res, "ranking");
  });

  req.on("close", () => {
    clearInterval(pingInterval);
    sseService.unsubscribe(res, "ranking");
  });
});

// =========================
// SSE — Estado do Jogador (canal privado por usuário)
// GET /api/users/state/subscribe
// Keep-alive: ping a cada 25s para manter a conexão viva em proxies/load balancers
// Segurança: token via query param — NÃO logado (sanitizado antes do morgan)
// =========================
router.get("/state/subscribe", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const topic  = `player:${userId}`;

  // Sanitiza query params para evitar que o token apareça nos logs do morgan
  // (o morgan loga req.url, então sobrescrevemos antes do log ser gerado)
  if (req.query.token) {
    req.url        = req.url.replace(/([?&])token=[^&]*/g, "$1token=[REDACTED]");
    req.originalUrl = req.originalUrl.replace(/([?&])token=[^&]*/g, "$1token=[REDACTED]");
  }

  try {
    res.set({
      "Content-Type" : "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection"   : "keep-alive",
      "X-Accel-Buffering": "no",   // Desabilita buffering em nginx/proxies
      "Content-Encoding": "identity", // Evita compressão que quebra SSE em alguns proxies
    });
    
    if (res.flushHeaders) res.flushHeaders();
    res.write("\n");

    const cid = req.query.cid || "legacy";
    sseService.subscribe(res, topic, cid);
  } catch (err) {
    console.error("❌ Erro fatal ao iniciar canal SSE:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao iniciar stream de dados" });
    } else {
      res.end();
    }
    return;
  }

  // Confirmação de conexão
  res.write(
    `event: player:connected\ndata: ${JSON.stringify({
      message: "Canal privado conectado.",
    })}\n\n`,
  );

  // Keep-alive: envia comentário SSE a cada 15s para evitar timeout
  // de proxies/load balancers (padrão em redes móveis é agressivo)
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_) {
      clearInterval(pingInterval);
    }
  }, 15_000);

  // Previne crash do servidor quando mobile troca de rede (WiFi↔4G)
  res.on("error", () => {
    clearInterval(pingInterval);
    sseService.unsubscribe(res, topic);
  });

  // Cleanup ao fechar conexão
  req.on("close", () => {
    clearInterval(pingInterval);
    sseService.unsubscribe(res, topic);
  });
});

// =========================
// Validações
// =========================
const updateProfileValidation = [
  body("username")
    .optional()
    .isLength({ min: 3, max: 10 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username deve ter 3-10 caracteres e conter apenas letras, números e underscore",
    ),
  body("bio")
    .optional({ checkFalsy: true })
    .isLength({ max: 100 })
    .withMessage("Bio deve ter no máximo 100 caracteres"),
  body("faction")
    .optional()
    .isIn(["gangsters", "guardas", "renegados", "guardioes", "gangster", "guarda", "renegado", "guardiao"])
    .withMessage("Facção deve ser: renegados ou guardioes"),
  body("avatar_url")
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage("Avatar URL deve ser uma string de até 100 caracteres"),
  body("birth_date")
    .optional({ checkFalsy: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage("Data de nascimento deve estar no formato AAAA-MM-DD")
    .custom((value) => {
      if (!value) return true;
      const d = new Date(value);
      if (isNaN(d.getTime())) throw new Error("Data inválida");
      const year = d.getFullYear();
      if (year < 1900 || year > new Date().getFullYear()) {
        throw new Error("Ano de nascimento fora da faixa permitida");
      }
      return true;
    }),
];

const changePasswordValidation = [
  body("currentPassword").notEmpty().withMessage("Senha atual é obrigatória"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("Nova senha deve ter pelo menos 8 caracteres")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Nova senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo",
    ),
];

// =========================
// Stats por facção
// =========================
function getFactionStats(faction) {
  const baseStats = {
    level: 1,
    energy: 100,
    total_xp: 0,
    action_points: 20000,
    money: 1000,
    victories: 0,
    defeats: 0,
    winning_streak: 0,
    status: 'Operacional',
  };

  // Aceita tanto os valores legados (gangsters/guardas) quanto os novos (renegados/guardioes)
  const canonical = playerStateService.resolveFactionName(faction);

  if (canonical === "renegados") {
    return {
      ...baseStats,
      attack          : 8,
      defense         : 3,
      focus           : 5,
      instinct        : 0,
      intimidation    : 35.0,
      discipline      : 0.0,
      // critical_chance: pontos brutos acumulados — começa em 0, cresce nos treinos
      // A % real é calculada via gameLogic.calcCritChance() (inclui FOC e DISC)
      critical_chance : 0,
      // critical_damage: pontos brutos — base real é CRIT_DMG_BASE_RENEGADO (150)
      // A % extra bruta acumulada nos treinos, base fixa é da facceão
      critical_damage : 0,
    };
  }

  if (canonical === "guardioes") {
    return {
      ...baseStats,
      attack          : 5,
      defense         : 6,
      focus           : 6,
      instinct        : 0,
      intimidation    : 0.0,
      discipline      : 40.0,
      critical_chance : 0,
      critical_damage : 0,
    };
  }

  return {
    ...baseStats,
    attack          : 0,
    defense         : 0,
    focus           : 0,
    instinct        : 0,
    intimidation    : 0.0,
    discipline      : 0.0,
    critical_chance : 0,
    critical_damage : 0,
  };
}


// =========================
// GET /api/users/profile
// =========================
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const profile = await playerStateService.getPlayerState(req.user.id);
    if (!profile) return res.status(200).json(null);

    const convertedProfile = playerStateService.formatProfile(profile);
    
    // SÊNIOR: Chips e Toasts vêm do SSOT (Redis)
    convertedProfile.active_chips = profile.equipped_chips ? JSON.parse(profile.equipped_chips) : [];
    
    if (profile.pending_training_toast) {
      convertedProfile.pending_training_toast = JSON.parse(profile.pending_training_toast);
      await redisClient.hDelAsync(`playerState:${req.user.id}`, "pending_training_toast");
    }

    // Inventário (O(1) com catálogo em RAM)
    const inventoryService = require("../services/inventoryService");
    convertedProfile.inventory = await inventoryService.getInventory(req.user.id);

    const gameState = await getGameState();
    res.json({ ...convertedProfile, gameState });
  } catch (error) {
    console.error("❌ Erro no perfil:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// POST /api/users/profile
// =========================
router.post("/profile", authenticateToken, lockPlayerAction(1000), async (req, res) => {
  try {
    const { faction } = req.body;
    const canonical = playerStateService.resolveFactionName(faction);
    
    const existing = await query("SELECT id FROM user_profiles WHERE user_id = $1", [req.user.id]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Perfil já existe" });

    const userRes = await query("SELECT id, username, email FROM users WHERE id = $1", [req.user.id]);
    const user = userRes.rows[0];

    // SÊNIOR: Faction ID dinâmico via DB para garantir FK
    const { rows: fRows } = await query("SELECT id FROM factions WHERE name = $1", [canonical]);
    const factionId = fRows[0]?.id;

    const stats = getFactionStats(canonical);
    const safeName = buildSafeUsername({ userId: user.id, userFromDb: user });

    const { rows } = await query(
      `INSERT INTO user_profiles (user_id, username, display_name, faction, faction_id, level, energy, money, action_points, attack, defense, focus, intimidation, discipline, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [user.id, safeName, safeName, canonical, factionId, stats.level, stats.energy, stats.money, stats.action_points, stats.attack, stats.defense, stats.focus, stats.intimidation, stats.discipline, stats.status]
    );

    await refreshUserRankingCaches();
    res.status(201).json(playerStateService.formatProfile(rows[0]));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// PUT /api/users/profile (Dashboard/Settings)
// =========================
router.put("/profile", authenticateToken, lockPlayerAction(1000), updateProfileValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const newState = await playerStateService.updatePlayerState(req.user.id, req.body);
    if (!newState) return res.status(404).json({ error: "Perfil não encontrado" });

    await refreshUserRankingCaches();
    res.json(playerStateService.formatProfile(newState));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// GET /api/users/rankings
// =========================
router.get("/rankings", async (req, res) => {
  try {
    const { faction } = req.query;
    const factionKey = faction || "all";
    const gameState = await getGameState();

    const cached = await rankingCacheService.ensureFreshRanking(
      "users",
      factionKey,
    );

    if (!cached) {
      return res
        .status(503)
        .json({ error: "Ranking temporariamente indisponível" });
    }

    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch && ifNoneMatch === cached.etag) {
      res.set("Cache-Control", "public, max-age=600");
      res.set("ETag", cached.etag);
      return res.status(304).end();
    }

    res.set("Cache-Control", "public, max-age=600");
    res.set("ETag", cached.etag);
    return res.json({ leaderboard: cached.data, gameState });
  } catch (error) {
    console.error("❌ [RANKINGS] Erro:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// GET /api/users/:id
// =========================
router.get("/:id", async (req, res) => {
  try {
    const player = await playerStateService.getPlayerState(req.params.id);
    if (!player) return res.status(404).json({ error: "Usuário não encontrado" });

    // SÊNIOR: Formato seguro para perfil público (esconde dados sensíveis se necessário)
    const formatted = playerStateService.formatProfile(player);
    
    res.json({
      user: {
        id: formatted.id,
        username: formatted.username,
        display_name: formatted.display_name,
        avatar_url: formatted.avatar_url,
        bio: formatted.bio,
        level: formatted.level,
        faction: formatted.faction,
        victories: formatted.victories,
        defeats: formatted.defeats,
        winning_streak: formatted.winning_streak,
        created_at: player.account_created_at,
        birth_date: player.birth_date ? player.birth_date.split('T')[0] : null,
        clan_name: player.clan_name || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// PUT /api/users/:id/profile
// =========================
router.put("/:id/profile", authenticateToken, lockPlayerAction(1000), updateProfileValidation, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id && !req.user.is_admin) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // SÊNIOR: Se houver mudança de birth_date ou username, atualizamos a tabela users (SQL)
    if (req.body.birth_date || req.body.username) {
      const sqlParts = [];
      const sqlVals = [];
      if (req.body.birth_date) {
        sqlParts.push(`birth_date = $${sqlVals.length + 1}`);
        sqlVals.push(sanitizeBirthDate(req.body.birth_date));
      }
      if (req.body.username) {
        sqlParts.push(`username = $${sqlVals.length + 1}`);
        sqlVals.push(req.body.username);
      }
      sqlVals.push(id);
      await query(`UPDATE users SET ${sqlParts.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${sqlVals.length}`, sqlVals);
    }

    // Atualiza o estado principal no Redis (SSOT)
    const newState = await playerStateService.updatePlayerState(id, req.body);
    await refreshUserRankingCaches();

    res.json({
      message: "Perfil atualizado com sucesso",
      profile: playerStateService.formatProfile(newState),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// PUT /api/users/:id/password
// =========================
router.put(
  "/:id/password",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      if (req.user.id !== id && !req.user.is_admin) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;

      const userResult = await query(
        "SELECT password_hash FROM users WHERE id = $1",
        [id],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userResult.rows[0];
      const passwordValid = await bcrypt.compare(
        currentPassword,
        user.password_hash,
      );

      if (!passwordValid) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newPasswordHash, id],
      );

      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("❌ Erro ao alterar senha:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// =========================
// GET /api/users/:id/clans
// =========================
router.get("/:id/clans", async (req, res) => {
  try {
    const { id } = req.params;

    const clansResult = await query(
      `
      SELECT 
        c.id, c.name, c.description, c.faction, c.member_count, c.max_members,
        cm.role, cm.joined_at
      FROM clans c
      INNER JOIN clan_members cm ON c.id = cm.clan_id
      WHERE cm.user_id = $1
      ORDER BY cm.joined_at DESC
      `,
      [id],
    );

    res.json({ clans: clansResult.rows });
  } catch (error) {
    console.error("❌ Erro ao buscar clãs do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// DELETE /api/users/:id
// =========================
// Admin pode deletar qualquer usuário.
// Usuário comum só pode deletar a própria conta.
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const isOwner = req.user.id === id;
    const isAdmin = !!req.user.is_admin;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const result = await transaction(async (client) => {
      const deleteResult = await client.query(
        "DELETE FROM users WHERE id = $1",
        [id],
      );

      if (deleteResult.rowCount === 0) {
        throw new Error("Usuário não encontrado");
      }

      return deleteResult;
    });

    await invalidatePlayerCache(id);
    await refreshUserRankingCaches();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    if (error.message === "Usuário não encontrado") {
      return res.status(404).json({ error: error.message });
    }

    console.error("❌ Erro ao deletar usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// GET /api/users
// =========================
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      faction,
      search,
      sort = "created_at",
      order = "desc",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const validSorts = ["created_at", "username", "level", "experience_points"];
    const validOrders = ["asc", "desc"];

    const sortField = validSorts.includes(sort) ? sort : "created_at";
    const sortOrder = validOrders.includes(order) ? order : "desc";

    let whereClause = "WHERE u.is_email_confirmed = true";
    const queryParams = [];
    let paramCount = 1;

    if (faction) {
      whereClause += ` AND p.faction = $${paramCount++}`;
      queryParams.push(faction);
    }

    if (search) {
      whereClause += ` AND (COALESCE(p.username, u.username) ILIKE $${paramCount++} OR p.display_name ILIKE $${paramCount++})`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const orderBy =
      sortField === "created_at"
        ? "u.created_at"
        : sortField === "username"
          ? "COALESCE(p.username, u.username)"
          : `p.${sortField}`;

    const usersResult = await query(
      `
      SELECT 
        u.id,
        COALESCE(p.username, u.username) AS username,
        u.created_at,
        p.display_name,
        p.avatar_url,
        p.level,
        p.experience_points,
        p.faction
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
      ORDER BY ${orderBy} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
      `,
      [...queryParams, limitNum, offset],
    );

    const countResult = await query(
      `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
      `,
      queryParams,
    );

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      users: usersResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao listar usuários:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// GET /api/users/leaderboard
// =========================
router.get("/leaderboard", async (req, res) => {
  req.url = "/rankings";
  return router.handle(req, res);
});

// =========================
// Action Points
// =========================
router.get("/action-points", authenticateToken, async (req, res) => {
  try {
    const actionPoints = await ActionPointsService.getCurrentActionPoints(
      req.user.id,
    );

    res.json({
      action_points: actionPoints,
      max_points: 20000,
      reset_info: "Pontos resetam diariamente às 00:00",
    });
  } catch (error) {
    console.error("❌ Erro ao obter pontos de ação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/action-points/consume", authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Quantidade inválida" });
    }

    const result = await ActionPointsService.consumeActionPoints(
      req.user.id,
      amount,
    );

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        remaining: result.remaining,
      });
    }

    res.json({
      success: true,
      consumed: amount,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error("❌ Erro ao consumir pontos de ação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/action-points/reset", authenticateToken, async (req, res) => {
  try {
    const success = await ActionPointsService.resetActionPoints(req.user.id);

    if (success) {
      return res.json({
        message: "Pontos de ação resetados com sucesso",
        action_points: 20000,
      });
    }

    res.status(500).json({ error: "Erro ao resetar pontos de ação" });
  } catch (error) {
    console.error("❌ Erro ao resetar pontos de ação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = {
  router,
};