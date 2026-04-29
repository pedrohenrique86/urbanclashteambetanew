/**
 * SPECTRO NARRATIVE ENGINE - V4 (HI-FI PROTOCOL)
 * O estado da arte em narrativa para Urban Clash.
 * 
 * Novidades V4:
 * - Weapon Archetype Analysis (Verbos inteligentes por tipo de arma)
 * - Power-Based Archetype (Tom da narrativa muda com atributos dominantes)
 * - Highlighting Tokens (Prefixos para o frontend colorir)
 * - Environment Interaction (Ações integradas ao cenário)
 */

const WEAPON_CLASSES = {
  blade: ["Lâmina Térmica", "Mono-molécula", "Sabre de Plasma", "Adaga de Frequência"],
  firearm: ["Canhão de Pulso", "Rifle de Gauss", "Granada de Pulso EM"],
  hacker: ["Neural Linker", "Dreno de Energia", "Injetor de Vírus", "Nervo Óptico Hackeado", "Lançador de Nanites", "Dispositivo de Sobrecarga"],
  blunt: ["Bastão Eletrificado", "Exo-punho Hidráulico"]
};

const VERB_POOLS = {
  blade: ["retalha", "perfura", "fatia", "desfere um corte limpo em", "decapita os dados de", "abre uma fenda no chassi de"],
  firearm: ["dispara uma rajada contra", "descarrega o tambor em", "projeta energia cinética em", "abre fogo sobre", "bombardeia a posição de"],
  hacker: ["injeta um código malicioso em", "sobrecarrega os buffers de", "frita os circuitos neurais de", "invade o firewall de", "desliga os sistemas de"],
  blunt: ["esmaga", "tritura", "amassa a blindagem de", "colide violentamente com", "quebra a resistência física de"]
};

const FRAGMENTS = {
  intro: [
    "{AMBIENT} No coração do ${setor_cidade}, o sinal de ${target_name} oscila enquanto ${player_name} se aproxima...",
    "{AMBIENT} As sombras do ${setor_cidade} escondem o avanço tático de ${player_name} contra o alvo...",
    "{AMBIENT} Sob o neon do ${setor_cidade}, ${player_name} intercepta a frequência neural de ${target_name}...",
    "{AMBIENT} O ar pesado de ozônio no ${setor_cidade} indica que o confronto vai ser sangrento.",
    "{AMBIENT} O lixo eletrônico acumulado no ${setor_cidade} dificulta a cobertura, mas ${player_name} avança."
  ],
  
  interacao: [
    "...você chuta uma caixa de metal no ${setor_cidade} para distrair o alvo e então",
    "...aproveitando o reflexo das poças de óleo neon, você se posiciona e",
    "...usando o ruído de um drone de carga que passa baixo no ${setor_cidade}, você avança e",
    "...batendo com as costas contra uma parede pichada, você respira fundo e"
  ],

  normal: {
    brutal: [
      "...com força bruta descomunal, ${player_name} {VERB} ${target_name}...",
      "...sem um pingo de hesitação, você {VERB} o oponente...",
      "...${player_name} parte para uma execução direta e {VERB} o inimigo..."
    ],
    analitico: [
      "...calculando a trajetória neural, ${player_name} {VERB} ${target_name}...",
      "...após localizar um pixel de vulnerabilidade, você {VERB} o alvo...",
      "...movimento cirúrgico: ${player_name} {VERB} ${target_name} com precisão..."
    ]
  },

  critico: [
    "{CRIT} O IMPACTO É DEVASTADOR! A ${arma_equipada} brilha em luz branca e {VERB} o núcleo de ${target_name}!",
    "{CRIT} ACERTO DE ELITE! Você encontra uma falha catastrófica e {VERB} o oponente sem piedade!",
    "{CRIT} SOBRECARGA NEURAL! A força do seu golpe {VERB} o inimigo em uma explosão de faíscas neon!"
  ],

  breach: [
    "{BREACH} DEFESA ROMPIDA! O sistema de ${target_name} trava por um segundo enquanto você o {VERB}!",
    "{BREACH} BYPASS CONFIRMADO! Sua ${arma_equipada} ignora a blindagem e {VERB} a unidade inimiga!",
    "{BREACH} FIREWALL DELETADO! Não há proteção que segure seu avanço enquanto você {VERB} o alvo!"
  ],

  esquiva: [
    "{MISS} POR UM FIO! ${target_name} executa um dash lateral, fazendo sua ${arma_equipada} atingir apenas a estática...",
    "{MISS} ERRO DE TIMING! O oponente foi mais rápido e sua investida falhou por milímetros...",
    "{MISS} EVASÃO PERFEITA! O alvo previu seu ataque e deslizou pelo asfalto, saindo ileso."
  ],

  spectro: {
    hype: [
      "{SPECTRO} \"MINHA NOSSA! Que sequência! Você está reescrevendo o manual de combate, ${player_name}!\"",
      "{SPECTRO} \"Isso foi hipnotizante. O fluxo de dados da vitória está garantido.\"",
      "{SPECTRO} \"Alerta: Seus níveis de estilo estão sobrecarregando meus buffers!\""
    ],
    preocupado: [
      "{SPECTRO} \"Atenção, Operador. Seus batimentos estão altos e o dano dele é real. Recue se precisar.\"",
      "{SPECTRO} \"Sua integridade física está em 404. Tente uma manobra defensiva agora!\"",
      "{SPECTRO} \"Droga, ${player_name}, você está perdendo pacotes vitais. Foque no núcleo!\""
    ],
    frio: [
      "{SPECTRO} \"Monitoramento em curso. A morte dele é apenas uma questão de latência.\"",
      "{SPECTRO} \"Sinal alvo perdendo força. Execute o encerramento do protocolo.\"",
      "{SPECTRO} \"Estatísticas favoráveis. Não desperdice energia em movimentos desnecessários.\""
    ]
  }
};

function construirNarrativa(turno, contexto, turnData) {
  const { 
    player_name, target_name, setor_cidade, arma_equipada, 
    faction = "Renegado",
    usedFrags = new Set() 
  } = contexto;

  // 1. Identificar arquétipo do Jogador (Ataque vs Foco) baseado nos dados contextuais ou turnData
  // Aqui vamos de forma simplificada por facção para o tom:
  const archeType = (faction.toLowerCase().includes("renegado")) ? 'brutal' : 'analitico';
  
  // 2. Identificar Classe da Arma para Verbos
  let weaponClass = "blade";
  for (const [cls, list] of Object.entries(WEAPON_CLASSES)) {
    if (list.includes(arma_equipada)) {
      weaponClass = cls;
      break;
    }
  }
  const pickVerb = () => {
    const pool = VERB_POOLS[weaponClass];
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const pick = (pool) => {
    if (!pool || pool.length === 0) return "...";
    let frag = pool[Math.floor(Math.random() * pool.length)];
    let attempts = 0;
    while (usedFrags.has(frag) && attempts < 10) {
      frag = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    }
    usedFrags.add(frag);
    return frag;
  };

  // 3. Montar a história baseada no turnData
  let lines = [];

  // Turno 1: Introdução Tática
  if (turno === 1) {
    lines.push(pick(FRAGMENTS.intro));
    if (Math.random() > 0.5) lines.push(pick(FRAGMENTS.interacao));
  }

  // Turno 2 e 3: Desenvolvimento ou Reação
  if (turnData && turnData.attacker) {
    const { isCrit, isBreach, isEvaded, damage } = turnData.attacker;
    let actionTxt = "";
    
    if (isEvaded) actionTxt = pick(FRAGMENTS.esquiva);
    else if (isCrit) actionTxt = pick(FRAGMENTS.critico);
    else if (isBreach) actionTxt = pick(FRAGMENTS.breach);
    else actionTxt = pick(FRAGMENTS.normal[archeType]);

    // Aplicar Verbo Inteligente
    actionTxt = actionTxt.replace("{VERB}", pickVerb());
    lines.push(actionTxt);

    // Reação do Spectro
    const hRatio = turnData.attacker.hpAfter / turnData.attacker.maxHP;
    if (hRatio < 0.3) lines.push(pick(FRAGMENTS.spectro.preocupado));
    else if (damage > 350 || isCrit) lines.push(pick(FRAGMENTS.spectro.hype));
    else lines.push(pick(FRAGMENTS.spectro.frio));
  }

  // 4. Finalizações do Turno 3
  if (turno === 3) {
    const { is_draw_dko, is_draw_flee, is_loss } = contexto;
    if (is_draw_dko) {
       lines.push("{AMBIENT} Em um estouro de estática mútua, ambos colapsam no asfalto.");
       lines.push("{SPECTRO} \"Dois reboots ao mesmo tempo? Que vergonha para a rede...\"");
    } else if (is_draw_flee) {
       lines.push("{AMBIENT} Sirenes da Central de Dados ecoam. A polícia chegou.");
       lines.push("{SPECTRO} \"Abortar! Fuja antes que os scanners te peguem!\"");
    } else if (is_loss) {
       lines.push("{AMBIENT} Sua visão escurece. O kernel de ${target_name} foi superior.");
       lines.push("{SPECTRO} \"OPERADOR EM QUEDA! Iniciando modo de segurança médico...\"");
    }
  }

  // Montar Narrativa Final
  let narrativa = lines.join(" ");

  // Limpeza e Substituições
  const vars = {
    '\\${player_name}': player_name || "Desconhecido",
    '\\${target_name}': target_name || "Target",
    '\\${setor_cidade}': setor_cidade || "Distrito Baixo",
    '\\${arma_equipada}': arma_equipada || "Chip Letal"
  };

  for (const [key, val] of Object.entries(vars)) {
    narrativa = narrativa.replace(new RegExp(key, 'g'), val);
  }

  return narrativa;
}

function generateSpectroTalk(category) {
  const pools = {
    detection: ["{SPECTRO} \"Sinal captado. Ele está vulnerável.\"", "{SPECTRO} \"Localizei uma brecha. Vamos nessa.\""],
    victory: ["{SPECTRO} \"Alvo deletado. Um erro a menos.\"", "{SPECTRO} \"Protocolo finalizado. Dinheiro na conta.\""],
    timeout: ["{SPECTRO} \"Sinal perdido. Fica para a próxima.\"", "{SPECTRO} \"Ele fugiu. Vamos rastrear novamente.\""]
  };
  const pool = pools[category] || pools.detection;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { construirNarrativa, generateSpectroTalk };
