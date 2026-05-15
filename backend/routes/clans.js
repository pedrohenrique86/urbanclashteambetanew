const express = require("express");
const { body, validationResult } = require("express-validator");
const { query, transaction } = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { lockPlayerAction } = require("../middleware/lockMiddleware");
const redisClient = require("../config/redisClient");
const { getGameState } = require("../services/gameStateService");
const { FACTION_ALIAS_MAP } = require("../utils/faction");

const router = express.Router();

const rankingCacheService = require("../services/rankingCacheService");
const clanStateService = require("../services/clanStateService");
const clanMemberService = require("../services/clanMemberService");
const clanService = require("../services/clanService");
const playerStateService = require("../services/playerStateService");
const sseService = require("../services/sseService");

// =========================
// Validações
// =========================
const createClanValidation = [
  body("name")
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage("Nome do clã deve ter 3-50 caracteres e conter apenas letras, números e espaços"),
  body("faction")
    .isIn(Object.keys(FACTION_ALIAS_MAP))
    .withMessage("Facção inválida"),
];

// =========================
// Helpers
// =========================
function parseClanCount(row) {
  if (!row) return null;
  return { 
    ...row, 
    member_count: Number(row.member_count || 0), 
    max_members: Number(row.max_members || 0) 
  };
}

// =========================
// GET /api/clans - Listar clãs
// =========================
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, faction, search, recruiting_only = false, sort = "created_at", order = "desc" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "WHERE 1=1";
    const queryParams = [];
    let paramCount = 1;

    if (faction) {
      whereClause += ` AND c.faction = ?`;
      queryParams.push(playerStateService.resolveFactionName(faction));
    }

    if (search) {
      whereClause += ` AND c.name LIKE ?`;
      queryParams.push(`%${search}%`);
    }

    if (recruiting_only === "true") {
      whereClause += ` AND c.is_recruiting = true AND c.member_count < c.max_members`;
    }

    const clansResult = await query(
      `SELECT id, name, description, faction, member_count, max_members, is_recruiting, created_at 
       FROM clans c ${whereClause} ORDER BY ${sort === "member_count" ? "c.member_count" : "c.created_at"} ${order} LIMIT ? OFFSET ?`,
      [...queryParams, Number(limit), offset]
    );

    const countResult = await query(`SELECT COUNT(*) as total FROM clans c ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    res.json({ 
      clans: clansResult.rows.map(parseClanCount), 
      pagination: { 
        page: Number(page), 
        total, 
        totalPages: Math.ceil(total / Number(limit)) 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// GET /api/clans/rankings
// =========================
router.get("/rankings", async (req, res) => {
  try {
    const cached = await rankingCacheService.ensureFreshRanking("clans", null);
    if (!cached) return res.status(503).json({ error: "Ranking indisponível" });
    res.json({ clans: cached.data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// GET /api/clans/:id
// =========================
router.get("/:id", async (req, res) => {
  try {
    const clanRes = await query("SELECT * FROM clans WHERE id = ?", [req.params.id]);
    if (clanRes.rows.length === 0) return res.status(404).json({ error: "Clã não encontrado" });
    res.json({ clan: parseClanCount(clanRes.rows[0]) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// GET /api/clans/:id/members
// =========================
router.get("/:id/members", async (req, res) => {
  try {
    const memberIds = await clanMemberService.getMemberIds(req.params.id);
    if (memberIds.length === 0) return res.json({ members: [] });

    const playerStates = await playerStateService.getManyPlayerStates(memberIds);
    const members = playerStates.map(state => {
      const f = playerStateService.formatProfile(state);
      return { 
        user_id: f.id, 
        username: f.username, 
        display_name: f.display_name,
        avatar_url: f.avatar_url, 
        faction: f.faction, // SÊNIOR: Adicionado para coloração na lista
        level: f.level, 
        role: state.clan_role || 'member' 
      };
    });

    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================
// POST /api/clans - Criar clã
// =========================
router.post("/", authenticateToken, lockPlayerAction(2000), createClanValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, description, faction, max_members = 50 } = req.body;
    const userId = req.user.id;

    const result = await transaction(async (client) => {
      const profile = (await client.query("SELECT clan_id, faction FROM user_profiles WHERE user_id = ?", [userId])).rows[0];
      if (profile.clan_id) throw new Error("Você já tem um clã");
      
      const canonical = playerStateService.resolveFactionName(faction);
      if (profile.faction !== canonical) throw new Error("Facção incompatível");

      const clanId = require("crypto").randomUUID();
      const { rows: fRows } = await client.query("SELECT id FROM factions WHERE name = ?", [canonical]);
      
      await client.query(
        "INSERT INTO clans (id, name, description, faction, faction_id, max_members, member_count) VALUES (?, ?, ?, ?, ?, ?, 1)",
        [clanId, name, description, canonical, fRows[0].id, max_members]
      );
      await client.query("INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, 'leader')", [clanId, userId]);
      await client.query("UPDATE user_profiles SET clan_id = ? WHERE user_id = ?", [clanId, userId]);

      return clanId;
    });

    await clanMemberService.addMember(result, userId);
    await playerStateService.updatePlayerState(userId, { clan_id: result, clan_role: 'leader' });
    
    // SÊNIOR: Invalida cache de autenticação para o SocketHandler ver o clã novo
    const { clearAuthCache } = require("../services/authService");
    await clearAuthCache(userId);

    res.status(201).json({ message: "Clã criado com sucesso!", id: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =========================
// POST /api/clans/:id/join
// =========================
router.post("/:id/join", authenticateToken, lockPlayerAction(1000), async (req, res) => {
  try {
    const result = await clanService.joinClan(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =========================
// POST /api/clans/:id/leave
// =========================
router.post("/:id/leave", authenticateToken, lockPlayerAction(1000), async (req, res) => {
  try {
    const result = await clanService.leaveClan(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =========================
// DELETE /api/clans/:id
// =========================
router.delete("/:id", authenticateToken, lockPlayerAction(2000), async (req, res) => {
  try {
    const { id } = req.params;
    const memberIds = await clanMemberService.getMemberIds(id);

    await transaction(async (client) => {
      const leader = (await client.query("SELECT role FROM clan_members WHERE clan_id = ? AND user_id = ?", [id, req.user.id])).rows[0];
      if (!leader || leader.role !== 'leader') throw new Error("Apenas o líder pode deletar o clã");

      await client.query("UPDATE user_profiles SET clan_id = NULL WHERE clan_id = ?", [id]);
      await client.query("DELETE FROM clans WHERE id = ?", [id]);
    });

    // SÊNIOR: Sincronização em massa (Redis + SSE + AuthCache)
    const { clearAuthCache } = require("../services/authService");
    for (const memberId of memberIds) {
      await playerStateService.updatePlayerState(memberId, { clan_id: "" });
      await clearAuthCache(memberId);
    }

    res.json({ message: "Clã deletado com sucesso" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = {
  router,
};