/**
 * SPECTRO NARRATIVE ENGINE - V3 (NARRATIVA REATIVA)
 * Sistema de geração combinatória baseado em eventos reais de combate.
 * 
 * Estilos:
 * - Militar (Geralmente Guardiões)
 * - Caótico (Geralmente Renegados)
 */

const FRAGMENTS = {
  ambiente: [
    "No coração do ${setor_cidade}, o sinal de ${target_name} oscila enquanto ${player_name} se aproxima...",
    "As sombras do ${setor_cidade} escondem o avanço tático de ${player_name} contra o alvo...",
    "Sob o neon do ${setor_cidade}, ${player_name} intercepta a frequência neural de ${target_name}...",
    "A chuva do ${setor_cidade} silencia os passos de ${player_name} na direção de ${target_name}...",
    "Perímetro de segurança do ${setor_cidade} violado. ${player_name} em rota de interceptação...",
    "O ar pesado de ozônio no ${setor_cidade} indica que o confronto vai ser sangrento.",
    "Sensores térmicos no ${setor_cidade} confirmam: ${target_name} não tem para onde fugir.",
    "Luzes estroboscópicas de um drone de patrulha iluminam o beco no ${setor_cidade} por um segundo.",
    "Um outdoor de realidade aumentada no ${setor_cidade} projeta falhas gráficas sobre a silhueta de ${player_name}.",
    "O lixo eletrônico acumulado no ${setor_cidade} dificulta a cobertura, mas ${player_name} avança."
  ],
  
  // Ações Normais (Ataque Padrão)
  normal: {
    militar: [
      "...${player_name} desfere uma sequência tática, buscando os pontos fracos do alvo...",
      "...sincronizando o movimento das pernas, você ataca com precisão técnica...",
      "...um golpe direto focado no centro de massa de ${target_name} é executado...",
      "...movimentação circular padrão de combate urbano, ${player_name} conecta o golpe...",
      "...protocolo de assalto iniciado: você projeta a ${arma_equipada} contra o oponente."
    ],
    caotico: [
      "...num surto de adrenalina, ${player_name} parte pra cima sem pensar duas vezes...",
      "...você solta um grito de raiva enquanto brande a ${arma_equipada} violentamente...",
      "...${player_name} tenta um golpe sujo, visando as articulações de ${target_name}...",
      "...com um sorriso sádico, você descarrega a fúria da ${arma_equipada}...",
      "...em um movimento imprevisível, você tenta atropelar a defesa de ${target_name}."
    ]
  },

  // Eventos Especiais (Reativos ao turnData)
  critico: [
    "...O IMPACTO É BRUTAL! A ${arma_equipada} explode em uma sobrecarga de energia pura...",
    "...UM ACERTO LIMPO! Você perfura o núcleo vital, causando um dano crítico massivo...",
    "...CRÍTICO! Faíscas neon e pedaços de armadura voam com a força do seu golpe...",
    "...Sincronização perfeita! Seus neurônios e a ${arma_equipada} agem como um só no acerto...",
    "...O som de metal retorcido ecoa: você atingiu um ponto de falha catastrófica no inimigo!"
  ],
  
  breach: [
    "...BREACH! O firewall defensivo de ${target_name} desmorona diante do seu ataque...",
    "...QUEBRA DE DEFESA! Você ignora a blindagem do oponente como se fosse papel...",
    "...Vulnerabilidade detectada e explorada! O golpe atravessa a mitigação sem resistência...",
    "...A proteção de ${target_name} sofre uma pane sistêmica sob a pressão da sua ${arma_equipada}..."
  ],

  esquiva: [
    "...por um milissegundo de latência, o oponente passou raspando pela sua lâmina...",
    "...${target_name} executa uma manobra de dash lateral, fazendo você atingir apenas o ar...",
    "...ERRO DE CÁLCULO! O alvo se moveu mais rápido que seus sensores processaram...",
    "...O golpe foi forte, mas a agilidade de ${target_name} foi superior neste movimento..."
  ],

  // Reações do Spectro
  spectro: {
    bom: [
      "Spectro: \"Belo movimento. A integridade dele está despencando!\"",
      "Spectro: \"Isso! Siga o rastro de dados, ele está entrando em colapso.\"",
      "Spectro: \"Eficiência de processamento impecável, ${player_name}. Continue assim.\"",
      "Spectro: \"Sinto o cheiro de circuitos queimados daqui. Excelente.\""
    ],
    ruim: [
      "Spectro: \"Mantenha o foco! O kernel dele está resistindo mais do que eu previ.\"",
      "Spectro: \"Se continuar errando assim, eu mesmo vou ter que assumir o controle.\"",
      "Spectro: \"Tente não morrer, ${player_name}. Eu odeio ter que formatar novos hospedeiros.\"",
      "Spectro: \"Otimize sua rota de ataque. Você está parecendo um script de nível 1.\""
    ],
    neutro: [
      "Spectro: \"Monitorando fluxo de dados. O combate atingiu o clímax.\"",
      "Spectro: \"Lembre-se: no Urban Clash, só o último bit em pé importa.\"",
      "Spectro: \"Sinal estável. Mantenha a pressão constante.\""
    ]
  },

  // Impactos Finais (Visual)
  impacto: [
    "...poças de óleo e sangue neon se espalham pelo asfalto.",
    "...o ruído branco de estática paira no ar após o choque.",
    "...luzes de emergência de prédios próximos piscam em resposta ao combate.",
    "...a temperatura no local sobe, distorcendo a visão tática."
  ]
};

function construirNarrativa(turno, contexto, turnData) {
  const { 
    player_name, target_name, setor_cidade, arma_equipada, 
    is_rare, is_draw_dko, is_draw_flee, is_loss, 
    faction = "Renegado",
    usedFrags = new Set() 
  } = contexto;

  const style = (faction.toLowerCase().includes("renegado") || faction.toLowerCase().includes("kaos")) ? 'caotico' : 'militar';
  
  // Função helper para pegar fragmentos sem repetir na mesma luta
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

  // 1. Construir Introdução (Apenas Turno 1) ou Ambientação Progressiva
  let p1 = turno === 1 ? pick(FRAGMENTS.ambiente) : "";
  
  // 2. Construir Ação Reativa (O QUE REALMENTE ACONTECEU NO TURNO)
  let p2 = "";
  if (turnData) {
    const { isCrit, isBreach, isEvaded, damage } = turnData.attacker || {};
    
    if (isEvaded) {
       p2 = pick(FRAGMENTS.esquiva);
    } else if (isCrit) {
       p2 = pick(FRAGMENTS.critico);
    } else if (isBreach) {
       p2 = pick(FRAGMENTS.breach);
    } else {
       p2 = pick(FRAGMENTS.normal[style]);
    }
  } else {
    p2 = pick(FRAGMENTS.normal[style]);
  }

  // 3. Comentário do Spectro baseado na performance
  let p3 = "";
  if (turnData && turnData.attacker) {
    const hRatio = turnData.attacker.hpAfter / turnData.attacker.maxHP;
    if (hRatio < 0.3) p3 = pick(FRAGMENTS.spectro.ruim);
    else if (turnData.attacker.damage > 300) p3 = pick(FRAGMENTS.spectro.bom);
    else p3 = pick(FRAGMENTS.spectro.neutro);
  } else {
    p3 = pick(FRAGMENTS.spectro.neutro);
  }

  // 4. Detalhe visual (Impacto)
  let p4 = pick(FRAGMENTS.impacto);

  // 5. Finalizações Especiais (Turno 3)
  if (turno === 3) {
    if (is_draw_dko) {
      p2 = "...em um choque mútuo, ambos desferem o golpe final ao mesmo tempo...";
      p4 = "...o impacto duplo faz o sistema colapsar, jogando vocês dois no chão.";
      p3 = "Spectro: \"Dois KO? Sério? Parabéns, vocês dois perderam ao mesmo tempo. Que desperdício de dados.\"";
    } else if (is_draw_flee) {
      p2 = "...quando você ia finalizar, sirenes da SWAT-Net cortam o ar...";
      p4 = "...a polícia chega na festa e vocês dois precisam fugir em direções opostas.";
      p3 = "Spectro: \"ABORTAR! A polícia chegou. Saiam daí antes que eu seja formatado e vendido como sucata!\"";
    } else if (is_loss) {
      p2 = `...sua arma falha no momento crucial, dando brecha para ${target_name} finalizar...`;
      p4 = "...o choque do impacto desativa seus sistemas. A visão escurece lentamente.";
      p3 = `Spectro: \"ALERTA CRÍTICO! Você foi deletado do plano físico, ${player_name}. Reencerrando conexão...\"`;
    }
  }

  // Montagem Dinâmica de Estrutura (Variar a ordem para não ser sempre igual)
  let narrativa = "";
  const roll = Math.random();
  if (roll < 0.33) {
    narrativa = `${p1} ${p2} ${p4} ${p3}`;
  } else if (roll < 0.66) {
    narrativa = `${p3} ${p1} ${p2} ${p4}`;
  } else {
    narrativa = `${p1} ${p2} ${p3} ${p4}`;
  }
  
  // Limpeza de espaços extras
  narrativa = narrativa.trim().replace(/\s\s+/g, ' ');

  // Substituições de Variáveis
  const vars = {
    '\\${player_name}': player_name || "Operador",
    '\\${target_name}': target_name || "Host-Alvo",
    '\\${setor_cidade}': setor_cidade || "Distrito Zero",
    '\\${arma_equipada}': arma_equipada || "Lâmina Neural"
  };

  for (const [key, val] of Object.entries(vars)) {
    narrativa = narrativa.replace(new RegExp(key, 'g'), val);
  }

  return narrativa;
}

function generateSpectroTalk(category) {
  const pools = {
    detection: ["Sinal captado. Alvo vulnerável.", "Localizei uma brecha. Vamos nessa.", "Alvo rastreado. Não perca o sinal."],
    victory: ["Execução terminada. Dinheiro na conta.", "Alvo deletado. Um erro a menos no mainframe.", "Protocolo ganho. Spectro fora."],
    timeout: ["Sinal perdido. Ele escapou.", "Conexão interrompida. Fica pra próxima.", "O alvo entrou em modo furtivo e sumiu."]
  };
  const pool = pools[category] || pools.detection;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { construirNarrativa, generateSpectroTalk };
