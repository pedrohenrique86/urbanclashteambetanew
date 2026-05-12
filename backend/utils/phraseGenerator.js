/**
 * phraseGenerator.js
 * 
 * Motor combinatório para geração de frases dinâmicas.
 * Evita repetição através de permutação de segmentos.
 */

const SEGMENTS = {
  gangsters: {
    verbs: [
      "ASSALTOU", "INVADIU", "LIMPOU", "DITOU AS REGRAS EM", "APLICOU UM GOLPE EM", 
      "SAQUEOU", "FRAGMENTOU A SEGURANÇA DE", "DESVALORIZOU", "PASSOU O RODO EM", "ZEROU"
    ],
    reactions: [
      "COMO UM FANTASMA", "DANDO RISADA", "SEM DEIXAR RASTROS", "NA VELOCIDADE DA LUZ", 
      "COM UMA MÃO NAS COSTAS", "IGUAL UM PROFISSIONAL", "NA MAIOR CARA DE PAU", 
      "DEIXANDO TODOS EM CHOQUE", "COM O ESTILO DE ELITE", "DANDO UM BALÃO NA POLÍCIA"
    ],
    outcomes: [
      "E ESCAPOU COM", "E SAIU COM OS BOLSOS CHEIOS DE", "E GARANTIU", "E DESAPARECEU COM", 
      "E JÁ CONVERTEU EM", "E AGORA OSTENTA", "E ADICIONOU À CONTA", "E MANDOU PRO ESCONDERIJO"
    ],
    punchlines: [
      "O PAI TÁ ON!", "QUE FASE!", "INCONTROLÁVEL!", "CHORA POLÍCIA!", "FÁCIL DEMAIS.", 
      "NINGUÉM SEGURA.", "ESTILO RENEGADO.", "MAIS UM DIA COMUM.", "PROTOCOLOS QUEBRADOS.", "SÓ PROGRESSO!"
    ]
  },
  guardas: {
    prefixes: [
      "SENTIDO!", "ATENÇÃO!", "OPERAÇÃO CONCLUÍDA:", "CUMPRA-SE!", "ORDEM RESTABELECIDA:", 
      "ALERTA GERAL:", "PELA LEI!", "CÓDIGO 7:", "NA MIRA:", "SETOR LIMPO:"
    ],
    verbs: [
      "VARREU O CRIME EM", "FINALIZOU A PATRULHA EM", "GARANTIU A ORDEM EM", "COLOCOU ORDEM EM", 
      "INTERCEPTOU ATIVIDADES EM", "FECHOU O CERCO EM", "NEUTRALIZOU AMEAÇAS EM", "PROTEGEU O SETOR"
    ],
    reactions: [
      "COM RIGOR MILITAR", "SEM DAR CHANCE PARA O AZAR", "COM PRECISÃO CIRÚRGICA", 
      "SOB O COMANDO DE ELITE", "HONRANDO A FARDA", "DENTRO DOS PROTOCOLO", "COM MÃO DE FERRO",
      "MOSTRANDO QUEM MANDA", "MANTENDO A DISCIPLINA", "COM TOTAL AUTORIDADE"
    ],
    outcomes: [
      "E RECEBEU", "E FOI RECOMPENSADO COM", "E O PAGAMENTO DE", "E A GRATIFICAÇÃO DE", 
      "E O MERITO DE", "E O BÔNUS TÁTICO DE"
    ],
    punchlines: [
      "PARA O CAFÉ!", "SOLDADO PROMOVIDO.", "A LEI PREVALECE.", "MISSÃO CUMPRIDA.", 
      "VAGABUNDO NÃO TEM VEZ.", "CIDADE MAIS SEGURA.", "SEM MOLEZA.", "HONRA AO MÉRITO.", "PODE DESCANSAR.", "EXCELENTE SERVIÇO!"
    ]
  }
};

class PhraseGenerator {
  generate(faction, data) {
    const group = SEGMENTS[faction === 'guardas' ? 'guardas' : 'gangsters'];
    const name = data.name || "VOCÊ";
    const target = (data.target || "ALVO").toUpperCase();
    const money = data.money || "$0";

    if (faction === 'guardas') {
      const p = group.prefixes[Math.floor(Math.random() * group.prefixes.length)];
      const v = group.verbs[Math.floor(Math.random() * group.verbs.length)];
      const r = group.reactions[Math.floor(Math.random() * group.reactions.length)];
      const o = group.outcomes[Math.floor(Math.random() * group.outcomes.length)];
      const pl = group.punchlines[Math.floor(Math.random() * group.punchlines.length)];
      
      return `${p} ${name} ${v} ${target} ${r} ${o} ${money} ${pl}`;
    } else {
      const v = group.verbs[Math.floor(Math.random() * group.verbs.length)];
      const r = group.reactions[Math.floor(Math.random() * group.reactions.length)];
      const o = group.outcomes[Math.floor(Math.random() * group.outcomes.length)];
      const pl = group.punchlines[Math.floor(Math.random() * group.punchlines.length)];
      
      return `${name} ${v} ${target} ${r} ${o} ${money}. ${pl}`;
    }
  }
}

module.exports = new PhraseGenerator();
