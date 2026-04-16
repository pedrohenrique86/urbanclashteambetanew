/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Migration de Limpeza de Arquitetura Legada
 * Objetivo: Remover a tabela user_sessions que não é mais utilizada pela autenticação JWT stateless.
 */

exports.up = (pgm) => {
  pgm.dropTable("user_sessions", { ifExists: true, cascade: true });
};

exports.down = (pgm) => {
  pgm.createTable("user_sessions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("uuid_generate_v4()"),
    },
    user_id: {
      type: "uuid",
      notNull: true,
      references: "users",
      onDelete: "CASCADE",
    },
    token_hash: {
      type: "varchar(255)",
      notNull: true,
    },
    expires_at: {
      type: "timestamptz",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("CURRENT_TIMESTAMP"),
    },
  });

  pgm.createIndex("user_sessions", "user_id", {
    name: "idx_user_sessions_user_id",
  });

  pgm.createIndex("user_sessions", "expires_at", {
    name: "idx_user_sessions_expires_at",
  });
};