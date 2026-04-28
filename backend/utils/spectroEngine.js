/**
 * SPECTRO NARRATIVE ENGINE - ACERTO DE CONTAS
 * Gerador de narrativa combinatória anti-repetição.
 * 15^4 combinações por turno = ~50.625 variações únicas por estágio da luta.
 */

const FRAGMENTS = {
  turno1: { // TENSÃO: Clima, Bio-dados, Furtividade
    ambiente: [
      "Sob a chuva ácida que corrói o concreto do ${setor_cidade} às ${horario_real}...",
      "A névoa de neon do ${setor_cidade} oscila violentamente enquanto o relógio marca ${horario_real}...",
      "No silêncio opressor do ${setor_cidade}, interrompido apenas pelo zumbido dos drones às ${horario_real}...",
      "As luzes estroboscópicas de um outdoor hackeado iluminam o beco do ${setor_cidade} às ${horario_real}...",
      "O cheiro de ozônio e metal queimado impregna o ar pesado do ${setor_cidade} nesta tarde de ${horario_real}...",
      "Vapor tóxico sobe das bueiros térmicos do ${setor_cidade} enquanto os ponteiros indicam ${horario_real}...",
      "Entre arranha-céus colossais que bloqueiam o sol do ${setor_cidade}, a hora final chega às ${horario_real}...",
      "Câmeras de vigilância desativadas piscam em vermelho no distrito de ${setor_cidade} às ${horario_real}...",
      "O asfalto úmido reflete os hologramas de propaganda que dominam o céu do ${setor_cidade} às ${horario_real}...",
      "Sirenes distantes ecoam pelas ruas vazias do ${setor_cidade}, abafadas pelo vento frio de ${horario_real}...",
      "A grade de energia do ${setor_cidade} sofre quedas constantes enquanto o cronômetro marca ${horario_real}...",
      "Sinais de rádio pirata interferem na comunicação local no ${setor_cidade} às ${horario_real}...",
      "Um corvo robótico observa do alto de uma gárgula de aço no ${setor_cidade} exatamente às ${horario_real}...",
      "A umidade do ${setor_cidade} condensa nos seus implantes cibernéticos, marcando o tempo: ${horario_real}...",
      "Sombras deformadas se alongam sob as vigas de sustentação do ${setor_cidade} enquanto bate ${horario_real}..."
    ],
    acao: [
      "...você ajusta o foco dos seus implantes oculares enquanto saca sua ${arma_equipada}...",
      "...${player_name} desliza silenciosamente pelas sombras, sentindo o peso da ${arma_equipada} em mãos...",
      "...com um overclock nos servos motores das pernas, você prepara a ${arma_equipada} para o impacto...",
      "...sua interface neural projeta vetores de ataque enquanto a ${arma_equipada} inicia o carregamento...",
      "...calibrando a sensibilidade táctil das luvas, ${player_name} empunha a ${arma_equipada} com precisão...",
      "...um fluxo de adrenalina sintética inunda o sistema de ${player_name} ao ativar a ${arma_equipada}...",
      "...você ignora os alertas de bateria baixa e foca o balanceamento da ${arma_equipada} para o combate...",
      "...a contagem regressiva interna de ${player_name} sincroniza com o pulsar rítmico da ${arma_equipada}...",
      "...desviando de cabos soltos, você posiciona a ${arma_equipada} para um bote rápido e letal...",
      "...${player_name} verifica a integridade do firmware da ${arma_equipada} antes da primeira investida...",
      "...o sensor de proximidade vibra na nuca de ${player_name} enquanto a ${arma_equipada} sai do coldre...",
      "...você murmura um código de proteção enquanto o gume da ${arma_equipada} brilha em tom carmesim...",
      "...${player_name} executa um giro tático, mudando a empunhadura da ${arma_equipada} para o modo ofensivo...",
      "...fragmentos de dados sobre o alvo são processados enquanto você testa o gatilho da ${arma_equipada}...",
      "...com a respiração controlada, ${player_name} aguarda o momento perfeito para revelar a ${arma_equipada}..."
    ],
    impacto: [
      "...o rastreador biométrico apita em um tom agudo, denunciando uma presença hostil logo à frente.",
      "...faíscas de fiação exposta iluminam o alvo por um breve segundo, revelando uma silhueta tensa e pronta.",
      "...o ar em volta fica saturado de eletricidade estática enquanto seu sensor capta uma pulsação acelerada.",
      "...ecos de passos metálicos ricocheteiam nas paredes, confirmando que você não está sozinho no setor.",
      "...uma anomalia no radar indica que o oponente está usando camuflagem óptica de baixa frequência.",
      "...um zumbido subsônico distorce a visão periférica de ${player_name}, prenunciando o choque iminente.",
      "...o scanner de curto alcance detecta níveis perigosos de radiação emanando da armadura do inimigo.",
      "...fragmentos de vidro quebrado estalam sob os pés do adversário, quebrando o silêncio da emboscada.",
      "...uma rajada de vento frio traz o aroma metálico de sangue e refrigerante hidráulico vazando de perto.",
      "...bio-sensores indicam que o alvo está em estado de alerta máximo, pronto para o primeiro contato.",
      "...o contador Geiger no seu pulso começa a estalar freneticamente conforme a aproximação ocorre.",
      "...padrões infravermelhos mostram que o inimigo está respirando de forma pesada e irregular na neblina.",
      "...um clarão azulado reflete nas poças de óleo, denunciando a posição daquele que te caça nas sombras.",
      "...a pressão atmosférica parece despencar enquanto os dois predadores se reconhecem no escuro.",
      "...um sinal de interferência corrompe seu visor HUD, indicando que o alvo possui contramedidas Ativas."
    ],
    spectro: [
      "Spectro: \"Sinal detectado. Escaneando... Esse sinal biométrico parece instável e fácil de corromper.\"",
      "Spectro: \"Interessante... o batimento cardíaco dele subiu 40%. Ele sabe que o fim está próximo.\"",
      "Spectro: \"Não erre o primeiro bit. Uma falha de processamento aqui e o firewall da realidade te apaga.\"",
      "Spectro: \"Hah! Olhe esses dados... ele acha que está escondido. Coitado, a rede já entregou o IP dele.\"",
      "Spectro: \"Execute com frieza, ${player_name}. Hardware é substituível, o orgulho de vencer não.\"",
      "Spectro: \"Vejo medo codificado no buffer de memória dele. Aproveite o lag mental do oponente.\"",
      "Spectro: \"Rastreando pacotes... o firewall dele tem furos do tamanho de um HVD. Vá fundo.\"",
      "Spectro: \"Mantenha o ping baixo e a guarda alta. Eu estarei assistindo a execução do script.\"",
      "Spectro: \"Dados biométricos sugados. O nível de dopamina dele está despencando. É a sua deixa.\"",
      "Spectro: \"Lembre-se: no Acerto de Contas, não existe botão de pause. Só o botão de Delete.\"",
      "Spectro: \"Eu detectei um bug na defesa dele antes mesmo de você sacar a arma. De nada.\"",
      "Spectro: \"A arquitetura mental desse aí é ultrapassada. Vai ser como hackear um terminal de 2020.\"",
      "Spectro: \"Iniciando protocolo de análise de danos. Tente ser criativo, ${player_name}. Detesto tédio.\"",
      "Spectro: \"Sinto um cheiro de medo digital... ou talvez seja apenas o kernel dele fritando de ansiedade.\"",
      "Spectro: \"Prepare o log-off dele. O sistema está pronto para registrar mais uma baixa no registro.\""
    ]
  },
  turno2: { // CONFLITO: Golpes, Faíscas, Dano em circuitos
    ambiente: [
      "O asfalto estilhaça sob a pressão do combate frenético no coração do ${setor_cidade}...",
      "Reflexos de luzes estroboscópicas transformam o beco do ${setor_cidade} em um caleidoscópio frenético...",
      "A temperatura corporal sobe exponencialmente enquanto a adrenalina inunda o sistema no ${setor_cidade}...",
      "Poeira industrial e faíscas voam enquanto os dois combatentes se chocam violentamente no ${setor_cidade}...",
      "O som metálico de impactos sucessivos reverbera pelas paredes de cimento armado do ${setor_cidade}...",
      "Cabos de alta tensão estouram acima, banhando o campo de batalha do ${setor_cidade} em luz branca...",
      "Vapor escapa de tubulações rompidas, obscurecendo a visão de quem luta no ${setor_cidade}...",
      "Gritos de alerta do sistema ecoam enquanto a luta se desloca pelas passarelas do ${setor_cidade}...",
      "Vidros de lojas abandonadas estouram com as ondas de choque do confronto no ${setor_cidade}...",
      "O chão vibra com a passagem de um trem bala subterrâneo, aumentando o caos no ${setor_cidade}...",
      "Luzes de emergência giram freneticamente, pintando o cenário de vermelho sangue no ${setor_cidade}...",
      "Fragmentos de blindagem voam como estilhaços de granada pelas esquinas do ${setor_cidade}...",
      "A gravidade parece oscilar enquanto os implantes de grav-lev são forçados ao limite no ${setor_cidade}...",
      "Um rastro de destruição marca cada passo da dança mortal que ocorre agora no ${setor_cidade}...",
      "O tempo parece desacelerar para ${player_name} enquanto os golpes se sucedem no ${setor_cidade}..."
    ],
    acao: [
      "...você desfere uma sequência brutal com sua ${arma_equipada}, perfurando a defesa inimiga com ímpeto...",
      "...os circuitos da ${arma_equipada} chiam com o uso excessivo, mas cada impacto é certeiro e devastador...",
      "...${player_name} avança ignorando os alertas de dano, usando a ${arma_equipada} como um instrumento de purga...",
      "...um giro rápido coloca a ${arma_equipada} em contato direto com os cabos neurais do adversário...",
      "...você canaliza um pulso eletromagnético através da ${arma_equipada}, fritando os sensores do alvo...",
      "...${player_name} utiliza o ambiente a seu favor, golpeando com a ${arma_equipada} de um ângulo impossível...",
      "...cada movimento com a ${arma_equipada} deixa um rastro de luz residual que confunde os olhos do inimigo...",
      "...em um acesso de fúria cibernética, você golpeia repetidamente com a ${arma_equipada} sem piedade...",
      "...a precisão cirúrgica de ${player_name} faz com que a ${arma_equipada} encontre cada junta exposta do alvo...",
      "...uma manobra evasiva permite que você revide com a ${arma_equipada}, causando um corte profundo...",
      "...${player_name} sobrecarrega o capacitor da ${arma_equipada} para um impacto de força triplicada...",
      "...você sente o recuo da ${arma_equipada} nos ossos, mas o dano causado no oponente é imensamente superior...",
      "...com um movimento fluido, ${player_name} desarma o ímpeto inimigo usando o cabo da ${arma_equipada}...",
      "...um brilho intenso emana da ${arma_equipada} quando ela se conecta ao peito do agressor distraído...",
      "...${player_name} sorri por trás do visor enquanto a ${arma_equipada} desenha o caminho da vitória..."
    ],
    impacto: [
      "...choques elétricos saltam da armadura rompida, banhando o ambiente em um brilho azul metálico e frio.",
      "...o estrondo de metal contra metal ecoa, seguido pelo chiado característico de fluído hidráulico vazando.",
      "...uma explosão de faíscas cega os scanners por um instante, deixando apenas o rastro de destruição total.",
      "...o inimigo cambaleia para trás enquanto luzes de erro piscam em seu peito, indicando falha crítica.",
      "...uma fumaça negra e densa começa a sair dos ventiladores de resfriamento do alvo atingido em cheio.",
      "...chips de memória e fragmentos de fibra de carbono se espalham pelo chão após o impacto absurdo.",
      "...o grito de dor do oponente é abafado pelo som de motores elétricos entrando em curto-circuito.",
      "...um vazamento de gás refrigerante cria uma nuvem gélida entre os dois, congelando o sangue no chão.",
      "...o visor de proteção do adversário racha, revelando olhos arregalados de puro terror e desespero.",
      "...energias residuais continuam a estalar no ponto de impacto, desintegrando partes da vestimenta.",
      "...o alvo tenta um contra-ataque desesperado, mas seus movimentos estão lentos e pesados pelo dano.",
      "...um estalo seco indica que um osso ou suporte de titânio cedeu sob a pressão da sua investida.",
      "...o radar inimigo entra em loop infinito após o choque, deixando-o completamente vulnerável e cego.",
      "...líquido lubrificante neon espirra nas paredes, desenhando um mapa grotesco da batalha em curso.",
      "...a grade defensiva do oponente colapsa de vez, deixando o caminho livre para o golpe finalizador."
    ],
    spectro: [
      "Spectro: \"Isso foi lindo de ver! O kernel dele está entrando em colapso total agora mesmo.\"",
      "Spectro: \"Dano crítico detectado. Continue assim e não vai sobrar nem o backup pra contar a história.\"",
      "Spectro: \"Adoro o cheiro de circuitos queimados à tarde. É o aroma da pura eficiência digital.\"",
      "Spectro: \"Olhe aquela taxa de erro subindo! Se ele fosse um servidor, eu já teria puxado a tomada.\"",
      "Spectro: \"Bela técnica, ${player_name}. Você está transformando esse HVT em sucata de luxo.\"",
      "Spectro: \"A resistência dele é fútil. É como tentar segurar um DDOS com um firewall de brinquedo.\"",
      "Spectro: \"O sistema dele está pedindo reboot. Não dê essa chance. Finalize a tarefa permanentemente.\"",
      "Spectro: \"Estou salvando os registros desse combate. Vai servir de tutorial de como NÃO apanhar.\"",
      "Spectro: \"Sinta o fluxo da rede! Você é o vírus e ele é apenas um arquivo infectado esperando a purga.\"",
      "Spectro: \"A integridade estrutural dele está em 12%. Um sopro agora e ele vira um erro 404.\"",
      "Spectro: \"Eu poderia assistir isso o dia todo. A coreografia da destruição é realmente fascinante.\"",
      "Spectro: \"Não pare agora, ${player_name}. O processador dele já está trabalhando em modo de segurança.\"",
      "Spectro: \"Ele está tentando enviar um sinal de socorro. Bloqueado. Ele é todinho seu.\"",
      "Spectro: \"Fantástico. O buffer de dor dele estourou. Agora é só questão de tempo e estilo.\"",
      "Spectro: \"Alerta: Diversão nível máximo detectada. Continue deletando os setores vitais desse lixo.\""
    ]
  },
  turno3: { // DESFECHO: Nome revelado, Golpe final, Veredito
    ambiente: [
      "Com o sinal de ${target_name} piscando em vermelho terminal no radar do ${setor_cidade}...",
      "Finalmente, a identidade de elite é confirmada: ${target_name} está diante do log-off forçado no ${setor_cidade}...",
      "O silêncio retorna ao ${setor_cidade} enquanto as luzes vitais de ${target_name} começam a apagar...",
      "Um último suspiro de energia percorre as ruas do ${setor_cidade} enquanto ${target_name} desmorona...",
      "O destino de ${target_name} foi selado entre as sombras e luzes frias do distrito de ${setor_cidade}...",
      "A rede finalmente reconhece a derrota: ${target_name} perdeu o controle do mainframe no ${setor_cidade}...",
      "Uma última transmissão criptografada de ${target_name} é interceptada no vácuo do ${setor_cidade}...",
      "As câmeras do ${setor_cidade} focam o corpo de ${target_name}, registrando o fim de uma era digital...",
      "O nome de ${target_name} ecoa pela última vez nos canais de áudio pirata do ${setor_cidade}...",
      "Sob o olhar indiferente dos drones do ${setor_cidade}, o sinal de ${target_name} se dissolve no éter...",
      "O registro oficial será alterado: ${target_name} não passa de um erro deletado no ${setor_cidade}...",
      "A chuva para por um instante no ${setor_cidade}, como se honrasse o momento em que ${target_name} caiu...",
      "Um pulso eletromagnético varre o ${setor_cidade}, marcando o ponto exato da queda de ${target_name}...",
      "O log de combate encerra o processo: ${target_name} foi removido da lista ativa no ${setor_cidade}...",
      "No coração tecnológico do ${setor_cidade}, a conexão neural de ${target_name} é cortada sem aviso..."
    ],
    acao: [
      "...você canaliza toda a energia restante no núcleo da ${arma_equipada} para o golpe de misericórdia final...",
      "...${player_name} desfere o corte final que desativa permanentemente o hardware central de ${target_name}...",
      "...um último pulso de energia letal da ${arma_equipada} atravessa a barreira neural e encerra a conexão...",
      "...você executa o comando 'format' físico usando o gume superaquecido da sua ${arma_equipada}...",
      "...com um movimento gélido, ${player_name} encosta a ponta da ${arma_equipada} no processador de ${target_name}...",
      "...a ${arma_equipada} brilha com uma intensidade cega antes de descarregar toda a fúria em ${target_name}...",
      "...você gira a ${arma_equipada} com maestria, finalizando a trajetória de vida útil de ${target_name}...",
      "...${player_name} ativa o disparo à queima-roupa da ${arma_equipada}, obliterando o núcleo de ${target_name}...",
      "...um golpe descendente com a ${arma_equipada} divide o suprimento de energia que mantinha ${target_name} de pé...",
      "...você sussurra 'adeus' enquanto a ${arma_equipada} executa a última instrução no shell de ${target_name}...",
      "...${player_name} não hesita e crava a ${arma_equipada} no ponto mais fraco da carcaça de ${target_name}...",
      "...o impacto final da ${arma_equipada} ressoa como um sino de igreja fúnebre para o pobre ${target_name}...",
      "...você libera a trava de segurança da ${arma_equipada} para uma explosão sônica que apaga ${target_name}...",
      "...${player_name} assiste os últimos frames de vida de ${target_name} enquanto puxa o gatilho da ${arma_equipada}...",
      "...com a frieza de um executor de elite, você usa a ${arma_equipada} para deletar ${target_name} da base dados..."
    ],
    impacto: [
      "...o corpo cai sem vida no lodo tóxico do beco, enquanto a recompensa é transferida para seu portfólio.",
      "...uma última mensagem de erro surge no visor do alvo antes da escuridão absoluta e definitiva tomar conta.",
      "...o sistema registra a baixa com sucesso total. O sinal de ${target_name} desapareceu da rede mundial hoje.",
      "...fragmentos de metal e silício chovem como confetes fúnebres sobre o local onde o combate terminou.",
      "...o oponente se torna apenas estatística, um monte de sucata valiosa esperando pelo próximo sucateiro.",
      "...o silêncio que se segue é apenas quebrado pelo som dos créditos entrando na sua conta bancária digital.",
      "...a conexão é cortada. O sinal HVT foi neutralizado e as ameaças ao sistema foram devidamente purgadas.",
      "...fumaça branca sai de cada orifício do traje de combate destruído, indicando o fim de todo o esforço.",
      "...um brilho residual de dados corrompidos flutua no ar, como o fantasma de uma identidade deletada.",
      "...os drones de limpeza já começam a circular, esperando que você saia para recolher o que sobrou.",
      "...a luz nos olhos cibernéticos de ${target_name} pisca uma última vez antes de se apagar para sempre.",
      "...o veredito de morte é transmitido para todos os nós da facção inimiga como um aviso claro.",
      "...uma explosão interna desfigura o rosto metálico do alvo, garantindo que não haverá ressurreição.",
      "...as ferramentas de depuração do Spectro confirmam: o alvo ${target_name} foi movido para a lixeira.",
      "...você limpa o sangue sintético da lâmina enquanto o mundo volta a ignorar o que aconteceu aqui."
    ],
    spectro: [
      "Spectro: \"Veredito: execução perfeita. Limpamos o lixo do sistema. Próximo alvo cadastrado?\"",
      "Spectro: \"Alvo deletado. Os créditos já estão na conta. Não gaste tudo em RAM barata de esquina.\"",
      "Spectro: \"Menos uma anomalia no meu setor. Você é uma ferramenta de depuração realmente eficiente.\"",
      "Spectro: \"Trabalho limpo, ${player_name}. Deixou o lugar mais organizado do que quando chegamos.\"",
      "Spectro: \"Registro de óbito enviado para os servidores centrais. Hoje a rede dorme um pouco mais leve.\"",
      "Spectro: \"Eu daria um 10/10 pelo estilo. Aquele golpe final foi digno de um filme de propaganda corporativa.\"",
      "Spectro: \"O sistema está purgado. Pegue o que puder e se mande antes que os reforços detectem a falha.\"",
      "Spectro: \"Gostei da forma como você ignorou os pedidos de misericórdia dele. Dados não têm sentimentos.\"",
      "Spectro: \"A eficiência é o meu feromônio preferido. E você exala eficiência hoje, ${player_name}.\"",
      "Spectro: \"Mais uma vida formatada com sucesso. A reciclagem de hardware será grata pelo serviço.\"",
      "Spectro: \"O nome ${target_name} já foi removido de todos os diretórios ativos. Ele nunca existiu.\"",
      "Spectro: \"Hackear a vida de alguém nunca foi tão gratificante de assistir. Vamos para a próxima sessão?\"",
      "Spectro: \"Os dados biométricos dele agora são meus. Uma adição valiosa à minha coleção de falhas.\"",
      "Spectro: \"Fim de linha. Shutdown completo. O fluxo de dados voltou ao normal sob meu comando.\"",
      "Spectro: \"Execução terminada. Saia da frequência rápida. O sysadmin está começando a escanear este nó.\""
    ]
  }
};

/**
 * Função principal do motor narrativo.
 * Gera uma string de 300-400 caracteres combinando 4 partes.
 */
function construirNarrativa(turno, contexto) {
  const { player_name, target_name, setor_cidade, arma_equipada, is_rare, is_draw_dko, is_draw_flee } = contexto;
  
  // Horário real dinâmico
  const horario_real = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Seleciona a chave do turno
  const turnKey = `turno${turno}`;
  const fragments = FRAGMENTS[turnKey];

  if (!fragments) return "Erro no Motor de Narrativa: Turno inválido.";

  const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Seleção base
  let p1 = getRandom(fragments.ambiente);
  let p2 = getRandom(fragments.acao);
  let p3 = getRandom(fragments.impacto);
  let p4 = getRandom(fragments.spectro);

  // Lógica Especial: NPC Raro (HVT) - Substitui Spectro no Turno 1 ou 2 por algo de Elite
  if (is_rare && turno < 3 && Math.random() > 0.5) {
    p4 = `Spectro: "ALERTA DE ELITE! Esse alvo possui uma assinatura neural de nível militar. Não subestime a fera!"`;
  }

  // Lógica Especial: Turno 3 - Empates
  if (turno === 3) {
    if (is_draw_dko) {
      p2 = `...em um choque mútuo de proporções nucleares, ambos desferem o golpe final ao mesmo tempo...`;
      p3 = `...o impacto duplo faz o sistema colapsar, jogando vocês dois no chão enquanto os circuitos fritam.`;
      p4 = `Spectro: "Inacreditável. Um Double Knockout sincronizado. Dois idiotas, zero vencedores. Que desperdício."`;
    } else if (is_draw_flee) {
      p2 = `...quando você ia desferir o golpe, sirenes de alta frequência cortam o ar do ${setor_cidade}...`;
      p3 = `...viaturas da SWAT-Net surgem nas esquinas. A luta é interrompida pela necessidade brutal de fuga.`;
      p4 = `Spectro: "ABORTAR! A polícia chegou na festa. Saiam daí antes que virem arquivo morto na cadeia!"`;
    }
  }

  // Montagem e substituição de variáveis
  let narrativa = `${p1} ${p2} ${p3} ${p4}`;
  
  const vars = {
    '\\${player_name}': player_name || "Desconhecido",
    '\\${target_name}': target_name || "Alvo",
    '\\${setor_cidade}': setor_cidade || "Setor 7",
    '\\${arma_equipada}': arma_equipada || "Lâmina Térmica",
    '\\${horario_real}': horario_real
  };

  for (const [key, val] of Object.entries(vars)) {
    narrativa = narrativa.replace(new RegExp(key, 'g'), val);
  }

  // Ajuste de Tamanho (300-400 caracteres)
  // Como os fragmentos foram desenhados para terem ~80-100 caracteres cada, a soma deve estar no range.
  // Mas para garantir:
  if (narrativa.length < 300) {
    // Adiciona um ruído/glitch se for muito curta
    const glitches = [
      " [Sinal instável...]", " // Link neural estabelecido.", " (Dados corrompidos)", " <System.Halt>", " [Ping: 10ms]"
    ];
    while (narrativa.length < 300) {
      narrativa += getRandom(glitches);
    }
  }
  
  if (narrativa.length > 400) {
    // Trunca de forma elegante no último ponto ou espaço
    narrativa = narrativa.substring(0, 397) + "...";
  }

  return narrativa;
}

module.exports = { construirNarrativa };
