const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

const factions = [
  { id: 1, name: "renegados", display_name: "Renegados", color_hex: "#E8333A", description: "Facção do caos. Atacam territórios, desestabilizam a economia e dominam pela força." },
  { id: 2, name: "guardioes", display_name: "Guardiões", color_hex: "#3A7FE8", description: "Facção da ordem. Defendem territórios, protegem aliados e garantem estabilidade." }
];

const clansToInsert = [
  // ... (GANGSTERS)
  { id: 'g1', name: "Sindicato da Névoa", description: "Controlam as docas e o contrabando sob o véu da neblina matinal.", faction: "gangsters", faction_id: 1 },
  { id: 'g2', name: "Consórcio Escarlate", description: "Uma aliança de agiotas e apostadores que opera nos cassinos de luxo.", faction: "gangsters", faction_id: 1 },
  { id: 'g3', name: "Irmandade do Asfalto", description: "Dominam as rotas de transporte da cidade, nada entra ou sai sem a sua permissão.", faction: "gangsters", faction_id: 1 },
  { id: 'g4', name: "Quimera Urbana", description: "Especialistas em falsificação e roubos de alta tecnologia.", faction: "gangsters", faction_id: 1 },
  { id: 'g5', name: "Víbora de Ébano", description: "Um grupo matriarcal conhecido por sua rede de informantes e uso de venenos.", faction: "gangsters", faction_id: 1 },
  { id: 'g6', name: "Legião do Submundo", description: "Mercenários que oferecem seus serviços para quem pagar mais, sem fazer perguntas.", faction: "gangsters", faction_id: 1 },
  { id: 'g7', name: "Titãs de Concreto", description: "Famosos pela extorsão em grandes canteiros de obras e pela força bruta.", faction: "gangsters", faction_id: 1 },
  { id: 'g8', name: "The Gilded Vultures", description: "Eles atacam a elite da cidade, especializando-se em chantagem e espionagem corporativa.", faction: "gangsters", faction_id: 1 },
  { id: 'g9', name: "Rust-Heart Syndicate", description: "Uma equipe corajosa que controla a sucata e as peças do mercado negro do distrito industrial.", faction: "gangsters", faction_id: 1 },
  { id: 'g10', name: "Midnight Phantoms", description: "Conhecidos por assaltos tão perfeitos que é como se nunca tivessem acontecido.", faction: "gangsters", faction_id: 1 },
  { id: 'g11', name: "Crimson Tide Cartel", description: "Eles gerenciam o fluxo de mercadorias ilícitas através dos canais da cidade.", faction: "gangsters", faction_id: 1 },
  { id: 'g12', name: "The Alchemists", description: "Um grupo misterioso que fabrica e distribui drogas de rua para melhorar o desempenho.", faction: "gangsters", faction_id: 1 },
  { id: 'g13', name: "Shadow Weavers", description: "Eles manipulam a política da cidade nos bastidores, movendo os pauzinhos que ninguém mais vê.", faction: "gangsters", faction_id: 1 },

  // ... (GUARDAS)
  { id: 'u1', name: "Baluarte da Aurora", description: "A primeira linha de defesa da cidade, patrulham incansavelmente do amanhecer ao anoitecer.", faction: "guardas", faction_id: 2 },
  { id: 'u2', name: "Sentinelas de Aço", description: "Uma força de intervenção rápida equipada com a mais alta tecnologia de combate.", faction: "guardas", faction_id: 2 },
  { id: 'u3', name: "Égide da Metrópole", description: "Protegem os cidadãos e a infraestrutura crítica contra ameaças internas.", faction: "guardas", faction_id: 2 },
  { id: 'u4', name: "Falcões da Ordem", description: "Unidade de vigilância aérea e perseguição, os olhos da lei nos céus.", faction: "guardas", faction_id: 2 },
  { id: 'u5', name: "Vanguarda Cívica", description: "Especialistas em mediação de conflitos e proteção de testemunhas.", faction: "guardas", faction_id: 2 },
  { id: 'u6', name: "Legião da Justiça", description: "Detetives de elite que resolvem os casos mais complexos da cidade.", faction: "guardas", faction_id: 2 },
  { id: 'u7', name: "Guardiões do Zênite", description: "Protegem os distritos mais altos e ricos da cidade, uma força de elite impecável.", faction: "guardas", faction_id: 2 },
  { id: 'u8', name: "The Aegis Corps", description: "Uma unidade fortemente blindada que atua como o escudo imóvel da cidade contra o crime organizado.", faction: "guardas", faction_id: 2 },
  { id: 'u9', name: "Cerulean Wardens", description: "Eles patrulham os canais e portos da cidade, impedindo o contrabando e a entrada ilegal.", faction: "guardas", faction_id: 2 },
  { id: 'u10', name: "Vigilant Knights", description: "Uma delegacia conhecida por seus detetives incorruptíveis e alta taxa de resolução de casos de grande repercussão.", faction: "guardas", faction_id: 2 },
  { id: 'u11', name: "The Bastion", description: "Eles mantêm a prisão de alta segurança da cidade e são especialistas em conter os criminosos mais perigosos.", faction: "guardas", faction_id: 2 },
  { id: 'u12', name: "Phoenix Division", description: "Uma unidade especial dedicada a reconstruir e proteger distritos após grandes conflitos.", faction: "guardas", faction_id: 2 },
  { id: 'u13', name: "Shield of Veritas", description: "Uma divisão de assuntos internos que garante que todos os guardas operem com honra e integridade.", faction: "guardas", faction_id: 2 },
];

const config = [
  { key: "is_paused", value: "false" },
  { key: "game_start_time", value: "2026-05-30T15:00:00.000Z" },
  { key: "game_duration", value: "1728000" },
  { key: "is_countdown_active", value: "false" }
];

async function seed() {
  const dbs = ["dev.db", "prod.db"];
  const itemsFile = path.join(__dirname, "../backend/items_dump.json");
  const items = fs.existsSync(itemsFile) ? JSON.parse(fs.readFileSync(itemsFile, 'utf8')) : [];

  for (const dbName of dbs) {
    const dbPath = path.join(__dirname, "../", dbName);
    console.log(`🌱 Populando dados completos no banco: ${dbName}...`);
    const client = createClient({ url: `file:${dbPath}` });

    try {
      // SÊNIOR: Desativa FK durante o seed para evitar erros de ordem de inserção
      await client.execute("PRAGMA foreign_keys = OFF");

      // Factions
      await client.execute("DELETE FROM factions");
      for (const f of factions) {
        await client.execute({
          sql: "INSERT INTO factions (id, name, display_name, color_hex, description) VALUES (?, ?, ?, ?, ?)",
          args: [f.id, f.name, f.display_name, f.color_hex, f.description]
        });
      }

      // Clans
      await client.execute("DELETE FROM clans");
      for (const clan of clansToInsert) {
        await client.execute({
          sql: "INSERT INTO clans (id, name, description, faction, faction_id, max_members, is_recruiting) VALUES (?, ?, ?, ?, ?, 40, 1)",
          args: [clan.id, clan.name, clan.description, clan.faction, clan.faction_id]
        });
      }

      // Config
      await client.execute("DELETE FROM game_config");
      for (const c of config) {
        await client.execute({
          sql: "INSERT INTO game_config (key, value) VALUES (?, ?)",
          args: [c.key, c.value]
        });
      }

      // Items
      await client.execute("DELETE FROM items");
      for (const item of items) {
        await client.execute({
          sql: `INSERT INTO items (id, code, name, description, type, rarity, base_price, market_stock, base_attack_bonus, base_defense_bonus, base_focus_bonus, base_energy_bonus, is_tradeable, is_lootable, icon_url) 
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
      console.log(`✅ Seed completo concluído em ${dbName} (${items.length} itens).`);
    } catch (err) {
      console.error(`❌ Erro ao popular ${dbName}:`, err.message);
    }
  }
}

seed();
