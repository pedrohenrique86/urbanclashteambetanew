const { query } = require("../config/database");
const redisClient = require("../config/redisClient");
const playerStateService = require("./playerStateService");
const { getIO } = require("../socketHandler");
const { HEIST_TYPES, GUARDIAN_TYPES } = require("../utils/contractConstants");
const gameLogic = require("../utils/gameLogic");

class ContractService {
  /**
   * Renegado: Prepara o terreno gastando PA.
   */
  async prepareTask(userId, taskId, territoryId = null) {
    const LOCK_KEY = `lock:contract:prepare:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
    if (!hasLock) throw new Error("Operação em andamento.");

    try {
      const task = HEIST_TYPES.PREPARACAO_ROUBO.tasks.find(t => t.id === taskId);
      if (!task) throw new Error("Tarefa inválida.");

      const state = await playerStateService.getPlayerState(userId);
      if (!state) throw new Error("Jogador não encontrado.");

      if (state.action_points < task.costPA) throw new Error("PA insuficiente.");
      if (state.energy < task.costEnergy) throw new Error("Energia insuficiente.");

      // Verificar se já existe um contrato ativo ou criar um novo
      const activeContract = await this.getActiveContract(userId);
      
      const taskIdMap = {
        vigiar: "prep_vigiar_seguranca",
        hackear: "prep_hackear_cameras",
        rota: "prep_preparar_rota"
      };
      
      const dbTaskId = taskIdMap[taskId];
      if (!dbTaskId) throw new Error("Tarefa inválida.");
      
      if (activeContract) {
        if (activeContract.status !== 'pending') throw new Error("Você já tem uma execução em andamento.");
        if (activeContract[dbTaskId]) throw new Error("Esta etapa já foi concluída.");

        // Se passar um territoryId diferente do atual, resetar o progresso? 
        // Não, vamos assumir que o território é travado na primeira etapa.
        
        await query(
          `UPDATE active_contracts SET ${dbTaskId} = TRUE WHERE id = $1`,
          [activeContract.id]
        );
      } else {
        // Criar novo contrato pendente
        let finalTerritoryId = territoryId;
        
        if (!finalTerritoryId) {
          const districts = await this.getDistricts();
          finalTerritoryId = districts[Math.floor(Math.random() * districts.length)].id;
        }
        
        await query(
          `INSERT INTO active_contracts (user_id, territory_id, status, type, ${dbTaskId}) 
           VALUES ($1, $2, 'pending', 'execucao', TRUE)`,
          [userId, finalTerritoryId]
        );
      }

      const newState = await playerStateService.updatePlayerState(userId, {
        action_points: -task.costPA,
        energy: -task.costEnergy
      });

      return {
        message: `Etapa '${task.name}' concluída com sucesso.`,
        player: newState
      };
    } finally {
      await redisClient.delAsync(LOCK_KEY);
    }
  }

  /**
   * Renegado: Inicia a execução do roubo gastando muita energia.
   */
  async executeHeist(userId) {
    const LOCK_KEY = `lock:contract:execute:${userId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 3000);
    if (!hasLock) throw new Error("Operação em andamento.");

    try {
      const contract = await this.getActiveContract(userId);
      if (!contract) throw new Error("Você precisa preparar o terreno antes de executar.");
      if (contract.status !== 'pending') throw new Error("Execução já iniciada.");

      const state = await playerStateService.getPlayerState(userId);
      const heist = HEIST_TYPES.GRANDE_GOLPE;

      if (state.energy < heist.costEnergy) throw new Error("Energia insuficiente para o grande golpe.");

      const endsAt = new Date(Date.now() + heist.durationMinutes * 60000);
      
      await query(
        `UPDATE active_contracts SET status = 'active', execution_ends_at = $1 WHERE id = $2`,
        [endsAt, contract.id]
      );

      const newState = await playerStateService.updatePlayerState(userId, {
        energy: -heist.costEnergy,
        status: 'Ruptura', // Fica visível/vulnerável
        status_ends_at: endsAt.toISOString()
      });

      // ALERTA PARA GUARDIÕES
      const io = getIO();
      if (io) {
        io.emit("contract:crime_alert", {
          id: contract.id,
          renegade: state.username,
          territory: contract.territory_name,
          endsAt: endsAt.toISOString()
        });
      }

      // Logar evento global
      await this.logEvent({
        user_id: userId,
        username: state.username,
        faction: 'gangsters',
        event_type: 'heist_started',
        message: `${state.username} iniciou um roubo na ${contract.territory_name}!`,
        territory_name: contract.territory_name
      });

      return {
        message: "O golpe começou! Mantenha a guarda baixa até o tempo acabar.",
        endsAt: endsAt.toISOString(),
        player: newState
      };
    } finally {
      await redisClient.delAsync(LOCK_KEY);
    }
  }

  /**
   * Guardião: Realiza ações de patrulha/investigação.
   */
  async guardianAction(userId, actionId) {
    const action = Object.values(GUARDIAN_TYPES).find(a => a.id === actionId);
    if (!action) throw new Error("Ação inválida.");

    const state = await playerStateService.getPlayerState(userId);
    if (state.action_points < action.costPA) throw new Error("PA insuficiente.");

    // Ganhos
    const updates = {
      action_points: -action.costPA,
      money: action.salary,
      merit: action.merit
    };

    const newState = await playerStateService.updatePlayerState(userId, updates);

    // Aumentar Visibilidade do Guardião se for Investigação (fica dirty?)
    // Por enquanto apenas mérito
    
    return {
      message: `Operação '${action.name}' concluída. Recebido $${action.salary} e ${action.merit} de Mérito.`,
      player: newState
    };
  }

  /**
   * Guardião: Intercepta um roubo ativo.
   */
  async interceptHeist(guardianId, contractId) {
    const LOCK_KEY = `lock:contract:intercept:${contractId}`;
    const hasLock = await redisClient.setNXAsync(LOCK_KEY, "1", 5000);
    if (!hasLock) throw new Error("Outro guardião já está respondendo a este chamado.");

    try {
      const { rows } = await query(
        `SELECT ac.*, mt.name as territory_name, u.username as renegade_name 
         FROM active_contracts ac
         JOIN map_territories mt ON ac.territory_id = mt.id
         JOIN users u ON ac.user_id = u.id
         WHERE ac.id = $1 AND ac.status = 'active'`,
        [contractId]
      );
      
      const contract = rows[0];
      if (!contract) throw new Error("Este crime já foi resolvido ou o rastro esfriou.");

      const guardian = await playerStateService.getPlayerState(guardianId);
      const costEnergy = GUARDIAN_TYPES.INTERVENCAO.costEnergy;

      if (guardian.energy < costEnergy) throw new Error("Energia insuficiente para intervenção.");

      // Iniciar Combate via CombatService
      const combatService = require("./combatService");
      
      // Marcar contrato como interceptado imediatamente para evitar múltiplos guardiões
      await query(`UPDATE active_contracts SET status = 'intercepted' WHERE id = $1`, [contractId]);

      await playerStateService.updatePlayerState(guardianId, { energy: -costEnergy });

      await this.logEvent({
        user_id: guardianId,
        username: guardian.username,
        faction: 'guardas',
        event_type: 'intercept_attempt',
        message: `O Guardião ${guardian.username} interceptou ${contract.renegade_name} em ${contract.territory_name}!`,
        territory_name: contract.territory_name
      });

      // Retornar dados para o frontend iniciar a tela de combate
      return {
        message: "Interceptação iniciada! Neutralize o alvo.",
        targetId: contract.user_id,
        targetName: contract.renegade_name
      };
    } finally {
      await redisClient.delAsync(LOCK_KEY);
    }
  }

  async getActiveContract(userId) {
    const { rows } = await query(
      `SELECT ac.*, mt.name as territory_name 
       FROM active_contracts ac
       JOIN map_territories mt ON ac.territory_id = mt.id
       WHERE ac.user_id = $1 AND ac.status IN ('pending', 'active')`,
      [userId]
    );
    return rows[0];
  }

  async getActiveHeists() {
    const { rows } = await query(
      `SELECT ac.*, mt.name as territory_name, u.username as renegade_name 
       FROM active_contracts ac
       JOIN map_territories mt ON ac.territory_id = mt.id
       JOIN users u ON ac.user_id = u.id
       WHERE ac.status = 'active'`
    );
    return rows;
  }

  async getDistricts() {
    const { rows } = await query(`SELECT * FROM map_territories`);
    return rows;
  }

  async logEvent(data) {
    await query(
      `INSERT INTO contract_logs (user_id, username, faction, event_type, message, territory_name)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [data.user_id, data.username, data.faction, data.event_type, data.message, data.territory_name]
    );
    
    // Emitir via socket para o Live Feed
    const io = getIO();
    if (io) {
      io.emit("contract:log", {
        ...data,
        created_at: new Date().toISOString()
      });
    }
  }

  async getLogs() {
    const { rows } = await query(
      `SELECT * FROM contract_logs ORDER BY created_at DESC LIMIT 20`
    );
    return rows;
  }
  
  /**
   * Finaliza o contrato (pago após o timer)
   */
  async resolveHeist(userId) {
    const contract = await this.getActiveContract(userId);
    if (!contract || contract.status !== 'active') throw new Error("Nenhum roubo ativo para finalizar.");

    if (new Date(contract.execution_ends_at) > new Date()) {
      throw new Error("O roubo ainda está em progresso.");
    }

    const state = await playerStateService.getPlayerState(userId);
    const heist = HEIST_TYPES.GRANDE_GOLPE;

    // Calcular chance de sucesso baseada na preparação
    let successChance = HEIST_TYPES.PREPARACAO_ROUBO.baseSuccessChance;
    if (contract.prep_vigiar_seguranca) successChance += 15;
    if (contract.prep_hackear_cameras) successChance += 20;
    if (contract.prep_preparar_rota) successChance += 25;
    
    // Impacto do HEAT (cada ponto de heat reduz 0.25% da chance, max 25%)
    const territoryHeat = contract.heat || 0;
    const heatPenalty = territoryHeat * 0.25;
    successChance -= heatPenalty;

    // Adicionar sorte
    successChance += (state.luck || 0);

    const isSuccess = (Math.random() * 100) < successChance;

    if (isSuccess) {
      const updates = {
        money: heist.gains.money,
        total_xp: heist.gains.xp,
        corruption: 100, // Ganha 100 de corrupção por sucesso
        status: 'Operacional'
      };
      const newState = await playerStateService.updatePlayerState(userId, updates);

      await query(`UPDATE active_contracts SET status = 'completed' WHERE id = $1`, [contract.id]);
      
      // Aumentar Heat do território
      await query(`UPDATE map_territories SET heat = LEAST(100, heat + 10) WHERE id = $1`, [contract.territory_id]);

      await this.logEvent({
        user_id: userId,
        username: state.username,
        faction: 'gangsters',
        event_type: 'heist_success',
        message: `${state.username} limpou a ${contract.territory_name} e levou $${heist.gains.money}!`,
        territory_name: contract.territory_name
      });

      return {
        success: true,
        message: "O roubo foi um sucesso! Você limpou o local.",
        gains: heist.gains,
        player: newState
      };
    } else {
      // Falha (mas não necessariamente pego por guardião, talvez apenas falha técnica ou patrulha NPC)
      await query(`UPDATE active_contracts SET status = 'intercepted' WHERE id = $1`, [contract.id]);
      
      const newState = await playerStateService.updatePlayerState(userId, {
        status: 'Recondicionamento',
        status_ends_at: new Date(Date.now() + 10 * 60000).toISOString()
      });

      await this.logEvent({
        user_id: userId,
        username: state.username,
        faction: 'gangsters',
        event_type: 'heist_failed',
        message: `${state.username} falhou no roubo na ${contract.territory_name} e teve que fugir!`,
        territory_name: contract.territory_name
      });

      return {
        success: false,
        message: "O alarme tocou! Você teve que abandonar tudo e fugir pelos bueiros.",
        player: newState
      };
    }
  }
}

module.exports = new ContractService();
