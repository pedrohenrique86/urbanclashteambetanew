/**
 * SPECTRO NARRATIVE ENGINE - V4 (HI-FI PROTOCOL)
 * O estado da arte em narrativa para Urban Clash.
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
    "{AMBIENT} ${player_name} intercepta ${target_name} em ${setor_cidade}...",
    "{AMBIENT} Confronto iminente sob o neon de ${setor_cidade}.",
    "{AMBIENT} ${player_name} surge das sombras contra ${target_name}."
  ],
  
  interacao: [
    "...chute em destroços e",
    "...finta por trás de cabos e",
    "...dash rápido pelo óleo e"
  ],

  normal: {
    brutal: [
      "{VERB} o oponente sem piedade.",
      "Avança e {VERB} o inimigo.",
      "{VERB} ${target_name} com força bruta."
    ],
    analitico: [
      "{VERB} o alvo com precisão fria.",
      "Calcula a brecha e {VERB}.",
      "{VERB} explorando uma falha sistêmica."
    ]
  },

  critico: [
    "{CRIT} IMPACTO DEVASTADOR! {VERB} o núcleo de ${target_name}!",
    "{CRIT} GOLPE DE ELITE! {VERB} o chassi do oponente!",
    "{CRIT} SOBRECARGA! {VERB} em uma explosão de estática!"
  ],

  breach: [
    "{BREACH} DEFESA ROMPIDA! {VERB} ignorando blindagem!",
    "{BREACH} BYPASS! O sistema de ${target_name} cede ao {VERB}!",
    "{BREACH} FIREWALL DELETADO! {VERB} diretamente no kernel!"
  ],

  esquiva: [
    "{MISS} DASH! ${target_name} escapou por milímetros...",
    "{MISS} FALHA! O golpe atingiu apenas a estática.",
    "{MISS} EVASÃO! ${target_name} deslizou pelo asfalto."
  ],

  incident: [
    "[ESPECIAL : {LABEL}] Uma descarga massiva frita as sinapses!",
    "[ESPECIAL : {LABEL}] Sobrecarga de dados atinge o núcleo!",
    "[ESPECIAL : {LABEL}] Protocolo letal executado com sucesso!"
  ],

  spectro: {
    hype: [
      "{SPECTRO} \"INSANO! Que sequência, ${player_name}!\"",
      "{SPECTRO} \"Fluxo de dados da vitória garantido.\"",
      "{SPECTRO} \"Você está redefinindo o estilo de combate!\""
    ],
    preocupado: [
      "{SPECTRO} \"Cuidado! Dados vitais em queda!\"",
      "{SPECTRO} \"Kernel em risco! Manobra evasiva JÁ!\"",
      "{SPECTRO} \"Você está perdendo pacotes preciosos!\""
    ],
    frio: [
      "{SPECTRO} \"Monitoramento... ele está perdendo latência.\"",
      "{SPECTRO} \"Encerramento de protocolo favorável.\"",
      "{SPECTRO} \"Continue injetando pressão.\""
    ]
  }
};

function construirNarrativa(turno, contexto, turnData) {
  const { 
    player_name, target_name, setor_cidade, arma_equipada, 
    faction = "Renegado",
    usedFrags = new Set() 
  } = contexto;

  const archeType = (faction.toLowerCase().includes("renegado")) ? 'brutal' : 'analitico';
  
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

  let lines = [];

  if (turno === 1) {
    lines.push(pick(FRAGMENTS.intro));
    if (Math.random() > 0.5) lines.push(pick(FRAGMENTS.interacao));
  }

  if (turnData && turnData.attacker) {
    const { isCrit, isBreach, isEvaded, damage, incident } = turnData.attacker;
    let actionTxt = "";
    
    if (incident && incident.type === "SPECIAL") {
      actionTxt = pick(FRAGMENTS.incident).replace("{LABEL}", incident.label || "SOBRECARGA");
    } else if (isEvaded) {
      actionTxt = pick(FRAGMENTS.esquiva);
    } else if (isCrit) {
      actionTxt = pick(FRAGMENTS.critico);
    } else if (isBreach) {
      actionTxt = pick(FRAGMENTS.breach);
    } else {
      actionTxt = pick(FRAGMENTS.normal[archeType]);
    }

    if (actionTxt.includes("{VERB}")) {
      actionTxt = actionTxt.replace("{VERB}", pickVerb());
    }
    lines.push(actionTxt);

    const hRatio = turnData.attacker.hpAfter / turnData.attacker.maxHP;
    if (hRatio < 0.3) lines.push(pick(FRAGMENTS.spectro.preocupado));
    else if (damage > 500 || isCrit || incident) lines.push(pick(FRAGMENTS.spectro.hype));
    else lines.push(pick(FRAGMENTS.spectro.frio));
  }

  if (turno >= 5) {
     const { is_draw_dko, is_draw_flee, is_loss } = contexto;
     if (is_draw_dko) {
        lines.push("{AMBIENT} Colapso mútuo de rede detectado.");
     } else if (is_draw_flee) {
        lines.push("{AMBIENT} Sinal alvo perdido na névoa de dados.");
     } else if (is_loss) {
        lines.push("{AMBIENT} Visão escurece. O kernel adversário venceu.");
     }
  }

  let narrativa = lines.join(" ");

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
    detection: [
      "{SPECTRO} \"Sinal captado. Vulnerabilidade física detectada no kernel de defesa.\"", 
      "{SPECTRO} \"Localizei uma brecha. O chassi dele está clamando por um reformat.\"",
      "{SPECTRO} \"Alvo travado. Prepare os injetores de estática, vai ser barulhento.\"",
      "{SPECTRO} \"Interceptação tática iniciada. Não deixe sobrar um bit de resistência.\""
    ],
    victory: [
      "{SPECTRO} \"Alvo deletado. Um erro de sistema a menos para Neon City.\"", 
      "{SPECTRO} \"Protocolo finalizado. A loot é real, mas o arrependimento dele também.\"",
      "{SPECTRO} \"Execução limpa, Operador. Seus benchmarks de combate estão batendo recordes.\"",
      "{SPECTRO} \"Sinapses dele fritas em 100%. Uma obra de arte digital.\""
    ],
    timeout: [
      "{SPECTRO} \"Sinal perdido na rede. Ele se escondeu nas sombras do Mainframe.\"", 
      "{SPECTRO} \"Ele fugiu. Provavelmente está limpando o cache de medo agora.\"",
      "{SPECTRO} \"Link interrompido. Recomendo reescanear o setor imediatamente.\"",
      "{SPECTRO} \"Presa escapou. Nível de frustração: Elevado.\""
    ]
  };
  const pool = pools[category] || pools.detection;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { construirNarrativa, generateSpectroTalk };
