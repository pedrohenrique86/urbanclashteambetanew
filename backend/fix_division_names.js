const { query } = require("./config/database");

async function fixClanNames() {
  const mapping = {
    // 🔥 RENEGADOS (GANGSTERS)
    "Sindicato da Névoa": { name: "Divisão Sombra", desc: "Você nem percebe quando já caiu." },
    "Consórcio Escarlate": { name: "Divisão Caos", desc: "Transformamos ordem em cinzas." },
    "Irmandade do Asfalto": { name: "Divisão Ruína", desc: "Onde pisamos, nada permanece." },
    "Quimera Urbana": { name: "Divisão Fúria", desc: "Sem freio, sem pausa, só impacto." },
    "Víbora de Ébano": { name: "Divisão Eclipse", desc: "Sumimos com qualquer vestígio." },
    "Legião do Submundo": { name: "Divisão Vândalos", desc: "Marcamos território na força." },
    "Titãs de Concreto": { name: "Divisão Predadores", desc: "Você corre, a gente termina." },
    "The Gilded Vultures": { name: "Divisão Abismo", desc: "Cada passo seu é o último." },
    "Rust-Heart Syndicate": { name: "Divisão Rebeldes", desc: "Regra é só mais um alvo." },
    "Midnight Phantoms": { name: "Divisão Carnificina", desc: "A batalha sempre escala." },
    "Crimson Tide Cartel": { name: "Divisão Insurgentes", desc: "Nunca lutamos do seu jeito." },
    "The Alchemists": { name: "Divisão Fantasma", desc: "Chegamos, resolvemos, sumimos." },
    "Shadow Weavers": { name: "Divisão Anarquia", desc: "O jogo quebra quando entramos." },

    // 🛡️ GUARDIÕES (GUARDAS)
    "Baluarte da Aurora": { name: "Divisão Sentinela", desc: "Nada passa despercebido." },
    "Sentinelas de Aço": { name: "Divisão Bastião", desc: "Seguramos o que você destrói." },
    "Égide da Metrópole": { name: "Divisão Guardiões", desc: "Onde chegamos, tudo resiste." },
    "Falcões da Ordem": { name: "Divisão Vigília", desc: "Frieza que decide batalhas." },
    "Vanguarda Cívica": { name: "Divisão Aegis", desc: "Nem a escuridão atravessa." },
    "Legião da Justiça": { name: "Divisão Legião", desc: "Tomamos território em bloco." },
    "Guardiões do Zênite": { name: "Divisão Escudo", desc: "Aqui a corrida acaba." },
    "The Aegis Corps": { name: "Divisão Justiça", desc: "Cada erro seu tem sentença." },
    "Cerulean Wardens": { name: "Divisão Custódia", desc: "Tudo fica sob vigilância." },
    "Vigilant Knights": { name: "Divisão Fortaleza", desc: "Aqui a batalha encerra." },
    "The Bastion": { name: "Divisão Ordem", desc: "Sempre vencemos do nosso jeito." },
    "Phoenix Division": { name: "Divisão Vanguard", desc: "Chegamos primeiro e ficamos." },
    "Shield of Veritas": { name: "Divisão Patrulha", desc: "O controle nunca falha." }
  };

  try {
    console.log("🚀 Iniciando atualização de nomes das Divisões...");
    let updatedCount = 0;

    for (const [oldName, newData] of Object.entries(mapping)) {
      const res = await query(
        "UPDATE clans SET name = ?, description = ? WHERE name = ?",
        [newData.name, newData.desc, oldName]
      );
      if (res.rowCount > 0) {
        console.log(`✅ Atualizado: ${oldName} -> ${newData.name}`);
        updatedCount++;
      }
    }

    console.log(`\n✨ Sucesso! ${updatedCount} divisões foram renomeadas.`);
  } catch (err) {
    console.error("❌ Erro ao atualizar nomes:", err);
  } finally {
    process.exit();
  }
}

fixClanNames();
