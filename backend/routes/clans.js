const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { query, transaction } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const redisClient = require("../config/redisClient");
const { getGameState } = require("../services/gameStateService");

const router = express.Router();

// --- Sistema de Eventos em Tempo Real (SSE) por Clã ---
// Armazena os clientes SSE por ID do clã
const clanEventClients = new Map();

// Função para enviar eventos para todos os clientes de um clã específico
function broadcastToClan(clanId, event, data) {
  const clients = clanEventClients.get(clanId);
  if (!clients) {
    return;
  }

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      // Se houver erro ao escrever (ex: cliente desconectado), removemos o cliente.
      clients.delete(client);
    }
  });
}

// Rota para um cliente se inscrever para receber eventos de um clã
router.get("/:id/events", authenticateToken, (req, res) => {
  const { id: clanId } = req.params;

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  if (!clanEventClients.has(clanId)) {
    clanEventClients.set(clanId, new Set());
  }
  const clients = clanEventClients.get(clanId);
  clients.add(res);

  // Envia um evento de conexão para confirmar que a inscrição foi bem-sucedida
  res.write(
    `event: connection_established\ndata: ${JSON.stringify({ message: "Conectado aos eventos do clã." })}\n\n`,
  );

  req.on("close", () => {
    clients.delete(res);
    if (clients.size === 0) {
      clanEventClients.delete(clanId);
    }
  });
});

const sseService = require("../services/sseService");
const rankingCacheService = require("../services/rankingCacheService");

// Validações
const createClanValidation = [
  body("name")
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage(
      "Nome do clã deve ter 3-50 caracteres e conter apenas letras, números e espaços",
    ),
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Descrição deve ter no máximo 500 caracteres"),
  body("faction")
    .isIn(["gangsters", "guardas"])
    .withMessage("Facção deve ser: gangsters ou guardas"),
  body("max_members")
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage("Máximo de membros deve ser entre 5 e 100"),
];

const updateClanValidation = [
  body("description")
    .optional()
    .isLength({ max: 500 })
    .withMessage("Descrição deve ter no máximo 500 caracteres"),
  body("max_members")
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage("Máximo de membros deve ser entre 5 e 100"),
  body("is_recruiting")
    .optional()
    .isBoolean()
    .withMessage("is_recruiting deve ser true ou false"),
];

// GET /api/clans - Listar clãs
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      faction,
      search,
      recruiting_only = false,
      sort = "created_at",
      order = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const validSorts = ["created_at", "name", "member_count"];
    const validOrders = ["asc", "desc"];

    const sortField = validSorts.includes(sort) ? sort : "created_at";
    const sortOrder = validOrders.includes(order) ? order : "desc";

    // Construir query com filtros
    let whereClause = "WHERE 1=1";
    const queryParams = [];
    let paramCount = 1;

    if (faction) {
      whereClause += ` AND c.faction = $${paramCount++}`;
      queryParams.push(faction);
    }

    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramCount++} OR c.description ILIKE $${paramCount++})`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (recruiting_only === "true") {
      whereClause += ` AND c.is_recruiting = true AND c.member_count < c.max_members`;
    }

    // Query principal
    const clansResult = await query(
      `
      SELECT 
        c.id, c.name, c.description, c.faction, c.member_count, 
        c.max_members, c.is_recruiting, c.created_at
      FROM clans c
      ${whereClause}
      ORDER BY c.${sortField} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `,
      [...queryParams, limit, offset],
    );

    // Query para contar total
    const countResult = await query(
      `
      SELECT COUNT(*) as total
      FROM clans c
      ${whereClause}
    `,
      queryParams,
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      clans: clansResult.rows,
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
    console.error("❌ Erro ao listar clãs:", error.message);
    console.error("❌ Erro ao buscar ranking de clãs:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/clans/by-faction/:faction - Buscar clãs por facção
router.get("/by-faction/:faction", async (req, res) => {
  try {
    const { faction } = req.params;

    // Validar facção
    if (!["gangsters", "guardas"].includes(faction)) {
      return res
        .status(400)
        .json({ error: "Facção inválida. Use: gangsters ou guardas" });
    }

    const clansResult = await query(
      `
      SELECT 
        c.id, c.name, c.description, c.faction, c.member_count, 
        c.max_members, c.is_recruiting, c.created_at
      FROM clans c
      WHERE c.faction = $1
      ORDER BY c.name ASC
    `,
      [faction],
    );

    res.json({
      clans: clansResult.rows,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar clãs por facção:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});



// GET /api/clans/rankings - Ranking de clãs
router.get("/rankings", async (req, res) => {
  try {
    const gameState = await getGameState();

    // Cache centralizado com stale-while-revalidate (SSOT)
    const cached = await rankingCacheService.ensureFreshRanking(
      "clans",
      null
    );

    if (!cached) {
      return res
        .status(503)
        .json({ error: "Ranking de clãs temporariamente indisponível" });
    }

    const ifNoneMatch = req.headers["if-none-match"];
    if (ifNoneMatch && ifNoneMatch === cached.etag) {
      res.set("Cache-Control", "public, max-age=600");
      res.set("ETag", cached.etag);
      return res.status(304).end();
    }

    res.set("Cache-Control", "public, max-age=600");
    res.set("ETag", cached.etag);
    return res.json({ clans: cached.data, gameState });
  } catch (error) {
    console.error("❌ [CLANS RANKINGS] Erro:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// GET /api/clans/:id - Obter detalhes do clã
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar clã
    const clanResult = await query(
      `
      SELECT c.*
      FROM clans c
      WHERE c.id = $1
    `,
      [id],
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: "Clã não encontrado" });
    }

    const clan = clanResult.rows[0];

    // Buscar membros do clã
    const membersResult = await query(
      `
      SELECT 
        cm.role, cm.joined_at,
        u.id as user_id, u.username, u.country,
        u.username as display_name, p.avatar_url, p.level, p.experience_points -- username vem da tabela users
      FROM clan_members cm
      INNER JOIN users u ON cm.user_id = u.id
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE cm.clan_id = $1
      ORDER BY 
        CASE cm.role 
          WHEN 'leader' THEN 1 
          WHEN 'officer' THEN 2 
          ELSE 3 
        END,
        cm.joined_at ASC
    `,
      [id],
    );

    res.json({
      clan: {
        ...clan,
        leader: clan.leader_username
          ? {
              username: clan.leader_username,
              display_name: clan.leader_display_name,
              avatar_url: clan.leader_avatar,
            }
          : null,
        members: membersResult.rows,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar clã:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/clans - Criar novo clã
router.post("/", authenticateToken, createClanValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Dados inválidos",
        details: errors.array(),
      });
    }

    const { name, description, faction, max_members = 50 } = req.body;
    const userId = req.user.id;

    // Verificação de líder removida - funcionalidade não implementada

    // Verificar se o usuário já é membro de algum clã
    const existingMemberResult = await query(
      "SELECT id FROM clan_members WHERE user_id = $1",
      [userId],
    );

    if (existingMemberResult.rows.length > 0) {
      return res.status(400).json({ error: "Você já é membro de um clã" });
    }

    // Verificar se o usuário tem a mesma facção do clã
    const userProfileResult = await query(
      "SELECT faction FROM user_profiles WHERE user_id = $1",
      [userId],
    );

    if (userProfileResult.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "Perfil de usuário não encontrado" });
    }

    const userFaction = userProfileResult.rows[0].faction;
    if (userFaction !== faction) {
      return res
        .status(400)
        .json({ error: "Você só pode entrar em clãs da sua facção" });
    }

    // Verificar se o nome do clã já existe
    const nameExistsResult = await query(
      "SELECT id FROM clans WHERE name = $1",
      [name],
    );

    if (nameExistsResult.rows.length > 0) {
      return res.status(409).json({ error: "Nome do clã já está em uso" });
    }

    // Criar clã e adicionar líder em uma transação
    const result = await transaction(async (client) => {
      const clanResult = await client.query(
        `
        INSERT INTO clans (name, description, faction, max_members, member_count)
        VALUES ($1, $2, $3, $4, 0)
        RETURNING *
      `,
        [name, description, faction, max_members],
      );

      const clan = clanResult.rows[0];

      // Adicionar líder como membro
      await client.query(
        `
        INSERT INTO clan_members (clan_id, user_id, role)
        VALUES ($1, $2, 'leader')
      `,
        [clan.id, userId],
      );

      // Atualizar clan_id no perfil do usuário
      await client.query(
        "UPDATE user_profiles SET clan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [clan.id, userId],
      );

      return clan;
    });

    // Invalida cache do perfil para refletir novo clã
    await redisClient.delAsync(`playerState:${userId}`);

    res.status(201).json({
      message: "Clã criado com sucesso",
      clan: result,
    });
  } catch (error) {
    console.error("❌ Erro ao criar clã:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// PUT /api/clans/:id - Atualizar clã
router.put(
  "/:id",
  authenticateToken,
  updateClanValidation,
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
      const { description, max_members, is_recruiting } = req.body;
      const userId = req.user.id;

      // Verificar se o usuário é líder do clã
      const clanResult = await query("SELECT * FROM clans WHERE id = $1", [id]);

      if (clanResult.rows.length === 0) {
        return res.status(404).json({ error: "Clã não encontrado" });
      }

      const clan = clanResult.rows[0];

      // Verificar se o usuário é líder do clã
      const leaderResult = await query(
        "SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3",
        [id, userId, "leader"],
      );

      if (leaderResult.rows.length === 0) {
        return res
          .status(403)
          .json({ error: "Apenas o líder pode atualizar o clã" });
      }

      // Verificar se max_members não é menor que o número atual de membros
      if (max_members && max_members < clan.member_count) {
        return res.status(400).json({
          error: `Máximo de membros não pode ser menor que o número atual (${clan.member_count})`,
        });
      }

      // Construir query de atualização
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(description);
      }
      if (max_members !== undefined) {
        updateFields.push(`max_members = $${paramCount++}`);
        updateValues.push(max_members);
      }
      if (is_recruiting !== undefined) {
        updateFields.push(`is_recruiting = $${paramCount++}`);
        updateValues.push(is_recruiting);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: "Nenhum campo para atualizar" });
      }

      updateValues.push(id);

      const result = await query(
        `
      UPDATE clans 
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `,
        updateValues,
      );

      res.json({
        message: "Clã atualizado com sucesso",
        clan: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Erro ao atualizar clã:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// POST /api/clans/:id/join - Entrar no clã
router.post("/:id/join", authenticateToken, async (req, res) => {
  const { id: clanId } = req.params;
  const userId = req.user.id;

  console.log(
    `[CLAN_JOIN_ATTEMPT] User ${userId} tentando entrar no clã ${clanId}`,
  );

  try {
    const result = await transaction(async (client) => {
      // Etapa 1: Bloquear e verificar o clã para atualização.
      const clanResult = await client.query(
        "SELECT * FROM clans WHERE id = $1 FOR UPDATE",
        [clanId],
      );

      if (clanResult.rows.length === 0) {
        return { status: 404, error: "Clã não encontrado" };
      }
      const clan = clanResult.rows[0];

      // Etapa 2: Validar regras de negócio (sem bloquear perfil do usuário, pois o ON CONFLICT cuidará disso)
      if (!clan.is_recruiting) {
        return { status: 400, error: "Clã não está recrutando" };
      }
      if (clan.member_count >= clan.max_members) {
        return { status: 400, error: "Clã está cheio" };
      }

      // 3. Tenta inserir o usuário no clã.
      // Primeiro, verificamos se o usuário já faz parte de QUALQUER clã.
      // Usamos a tabela clan_members para essa verificação de integridade.
      const existingMembership = await client.query(
        "SELECT clan_id FROM clan_members WHERE user_id = $1",
        [userId],
      );
      
      if (existingMembership.rows.length > 0) {
        return {
          status: 409,
          error: "Você já faz parte de um clã.",
        };
      }

      // 4. Insere o usuário no novo clã.
      // Nota: Removido 'ON CONFLICT (user_id)' pois a constraint unique faltava no schema, causando Erro 500.
      await client.query(
        "INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'member')",
        [clanId, userId],
      );

      console.log(
        `[JOIN_CLAN_SUCCESS] User ${userId} inserido com sucesso no clã ${clanId}.`,
      );

      // 5. Atualiza o perfil do usuário com o novo clan_id.
      await client.query(
        "UPDATE user_profiles SET clan_id = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
        [clanId, userId],
      );

      return { status: 200, message: "Você entrou no clã com sucesso" };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    // Invalida cache do perfil para refletir novo clã
    await redisClient.delAsync(`playerState:${userId}`);

    console.log(
      `[CLAN_JOIN_SUCCESS] User ${userId} entrou com sucesso no clã ${clanId}`,
    );
    broadcastToClan(clanId, "member_joined", { userId, clanId });
    res.json({ message: result.message });
  } catch (error) {
    console.error(
      `[CLAN_JOIN_ERROR] Erro crítico ao tentar adicionar user ${userId} ao clã ${clanId}:`,
      error,
    );
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/clans/:id/leave - Sair do clã
router.post("/:id/leave", authenticateToken, async (req, res) => {
  const { id: clanId } = req.params;
  const userId = req.user.id;

  console.log(
    `[CLAN_LEAVE_ATTEMPT] User ${userId} tentando sair do clã ${clanId}`,
  );

  try {
    const result = await transaction(async (client) => {
      // 1. Verifica se o usuário é membro do clã especificado.
      const memberResult = await client.query(
        "SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2",
        [userId, clanId],
      );

      if (memberResult.rows.length === 0) {
        return { status: 404, error: "Você não é membro deste clã." };
      }

      const userRole = memberResult.rows[0].role;

      // 2. Regra de negócio: O líder não pode sair do clã.
      if (userRole === "leader") {
        return {
          status: 400,
          error:
            "O líder não pode abandonar o clã. Transfira a liderança primeiro.",
        };
      }

      // 3. Remove o usuário da tabela de membros.
      const deleteResult = await client.query(
        "DELETE FROM clan_members WHERE user_id = $1 AND clan_id = $2",
        [userId, clanId],
      );

      // Se nada foi deletado (verificação extra de segurança)
      if (deleteResult.rowCount === 0) {
        // Isso não deve acontecer devido à verificação inicial, mas é uma boa prática.
        return {
          status: 404,
          error: "Falha ao encontrar o membro para remover.",
        };
      }

      // 4. Limpa o clan_id do perfil do usuário.
      await client.query(
        "UPDATE user_profiles SET clan_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
        [userId],
      );

      return { status: 200, message: "Você saiu do clã com sucesso." };
    });

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    // Invalida cache do perfil para refletir saída do clã
    await redisClient.delAsync(`playerState:${userId}`);

    broadcastToClan(clanId, "member_left", { userId, clanId });
    res.json({ message: result.message });
  } catch (error) {
    console.error("❌ Erro ao sair do clã:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/clans/:id/vote-kick/:targetUserId - Votar para expulsar um membro
router.post(
  "/:id/vote-kick/:targetUserId",
  authenticateToken,
  async (req, res) => {
    try {
      const { id: clanId, targetUserId } = req.params;
      const { id: voterId } = req.user;
      const KICK_VOTE_THRESHOLD = 10;

      if (voterId === targetUserId) {
        return res
          .status(400)
          .json({ error: "Você não pode votar para expulsar a si mesmo." });
      }

      const result = await transaction(async (client) => {
        // Validar se todos os envolvidos pertencem ao clã
        const membersCheck = await client.query(
          `SELECT user_id, role FROM clan_members WHERE clan_id = $1 AND user_id = ANY($2::uuid[])`,
          [clanId, [voterId, targetUserId]],
        );

        const voterInfo = membersCheck.rows.find((m) => m.user_id === voterId);
        const targetInfo = membersCheck.rows.find(
          (m) => m.user_id === targetUserId,
        );

        if (!voterInfo) {
          return {
            status: 403,
            body: { error: "Você não é membro deste clã." },
          };
        }

        if (!targetInfo) {
          return {
            status: 404,
            body: { error: "O membro alvo não foi encontrado neste clã." },
          };
        }

        // Líder não pode ser expulso por votação
        if (targetInfo.role === "leader") {
          return {
            status: 400,
            body: { error: "O líder do clã não pode ser expulso por votação." },
          };
        }

        // Registrar o voto, ignorando se já votou
        await client.query(
          `INSERT INTO clan_kick_votes (clan_id, target_user_id, voter_user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (clan_id, target_user_id, voter_user_id) DO NOTHING`,
          [clanId, targetUserId, voterId],
        );

        // Contar os votos
        const voteCountResult = await client.query(
          `SELECT COUNT(*) as count FROM clan_kick_votes WHERE clan_id = $1 AND target_user_id = $2`,
          [clanId, targetUserId],
        );
        const voteCount = parseInt(voteCountResult.rows[0].count, 10);

        // Notificar sobre o novo voto
        broadcastToClan(clanId, "vote_update", { targetUserId, voteCount });

        // Se atingiu o limite, expulsar o membro
        if (voteCount >= KICK_VOTE_THRESHOLD) {
          // Remover da tabela clan_members
          await client.query(
            `DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2`,
            [clanId, targetUserId],
          );
          // Limpar clan_id no perfil do usuário
          await client.query(
            `UPDATE user_profiles SET clan_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
            [targetUserId],
          );

          // Notificar que o membro foi expulso
          broadcastToClan(clanId, "member_kicked", { targetUserId, clanId });
          return {
            status: 200,
            body: { message: `Membro expulso com ${voteCount} votos.` },
          };
        }

        return {
          status: 200,
          body: { message: "Voto registrado com sucesso.", voteCount },
        };
      });

      // Invalida cache do alvo se foi expulso
      if (result.status === 200 && result.body.message.includes("expulso")) {
        await redisClient.delAsync(`playerState:${targetUserId}`);
      }

      return res.status(result.status).json(result.body);
    } catch (error) {
      console.error("❌ Erro ao votar para expulsar membro:", error.message);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
);

// POST /api/clans/:id/kick/:userId - Expulsar membro do clã
router.post("/:id/kick/:userId", authenticateToken, async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const requesterId = req.user.id;

    // Verificar se o requisitante é líder do clã
    const requesterMember = await query(
      "SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2",
      [id, requesterId],
    );

    if (
      requesterMember.rows.length === 0 ||
      requesterMember.rows[0].role !== "leader"
    ) {
      return res
        .status(403)
        .json({ error: "Apenas o líder pode expulsar membros." });
    }

    // O líder não pode expulsar a si mesmo
    if (String(requesterId) === String(targetUserId)) {
      return res
        .status(400)
        .json({ error: "Você não pode expulsar a si mesmo." });
    }

    // Usar transação para garantir a consistência
    const result = await transaction(async (client) => {
      // Verificar se o alvo é membro do clã
      const targetMember = await client.query(
        "SELECT role FROM clan_members WHERE clan_id = $1 AND user_id = $2",
        [id, targetUserId],
      );

      if (targetMember.rows.length === 0) {
        // Retornar um objeto para indicar que o membro não foi encontrado
        return { notFound: true };
      }

      // Remover membro do clã
      await client.query(
        "DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2",
        [id, targetUserId],
      );

      // Limpar clan_id no perfil do usuário expulso
      await client.query(
        "UPDATE user_profiles SET clan_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1",
        [targetUserId],
      );

      return { success: true };
    });

    if (result.notFound) {
      return res.status(404).json({ error: "Membro alvo não encontrado." });
    }

    // Invalida cache do perfil do expulso
    await redisClient.delAsync(`playerState:${targetUserId}`);

    res.json({ message: "Membro expulso com sucesso." });
  } catch (error) {
    console.error("❌ Erro ao expulsar membro:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/clans/:id/promote/:userId - Promover membro
router.post("/:id/promote/:userId", authenticateToken, async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user.id;
    const { role } = req.body;

    if (!["officer", "member"].includes(role)) {
      return res.status(400).json({ error: "Cargo inválido" });
    }

    // Verificar se o clã existe
    const clanResult = await query("SELECT * FROM clans WHERE id = $1", [id]);

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: "Clã não encontrado" });
    }

    // Verificar se o usuário é líder do clã
    const leaderResult = await query(
      "SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3",
      [id, userId, "leader"],
    );

    if (leaderResult.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas o líder pode alterar cargos" });
    }

    // Verificar se o alvo é membro do clã
    const memberResult = await query(
      "SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2",
      [id, targetUserId],
    );

    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: "Usuário não é membro deste clã" });
    }

    const member = memberResult.rows[0];

    // Não pode alterar cargo do líder
    if (member.role === "leader") {
      return res
        .status(400)
        .json({ error: "Não é possível alterar o cargo do líder" });
    }

    // Atualizar cargo
    await query(
      "UPDATE clan_members SET role = $1 WHERE clan_id = $2 AND user_id = $3",
      [role, id, targetUserId],
    );

    res.json({
      message: `Membro ${role === "officer" ? "promovido a oficial" : "rebaixado a membro"} com sucesso`,
    });
  } catch (error) {
    console.error("❌ Erro ao alterar cargo:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// DELETE /api/clans/:id - Deletar clã
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o clã existe
    const clanResult = await query("SELECT * FROM clans WHERE id = $1", [id]);

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: "Clã não encontrado" });
    }

    // Verificar se o usuário é líder do clã
    const leaderResult = await query(
      "SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3",
      [id, userId, "leader"],
    );

    if (leaderResult.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Apenas o líder pode deletar o clã" });
    }

    // Deletar clã e atualizar perfis de usuário em uma transação
    await transaction(async (client) => {
      // Limpar clan_id nos perfis dos membros e atualizar updated_at
      await client.query(
        "UPDATE user_profiles SET clan_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE clan_id = $1",
        [id],
      );
      // Deletar clã (ON DELETE CASCADE cuidará dos clan_members)
      await client.query("DELETE FROM clans WHERE id = $1", [id]);
    });

    // Como deletar um clã afeta muitos usuários, não invalidamos todos um por um aqui 
    // para evitar gargalo, mas os perfis no DB já estão corretos (NULL).
    // O cache expirará naturalmente ou será resetado em outras ações.
    // Mas invalidamos o do líder pelo menos.
    await redisClient.delAsync(`playerState:${userId}`);

    res.json({ message: "Clã deletado com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao deletar clã:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

module.exports = {
  router,
};
