/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Resetar todos os pontos para 0
  pgm.sql(`
    UPDATE clans
    SET points = 0;
  `);
};

exports.down = (pgm) => {
  // Não há rollback seguro aqui, pois perderíamos estado real
  // Intencionalmente vazio
};