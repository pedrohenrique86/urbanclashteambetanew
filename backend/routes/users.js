const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { query, transaction } = require("../config/database");
const { authenticateToken, requireOperational } = require("../middleware/auth");
const ActionPointsService = require("../services/actionPointsService");
const redisClient = require("../config/redisClient");
const { getGameState } = require("../services/gameStateService");
const sseService = require("../services/sseService");
const rankingCacheService = require("../services/rankingCacheService");
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
  if (
    birthDate === undefined ||
    birthDate === null ||
    birthDate === "" ||
    birthDate === "Invalid Date" ||
    birthDate === "null" ||
    birthDate === "undefined"
  ) {
    return null;
  }
  // Se for uma data ISO completa, pega apenas a parte da data
  if (typeof birthDate === 'string' && birthDate.includes('T')) {
     return birthDate.split('T')[0];
  }
  return birthDate;
}

async function invalidatePlayerCache(userId) {
  const cacheKey = `playerState:${userId}`;
  try {
    await redisClient.delAsync(cacheKey);
  } catch (_) { }
}

async function refreshUserRankingCaches() {
  try {
    await Promise.allSettled([
      rankingCacheService.triggerRefresh("users", "renegados"),
      rankingCacheService.triggerRefresh("users", "guardioes"),
      rankingCacheService.triggerRefresh("users", "gangsters"),
      rankingCacheService.triggerRefresh("users", "guardas"),
      rankingCacheService.triggerRefresh("users", "all"),
    ]);
  } catch (_) { }
}

/**
 * Converte qualquer valor de facção (legado ou novo) para o nome canônico
 * e retorna { canonicalName, factionId } consultando a tabela factions.
 * Suporta: gangsters, guardas (legado) e renegados, guardioes (novo).
 */
const FACTION_ALIAS_MAP = {
  gangsters:  "renegados",
  gangster:   "renegados",
  renegados:  "renegados",
  renegado:   "renegados",
  guardas:    "guardioes",
  guarda:     "guardioes",
  guardioes:  "guardioes",
  guardiao:   "guardioes",
  "guardiões": "guardioes",
  "guardião":  "guardioes",
};

async function resolveFaction(factionInput, clientOrQuery) {
  const canonical = FACTION_ALIAS_MAP[String(factionInput).toLowerCase().trim()];
  if (!canonical) {
    throw new Error(`Facção inválida: "${factionInput}". Use: renegados ou guardioes.`);
  }

  const fn = clientOrQuery?.query ? (sql, p) => clientOrQuery.query(sql, p) : query;
  const result = await fn("SELECT id FROM factions WHERE name = $1", [canonical]);

  if (result.rows.length === 0) {
    throw new Error(`Facção "${canonical}" não encontrada na tabela factions. Execute a Migration A.`);
  }

  return { canonicalName: canonical, factionId: result.rows[0].id };
}

// =========================
// SSE Ranking
// =========================
router.get("/rankings/subscribe", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("\n");

  sseService.subscribe(res, "ranking");

  res.write(
    `event: connection_established\ndata: ${JSON.stringify({
      message: "Conectado ao ranking em tempo real.",
    })}\n\n`,
  );

  req.on("close", () => {
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

  res.set({
    "Content-Type" : "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection"   : "keep-alive",
    "X-Accel-Buffering": "no",   // Desabilita buffering em nginx/proxies
  });
  if (res.flushHeaders) res.flushHeaders();
  res.write("\n");

  sseService.subscribe(res, topic);

  // Confirmação de conexão
  res.write(
    `event: player:connected\ndata: ${JSON.stringify({
      message: "Canal privado conectado.",
    })}\n\n`,
  );

  // Keep-alive: envia comentário SSE a cada 25s para evitar timeout
  // de proxies/load balancers (padrão é 30–60s)
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch (_) {
      clearInterval(pingInterval);
    }
  }, 25_000);

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
  const canonical = FACTION_ALIAS_MAP[String(faction).toLowerCase().trim()];

  if (canonical === "renegados") {
    return {
      ...baseStats,
      attack          : 8,
      defense         : 3,
      focus           : 5,
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
    const playerStateService = require("../services/playerStateService");
    const profile = await playerStateService.getPlayerState(req.user.id);

    if (!profile) {
      return res.status(200).json(null);
    }

    // Se o profile veio do Redis, os campos numéricos podem estar como strings.
    // Garantimos a conversão para manter a compatibilidade com o frontend.
    // XP e XP requerido agora são calculados dinamicamente baseado no total_xp e level.
    const level    = parseInt(profile.level, 10) || 1;
    const total_xp = parseInt(profile.total_xp || 0, 10);
    const xpStatus = gameLogic.deriveXpStatus(total_xp, level);

    const convertedProfile = {
      ...profile,
      id: profile.user_id || profile.id, // Normalização de ID
      username: profile.username || profile.display_name,
      is_admin: profile.is_admin === "1" || profile.is_admin === true || profile.is_admin === "true",
      attack: parseFloat(profile.attack) || 0,
      defense: parseFloat(profile.defense) || 0,
      focus: parseFloat(profile.focus) || 0,
      critical_damage: parseFloat(profile.critical_damage) || 0,
      critical_chance: parseFloat(profile.critical_chance) || 0,
      intimidation: parseFloat(profile.intimidation) || 0,
      discipline: parseFloat(profile.discipline) || 0,
      level,
      energy: parseInt(profile.energy, 10) || 0,
      total_xp,
      current_xp: xpStatus.currentXp,
      xp_required: xpStatus.xpRequired,
      action_points: parseInt(profile.action_points, 10) || 0,
      money: parseInt(profile.money, 10) || 0,
      victories: parseInt(profile.victories, 10) || 0,
      defeats: parseInt(profile.defeats, 10) || 0,
      winning_streak: parseInt(profile.winning_streak, 10) || 0,
      // SÊNIOR: Valores DERIVADOS calculados em tempo real — nunca persistidos
      // Estes são os valores REAIS que o combate usa
      crit_chance_pct : gameLogic.calcCritChance(profile),
      crit_damage_mult: gameLogic.calcCritDamageMultiplier(profile),
    };

    const gameState = await getGameState();
    res.json({ ...convertedProfile, gameState });
  } catch (error) {
    console.error("❌ Erro ao buscar perfil do usuário (Redis):", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// POST /api/users/profile
// =========================
router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const { faction } = req.body;

    if (!faction || !FACTION_ALIAS_MAP[String(faction).toLowerCase().trim()]) {
      return res
        .status(400)
        .json({ error: "Facção deve ser: renegados ou guardioes (ou gangsters/guardas)" });
    }

    const existingProfile = await query(
      "SELECT id FROM user_profiles WHERE user_id = $1",
      [req.user.id],
    );

    if (existingProfile.rows.length > 0) {
      return res.status(409).json({ error: "Perfil já existe" });
    }

    const userData = await query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [req.user.id],
    );
    const user = userData.rows[0];

    if (!user) {
      return res
        .status(404)
        .json({ error: "Usuário não encontrado para criação de perfil" });
    }

    // Resolve o faction_id obrigatório via tabela factions
    const { canonicalName, factionId } = await resolveFaction(faction);
    const factionStats = getFactionStats(canonicalName);

    const usernameToInsert = buildSafeUsername({
      requestedUsername: null,
      userId: user.id,
      userFromDb: user,
    });

    const result = await query(
      `
      INSERT INTO user_profiles (
        user_id,
        username,
        display_name,
        faction,
        faction_id,
        level,
        total_xp,
        energy,
        action_points,
        attack,
        defense,
        focus,
        intimidation,
        discipline,
        critical_chance,
        critical_damage,
        money,
        victories,
        defeats,
        winning_streak,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21
      )
      `,
      [
        user.id,
        usernameToInsert,
        usernameToInsert,
        canonicalName,
        factionId,
        factionStats.level,
        factionStats.total_xp,
        factionStats.energy,
        factionStats.action_points,
        factionStats.attack,
        factionStats.defense,
        factionStats.focus,
        factionStats.intimidation,
        factionStats.discipline,
        factionStats.critical_chance,
        factionStats.critical_damage,
        factionStats.money,
        factionStats.victories,
        factionStats.defeats,
        factionStats.winning_streak,
        factionStats.status,
      ],
    );

    const insertedProfile = await query(`SELECT * FROM user_profiles WHERE user_id = $1`, [user.id]);

    await invalidatePlayerCache(user.id);
    await refreshUserRankingCaches();

    res.status(201).json(insertedProfile.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Perfil já existe ou username em uso" });
    }

    console.error("❌ Erro ao criar perfil do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// PUT /api/users/profile
// =========================
router.put(
  "/profile",
  authenticateToken,
  updateProfileValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: errors.array(),
        });
      }

      const updateData = req.body;
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      const allowedFields = [
        "faction",
        "bio",
        "avatar_url",
        "level",
        "total_xp",
        "energy",
        "action_points",
        "money",
        "victories",
        "defeats",
        "winning_streak",
      ];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = $${paramCount++}`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        return res
          .status(400)
          .json({ error: "Nenhum campo válido para atualizar" });
      }

      updateValues.push(req.user.id);

      const result = await query(
        `
        UPDATE user_profiles
        SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramCount}
        `,
        updateValues,
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Perfil não encontrado" });
      }

      const updatedProfile = await query(`SELECT * FROM user_profiles WHERE user_id = $1`, [req.user.id]);

      await invalidatePlayerCache(req.user.id);
      await refreshUserRankingCaches();

      res.json(updatedProfile.rows[0]);
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil do usuário:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

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
    const { id } = req.params;
    const playerStateService = require("../services/playerStateService");

    const player = await playerStateService.getPlayerState(id);

    if (!player) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    let birthDate = null;
    if (player.birth_date) {
      try {
        if (typeof player.birth_date === "string") {
          birthDate = player.birth_date.split("T")[0];
          // Validação básica de formato YYYY-MM-DD
          if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
             const d = new Date(player.birth_date);
             birthDate = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
          }
        } else {
          const d = new Date(player.birth_date);
          birthDate = !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : null;
        }
      } catch (e) {
        console.warn(`[USER_PROFILE] Data de nascimento inválida para user ${id}:`, player.birth_date);
        birthDate = null;
      }
    }

    res.json({
      user: {
        id: player.user_id,
        username: player.username,
        display_name: player.display_name,
        country: player.country,
        avatar_url: player.avatar_url,
        bio: player.bio,
        level: parseInt(player.level, 10) || 1,
        faction: player.faction,
        victories: parseInt(player.victories, 10) || 0,
        defeats: parseInt(player.defeats, 10) || 0,
        winning_streak: parseInt(player.winning_streak, 10) || 0,
        created_at: player.account_created_at,
        birth_date: birthDate,
        clan_name: player.clan_name || null,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar perfil (Redis):", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// =========================
// PUT /api/users/:id/profile
// =========================
router.put(
  "/:id/profile",
  authenticateToken,
  updateProfileValidation,
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

      const { username, bio, faction, avatar_url, birth_date } = req.body;

      const sanitizedBirthDate = sanitizeBirthDate(birth_date);

      const updatedProfile = await transaction(async (client) => {
        const userResult = await client.query(
          "SELECT id, username, email FROM users WHERE id = $1",
          [id],
        );
        const user = userResult.rows[0];

        if (!user) {
          throw new Error("Usuário não encontrado");
        }

        if (birth_date !== undefined) {
          await client.query(
            "UPDATE users SET birth_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [sanitizedBirthDate, id],
          );
        }

        if (username !== undefined) {
          await client.query(
            "UPDATE users SET username = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [username, id],
          );
        }

        const profileResult = await client.query(
          "SELECT * FROM user_profiles WHERE user_id = $1",
          [id],
        );
        const profileExists = profileResult.rows.length > 0;

        if (!profileExists) {
          const usernameToInsert = buildSafeUsername({
            requestedUsername: username,
            userId: id,
            userFromDb: user,
          });

          const rawFaction = faction || "renegados";
          const { canonicalName: insertCanonical, factionId: insertFactionId } =
            await resolveFaction(rawFaction, client);
          const stats = getFactionStats(insertCanonical);

          const insertResult = await client.query(
            `
            INSERT INTO user_profiles (
              user_id,
              username,
              display_name,
              bio,
              faction,
              faction_id,
              avatar_url,
              attack,
              defense,
              focus,
              critical_damage,
              critical_chance,
              intimidation,
              discipline
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            )
            `,
            [
              id,
              usernameToInsert,
              usernameToInsert,
              bio || "",
              insertCanonical,    // faction VARCHAR canônico
              insertFactionId,    // faction_id FK obrigatória
              avatar_url || "",
              stats.attack,
              stats.defense,
              stats.focus,
              stats.critical_damage,
              stats.critical_chance,
              stats.intimidation,
              stats.discipline,
            ],
          );

          const insertedResult = await client.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [id]);
          return insertedResult.rows[0];
        }

        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (username !== undefined) {
          updateFields.push(`username = $${paramCount++}`);
          updateFields.push(`display_name = $${paramCount++}`);
          updateValues.push(username);
          updateValues.push(username);
        }

        if (bio !== undefined) {
          updateFields.push(`bio = $${paramCount++}`);
          updateValues.push(String(bio).substring(0, 500));
        }

        if (avatar_url !== undefined) {
          updateFields.push(`avatar_url = $${paramCount++}`);
          updateValues.push(avatar_url);
        }

        if (faction !== undefined) {
          // Resolve faction_id e normaliza o VARCHAR simultaneamente
          const { canonicalName: updCanonical, factionId: updFactionId } =
            await resolveFaction(faction, client);
          updateFields.push(`faction = $${paramCount++}`);
          updateValues.push(updCanonical);
          updateFields.push(`faction_id = $${paramCount++}`);
          updateValues.push(updFactionId);
        }

        if (updateFields.length === 0 && birth_date !== undefined) {
          const current = await client.query(
            "SELECT * FROM user_profiles WHERE user_id = $1",
            [id],
          );
          return current.rows[0];
        }

        if (updateFields.length === 0) {
          throw new Error("Nenhum campo válido para atualizar");
        }

        updateValues.push(id);

        const updateResult = await client.query(
          `
          UPDATE user_profiles
          SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $${paramCount}
          `,
          updateValues,
        );

        const updatedResult = await client.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [id]);
        return updatedResult.rows[0];
      });

      await invalidatePlayerCache(id);
      await refreshUserRankingCaches();

      res.json({
        message: "Perfil atualizado com sucesso",
        profile: updatedProfile,
      });
    } catch (error) {
      if (
        error.code === "23505" &&
        (error.constraint === "users_username_key" ||
          error.constraint === "user_profiles_username_unique" ||
          error.constraint === "user_profiles_username_key")
      ) {
        return res
          .status(409)
          .json({ error: "Este nome de usuário já está em uso." });
      }

      if (error.message === "Usuário não encontrado") {
        return res.status(404).json({ error: error.message });
      }

      if (error.message === "Nenhum campo válido para atualizar") {
        return res.status(400).json({ error: error.message });
      }

      console.error("❌ Erro ao atualizar perfil:", error.message);
      res
        .status(500)
        .json({ error: "Erro interno do servidor", details: error.message });
    }
  },
);

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