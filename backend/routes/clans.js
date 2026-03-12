const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validações
const createClanValidation = [
  body('name')
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage('Nome do clã deve ter 3-50 caracteres e conter apenas letras, números e espaços'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  body('faction')
    .isIn(['north', 'south', 'east', 'west'])
    .withMessage('Facção deve ser: north, south, east ou west'),
  body('max_members')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Máximo de membros deve ser entre 5 e 100')
];

const updateClanValidation = [
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  body('max_members')
    .optional()
    .isInt({ min: 5, max: 100 })
    .withMessage('Máximo de membros deve ser entre 5 e 100'),
  body('is_recruiting')
    .optional()
    .isBoolean()
    .withMessage('is_recruiting deve ser true ou false')
];

// GET /api/clans - Listar clãs
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      faction, 
      search,
      recruiting_only = false,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const validSorts = ['created_at', 'name', 'member_count'];
    const validOrders = ['asc', 'desc'];
    
    const sortField = validSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order) ? order : 'desc';

    // Construir query com filtros
    let whereClause = 'WHERE 1=1';
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

    if (recruiting_only === 'true') {
      whereClause += ` AND c.is_recruiting = true AND c.member_count < c.max_members`;
    }

    // Query principal
    const clansResult = await query(`
      SELECT 
        c.id, c.name, c.description, c.faction, c.member_count, 
        c.max_members, c.is_recruiting, c.created_at
      FROM clans c
      ${whereClause}
      ORDER BY c.${sortField} ${sortOrder}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `, [...queryParams, limit, offset]);

    // Query para contar total
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM clans c
      ${whereClause}
    `, queryParams);

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
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Erro ao listar clãs:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/clans/by-faction/:faction - Buscar clãs por facção
router.get('/by-faction/:faction', async (req, res) => {
  try {
    const { faction } = req.params;
    
    // Validar facção
    if (!['gangsters', 'guardas'].includes(faction)) {
      return res.status(400).json({ error: 'Facção inválida. Use: gangsters ou guardas' });
    }

    const clansResult = await query(`
      SELECT 
        c.id, c.name, c.description, c.faction, c.member_count, 
        c.max_members, c.is_recruiting, c.created_at
      FROM clans c
      WHERE c.faction = $1
      ORDER BY c.name ASC
    `, [faction]);

    res.json({
      clans: clansResult.rows
    });

  } catch (error) {
    console.error('❌ Erro ao buscar clãs por facção:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/clans/rankings - Ranking de clãs
router.get('/rankings', async (req, res) => {
  try {
    console.log('🔍 Buscando ranking de clãs...');
    const { limit = 26 } = req.query;
    console.log('📊 Limite:', limit);

    const rankingResult = await query(`
      SELECT 
        c.id,
        c.name,
        c.faction,
        c.points as score,
        c.created_at,
        c.updated_at,
        COUNT(cm.id) as member_count,
        ROW_NUMBER() OVER (ORDER BY c.points DESC, COUNT(cm.id) DESC) as rank
      FROM clans c
      LEFT JOIN clan_members cm ON c.id = cm.clan_id
      GROUP BY c.id, c.name, c.faction, c.points, c.created_at, c.updated_at
      ORDER BY c.points DESC, COUNT(cm.id) DESC
      LIMIT $1
    `, [limit]);

    console.log('✅ Ranking encontrado:', rankingResult.rows.length, 'clãs');
    res.json({
      clans: rankingResult.rows
    });

  } catch (error) {
    console.error('❌ Erro ao buscar ranking de clãs:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/clans/:id - Obter detalhes do clã
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar clã
    const clanResult = await query(`
      SELECT c.*
      FROM clans c
      WHERE c.id = $1
    `, [id]);

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clã não encontrado' });
    }

    const clan = clanResult.rows[0];

    // Buscar membros do clã
    const membersResult = await query(`
      SELECT 
        cm.role, cm.joined_at,
        u.id as user_id, u.username,
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
    `, [id]);

    res.json({
      clan: {
        ...clan,
        leader: clan.leader_username ? {
          username: clan.leader_username,
          display_name: clan.leader_display_name,
          avatar_url: clan.leader_avatar
        } : null,
        members: membersResult.rows
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar clã:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/clans - Criar novo clã
router.post('/', authenticateToken, createClanValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { name, description, faction, max_members = 50 } = req.body;
    const userId = req.user.id;

    // Verificação de líder removida - funcionalidade não implementada

    // Verificar se o usuário já é membro de algum clã
    const existingMemberResult = await query(
      'SELECT id FROM clan_members WHERE user_id = $1',
      [userId]
    );

    if (existingMemberResult.rows.length > 0) {
      return res.status(400).json({ error: 'Você já é membro de um clã' });
    }

    // Verificar se o usuário tem a mesma facção do clã
    const userProfileResult = await query(
      'SELECT faction FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (userProfileResult.rows.length === 0) {
      return res.status(400).json({ error: 'Perfil de usuário não encontrado' });
    }

    const userFaction = userProfileResult.rows[0].faction;
    if (userFaction !== clan.faction) {
      return res.status(400).json({ error: 'Você só pode entrar em clãs da sua facção' });
    }

    // Verificar se o nome do clã já existe
    const nameExistsResult = await query(
      'SELECT id FROM clans WHERE name = $1',
      [name]
    );

    if (nameExistsResult.rows.length > 0) {
      return res.status(409).json({ error: 'Nome do clã já está em uso' });
    }

    // Criar clã e adicionar líder em uma transação
    const result = await transaction(async (client) => {
      // Criar clã
      const clanResult = await client.query(`
        INSERT INTO clans (name, description, faction, max_members, member_count)
        VALUES ($1, $2, $3, $4, 1)
        RETURNING *
      `, [name, description, faction, max_members]);

      const clan = clanResult.rows[0];

      // Adicionar líder como membro
      await client.query(`
        INSERT INTO clan_members (clan_id, user_id, role)
        VALUES ($1, $2, 'leader')
      `, [clan.id, userId]);

      return clan;
    });

    res.status(201).json({
      message: 'Clã criado com sucesso',
      clan: result
    });

  } catch (error) {
    console.error('❌ Erro ao criar clã:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/clans/:id - Atualizar clã
router.put('/:id', authenticateToken, updateClanValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { description, max_members, is_recruiting } = req.body;
    const userId = req.user.id;

    // Verificar se o usuário é líder do clã
    const clanResult = await query(
      'SELECT * FROM clans WHERE id = $1',
      [id]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clã não encontrado' });
    }

    const clan = clanResult.rows[0];

    // Verificar se o usuário é líder do clã
    const leaderResult = await query(
      'SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3',
      [clanId, userId, 'leader']
    );

    if (leaderResult.rows.length === 0) {
      return res.status(403).json({ error: 'Apenas o líder pode atualizar o clã' });
    }

    // Verificar se max_members não é menor que o número atual de membros
    if (max_members && max_members < clan.member_count) {
      return res.status(400).json({ 
        error: `Máximo de membros não pode ser menor que o número atual (${clan.member_count})`
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
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updateValues.push(id);
    
    const result = await query(`
      UPDATE clans 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `, updateValues);

    res.json({
      message: 'Clã atualizado com sucesso',
      clan: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar clã:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/clans/:id/join - Entrar no clã
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o clã existe
    const clanResult = await query(
      'SELECT * FROM clans WHERE id = $1',
      [id]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clã não encontrado' });
    }

    const clan = clanResult.rows[0];

    // Verificar se o clã está recrutando
    if (!clan.is_recruiting) {
      return res.status(400).json({ error: 'Clã não está recrutando' });
    }

    // Verificar se o clã não está cheio
    if (clan.member_count >= clan.max_members) {
      return res.status(400).json({ error: 'Clã está cheio' });
    }

    // Verificar se o usuário já é membro de algum clã
    const existingMemberResult = await query(
      'SELECT id FROM clan_members WHERE user_id = $1',
      [userId]
    );

    if (existingMemberResult.rows.length > 0) {
      return res.status(400).json({ error: 'Você já é membro de um clã' });
    }

    // Adicionar usuário ao clã e atualizar contadores
    await transaction(async (client) => {
      // Adicionar à tabela clan_members
      await client.query(
        'INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)',
        [id, userId, 'member']
      );

      // Atualizar clan_id no perfil do usuário
      await client.query(
        'UPDATE user_profiles SET clan_id = $1 WHERE user_id = $2',
        [id, userId]
      );

      // Incrementar member_count do clã
      await client.query(
        'UPDATE clans SET member_count = member_count + 1 WHERE id = $1',
        [id]
      );
    });

    res.json({ message: 'Você entrou no clã com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao entrar no clã:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/clans/:id/leave - Sair do clã
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o usuário é membro do clã
    const memberResult = await query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: 'Você não é membro deste clã' });
    }

    const member = memberResult.rows[0];

    // Verificar se é o líder
    if (member.role === 'leader') {
      // Verificar se há outros membros
      const otherMembersResult = await query(
        'SELECT COUNT(*) as count FROM clan_members WHERE clan_id = $1 AND user_id != $2',
        [id, userId]
      );

      const otherMembersCount = parseInt(otherMembersResult.rows[0].count);

      if (otherMembersCount > 0) {
        return res.status(400).json({ 
          error: 'Você deve transferir a liderança ou remover todos os membros antes de sair'
        });
      }

      // Se é o único membro, deletar o clã
      await transaction(async (client) => {
        await client.query('DELETE FROM clan_members WHERE clan_id = $1', [id]);
        await client.query('DELETE FROM clans WHERE id = $1', [id]);
      });

      return res.json({ message: 'Clã deletado com sucesso' });
    }

    // Remover membro do clã
    await query(
      'DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [id, userId]
    );

    res.json({ message: 'Você saiu do clã com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao sair do clã:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/clans/:id/kick/:userId - Expulsar membro
router.post('/:id/kick/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user.id;

    // Verificar se o clã existe
    const clanResult = await query(
      'SELECT * FROM clans WHERE id = $1',
      [id]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clã não encontrado' });
    }

    // Verificar se o usuário é líder do clã
    const leaderResult = await query(
      'SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3',
      [id, userId, 'leader']
    );

    if (leaderResult.rows.length === 0) {
      return res.status(403).json({ error: 'Apenas o líder pode expulsar membros' });
    }

    // Verificar se o alvo é membro do clã
    const memberResult = await query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [id, targetUserId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: 'Usuário não é membro deste clã' });
    }

    const member = memberResult.rows[0];

    // Não pode expulsar o líder
    if (member.role === 'leader') {
      return res.status(400).json({ error: 'Não é possível expulsar o líder' });
    }

    // Remover membro
    await query(
      'DELETE FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [id, targetUserId]
    );

    res.json({ message: 'Membro expulso com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao expulsar membro:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/clans/:id/promote/:userId - Promover membro
router.post('/:id/promote/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const userId = req.user.id;
    const { role } = req.body;

    if (!['officer', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Cargo inválido' });
    }

    // Verificar se o clã existe
    const clanResult = await query(
      'SELECT * FROM clans WHERE id = $1',
      [id]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clã não encontrado' });
    }

    // Verificar se o usuário é líder do clã
    const leaderResult = await query(
      'SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3',
      [id, userId, 'leader']
    );

    if (leaderResult.rows.length === 0) {
      return res.status(403).json({ error: 'Apenas o líder pode alterar cargos' });
    }

    // Verificar se o alvo é membro do clã
    const memberResult = await query(
      'SELECT * FROM clan_members WHERE clan_id = $1 AND user_id = $2',
      [id, targetUserId]
    );

    if (memberResult.rows.length === 0) {
      return res.status(400).json({ error: 'Usuário não é membro deste clã' });
    }

    const member = memberResult.rows[0];

    // Não pode alterar cargo do líder
    if (member.role === 'leader') {
      return res.status(400).json({ error: 'Não é possível alterar o cargo do líder' });
    }

    // Atualizar cargo
    await query(
      'UPDATE clan_members SET role = $1 WHERE clan_id = $2 AND user_id = $3',
      [role, id, targetUserId]
    );

    res.json({ message: `Membro ${role === 'officer' ? 'promovido a oficial' : 'rebaixado a membro'} com sucesso` });

  } catch (error) {
    console.error('❌ Erro ao alterar cargo:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/clans/:id - Deletar clã
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar se o clã existe
    const clanResult = await query(
      'SELECT * FROM clans WHERE id = $1',
      [id]
    );

    if (clanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clã não encontrado' });
    }

    // Verificar se o usuário é líder do clã
    const leaderResult = await query(
      'SELECT id FROM clan_members WHERE clan_id = $1 AND user_id = $2 AND role = $3',
      [id, userId, 'leader']
    );

    if (leaderResult.rows.length === 0) {
      return res.status(403).json({ error: 'Apenas o líder pode deletar o clã' });
    }

    // Deletar clã (cascade irá deletar membros)
    await query('DELETE FROM clans WHERE id = $1', [id]);

    res.json({ message: 'Clã deletado com sucesso' });

  } catch (error) {
    console.error('❌ Erro ao deletar clã:', error.message);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;