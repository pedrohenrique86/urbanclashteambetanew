/**
 * cronService.js
 * 
 * Gerencia tarefas agendadas (Cron) sem dependências externas.
 * Focado em eventos diários (Meia-noite SP).
 */

const redisClient = require("../config/redisClient");
const { getIO } = require("../socketHandlerNative");
const phraseGenerator = require("../utils/phraseGenerator");

class CronService {
  constructor() {
    this.checkInterval = null;
  }

  start() {
    console.log("⏰ CronService iniciado (Checagem de Meia-Noite SP ativa)");
    
    // Verifica a cada minuto
    this.checkInterval = setInterval(() => {
      const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      
      // Se for exatamente 00:00 (ou nos primeiros 59s do dia)
      if (nowSP.getHours() === 0 && nowSP.getMinutes() === 0) {
        this.executeMidnightTasks();
      }
    }, 60000); // 1 minuto
  }

  async executeMidnightTasks() {
    console.log("🌙 Executando tarefas de meia-noite...");
    
    try {
      const io = getIO();
      
      // 1. Destaques do Dia (Maiores Ganhos)
      const factions = ['gangsters', 'guardas'];
      const highlights = {};

      for (const f of factions) {
        const key = `stats:daily_max:${f}`;
        const data = await redisClient.getAsync(key);
        if (data) {
          highlights[f] = JSON.parse(data);
          // Limpa para o próximo dia
          await redisClient.delAsync(key);
        }
      }

      const actionLogService = require("./actionLogService");

      if (highlights.gangsters || highlights.guardas) {
        // SÊNIOR: Limpa os logs públicos do dia anterior para que o feed mostre apenas os destaques
        await redisClient.delAsync("cache:public_logs_stream");

        // Envia anúncio via LOG (Ticker de Notícias) e persiste no Redis
        if (highlights.gangsters) {
          const phrase = phraseGenerator.generate('gangsters', { 
            name: highlights.gangsters.username, 
            target: highlights.gangsters.target, 
            money: `$${highlights.gangsters.amount.toLocaleString()}` 
          });

          await actionLogService.log(highlights.gangsters.userId, 'HEIST_SUCCESS', 'contract', 'daily_winner', {
            public_message: `👑 RENEGADO DO DIA: ${phrase}`,
            is_major: true,
            faction: 'gangsters',
            money_gain: highlights.gangsters.amount
          }, true);
        }

        if (highlights.guardas) {
          const phrase = phraseGenerator.generate('guardas', { 
            name: highlights.guardas.username, 
            target: highlights.guardas.target, 
            money: `$${highlights.guardas.amount.toLocaleString()}` 
          });

          await actionLogService.log(highlights.guardas.userId, 'guardian_task', 'contract', 'daily_winner', {
            public_message: `🎖️ GUARDIÃO DO DIA: ${phrase}`,
            is_major: true,
            faction: 'guardas',
            money_gain: highlights.guardas.amount
          }, true);
        }
        
        console.log("✅ Destaques do dia enviados e persistidos no Ticker.");
      }

    } catch (error) {
      console.error("❌ Erro ao executar tarefas de meia-noite:", error);
    }
  }
}

module.exports = new CronService();
