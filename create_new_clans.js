const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'urbanclash',
  password: 'W0rdPr355@@',
  port: 5432,
});

// Clãs de Gangsters
const gangsterClans = [
  {
    name: 'Família Corleone',
    description: 'Uma das famílias mais poderosas e respeitadas do submundo criminal.',
    faction: 'gangsters'
  },
  {
    name: 'Cartel de Medellín',
    description: 'Organização criminosa especializada em tráfico e operações de alto risco.',
    faction: 'gangsters'
  },
  {
    name: 'Yakuza Dragons',
    description: 'Clã tradicional japonês com códigos de honra e disciplina rígida.',
    faction: 'gangsters'
  },
  {
    name: 'Máfia Russa',
    description: 'Grupo criminoso conhecido por sua brutalidade e eficiência.',
    faction: 'gangsters'
  },
  {
    name: 'Los Hermanos',
    description: 'Irmandade latina unida por laços de sangue e lealdade.',
    faction: 'gangsters'
  },
  {
    name: 'Black Serpents',
    description: 'Organização sombria que opera nas ruas mais perigosas da cidade.',
    faction: 'gangsters'
  },
  {
    name: 'Triads do Dragão',
    description: 'Sociedade secreta chinesa com tradições milenares.',
    faction: 'gangsters'
  },
  {
    name: 'Cosa Nostra',
    description: 'A verdadeira máfia siciliana com tradições ancestrais.',
    faction: 'gangsters'
  },
  {
    name: 'Wolves Pack',
    description: 'Matilha urbana que caça em grupo pelas ruas da cidade.',
    faction: 'gangsters'
  },
  {
    name: 'Camorra Napolitana',
    description: 'Organização criminosa napolitana com forte presença territorial.',
    faction: 'gangsters'
  },
  {
    name: 'Blood Brothers',
    description: 'Irmandade selada em sangue com juramentos eternos.',
    faction: 'gangsters'
  },
  {
    name: 'Cartel dos Ventos',
    description: 'Grupo ágil e imprevisível como o vento que os nomeia.',
    faction: 'gangsters'
  },
  {
    name: 'Shadow Syndicate',
    description: 'Sindicato que opera nas sombras da sociedade.',
    faction: 'gangsters'
  }
];

// Clãs de Guardas
const guardasClans = [
  {
    name: 'Força Elite',
    description: 'Unidade de elite especializada em operações de alto risco.',
    faction: 'guardas'
  },
  {
    name: 'Escudo Dourado',
    description: 'Força de proteção com tradição e honra inabaláveis.',
    faction: 'guardas'
  },
  {
    name: 'Guardiões da Lei',
    description: 'Defensores incorruptíveis da justiça e da ordem.',
    faction: 'guardas'
  },
  {
    name: 'SWAT Alpha',
    description: 'Equipe tática de resposta rápida para situações extremas.',
    faction: 'guardas'
  },
  {
    name: 'Sentinelas Urbanas',
    description: 'Vigilantes dedicados à proteção dos cidadãos.',
    faction: 'guardas'
  },
  {
    name: 'Blue Steel',
    description: 'Força policial de aço com determinação inabalável.',
    faction: 'guardas'
  },
  {
    name: 'Águias da Justiça',
    description: 'Observadores atentos que voam alto em busca da verdade.',
    faction: 'guardas'
  },
  {
    name: 'Ordem e Progresso',
    description: 'Defensores do progresso social através da manutenção da ordem.',
    faction: 'guardas'
  },
  {
    name: 'Iron Shield',
    description: 'Escudo de ferro que protege os inocentes dos criminosos.',
    faction: 'guardas'
  },
  {
    name: 'Cavaleiros da Paz',
    description: 'Modernos cavaleiros dedicados à manutenção da paz.',
    faction: 'guardas'
  },
  {
    name: 'Força Especial',
    description: 'Unidade especial treinada para missões impossíveis.',
    faction: 'guardas'
  },
  {
    name: 'Guardiões do Amanhã',
    description: 'Protetores do futuro através da justiça presente.',
    faction: 'guardas'
  },
  {
    name: 'Phoenix Squad',
    description: 'Esquadrão que renasce das cinzas para proteger a cidade.',
    faction: 'guardas'
  }
];

async function updateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Conectado ao banco de dados PostgreSQL');
    
    // Deletar clãs existentes
    console.log('Removendo clãs existentes...');
    await client.query('DELETE FROM clans');
    
    // Inserir novos clãs de gangsters
    console.log('Inserindo clãs de gangsters...');
    for (const clan of gangsterClans) {
      await client.query(
        'INSERT INTO clans (name, description, faction, max_members, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [clan.name, clan.description, clan.faction, 40]
      );
    }
    
    // Inserir novos clãs de guardas
    console.log('Inserindo clãs de guardas...');
    for (const clan of guardasClans) {
      await client.query(
        'INSERT INTO clans (name, description, faction, max_members, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [clan.name, clan.description, clan.faction, 40]
      );
    }
    
    // Atualizar valor padrão para max_members
    console.log('Atualizando valor padrão para max_members...');
    await client.query('ALTER TABLE clans ALTER COLUMN max_members SET DEFAULT 40');
    
    console.log('\n✅ Banco de dados atualizado com sucesso!');
    console.log(`📊 Total de clãs criados: ${gangsterClans.length + guardasClans.length}`);
    console.log(`🔫 Clãs de Gangsters: ${gangsterClans.length}`);
    console.log(`🛡️ Clãs de Guardas: ${guardasClans.length}`);
    console.log('👥 Cada clã suporta 40 membros');
    
  } catch (error) {
    console.error('❌ Erro ao atualizar banco de dados:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateDatabase();