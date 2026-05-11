/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 🔥 GANGSTERS → RENEGADOS

    UPDATE clans SET name = 'Divisão Sombra', description = 'Você nem percebe quando já caiu'
    WHERE name = 'Sindicato da Sombra';

    UPDATE clans SET name = 'Divisão Caos', description = 'Transformamos ordem em cinzas'
    WHERE name = 'Navalhas Noturnas';

    UPDATE clans SET name = 'Divisão Ruína', description = 'Onde pisamos, nada permanece'
    WHERE name = 'Irmandade do Asfalto';

    UPDATE clans SET name = 'Divisão Fúria', description = 'Sem freio, sem pausa, só impacto'
    WHERE name = 'Cães de Aluguel';

    UPDATE clans SET name = 'Divisão Eclipse', description = 'Sumimos com qualquer vestígio'
    WHERE name = 'Corvos Urbanos';

    UPDATE clans SET name = 'Divisão Vândalos', description = 'Marcamos território na força'
    WHERE name = 'Víbora de Concreto';

    UPDATE clans SET name = 'Divisão Predadores', description = 'Você corre, a gente termina'
    WHERE name = 'Mercenários do Neon';

    UPDATE clans SET name = 'Divisão Abismo', description = 'Cada passo seu é o último'
    WHERE name = 'Esquadrão Fantasma';

    UPDATE clans SET name = 'Divisão Rebeldes', description = 'Regra é só mais um alvo'
    WHERE name = 'Lâminas do Beco';

    UPDATE clans SET name = 'Divisão Carnificina', description = 'A batalha sempre escala'
    WHERE name = 'Cartel do Subúrbio';

    UPDATE clans SET name = 'Divisão Insurgentes', description = 'Nunca lutamos do seu jeito'
    WHERE name = 'Lobos de Rua';

    UPDATE clans SET name = 'Divisão Fantasma', description = 'Chegamos, resolvemos, sumimos'
    WHERE name = 'Abutres da Metrópole';

    UPDATE clans SET name = 'Divisão Anarquia', description = 'O jogo quebra quando entramos'
    WHERE name = 'Titãs de Ferro';


    -- 🛡️ GUARDAS → GUARDIÕES

    UPDATE clans SET name = 'Divisão Sentinela', description = 'Nada passa despercebido'
    WHERE name = 'Baluarte da Justiça';

    UPDATE clans SET name = 'Divisão Bastião', description = 'Seguramos o que você destrói'
    WHERE name = 'Sentinelas da Ordem';

    UPDATE clans SET name = 'Divisão Guardiões', description = 'Onde chegamos, tudo resiste'
    WHERE name = 'Legião Protetora';

    UPDATE clans SET name = 'Divisão Vigília', description = 'Frieza que decide batalhas'
    WHERE name = 'Guardiões do Amanhecer';

    UPDATE clans SET name = 'Divisão Aegis', description = 'Nem a escuridão atravessa'
    WHERE name = 'Defensores da Cidade';

    UPDATE clans SET name = 'Divisão Legião', description = 'Tomamos território em bloco'
    WHERE name = 'Vigilantes de Aço';

    UPDATE clans SET name = 'Divisão Escudo', description = 'Aqui a corrida acaba'
    WHERE name = 'Escudo Cidadão';

    UPDATE clans SET name = 'Divisão Justiça', description = 'Cada erro seu tem sentença'
    WHERE name = 'Tropa de Honra';

    UPDATE clans SET name = 'Divisão Custódia', description = 'Tudo fica sob vigilância'
    WHERE name = 'Falcões Urbanos';

    UPDATE clans SET name = 'Divisão Fortaleza', description = 'Aqui a batalha encerra'
    WHERE name = 'Muralha Protetora';

    UPDATE clans SET name = 'Divisão Ordem', description = 'Sempre vencemos do nosso jeito'
    WHERE name = 'Vanguarda Cívica';

    UPDATE clans SET name = 'Divisão Vanguard', description = 'Chegamos primeiro e ficamos'
    WHERE name = 'Pacificadores';

    UPDATE clans SET name = 'Divisão Patrulha', description = 'O controle nunca falha'
    WHERE name = 'Força Unida';
  `);
};

exports.down = (pgm) => {
  // rollback opcional (pode deixar vazio se não precisar)
};