const { query } = require("./config/database");

async function fixClanNamesById() {
  const mapping = {
    // 🔥 RENEGADOS (GANGSTERS)
    "g1": { name: "Divisão Sombra", desc: "Você nem percebe quando já caiu." },
    "g2": { name: "Divisão Caos", desc: "Transformamos ordem em cinzas." },
    "g3": { name: "Divisão Ruína", desc: "Onde pisamos, nada permanece." },
    "g4": { name: "Divisão Fúria", desc: "Sem freio, sem pausa, só impacto." },
    "g5": { name: "Divisão Eclipse", desc: "Sumimos com qualquer vestígio." },
    "g6": { name: "Divisão Vândalos", desc: "Marcamos território na força." },
    "g7": { name: "Divisão Predadores", desc: "Você corre, a gente termina." },
    "g8": { name: "Divisão Abismo", desc: "Cada passo seu é o último." },
    "g9": { name: "Divisão Rebeldes", desc: "Regra é só mais um alvo." },
    "g10": { name: "Divisão Carnificina", desc: "A batalha sempre escala." },
    "g11": { name: "Divisão Insurgentes", desc: "Nunca lutamos do seu jeito." },
    "g12": { name: "Divisão Fantasma", desc: "Chegamos, resolvemos, sumimos." },
    "g13": { name: "Divisão Anarquia", desc: "O jogo quebra quando entramos." },

    // 🛡️ GUARDIÕES (GUARDAS)
    "u1": { name: "Divisão Sentinela", desc: "Nada passa despercebido." },
    "u2": { name: "Divisão Bastião", desc: "Seguramos o que você destrói." },
    "u3": { name: "Divisão Guardiões", desc: "Onde chegamos, tudo resiste." },
    "u4": { name: "Divisão Vigília", desc: "Frieza que decide batalhas." },
    "u5": { name: "Divisão Aegis", desc: "Nem a escuridão atravessa." },
    "u6": { name: "Divisão Legião", desc: "Tomamos território em bloco." },
    "u7": { name: "Divisão Escudo", desc: "Aqui a corrida acaba." },
    "u8": { name: "Divisão Justiça", desc: "Cada erro seu tem sentença." },
    "u9": { name: "Divisão Custódia", desc: "Tudo fica sob vigilância." },
    "u10": { name: "Divisão Fortaleza", desc: "Aqui a batalha encerra." },
    "u11": { name: "Divisão Ordem", desc: "Sempre vencemos do nosso jeito." },
    "u12": { name: "Divisão Vanguard", desc: "Chegamos primeiro e ficamos." },
    "u13": { name: "Divisão Patrulha", desc: "O controle nunca falha." }
  };

  try {
    console.log("🚀 Iniciando atualização de nomes das Divisões por ID...");
    let updatedCount = 0;

    for (const [id, newData] of Object.entries(mapping)) {
      const res = await query(
        "UPDATE clans SET name = ?, description = ? WHERE id = ?",
        [newData.name, newData.desc, id]
      );
      if (res.rowCount > 0) {
        console.log(`✅ Atualizado ID ${id} -> ${newData.name}`);
        updatedCount++;
      } else {
        console.warn(`⚠️ ID ${id} não encontrado ou já atualizado.`);
      }
    }

    console.log(`\n✨ Sucesso! ${updatedCount} divisões foram processadas.`);
  } catch (err) {
    console.error("❌ Erro ao atualizar nomes:", err);
  } finally {
    process.exit();
  }
}

fixClanNamesById();
