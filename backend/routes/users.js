const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const { query, transaction } = require("../config/database");
const { authenticateToken, requireOwnership } = require("../middleware/auth");
const ActionPointsService = require("../services/actionPointsService");

const router = express.Router();

const sseClients = new Set();
function broadcastRankingsUpdate(payload) {
  const data = JSON.stringify(payload || {});
  sseClients.forEach((res) => {
    try {
      res.write(`event: rankings\n`);
      res.write(`data: ${data}\n\n`);
    } catch (e) {
      void e;
    }
  });
}
// Cache simples para rankings (TTL 10 minutos)
const RANKINGS_CACHE_TTL_MS = 10 * 60 * 1000;
const rankingsCache = new Map();
function getCacheKey(params) {
  const faction = params?.faction || "all";
  const limit = params?.limit || 26;
  return `${faction}:${limit}`;
}
function getCachedRankings(params) {
  const key = getCacheKey(params);
  const entry = rankingsCache.get(key);
  if (entry && Date.now() - entry.timestamp < RANKINGS_CACHE_TTL_MS) {
    return entry;
  }
  return null;
}
function computeETag(data) {
  const h = crypto.createHash("sha1");
  h.update(JSON.stringify(data));
  return `W/"${h.digest("hex")}"`;
}
function setCachedRankings(params, data) {
  const key = getCacheKey(params);
  const etag = computeETag(data);
  rankingsCache.set(key, { data, etag, timestamp: Date.now() });
}
async function refreshRankingsCache(faction, limit) {
  let whereClause = "WHERE u.is_email_confirmed = true AND p.id IS NOT NULL";
  const queryParams = [];
  if (faction) {
    whereClause += " AND p.faction = $1";
    queryParams.push(faction);
  }
  const leaderboardResult = await query(
    `
    SELECT 
      u.id, u.username, u.country,
      p.username as display_name, p.avatar_url, p.level, 
      p.experience_points, p.faction, p.victories, p.defeats, p.winning_streak,
      ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    ${whereClause}
    ORDER BY p.level DESC, p.experience_points DESC
    LIMIT $${queryParams.length + 1}
  `,
    [...queryParams, limit],
  );
  setCachedRankings({ faction, limit }, leaderboardResult.rows);
  broadcastRankingsUpdate({ faction, limit });
}
function scheduleUsersRefresh() {
  query("SELECT NOW() as now")
    .then((result) => {
      const now = new Date(result.rows[0].now);
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const milliseconds = now.getMilliseconds();
      const minutesToNextInterval = 10 - (minutes % 10);
      const delay =
        (minutesToNextInterval * 60 - seconds) * 1000 - milliseconds;
      setTimeout(
        async () => {
          try {
            await refreshRankingsCache("gangsters", 26);
            await refreshRankingsCache("guardas", 26);
            await refreshRankingsCache(undefined, 26);
          } catch (e) {
            void e;
          } finally {
            scheduleUsersRefresh();
          }
        },
        Math.max(0, delay),
      );
    })
    .catch(() => {
      setTimeout(async () => {
        try {
          await refreshRankingsCache("gangsters", 26);
          await refreshRankingsCache("guardas", 26);
          await refreshRankingsCache(undefined, 26);
        } catch (e) {
          void e;
        } finally {
          scheduleUsersRefresh();
        }
      }, RANKINGS_CACHE_TTL_MS);
    });
}
scheduleUsersRefresh();

router.get("/rankings/subscribe", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders && res.flushHeaders();
  res.write("\n");
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});
// Validações
const updateProfileValidation = [
  body("username")
    .optional()
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username deve ter 3-20 caracteres e conter apenas letras, números e underscore",
    ),
  body("bio")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Bio deve ter no máximo 500 caracteres"),
  body("faction")
    .optional()
    .isIn(["gangsters", "guardas"])
    .withMessage("Facção deve ser: gangsters ou guardas"),
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

// GET /api/users/profile - Obter perfil do usuário logado
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    // Buscar perfil do usuário com JOIN para pegar username da tabela users
    const profileResult = await query(
      `
      SELECT 
        p.*,
        u.username,
        u.is_admin
      FROM user_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `,
      [req.user.id],
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "Perfil não encontrado" });
    }

    // Verificar se o usuário é membro de algum clã
    const clanResult = await query(
      `
      SELECT clan_id FROM clan_members WHERE user_id = $1
    `,
      [req.user.id],
    );

    // Converter campos numéricos que vêm como string do PostgreSQL
    const profile = profileResult.rows[0];
    const clanMembership = clanResult.rows[0];
    const convertedProfile = {
      ...profile,
      username: profile.username, // Username vem da tabela users
      is_admin: profile.is_admin, // Adicionar is_admin
      clan_id: clanMembership ? clanMembership.clan_id : null, // ID do clã se for membro
      attack: Number(profile.attack),
      defense: Number(profile.defense),
      focus: Number(profile.focus),
      critical_damage: Number(profile.critical_damage),
      critical_chance: Number(profile.critical_chance),
      intimidation: Number(profile.intimidation),
      discipline: Number(profile.discipline),
      level: Number(profile.level),
      energy: Number(profile.energy),
      current_xp: Number(profile.current_xp),
      xp_required: Number(profile.xp_required),
      action_points: Number(profile.action_points),
      money: Number(profile.money),
      money_daily_gain: Number(profile.money_daily_gain || 0),
      victories: Number(profile.victories),
      defeats: Number(profile.defeats),
      winning_streak: Number(profile.winning_streak),
    };

    res.json(convertedProfile);
  } catch (error) {
    console.error("❌ Erro ao buscar perfil do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Função para calcular stats baseados na facção
function getFactionStats(faction) {
  const baseStats = {
    level: 1,
    energy: 100,
    current_xp: 0,
    xp_required: 100,
    action_points: 20000, // 20.000 pontos de ação diários não cumulativos
    money: 1000,
    money_daily_gain: 0, // Ganhos diários começam com 0 para todas as facções
    victories: 0,
    defeats: 0,
    winning_streak: 0,
  };

  if (faction === "gangsters") {
    const focus = 5;
    const attack = 8;
    return {
      ...baseStats,
      attack: attack,
      defense: 3,
      focus: focus,
      intimidation: 35.0, // -35% defesa inimiga (valor positivo para cálculo)
      discipline: 0.0,
      critical_chance: focus * 2, // foco * 2 = % (5*2 = 10%)
      critical_damage: attack + focus / 2, // Ataque + (Foco ÷ 2) = 8 + (5/2) = 10.5
    };
  } else if (faction === "guardas") {
    const focus = 6;
    const attack = 5;
    return {
      ...baseStats,
      attack: attack,
      defense: 6,
      focus: focus,
      intimidation: 0.0,
      discipline: 40.0, // -40% dano recebido (valor positivo para cálculo)
      critical_chance: focus * 2, // foco * 2 = % (6*2 = 12%)
      critical_damage: attack + focus / 2, // Ataque + (Foco ÷ 2) = 5 + (6/2) = 8.0
    };
  }

  // Valores padrão se facção não especificada
  return {
    ...baseStats,
    attack: 0,
    defense: 0,
    focus: 0,
    intimidation: 0.0,
    discipline: 0.0,
    critical_chance: 0.0,
    critical_damage: 150.0,
  };
}

// POST /api/users/profile - Criar perfil do usuário
router.post("/profile", authenticateToken, async (req, res) => {
  try {
    const { faction } = req.body; // username não é mais necessário pois vem da tabela users

    // Validar facção
    if (faction !== "gangsters" && faction !== "guardas") {
      return res
        .status(400)
        .json({ error: "Facção deve ser: gangsters ou guardas" });
    }

    // Verificar se o perfil já existe
    const existingProfile = await query(
      "SELECT id FROM user_profiles WHERE user_id = $1",
      [req.user.id],
    );

    if (existingProfile.rows.length > 0) {
      return res.status(409).json({ error: "Perfil já existe" });
    }

    // Obter stats baseados na facção
    const factionStats = getFactionStats(faction);

    console.log(`🎯 Criando perfil para facção: ${faction}`, factionStats);

    // Criar novo perfil com stats da facção (username vem da tabela users)
    // Obter o username da tabela users, que já foi autenticado
    const userData = await query("SELECT username FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const username = userData.rows[0]?.username;

    if (!username) {
      return res
        .status(404)
        .json({ error: "Usuário não encontrado para obter o username" });
    }

    const result = await query(
      `
      INSERT INTO user_profiles (
        user_id, username, faction, level, experience_points,
        energy, current_xp, xp_required, action_points,
        attack, defense, focus, intimidation, discipline,
        critical_chance, critical_damage, money, money_daily_gain, victories, defeats, winning_streak,
        action_points_reset_time
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, CURRENT_TIMESTAMP)
      RETURNING *
    `,
      [
        req.user.id,
        username, // Adicionado o username
        faction,
        factionStats.level,
        factionStats.current_xp, // experience_points
        factionStats.energy,
        factionStats.current_xp,
        factionStats.xp_required,
        factionStats.action_points,
        factionStats.attack,
        factionStats.defense,
        factionStats.focus,
        factionStats.intimidation,
        factionStats.discipline,
        factionStats.critical_chance,
        factionStats.critical_damage,
        factionStats.money,
        factionStats.money_daily_gain,
        factionStats.victories,
        factionStats.defeats,
        factionStats.winning_streak,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // 23505 é o código de erro do PostgreSQL para violação de constraint única (unique_violation)
    if (error.code === "23505") {
      console.log(
        `⚠️ Perfil já existente detectado via constraint para o usuário ${req.user.id}`,
      );
      return res.status(409).json({ error: "Perfil já existe" });
    }

    console.error("❌ Erro ao criar perfil do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /api/users/profile - Atualizar perfil do usuário logado
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

      // Construir query de atualização dinamicamente
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      const allowedFields = [
        "faction",
        "bio",
        "avatar_url",
        "level",
        "experience_points",
        "health",
        "energy",
        "action_points",
        "money",
        "victories",
        "defeats",
        "winning_streak",
      ]; // username removido - vem da tabela users

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
      RETURNING *
    `,
        updateValues,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Perfil não encontrado" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil do usuário:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// GET /api/users/rankings - Ranking de usuários (alias para leaderboard)
router.get("/rankings", async (req, res) => {
  try {
    const { faction, limit = 26 } = req.query;

    // Tenta usar cache
    const cached = getCachedRankings({ faction, limit });
    if (cached) {
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch && ifNoneMatch === cached.etag) {
        res.set("Cache-Control", "public, max-age=600");
        res.set("ETag", cached.etag);
        return res.status(304).end();
      }
      res.set("Cache-Control", "public, max-age=600");
      res.set("ETag", cached.etag);
      return res.json({ leaderboard: cached.data });
    }

    let whereClause = "WHERE u.is_email_confirmed = true AND p.id IS NOT NULL";
    const queryParams = [];

    if (faction) {
      whereClause += " AND p.faction = $1";
      queryParams.push(faction);
    }

    const leaderboardResult = await query(
      `
      SELECT 
        u.id, u.username, u.country,
        p.username as display_name, p.avatar_url, p.level, 
        p.experience_points, p.faction, p.victories, p.defeats, p.winning_streak,
        ROW_NUMBER() OVER (ORDER BY p.level DESC, p.experience_points DESC) as rank
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.level DESC, p.experience_points DESC
      LIMIT $${queryParams.length + 1}
    `,
      [...queryParams, limit],
    );

    console.log(
      "✅ [RANKINGS] Retornando",
      leaderboardResult.rows.length,
      "resultados",
    );
    console.log(
      "✅ [RANKINGS] Primeiro resultado com country:",
      leaderboardResult.rows[0]?.country,
    );

    setCachedRankings({ faction, limit }, leaderboardResult.rows);
    const entry = getCachedRankings({ faction, limit });
    res.set("Cache-Control", "public, max-age=600");
    res.set("ETag", entry?.etag || computeETag(leaderboardResult.rows));
    res.json({ leaderboard: leaderboardResult.rows });
  } catch (error) {
    console.error("❌ [RANKINGS] Erro:", error.message);
    res.status(500).json({
      error: "Erro interno do servidor",
    });
  }
});

// GET /api/users/:id - Obter perfil de usuário
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar usuário e perfil
    const userResult = await query(
      `
      SELECT 
        u.id, u.username, u.created_at, u.birth_date, u.country,
        p.avatar_url, p.bio, p.level, 
        p.experience_points, p.faction, p.created_at as profile_created_at
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1 AND u.is_email_confirmed = true
    `,
      [id],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = userResult.rows[0];

    // Buscar estatísticas do usuário
    const statsResult = await query(
      `
      SELECT 
        COUNT(cm.id) as clans_joined,
        COUNT(CASE WHEN cm.role = 'leader' THEN 1 END) as clans_led
      FROM clan_members cm
      WHERE cm.user_id = $1
    `,
      [id],
    );

    const stats = statsResult.rows[0] || { clans_joined: 0, clans_led: 0 };

    res.json({
      user: {
        id: user.id,
        username: user.username, // username vem da tabela users
        birth_date: user.birth_date,
        country: user.country,
        avatar_url: user.avatar_url,
        bio: user.bio,
        level: user.level || 1,
        experience_points: user.experience_points || 0,
        faction: user.faction,
        created_at: user.created_at,
        stats: {
          clans_joined: parseInt(stats.clans_joined),
          clans_led: parseInt(stats.clans_led),
        },
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /api/users/:id/profile - Atualizar perfil do usuário
router.put(
  "/:id/profile",
  authenticateToken,
  requireOwnership("id"),
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

      const { id } = req.params;
      const { username, bio, faction, avatar_url } = req.body;

      // Verificar se o perfil existe
      const profileExists = await query(
        "SELECT id FROM user_profiles WHERE user_id = $1",
        [id],
      );

      let result;
      if (profileExists.rows.length === 0) {
        // Criar perfil se não existir com valores corretos baseados na facção
        let stats = {};
        if (faction === "gangsters") {
          stats = {
            attack: 8,
            defense: 3,
            focus: 5,
            critical_damage: 10.5,
            critical_chance: 10,
            intimidation: 35.0,
            discipline: 0.0,
          };
        } else if (faction === "guardas") {
          stats = {
            attack: 5,
            defense: 6,
            focus: 6,
            critical_damage: 8.0,
            critical_chance: 12,
            intimidation: 0.0,
            discipline: 40.0,
          };
        } else {
          // Se a facção não for válida, retornar erro
          return res
            .status(400)
            .json({ error: "Facção deve ser: gangsters ou guardas" });
        }

        result = await query(
          `
        INSERT INTO user_profiles (
          user_id, username, bio, faction, avatar_url,
          attack, defense, focus, critical_damage, critical_chance, intimidation, discipline
        )
        SELECT $1, u.username, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        FROM users u
        WHERE u.id = $1
        RETURNING *
      `,
          [
            id,
            bio,
            faction,
            avatar_url,
            stats.attack,
            stats.defense,
            stats.focus,
            stats.critical_damage,
            stats.critical_chance,
            stats.intimidation,
            stats.discipline,
          ],
        );
      } else {
        // Atualizar perfil existente
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        if (username !== undefined) {
          updateFields.push(`username = ${paramCount++}`);
          updateValues.push(username);
        }
        if (bio !== undefined) {
          updateFields.push(`bio = $${paramCount++}`);
          updateValues.push(bio);
        }
        if (faction !== undefined) {
          updateFields.push(`faction = $${paramCount++}`);
          updateValues.push(faction);

          // Atualizar stats baseados na nova facção
          let stats = {};
          if (faction === "gangsters") {
            stats = {
              attack: 8,
              defense: 3,
              focus: 5,
              critical_damage: 10.5,
              critical_chance: 10,
              intimidation: 35.0,
              discipline: 0.0,
            };
          } else if (faction === "guardas") {
            stats = {
              attack: 5,
              defense: 6,
              focus: 6,
              critical_damage: 8.0,
              critical_chance: 12,
              intimidation: 0.0,
              discipline: 40.0,
            };
          } else {
            stats = {
              attack: 5,
              defense: 5,
              focus: 5,
              critical_damage: 8.0,
              critical_chance: 10,
              intimidation: 0.0,
              discipline: 0.0,
            };
          }

          updateFields.push(`attack = $${paramCount++}`);
          updateValues.push(stats.attack);
          updateFields.push(`defense = $${paramCount++}`);
          updateValues.push(stats.defense);
          updateFields.push(`focus = $${paramCount++}`);
          updateValues.push(stats.focus);
          updateFields.push(`critical_damage = $${paramCount++}`);
          updateValues.push(stats.critical_damage);
          updateFields.push(`critical_chance = $${paramCount++}`);
          updateValues.push(stats.critical_chance);
          updateFields.push(`intimidation = $${paramCount++}`);
          updateValues.push(stats.intimidation);
          updateFields.push(`discipline = $${paramCount++}`);
          updateValues.push(stats.discipline);
        }
        if (avatar_url !== undefined) {
          updateFields.push(`avatar_url = $${paramCount++}`);
          updateValues.push(avatar_url);
        }

        if (updateFields.length === 0) {
          return res.status(400).json({ error: "Nenhum campo para atualizar" });
        }

        updateValues.push(id);

        result = await query(
          `
        UPDATE user_profiles 
        SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $${paramCount}
        RETURNING *
      `,
          updateValues,
        );
      }

      res.json({
        message: "Perfil atualizado com sucesso",
        profile: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar perfil:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// PUT /api/users/:id/password - Alterar senha
router.put(
  "/:id/password",
  authenticateToken,
  requireOwnership("id"),
  changePasswordValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Dados inválidos",
          details: errors.array(),
        });
      }

      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Buscar senha atual
      const userResult = await query(
        "SELECT password_hash FROM users WHERE id = $1",
        [id],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userResult.rows[0];

      // Verificar senha atual
      const passwordValid = await bcrypt.compare(
        currentPassword,
        user.password_hash,
      );
      if (!passwordValid) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }

      // Hash da nova senha
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

      // Atualizar senha
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

// GET /api/users/:id/clans - Obter clãs do usuário
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

    res.json({
      clans: clansResult.rows,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar clãs do usuário:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// DELETE /api/users/:id - Deletar conta do usuário
router.delete(
  "/:id",
  authenticateToken,
  requireOwnership("id"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await transaction(async (client) => {
        // Verificar se o usuário é membro de um clã
        const clanMemberResult = await client.query(
          "SELECT clan_id FROM clan_members WHERE user_id = $1",
          [id],
        );

        // Se for membro, decrementar a contagem no clã
        if (clanMemberResult.rows.length > 0) {
          const { clan_id } = clanMemberResult.rows[0];
          await client.query(
            "UPDATE clans SET member_count = member_count - 1 WHERE id = $1",
            [clan_id],
          );
        }

        // Deletar o usuário (ON DELETE CASCADE cuidará das tabelas relacionadas)
        const deleteResult = await client.query(
          "DELETE FROM users WHERE id = $1",
          [id],
        );
        return deleteResult;
      });

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("❌ Erro ao deletar usuário:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// GET /api/users - Listar usuários (com paginação e filtros)
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

    const offset = (page - 1) * limit;
    const validSorts = ["created_at", "username", "level", "experience_points"];
    const validOrders = ["asc", "desc"];

    const sortField = validSorts.includes(sort) ? sort : "created_at";
    const sortOrder = validOrders.includes(order) ? order : "desc";

    // Construir query com filtros
    let whereClause = "WHERE u.is_email_confirmed = true";
    const queryParams = [];
    let paramCount = 1;

    if (faction) {
      whereClause += ` AND p.faction = $${paramCount++}`;
      queryParams.push(faction);
    }

    if (search) {
      whereClause += ` AND (u.username ILIKE $${paramCount++} OR p.display_name ILIKE $${paramCount++})`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    // Query principal
    const usersResult = await query(
      `
      SELECT 
        u.id, u.username, u.created_at,
        p.display_name, p.avatar_url, p.level, 
        p.experience_points, p.faction
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
      ORDER BY ${
        sortField === "created_at" ? "u.created_at" : "p." + sortField
      } ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `,
      [...queryParams, limit, offset],
    );

    // Query para contar total
    const countResult = await query(
      `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
    `,
      queryParams,
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      users: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao listar usuários:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/users/leaderboard - Ranking de usuários
router.get("/leaderboard", async (req, res) => {
  try {
    const { faction, limit = 50 } = req.query;

    let whereClause = "WHERE u.is_email_confirmed = true";
    const queryParams = [];

    if (faction) {
      whereClause += " AND p.faction = $1";
      queryParams.push(faction);
    }

    const leaderboardResult = await query(
      `
      SELECT 
        u.id, u.username,
        p.display_name, p.avatar_url, p.level, 
        p.experience_points, p.faction,
        ROW_NUMBER() OVER (ORDER BY p.experience_points DESC, p.level DESC) as rank
      FROM users u
      INNER JOIN user_profiles p ON u.id = p.user_id
      ${whereClause}
      ORDER BY p.experience_points DESC, p.level DESC
      LIMIT $${queryParams.length + 1}
    `,
      [...queryParams, limit],
    );

    res.json({
      leaderboard: leaderboardResult.rows,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar leaderboard:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/users/action-points - Obter pontos de ação atuais
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

// POST /api/users/action-points/consume - Consumir pontos de ação
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

// POST /api/users/action-points/reset - Reset manual (apenas para desenvolvimento)
router.post("/action-points/reset", authenticateToken, async (req, res) => {
  try {
    const success = await ActionPointsService.resetActionPoints(req.user.id);

    if (success) {
      res.json({
        message: "Pontos de ação resetados com sucesso",
        action_points: 20000,
      });
    } else {
      res.status(500).json({ error: "Erro ao resetar pontos de ação" });
    }
  } catch (error) {
    console.error("❌ Erro ao resetar pontos de ação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = router;
