/* eslint-disable camelcase */

/**
 * MIGRATION K — Transição de faction VARCHAR → FK (100% segura e transacional)
 *
 * O que faz:
 * 1. Mapeia todos os valores VARCHAR existentes para os IDs da tabela factions
 *    (gangsters → renegados.id, guardas → guardioes.id, e variantes)
 * 2. VALIDA que NENHUM registro ficou sem faction_id antes de aplicar NOT NULL
 * 3. Padroniza o campo VARCHAR faction para os novos valores canônicos
 * 4. Aplica NOT NULL em faction_id em ambas as tabelas
 * 5. Mantém o VARCHAR faction por compatibilidade com o backend atual
 *
 * Dependências: Migration A (factions), Migration J (faction_id columns)
 * Tabelas alteradas: user_profiles, clans
 *
 * ⚠️  ESTRATÉGIA DE SEGURANÇA:
 *     Todo o bloco de migração de dados ocorre dentro de um DO $$ ... $$
 *     com RAISE EXCEPTION em caso de registros não migrados.
 *     Se qualquer validação falhar, a migration INTEIRA é abortada (ROLLBACK automático).
 *
 * ⚠️  O campo VARCHAR faction NÃO é removido — backward compatibility mantida.
 *     Uma futura migration (pós-validação do backend) fará o DROP.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      v_renegados_id   INTEGER;
      v_guardioes_id   INTEGER;
      v_unmatched_profiles INTEGER;
      v_unmatched_clans    INTEGER;
    BEGIN

      -- ─────────────────────────────────────────────────────────────────
      -- PASSO 1: Buscar os IDs canônicos das facções
      -- ─────────────────────────────────────────────────────────────────
      SELECT id INTO v_renegados_id FROM factions WHERE name = 'renegados';
      SELECT id INTO v_guardioes_id FROM factions WHERE name = 'guardioes';

      IF v_renegados_id IS NULL THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: facção "renegados" não encontrada em factions. Verifique se a Migration A foi executada.';
      END IF;

      IF v_guardioes_id IS NULL THEN
        RAISE EXCEPTION 'ERRO CRÍTICO: facção "guardioes" não encontrada em factions. Verifique se a Migration A foi executada.';
      END IF;

      RAISE NOTICE 'Facções encontradas: renegados.id=%, guardioes.id=%', v_renegados_id, v_guardioes_id;


      -- ─────────────────────────────────────────────────────────────────
      -- PASSO 2: Mapear user_profiles.faction → faction_id
      --          Cobre todos os valores históricos possíveis:
      --          'gangsters', 'guardas' (legado) e
      --          'renegados', 'guardioes' (novo padrão)
      -- ─────────────────────────────────────────────────────────────────
      UPDATE user_profiles
      SET faction_id = v_renegados_id
      WHERE LOWER(TRIM(faction)) IN ('gangsters', 'gangster', 'renegados', 'renegado')
        AND faction_id IS NULL;

      UPDATE user_profiles
      SET faction_id = v_guardioes_id
      WHERE LOWER(TRIM(faction)) IN ('guardas', 'guarda', 'guardioes', 'guardiao', 'guardiões', 'guardião')
        AND faction_id IS NULL;

      RAISE NOTICE 'user_profiles: mapeamento de faction_id concluído.';


      -- ─────────────────────────────────────────────────────────────────
      -- PASSO 3: Mapear clans.faction → faction_id
      -- ─────────────────────────────────────────────────────────────────
      UPDATE clans
      SET faction_id = v_renegados_id
      WHERE LOWER(TRIM(faction)) IN ('gangsters', 'gangster', 'renegados', 'renegado')
        AND faction_id IS NULL;

      UPDATE clans
      SET faction_id = v_guardioes_id
      WHERE LOWER(TRIM(faction)) IN ('guardas', 'guarda', 'guardioes', 'guardiao', 'guardiões', 'guardião')
        AND faction_id IS NULL;

      RAISE NOTICE 'clans: mapeamento de faction_id concluído.';


      -- ─────────────────────────────────────────────────────────────────
      -- PASSO 4: VALIDAÇÃO CRÍTICA — nenhum registro pode ter ficado NULL
      --          Se houver qualquer registro sem faction_id, a migration
      --          é ABORTADA inteira (ROLLBACK automático do postgres).
      -- ─────────────────────────────────────────────────────────────────
      SELECT COUNT(*) INTO v_unmatched_profiles
      FROM user_profiles
      WHERE faction_id IS NULL AND faction IS NOT NULL AND TRIM(faction) != '';

      IF v_unmatched_profiles > 0 THEN
        RAISE EXCEPTION
          'VALIDAÇÃO FALHOU: % registro(s) em user_profiles têm faction preenchida mas faction_id NULL. '
          'Valores inesperados: % — Adicione-os ao mapeamento e re-execute.',
          v_unmatched_profiles,
          (SELECT ARRAY_AGG(DISTINCT faction) FROM user_profiles WHERE faction_id IS NULL AND faction IS NOT NULL AND TRIM(faction) != '');
      END IF;

      SELECT COUNT(*) INTO v_unmatched_clans
      FROM clans
      WHERE faction_id IS NULL;

      IF v_unmatched_clans > 0 THEN
        RAISE EXCEPTION
          'VALIDAÇÃO FALHOU: % clã(s) com faction_id NULL. '
          'Valores de faction sem mapeamento: % — Adicione-os e re-execute.',
          v_unmatched_clans,
          (SELECT ARRAY_AGG(DISTINCT faction) FROM clans WHERE faction_id IS NULL);
      END IF;

      RAISE NOTICE 'VALIDAÇÃO OK: todos os registros de user_profiles e clans possuem faction_id preenchido.';


      -- ─────────────────────────────────────────────────────────────────
      -- PASSO 5: Padronizar o VARCHAR faction para os novos nomes canônicos
      --          (mantido por compatibilidade, mas unificado no padrão novo)
      -- ─────────────────────────────────────────────────────────────────
      UPDATE user_profiles
      SET faction = 'renegados'
      WHERE faction_id = v_renegados_id
        AND LOWER(TRIM(faction)) NOT IN ('renegados', 'renegado');

      UPDATE user_profiles
      SET faction = 'guardioes'
      WHERE faction_id = v_guardioes_id
        AND LOWER(TRIM(faction)) NOT IN ('guardioes', 'guardiao', 'guardiões', 'guardião');

      UPDATE clans
      SET faction = 'renegados'
      WHERE faction_id = v_renegados_id
        AND LOWER(TRIM(faction)) NOT IN ('renegados', 'renegado');

      UPDATE clans
      SET faction = 'guardioes'
      WHERE faction_id = v_guardioes_id
        AND LOWER(TRIM(faction)) NOT IN ('guardioes', 'guardiao', 'guardiões', 'guardião');

      RAISE NOTICE 'VARCHAR faction padronizado para os valores canônicos (renegados/guardioes).';


      -- ─────────────────────────────────────────────────────────────────
      -- PASSO 6: Aplicar NOT NULL em faction_id após validação aprovada
      -- ─────────────────────────────────────────────────────────────────
      ALTER TABLE user_profiles ALTER COLUMN faction_id SET NOT NULL;
      ALTER TABLE clans         ALTER COLUMN faction_id SET NOT NULL;

      RAISE NOTICE 'NOT NULL aplicado em user_profiles.faction_id e clans.faction_id com sucesso.';
      RAISE NOTICE '✅ Migration K concluída. Faction VARCHAR mantida para backward compatibility.';

    END
    $$;
  `);
};

exports.down = (pgm) => {
  // Reverte apenas o NOT NULL — os dados de faction_id são preservados
  // para evitar perda de mapeamento em caso de rollback.
  pgm.sql(`
    DO $$
    BEGIN
      ALTER TABLE user_profiles ALTER COLUMN faction_id DROP NOT NULL;
      ALTER TABLE clans         ALTER COLUMN faction_id DROP NOT NULL;

      -- Reverte a padronização do VARCHAR (melhor esforço)
      UPDATE clans SET faction = 'gangsters' WHERE faction = 'renegados';
      UPDATE clans SET faction = 'guardas'   WHERE faction = 'guardioes';
      UPDATE user_profiles SET faction = 'gangsters' WHERE faction = 'renegados';
      UPDATE user_profiles SET faction = 'guardas'   WHERE faction = 'guardioes';

      RAISE NOTICE 'Migration K revertida: NOT NULL removido e VARCHAR restaurado (melhor esforço).';
    END
    $$;
  `);
};
