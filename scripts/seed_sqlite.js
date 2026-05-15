const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

/**
 * SÊNIOR: Script de Seed Remoto
 * Alimenta o banco da VM diretamente com dados iniciais (Factions, Clans, Config, Items).
 */

const factions = [
  { id: 1, name: "renegados", display_name: "Renegados", color_hex: "#E8333A", description: "Facção do caos." },
  { id: 2, name: "guardioes", display_name: "Guardiões", color_hex: "#3A7FE8", description: "Facção da ordem." }
];

const clansToInsert = [
  // 🔥 RENEGADOS (GANGSTERS)
  { id: 'g1', name: "Divisão Sombra", description: "Você nem percebe quando já caiu.", faction: "renegados", faction_id: 1 },
  { id: 'g2', name: "Divisão Caos", description: "Transformamos ordem em cinzas.", faction: "renegados", faction_id: 1 },
  { id: 'g3', name: "Divisão Ruína", description: "Onde pisamos, nada permanece.", faction: "renegados", faction_id: 1 },
  { id: 'g4', name: "Divisão Fúria", description: "Sem freio, sem pausa, só impacto.", faction: "renegados", faction_id: 1 },
  { id: 'g5', name: "Divisão Eclipse", description: "Sumimos com qualquer vestígio.", faction: "renegados", faction_id: 1 },
  { id: 'g6', name: "Divisão Vândalos", description: "Marcamos território na força.", faction: "renegados", faction_id: 1 },
  { id: 'g7', name: "Divisão Predadores", description: "Você corre, a gente termina.", faction: "renegados", faction_id: 1 },
  { id: 'g8', name: "Divisão Abismo", description: "Cada passo seu é o último.", faction: "renegados", faction_id: 1 },
  { id: 'g9', name: "Divisão Rebeldes", description: "Regra é só mais um alvo.", faction: "renegados", faction_id: 1 },
  { id: 'g10', name: "Divisão Carnificina", description: "A batalha sempre escala.", faction: "renegados", faction_id: 1 },
  { id: 'g11', name: "Divisão Insurgentes", description: "Nunca lutamos do seu jeito.", faction: "renegados", faction_id: 1 },
  { id: 'g12', name: "Divisão Fantasma", description: "Chegamos, resolvemos, sumimos.", faction: "renegados", faction_id: 1 },
  { id: 'g13', name: "Divisão Anarquia", description: "O jogo quebra quando entramos.", faction: "renegados", faction_id: 1 },

  // 🛡️ GUARDIÕES (GUARDAS)
  { id: 'u1', name: "Divisão Sentinela", description: "Nada passa despercebido.", faction: "guardioes", faction_id: 2 },
  { id: 'u2', name: "Divisão Bastião", description: "Seguramos o que você destrói.", faction: "guardioes", faction_id: 2 },
  { id: 'u3', name: "Divisão Guardiões", description: "Onde chegamos, tudo resiste.", faction: "guardioes", faction_id: 2 },
  { id: 'u4', name: "Divisão Vigília", description: "Frieza que decide batalhas.", faction: "guardioes", faction_id: 2 },
  { id: 'u5', name: "Divisão Aegis", description: "Nem a escuridão atravessa.", faction: "guardioes", faction_id: 2 },
  { id: 'u6', name: "Divisão Legião", description: "Tomamos território em bloco.", faction: "guardioes", faction_id: 2 },
  { id: 'u7', name: "Divisão Escudo", description: "Aqui a corrida acaba.", faction: "guardioes", faction_id: 2 },
  { id: 'u8', name: "Divisão Justiça", description: "Cada erro seu tem sentença.", faction: "guardioes", faction_id: 2 },
  { id: 'u9', name: "Divisão Custódia", description: "Tudo fica sob vigilância.", faction: "guardioes", faction_id: 2 },
  { id: 'u10', name: "Divisão Fortaleza", description: "Aqui a batalha encerra.", faction: "guardioes", faction_id: 2 },
  { id: 'u11', name: "Divisão Ordem", description: "Sempre vencemos do nosso jeito.", faction: "guardioes", faction_id: 2 },
  { id: 'u12', name: "Divisão Vanguard", description: "Chegamos primeiro e ficamos.", faction: "guardioes", faction_id: 2 },
  { id: 'u13', name: "Divisão Patrulha", description: "O controle nunca falha.", faction: "guardioes", faction_id: 2 }
];

async function seed() {
  const databaseUrl = process.env.LIBSQL_URL;
  const authToken = process.env.LIBSQL_AUTH_TOKEN || "";

  if (!databaseUrl) {
    console.error("❌ Erro: LIBSQL_URL não encontrada!");
    return;
  }

  console.log(`🌱 [Seed Remoto] Alvo: ${databaseUrl}`);
  const client = createClient({ url: databaseUrl, authToken });

  const itemsFile = path.join(__dirname, "../backend/items_dump.json");
  const items = fs.existsSync(itemsFile) ? JSON.parse(fs.readFileSync(itemsFile, 'utf8')) : [];

  try {
    await client.execute("PRAGMA foreign_keys = OFF");

    // Clans (Garantindo que existam)
    console.log("📦 Inserindo facções e clãs...");
    for (const f of factions) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO factions (id, name, display_name, color_hex, description) VALUES (?, ?, ?, ?, ?)",
        args: [f.id, f.name, f.display_name, f.color_hex, f.description]
      });
    }

    for (const clan of clansToInsert) {
      await client.execute({
        sql: "INSERT OR REPLACE INTO clans (id, name, description, faction, faction_id, max_members, is_recruiting) VALUES (?, ?, ?, ?, ?, 40, 1)",
        args: [clan.id, clan.name, clan.description, clan.faction, clan.faction_id]
      });
    }

    // Items
    console.log(`📦 Inserindo ${items.length} itens no mercado...`);
    for (const item of items) {
      await client.execute({
        sql: `INSERT OR REPLACE INTO items (id, code, name, description, type, rarity, base_price, market_stock, base_attack_bonus, base_defense_bonus, base_focus_bonus, base_energy_bonus, is_tradeable, is_lootable, icon_url) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id, item.code, item.name, item.description, item.type, item.rarity, 
          item.base_price, item.market_stock, item.base_attack_bonus, item.base_defense_bonus, 
          item.base_focus_bonus, item.base_energy_bonus, 
          item.is_tradeable ? 1 : 0, item.is_lootable ? 1 : 0, item.icon_url
        ]
      });
    }

    await client.execute("PRAGMA foreign_keys = ON");
    console.log(`✅ [Seed Remoto] Concluído com sucesso.`);
  } catch (err) {
    console.error(`❌ [Seed Remoto] Erro:`, err.message);
  }
}

seed();
