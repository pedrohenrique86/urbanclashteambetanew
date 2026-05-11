const redisClient = require("../config/redisClient");

/**
 * SÊNIOR: Middleware de Bloqueio de Ação Concorrente.
 * Impede que o usuário execute múltiplas ações pesadas ao mesmo tempo
 * usando um semáforo atômico no Redis (SET NX).
 * 
 * @param {number} ttlMs Tempo de trava em milissegundos (Default: 1s)
 */
const lockPlayerAction = (ttlMs = 1000) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.id) return next();

    const userId = req.user.id;
    const resource = `action:${userId}`;
    const lockKey = `lock:${resource}`;

    try {
      // Tenta adquirir a trava atômica
      const acquired = await redisClient.setNXAsync(lockKey, "1", ttlMs);

      if (!acquired) {
        return res.status(423).json({
          error: "Ação em processamento",
          message: "Aguarde o término da sua ação anterior antes de tentar novamente.",
          code: "ACTION_LOCKED"
        });
      }

      // Função para liberar a trava manualmente se necessário
      req.unlockAction = async () => {
        await redisClient.delAsync(lockKey);
      };

      // Prossegue para a rota
      next();
    } catch (err) {
      console.error("[LockMiddleware] Erro ao processar trava:", err.message);
      next();
    }
  };
};

module.exports = { lockPlayerAction };
