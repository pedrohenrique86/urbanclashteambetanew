/* eslint-disable camelcase */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Adiciona coluna code inicialmente nullable
  pgm.addColumn('items', {
    code: {
      type: 'text',
      notNull: false,
    },
  });

  // 2. Preenche codes dos itens já existentes
  pgm.sql(`
    UPDATE items SET code = 'sucata_placa_video' WHERE name = 'Sucata de Placa de Vídeo' AND code IS NULL;
    UPDATE items SET code = 'cabos_cobre' WHERE name = 'Cabos de Cobre' AND code IS NULL;
    UPDATE items SET code = 'chips_defeituosos' WHERE name = 'Chips Defeituosos' AND code IS NULL;
    UPDATE items SET code = 'pecas_drone' WHERE name = 'Peças de Drone' AND code IS NULL;
    UPDATE items SET code = 'fiacao_fibra_otica' WHERE name = 'Fiação de Fibra Ótica' AND code IS NULL;
    UPDATE items SET code = 'baterias_litio' WHERE name = 'Baterias de Lítio' AND code IS NULL;
    UPDATE items SET code = 'modulos_memoria' WHERE name = 'Módulos de Memória' AND code IS NULL;
    UPDATE items SET code = 'processadores_basicos' WHERE name = 'Processadores Básicos' AND code IS NULL;
    UPDATE items SET code = 'biomaterial_bruto' WHERE name = 'Biomaterial Bruto' AND code IS NULL;
    UPDATE items SET code = 'neuro_chips' WHERE name = 'Neuro-Chips' AND code IS NULL;
    UPDATE items SET code = 'drives_ouro' WHERE name = 'Drives de Ouro' AND code IS NULL;
    UPDATE items SET code = 'armazenamento_quantico' WHERE name = 'Armazenamento Quântico' AND code IS NULL;
    UPDATE items SET code = 'matriz_criptografica' WHERE name = 'Matriz Criptográfica' AND code IS NULL;
    UPDATE items SET code = 'nucleos_ia' WHERE name = 'Núcleos de Inteligência Artificial' AND code IS NULL;
    UPDATE items SET code = 'reator_fusao_portatil' WHERE name = 'Reator de Fusão Portátil' AND code IS NULL;

    UPDATE items SET code = 'soco_ingles_ferro' WHERE name = 'Soco Inglês de Ferro' AND code IS NULL;
    UPDATE items SET code = 'corrente_bicicleta' WHERE name = 'Corrente de Bicicleta' AND code IS NULL;
    UPDATE items SET code = 'taco_beisebol_pregos' WHERE name = 'Taco de Beisebol com Pregos' AND code IS NULL;
    UPDATE items SET code = 'canivete_suico_enferrujado' WHERE name = 'Canivete Suíço Enferrujado' AND code IS NULL;
    UPDATE items SET code = 'faca_combate' WHERE name = 'Faca de Combate' AND code IS NULL;
    UPDATE items SET code = 'revolver_38' WHERE name = 'Revólver Calibre .38' AND code IS NULL;
    UPDATE items SET code = 'submetralhadora_9mm' WHERE name = 'Submetralhadora 9mm' AND code IS NULL;
    UPDATE items SET code = 'escopeta_cano_serrado' WHERE name = 'Escopeta de Cano Serrado' AND code IS NULL;
    UPDATE items SET code = 'katana_termica' WHERE name = 'Espada Katana Térmica' AND code IS NULL;
    UPDATE items SET code = 'rifle_precisao_silenciado' WHERE name = 'Rifle de Precisão Silenciado' AND code IS NULL;
    UPDATE items SET code = 'pistola_pulso_eletromagnetico' WHERE name = 'Pistola de Pulso Eletromagnético' AND code IS NULL;
    UPDATE items SET code = 'lanca_misseis_tatico' WHERE name = 'Lança-Mísseis Tático' AND code IS NULL;
    UPDATE items SET code = 'lamina_plasma_focada' WHERE name = 'Lâmina de Plasma Focada' AND code IS NULL;
    UPDATE items SET code = 'canhao_quasar_portatil' WHERE name = 'Canhão Quasar Portátil' AND code IS NULL;
    UPDATE items SET code = 'emissor_antimateria' WHERE name = 'Emissor de Antimatéria' AND code IS NULL;

    UPDATE items SET code = 'jaqueta_couro_batida' WHERE name = 'Jaqueta de Couro Batida' AND code IS NULL;
    UPDATE items SET code = 'joelheiras_taticas' WHERE name = 'Joelheiras Táticas' AND code IS NULL;
    UPDATE items SET code = 'cotoveleiras_reforcadas' WHERE name = 'Cotoveleiras Reforçadas' AND code IS NULL;
    UPDATE items SET code = 'botas_combate_duras' WHERE name = 'Botas de Combate Duras' AND code IS NULL;
    UPDATE items SET code = 'capuz_filtro_ar' WHERE name = 'Capuz com Filtro de Ar' AND code IS NULL;
    UPDATE items SET code = 'colete_kevlar_militar' WHERE name = 'Colete de Kevlar Militar' AND code IS NULL;
    UPDATE items SET code = 'exoesqueleto_carga_leve' WHERE name = 'Exoesqueleto de Carga Leve' AND code IS NULL;
    UPDATE items SET code = 'oculos_visao_noturna_hud' WHERE name = 'Óculos de Visão Noturna HUD' AND code IS NULL;
    UPDATE items SET code = 'traje_furtivo_fibra_carbono' WHERE name = 'Traje Furtivo de Fibra de Carbono' AND code IS NULL;
    UPDATE items SET code = 'armadura_reativa_n7' WHERE name = 'Armadura Reativa N7' AND code IS NULL;

    UPDATE items SET code = 'tampa_bueiro' WHERE name = 'Tampa de Bueiro' AND code IS NULL;
    UPDATE items SET code = 'pedaco_porta_carro' WHERE name = 'Pedaço de Porta de Carro' AND code IS NULL;
    UPDATE items SET code = 'placa_sinalizacao' WHERE name = 'Placa de Sinalização' AND code IS NULL;
    UPDATE items SET code = 'escudo_policial_acrilico' WHERE name = 'Escudo Policial de Acrílico' AND code IS NULL;
    UPDATE items SET code = 'escudo_choque_tatico' WHERE name = 'Escudo de Choque Tático' AND code IS NULL;
    UPDATE items SET code = 'escudo_balistico_pesado_t3' WHERE name = 'Escudo Balístico Pesado TIER-III' AND code IS NULL;
    UPDATE items SET code = 'campo_forca_portatil_v1' WHERE name = 'Campo de Força Portátil V1' AND code IS NULL;
    UPDATE items SET code = 'barreira_ions_regenerativa' WHERE name = 'Barreira de Íons Regenerativa' AND code IS NULL;
  `);

  // 3. Valida se sobrou item sem code
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM items WHERE code IS NULL) THEN
        RAISE EXCEPTION 'Existem items sem code. Complete o mapeamento antes de continuar.';
      END IF;
    END $$;
  `);

  // 4. Agora trava como obrigatório
  pgm.alterColumn('items', 'code', {
    type: 'text',
    notNull: true,
  });

  // 5. Unique para garantir identidade estável
  pgm.addConstraint('items', 'items_code_unique', {
    unique: ['code'],
  });
};

exports.down = async (pgm) => {
  pgm.dropConstraint('items', 'items_code_unique', { ifExists: true });
  pgm.dropColumn('items', 'code');
};