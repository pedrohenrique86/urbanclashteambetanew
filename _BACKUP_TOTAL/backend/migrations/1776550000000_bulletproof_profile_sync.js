/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Migration de Grau de Produção: Sincronização e Blindagem de Perfil
 * 1. Adiciona coluna username em user_profiles
 * 2. Resolve duplicidades de perfis para o mesmo usuário
 * 3. Sincroniza usernames da tabela users
 * 4. Aplica restrições de NOT NULL e UNIQUE
 */
exports.up = (pgm) => {
  // 1. Adiciona coluna como anulável para permitir manipulação de dados
  pgm.addColumn("user_profiles", {
    username: { type: "varchar(50)", notNull: false }
  });

  // 2. Limpeza de Segurança: Remove perfis duplicados para o mesmo user_id (mantém o mais recente)
  pgm.sql(`
    DELETE FROM user_profiles a 
    USING user_profiles b 
    WHERE a.created_at < b.created_at 
    AND a.user_id = b.user_id;
  `);

  // 3. Sincronização SSOT (Single Source of Truth)
  pgm.sql(`
    UPDATE user_profiles p 
    SET username = u.username 
    FROM users u 
    WHERE p.user_id = u.id;
  `);

  // 4. Fallback de Segurança para perfis sem usuário correspondente (evita falha no NOT NULL)
  pgm.sql(`
    UPDATE user_profiles 
    SET username = 'user_' || SUBSTRING(user_id::text, 1, 8) 
    WHERE username IS NULL;
  `);

  // 5. Blindagem do Schema
  pgm.alterColumn("user_profiles", "username", { notNull: true });
  pgm.addConstraint("user_profiles", "user_profiles_username_unique", {
    unique: "username"
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint("user_profiles", "user_profiles_username_unique");
  pgm.dropColumn("user_profiles", "username");
};
