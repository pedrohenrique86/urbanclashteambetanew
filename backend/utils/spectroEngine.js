/**
 * SPECTRO NARRATIVE ENGINE - V2
 * Gerador de narrativa combinatória 50% Militar / 50% Engraçado.
 * Sistema Anti-Repetição baseado em Pool Dinâmica.
 */

const FRAGMENTS = {
  turno1: {
    militar: {
      ambiente: [
        "No coração do ${setor_cidade}, o sinal de ${target_name} oscila enquanto ${player_name} se aproxima...",
        "As sombras do ${setor_cidade} escondem o avanço tático de ${player_name} contra o alvo...",
        "Sob o neon do ${setor_cidade}, ${player_name} intercepta a frequência neural de ${target_name}...",
        "A chuva do ${setor_cidade} silencia os passos de ${player_name} na direção de ${target_name}...",
        "Perímetro de segurança do ${setor_cidade} violado. ${player_name} em rota de interceptação..."
      ],
      acao: [
        "...você ajusta o foco dos seus implantes oculares enquanto saca sua ${arma_equipada}...",
        "...calibrando a sensibilidade táctil das luvas, ${player_name} empunha a ${arma_equipada} com precisão...",
        "...sua interface neural projeta vetores de ataque enquanto a ${arma_equipada} inicia o carregamento...",
        "...com a respiração controlada, ${player_name} aguarda o momento perfeito para revelar a ${arma_equipada}..."
      ],
      spectro: [
        "Spectro: \"Sinal visual confirmado. Não erre o primeiro bit, ${player_name}.\"",
        "Spectro: \"Execute com frieza. No Acerto de Contas, não existe botão de pause.\"",
        "Spectro: \"Buffer de memória do alvo escaneado. Ele está instável hoje.\"",
        "Spectro: \"Iniciando protocolo de análise. Tente ser eficiente.\""
      ]
    },
    engracado: {
      ambiente: [
        "O cheiro de macarrão instantâneo no ${setor_cidade} indica que ${target_name} estava jantando agora...",
        "No ${setor_cidade}, um drone de entrega quase atropela ${player_name} enquanto ele tenta ser furtivo...",
        "Uma placa de publicidade quebrada no ${setor_cidade} pisca 'PROMOÇÃO DE FUNERAIS' para ${target_name}...",
        "O sinal do GPS do seu deck no ${setor_cidade} insiste que ${target_name} está dentro de um bueiro..."
      ],
      acao: [
        "...você quase tropeça num gato de rua enquanto tentava fazer pose com sua ${arma_equipada}...",
        "...${player_name} tenta fazer um giro estiloso com a ${arma_equipada} e quase a deixa cair...",
        "...você murmura 'papai chegou' enquanto limpa o suor do visor da ${arma_equipada}...",
        "...você ativa a ${arma_equipada} e o som de inicialização é um 'miau' por erro de driver..."
      ],
      spectro: [
        "Spectro: \"Misericórdia, ${player_name}. Sua furtividade é igual a de um elefante bêbado.\"",
        "Spectro: \"Se você morrer para esse noob, eu vou contar pra todo mundo que você usa Windows XP.\"",
        "Spectro: \"O nível de QI desse ${target_name} é tão baixo que o meu antivírus achou que ele era um bug.\"",
        "Spectro: \"Eu apostei 50 créditos que você ia errar o saque. Quase ganhei agora.\""
      ]
    },
    impacto: [
      "...o rastreador apita: vocês estão em rota de colisão iminente.",
      "...faíscas revelam que o alvo percebeu sua presença tarde demais.",
      "...o sensor capta a pulsação de ${target_name} acelerando conforme você fecha o cerco."
    ]
  },
  turno2: {
    militar: {
      ambiente: [
        "O asfalto estilhaça sob a pressão do combate frenético no coração do ${setor_cidade}...",
        "Reflexos de luzes estroboscópicas transformam o beco do ${setor_cidade} em um caos tático...",
        "A temperatura corporal sobe exponencialmente enquanto a adrenalina inunda o sistema no ${setor_cidade}..."
      ],
      acao: [
        "...${player_name} desfere uma sequência brutal, perfurando a defesa de ${target_name} com a ${arma_equipada}...",
        "...um giro rápido de ${player_name} conecta a ${arma_equipada} aos cabos neurais de ${target_name}...",
        "...você sobrecarrega o capacitor da ${arma_equipada} para um choque crítico em ${target_name}..."
      ],
      spectro: [
        "Spectro: \"Belo golpe! A integridade estrutural dele está caindo mais rápido que servidor da Ubisoft.\"",
        "Spectro: \"A resistência dele é fútil. É como tentar segurar um DDOS com um firewall de papel.\"",
        "Spectro: \"O kernel dele está entrando em colapso total. Continue!\""
      ]
    },
    engracado: {
      ambiente: [
        "Um drone de limpeza tenta limpar o sangue enquanto ${player_name} luta no ${setor_cidade}...",
        "A luta se desloca para cima de um carrinho de hot-dog abandonado no ${setor_cidade}...",
        "Um holograma de TV passa uma propaganda de xampu bem na hora do golpe no ${setor_cidade}..."
      ],
      acao: [
        "...você tenta dar um chute voador mas sua perna cibernética dá um 'estalo' de dobradiça velha...",
        "...${player_name} acerta o alvo enquanto grita o nome da sua avó por puro susto...",
        "...sua ${arma_equipada} faz um som de 'quack' ao conectar no ombro de ${target_name}..."
      ],
      spectro: [
        "Spectro: \"Eu já vi brigas de robôs de cozinha com mais estilo que isso, mas o estrago foi bom.\"",
        "Spectro: \"A bateria do meu processador está acabando de tanto rir dessa sua 'técnica'.\"",
        "Spectro: \"Se o objetivo era deixar ele confuso com sua dancinha de combate, você está vencendo.\""
      ]
    },
    impacto: [
      "...blindagem inimiga racha sob a pressão constante.",
      "...líquido lubrificante neon espirra para todos os lados com o soco.",
      "...o sistema de áudio capta um grito distorcido e digitalizado do oponente."
    ]
  },
  turno3: {
    militar: {
      ambiente: [
        "Com o sinal de ${target_name} piscando em vermelho terminal no radar do ${setor_cidade}...",
        "Finalmente, o registro confirma: ${target_name} está diante do log-off no ${setor_cidade}...",
        "O silêncio retorna ao ${setor_cidade} enquanto as luzes vitais de ${target_name} se apagam..."
      ],
      acao: [
        "...você canaliza toda a energia restante no núcleo da ${arma_equipada} para o golpe final...",
        "...um último pulso de energia letal atravessa a barreira neural e encerra a vida de ${target_name}...",
        "...com a frieza de um executor de elite, você usa a ${arma_equipada} para deletar o alvo..."
      ],
      spectro: [
        "Spectro: \"Execução terminada. Menos um erro no meu kernel. Bom trabalho.\"",
        "Spectro: \"Alvo deletado. Os créditos já estão na conta. Não gaste tudo em skins.\"",
        "Spectro: \"Veredito: Culpa confirmada, sentença executada. Eficiência pura.\""
      ]
    },
    engracado: {
      ambiente: [
        "O corpo de ${target_name} cai de cara numa poça de lama tóxica no ${setor_cidade}...",
        "No ${setor_cidade}, o sinal dele some e a última coisa que ele vê é seu rosto de cansaço...",
        "A última transmissão de ${target_name} no ${setor_cidade} foi apenas um emoji de tchauzinho..."
      ],
      acao: [
        "...você dá um tapa na cara de ${target_name} com a ${arma_equipada} só por humilhação extra...",
        "...${player_name} finaliza o serviço e percebe que o sapato do alvo é falsificado...",
        "...você executa o comando 'Alt+F4' físico com sua ${arma_equipada} no pescoço dele..."
      ],
      spectro: [
        "Spectro: \"Isso foi... ridículo. Mas pelo menos você não morreu hoje.\"",
        "Spectro: \"Eu ia dizer algo heróico, mas você está com a braguilha aberta. Perdeu o clima.\"",
        "Spectro: \"Em caso de processo judicial, eu sou apenas um sistema e você é o assassino. Fui!\""
      ]
    },
    impacto: [
      "...o corpo cai sem vida no lodo, enquanto os créditos caem na sua conta.",
      "...uma última mensagem de erro surge no visor dele: 'System Failure'.",
      "...o sistema registra a baixa. Alvo removido do servidor municipal."
    ]
  }
};

function construirNarrativa(turno, contexto) {
  const { player_name, target_name, setor_cidade, arma_equipada, is_rare, is_draw_dko, is_draw_flee, is_loss, usedFrags = new Set() } = contexto;
  const turnKey = `turno${turno}`;
  const frags = FRAGMENTS[turnKey];

  if (!frags) return "Erro no Motor: Turno inválido.";

  // Função para pegar fragmento único
  const getUniqueFrag = (category) => {
    const style = Math.random() > 0.5 ? 'militar' : 'engracado';
    const arr = category === 'impacto' ? frags.impacto : (frags[style] ? frags[style][category] : null);
    
    if (!arr || !Array.isArray(arr)) return "...";

    let frag = "";
    let attempts = 0;
    do {
      frag = arr[Math.floor(Math.random() * arr.length)];
      attempts++;
    } while (usedFrags.has(frag) && attempts < 10);
    
    usedFrags.add(frag);
    return frag;
  };

  let p1 = getUniqueFrag('ambiente');
  let p2 = getUniqueFrag('acao');
  let p3 = getUniqueFrag('impacto');
  let p4 = getUniqueFrag('spectro');

  // Lógicas de Finalização
  if (turno === 3) {
    if (is_draw_dko) {
      p2 = "...em um choque mútuo, ambos desferem o golpe final ao mesmo tempo...";
      p3 = "...o impacto duplo faz o sistema colapsar, jogando vocês dois no chão.";
      p4 = "Spectro: \"Dois KO? Sério? Parabéns, vocês dois perderam ao mesmo tempo.\"";
    } else if (is_draw_flee) {
      p2 = "...quando você ia finalizar, sirenes da SWAT-Net cortam o ar...";
      p3 = "...a polícia chega na festa e vocês dois precisam fugir em direções opostas.";
      p4 = "Spectro: \"ABORTAR! A polícia chegou. Saiam daí antes que eu seja formatado!\"";
    } else if (is_loss) {
      p2 = `...sua arma falha no momento crucial, dando brecha para ${target_name} finalizar...`;
      p3 = "...o choque do impacto desativa seus sistemas. A visão escurece lentamente.";
      p4 = `Spectro: \"NÃO! Você foi deletado, ${player_name}. Voltando para o modo de segurança...\"`;
    }
  }

  // Montagem e substituição
  let narrativa = `${p1} ${p2} ${p3} ${p4}`;
  
  const vars = {
    '\\${player_name}': player_name || "Desconhecido",
    '\\${target_name}': target_name || "Alvo",
    '\\${setor_cidade}': setor_cidade || "Setor 7",
    '\\${arma_equipada}': arma_equipada || "Lâmina Térmica"
  };

  for (const [key, val] of Object.entries(vars)) {
    narrativa = narrativa.replace(new RegExp(key, 'g'), val);
  }

  return narrativa;
}

function generateSpectroTalk(category) {
  const pools = {
    detection: ["Sinal captado. Alvo vulnerável.", "Localizei uma brecha. Vamos nessa."],
    victory: ["Execução terminada. Créditos na conta.", "Alvo deletado. Um erro a menos."],
    timeout: ["Sinal perdido. Ele escapou.", "Conexão interrompida. Fica pra próxima."]
  };
  const pool = pools[category] || pools.detection;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = { construirNarrativa, generateSpectroTalk };
