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
  { id: 'g1', name: "Sindicato da Névoa", description: "Docas e contrabando.", faction: "gangsters", faction_id: 1 },
  { id: 'g2', name: "Consórcio Escarlate", description: "Agiotas e apostadores.", faction: "gangsters", faction_id: 1 },
  { id: 'g3', name: "Irmandade do Asfalto", description: "Rotas de transporte.", faction: "gangsters", faction_id: 1 },
  { id: 'u1', name: "Baluarte da Aurora", description: "Primeira linha de defesa.", faction: "guardas", faction_id: 2 },
  { id: 'u2', name: "Sentinelas de Aço", description: "Intervenção rápida.", faction: "guardas", faction_id: 2 }
  // ... (Simplificado para brevidade, mas o original tinha mais itens)
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
