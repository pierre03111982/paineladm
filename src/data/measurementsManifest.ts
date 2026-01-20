/**
 * Manifest de Medidas - Banco de Dados de Imagens Técnicas
 * Este arquivo contém o mapeamento de produtos para suas respectivas imagens de guia de medidas.
 * 
 * Estrutura:
 * - id: Identificador único do produto/tipo
 * - filename: Nome do arquivo da imagem PNG
 * - category: Categoria do produto (mapeada para detecção pela IA)
 * - keywords: Palavras-chave para matching inteligente
 * - isPlusSize: Indica se é tamanho plus
 */

export interface MeasurementManifestItem {
  id: string;
  filename: string;
  category: 'top' | 'bottom' | 'one-piece' | 'swimwear' | 'underwear' | 'accessory' | 'sleepwear' | 'outerwear' | 'kids' | 'plus_top' | 'plus_bottom' | 'plus_one' | 'plus_swim' | 'plus_underwear' | 'plus_outer' | 'plus_sleep' | 'plus_masc' | 'activewear';
  keywords: string[]; // Keywords estratégicas para o match
  isPlusSize: boolean;
  defaultColumns: string[]; // Colunas sugeridas para a tabela manual (Ex: ['Busto', 'Comprimento'])
  target: ('female' | 'male' | 'kids')[]; // Público Alvo: Feminino, Masculino, Infantil ou múltiplos (unissex)
}

export const MEASUREMENTS_MANIFEST: MeasurementManifestItem[] = [
  {
    "id": "std_01",
    "filename": "top_camiseta_basica.png",
    "category": "top",
    "keywords": ["camiseta", "t-shirt", "básica", "manga curta", "gola redonda", "regular fit"],
    "isPlusSize": false,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "std_02",
    "filename": "top_regata.png",
    "category": "top",
    "keywords": ["regata", "tank top", "sem manga", "alça", "cavada"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_03",
    "filename": "top_camisa_social.png",
    "category": "top",
    "keywords": ["camisa social", "manga longa", "social masculina", "botão", "dress shirt"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"],
    "target": ["male"]
  },
  {
    "id": "std_04",
    "filename": "top_cropped.png",
    "category": "top",
    "keywords": ["cropped", "top curto", "blusa curta", "barriga de fora"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"],
    "target": ["female"]
  },
  {
    "id": "std_05",
    "filename": "top_moletom_hoodie.png",
    "category": "top",
    "keywords": ["moletom", "hoodie", "canguru", "casaco capuz", "sweatshirt"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_06",
    "filename": "top_blazer.png",
    "category": "top",
    "keywords": ["blazer", "feminino", "alfaiataria", "casaco social", "paletó feminino"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"],
    "target": ["female"]
  },
  {
    "id": "std_07",
    "filename": "top_jaqueta.png",
    "category": "outerwear",
    "keywords": ["jaqueta", "casaco pesado", "inverno", "frio", "coat"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_08",
    "filename": "top_body_feminino.png",
    "category": "top",
    "keywords": ["body", "collant", "peça única", "justo"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"],
    "target": ["female"]
  },
  {
    "id": "std_09",
    "filename": "top_fitness.png",
    "category": "activewear",
    "keywords": ["top ginástica", "top academia", "fitness", "sports bra", "treino"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_10",
    "filename": "top_colete.png",
    "category": "top",
    "keywords": ["colete", "sem manga", "terceira peça", "vest", "puffer vest"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "std_11",
    "filename": "bottom_calca_jeans.png",
    "category": "bottom",
    "keywords": ["calça jeans", "denim", "blue jeans", "calça", "five pockets"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_12",
    "filename": "bottom_calca_social.png",
    "category": "bottom",
    "keywords": ["calça social", "alfaiataria", "calça tecido", "calça reta", "formal"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "std_13",
    "filename": "bottom_shorts_jeans.png",
    "category": "bottom",
    "keywords": ["shorts jeans", "shortinho", "denim shorts", "curto"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_14",
    "filename": "bottom_bermuda_masc.png",
    "category": "bottom",
    "keywords": ["bermuda", "masculina", "sarja", "cargo short", "joelho"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"],
    "target": ["male"]
  },
  {
    "id": "std_15",
    "filename": "bottom_saia_mini.png",
    "category": "bottom",
    "keywords": ["saia curta", "minissaia", "saia jeans", "mini skirt"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"],
    "target": ["female"]
  },
  {
    "id": "std_16",
    "filename": "bottom_saia_midi.png",
    "category": "bottom",
    "keywords": ["saia midi", "saia longa", "saia média", "abaixo joelho"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_17",
    "filename": "bottom_legging.png",
    "category": "bottom",
    "keywords": ["legging", "calça ginástica", "lycra", "yoga pants", "suplex"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_18",
    "filename": "bottom_calca_jogger.png",
    "category": "bottom",
    "keywords": ["jogger", "calça moletom", "punho", "elástico", "conforto"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_19",
    "filename": "one_vestido_curto.png",
    "category": "one-piece",
    "keywords": ["vestido curto", "vestido verão", "mini dress", "casual"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"]
  },
  {
    "id": "std_20",
    "filename": "one_vestido_longo.png",
    "category": "one-piece",
    "keywords": ["vestido longo", "maxi dress", "festa", "longo"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"]
  },
  {
    "id": "std_21",
    "filename": "one_macacao_longo.png",
    "category": "one-piece",
    "keywords": ["macacão", "jumpsuit", "longo", "peça única calça"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_22",
    "filename": "one_macaquinho.png",
    "category": "one-piece",
    "keywords": ["macaquinho", "romper", "curto", "peça única short"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "std_23",
    "filename": "swim_biquini_conjunto.png",
    "category": "swimwear",
    "keywords": ["biquíni", "conjunto praia", "bikini", "duas peças"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Quadril"]
  },
  {
    "id": "std_24",
    "filename": "swim_maio.png",
    "category": "swimwear",
    "keywords": ["maiô", "body praia", "one piece swim", "banho"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "std_25",
    "filename": "swim_sunga_box.png",
    "category": "swimwear",
    "keywords": ["sunga", "masculina", "sunga box", "banho homem"],
    "isPlusSize": false,
    "target": ["male"],
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_26",
    "filename": "underwear_cueca_boxer.png",
    "category": "underwear",
    "keywords": ["cueca", "boxer", "íntima masculina", "underpants"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura"]
  },
  {
    "id": "std_27",
    "filename": "swim_biquini_top.png",
    "category": "swimwear",
    "keywords": ["top biquíni", "parte de cima", "avulso", "cortininha"],
    "isPlusSize": false,
    "defaultColumns": ["Busto"]
  },
  {
    "id": "std_28",
    "filename": "acc_bone.png",
    "category": "accessory",
    "keywords": ["boné", "cap", "chapéu", "aba"],
    "isPlusSize": false,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "std_29",
    "filename": "acc_cinto.png",
    "category": "accessory",
    "keywords": ["cinto", "belt", "couro", "fivela"],
    "isPlusSize": false,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "std_30",
    "filename": "swim_biquini_bottom.png",
    "category": "swimwear",
    "keywords": ["calcinha biquíni", "parte de baixo", "avulso", "tanga"],
    "isPlusSize": false,
    "defaultColumns": ["Quadril"]
  },
  {
    "id": "std_31",
    "filename": "kids_body_bebe.png",
    "category": "kids",
    "keywords": ["body bebê", "infantil", "roupa de bebê", "onesie"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"],
    "target": ["kids"]
  },
  {
    "id": "std_32",
    "filename": "top_polo_masc.png",
    "category": "top",
    "keywords": ["polo", "camisa polo", "masculina", "gola polo"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_33",
    "filename": "top_paleto_masc.png",
    "category": "top",
    "keywords": ["paletó", "terno", "blazer masculino", "social"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_34",
    "filename": "top_colete_social_masc.png",
    "category": "top",
    "keywords": ["colete social", "alfaiataria masculino", "waistcoat"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_35",
    "filename": "swim_bermuda_surf.png",
    "category": "swimwear",
    "keywords": ["boardshorts", "bermuda surf", "bermuda água", "praia"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_36",
    "filename": "top_polo_fem.png",
    "category": "top",
    "keywords": ["polo feminina", "baby look polo", "gola polo mulher"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_37",
    "filename": "underwear_sutia.png",
    "category": "underwear",
    "keywords": ["sutiã", "bra", "lingerie", "top íntimo"],
    "isPlusSize": false,
    "defaultColumns": ["Busto"]
  },
  {
    "id": "std_38",
    "filename": "underwear_calcinha_classica.png",
    "category": "underwear",
    "keywords": ["calcinha", "lingerie", "panties", "íntima feminina"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_39",
    "filename": "bottom_short_saia.png",
    "category": "bottom",
    "keywords": ["short saia", "skort", "fitness", "saia com short"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_40",
    "filename": "top_sueter_trico.png",
    "category": "top",
    "keywords": ["suéter", "tricô", "pullover", "lã", "inverno"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_41",
    "filename": "top_cardigan.png",
    "category": "top",
    "keywords": ["cardigan", "casaquinho", "aberto", "botões"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_42",
    "filename": "outer_jaqueta_jeans.png",
    "category": "outerwear",
    "keywords": ["jaqueta jeans", "denim jacket", "sarja"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_43",
    "filename": "sleep_pijama_curto.png",
    "category": "sleepwear",
    "keywords": ["pijama curto", "short doll", "dormir", "verão"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "std_44",
    "filename": "sleep_pijama_longo.png",
    "category": "sleepwear",
    "keywords": ["pijama longo", "dormir", "inverno", "conjunto dormir"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "std_45",
    "filename": "sleep_roupao.png",
    "category": "sleepwear",
    "keywords": ["roupão", "robe", "saída de banho", "bathrobe"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_46",
    "filename": "bottom_jeans_fem_skinny.png",
    "category": "bottom",
    "keywords": ["jeans skinny", "cintura alta", "justa", "feminina"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_47",
    "filename": "bottom_shorts_fem_hotpants.png",
    "category": "bottom",
    "keywords": ["hot pants", "short cintura alta", "short curto"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_48",
    "filename": "top_camisa_fem_curta.png",
    "category": "top",
    "keywords": ["camisa feminina", "manga curta", "botões", "social"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_49",
    "filename": "top_camisa_masc_curta.png",
    "category": "top",
    "keywords": ["camisa masculina", "manga curta", "social verão"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_50",
    "filename": "bottom_calca_pantalona.png",
    "category": "bottom",
    "keywords": ["pantalona", "wide leg", "calça larga", "solta"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_51",
    "filename": "one_vestido_tubinho.png",
    "category": "one-piece",
    "keywords": ["tubinho", "vestido justo", "bodycon", "colado"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"]
  },
  {
    "id": "std_52",
    "filename": "bottom_bermuda_ciclista.png",
    "category": "bottom",
    "keywords": ["bermuda ciclista", "biker shorts", "fitness", "justa"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_53",
    "filename": "sleep_camisola.png",
    "category": "sleepwear",
    "keywords": ["camisola", "vestido dormir", "nightgown", "lingerie"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "std_54",
    "filename": "outer_jaqueta_puffer.png",
    "category": "outerwear",
    "keywords": ["puffer", "bobojaco", "acolchoada", "jaqueta gomos"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_55",
    "filename": "top_corset.png",
    "category": "top",
    "keywords": ["corset", "corpete", "estruturado", "tomara que caia"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Cintura"]
  },
  {
    "id": "std_56",
    "filename": "bottom_calca_cargo.png",
    "category": "bottom",
    "keywords": ["calça cargo", "bolsos laterais", "streetwear", "utilitária"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_57",
    "filename": "top_camiseta_oversized.png",
    "category": "top",
    "keywords": ["oversized", "camiseta larga", "streetwear", "camisetão"],
    "isPlusSize": false,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "std_58",
    "filename": "bottom_bermuda_moletom.png",
    "category": "bottom",
    "keywords": ["bermuda moletom", "sweatshorts", "conforto", "casual"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_59",
    "filename": "outer_corta_vento.png",
    "category": "outerwear",
    "keywords": ["corta vento", "windbreaker", "jaqueta leve", "esportiva"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_60",
    "filename": "outer_parka.png",
    "category": "outerwear",
    "keywords": ["parka", "casaco longo", "militar", "capuz"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_61",
    "filename": "outer_sobretudo.png",
    "category": "outerwear",
    "keywords": ["sobretudo", "trench coat", "casaco longo", "gabardine"],
    "isPlusSize": false,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_62",
    "filename": "top_polo_masc_longa.png",
    "category": "top",
    "keywords": ["polo manga longa", "masculina", "inverno"],
    "isPlusSize": false,
    "defaultColumns": ["Busto", "Manga", "Comprimento"]
  },
  {
    "id": "std_63",
    "filename": "bottom_saia_lapis.png",
    "category": "bottom",
    "keywords": ["saia lápis", "saia justa", "secretária", "formal"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "std_64",
    "filename": "bottom_calca_pantacourt.png",
    "category": "bottom",
    "keywords": ["pantacourt", "calça curta", "wide leg curta", "culottes"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "std_65",
    "filename": "bottom_short_runner.png",
    "category": "bottom",
    "keywords": ["short runner", "corrida", "fenda lateral", "esportivo"],
    "isPlusSize": false,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_01",
    "filename": "plus_top_tshirt.png",
    "category": "plus_top",
    "keywords": ["camiseta plus size", "t-shirt plus", "básica plus", "blusa grande"],
    "isPlusSize": true,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "plus_02",
    "filename": "plus_top_bata_tunica.png",
    "category": "plus_top",
    "keywords": ["bata", "túnica", "blusa solta plus", "alongada"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_03",
    "filename": "plus_top_camisa_social.png",
    "category": "plus_top",
    "keywords": ["camisa social plus", "social feminina plus", "botão plus"],
    "isPlusSize": true,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "plus_04",
    "filename": "plus_top_blazer_longo.png",
    "category": "plus_top",
    "keywords": ["blazer plus size", "blazer alongado", "alfaiataria plus"],
    "isPlusSize": true,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "plus_05",
    "filename": "plus_bottom_calca_jeans.png",
    "category": "plus_bottom",
    "keywords": ["calça jeans plus", "cintura alta plus", "denim plus"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_06",
    "filename": "plus_bottom_legging.png",
    "category": "plus_bottom",
    "keywords": ["legging plus size", "cós largo", "montaria plus"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_07",
    "filename": "plus_bottom_pantalona.png",
    "category": "plus_bottom",
    "keywords": ["pantalona plus", "wide leg plus", "calça larga plus"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_08",
    "filename": "plus_bottom_short_saia.png",
    "category": "plus_bottom",
    "keywords": ["short saia plus", "skort plus", "conforto"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_09",
    "filename": "plus_bottom_bermuda_ciclista.png",
    "category": "plus_bottom",
    "keywords": ["bermuda ciclista plus", "biker plus", "anti-atrito"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_10",
    "filename": "plus_one_vestido_envelope.png",
    "category": "plus_one",
    "keywords": ["vestido envelope plus", "transpassado plus", "wrap dress"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"]
  },
  {
    "id": "plus_11",
    "filename": "plus_one_vestido_longo_solto.png",
    "category": "plus_one",
    "keywords": ["vestido longo plus", "vestido solto", "três marias"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"]
  },
  {
    "id": "plus_12",
    "filename": "plus_one_macacao_pantalona.png",
    "category": "plus_one",
    "keywords": ["macacão plus size", "jumpsuit plus", "longo plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_13",
    "filename": "plus_underwear_sutia_reforcado.png",
    "category": "plus_underwear",
    "keywords": ["sutiã plus size", "reforçado", "sustentação", "alça larga"],
    "isPlusSize": true,
    "defaultColumns": ["Busto"]
  },
  {
    "id": "plus_14",
    "filename": "plus_underwear_calcinha_alta.png",
    "category": "plus_underwear",
    "keywords": ["calcinha cintura alta", "calcinha plus", "conforto"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_15",
    "filename": "plus_swim_hotpant.png",
    "category": "plus_swim",
    "keywords": ["hot pant plus", "biquíni cintura alta", "praia plus"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_16",
    "filename": "plus_swim_maio.png",
    "category": "plus_swim",
    "keywords": ["maiô plus size", "maiô sustentação", "body praia plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "plus_17",
    "filename": "plus_underwear_cinta.png",
    "category": "plus_underwear",
    "keywords": ["cinta modeladora", "shapewear", "compressão"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura"]
  },
  {
    "id": "plus_18",
    "filename": "plus_outer_kimono.png",
    "category": "plus_outer",
    "keywords": ["kimono plus", "saída de praia plus", "terceira peça"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_19",
    "filename": "plus_acc_meia_calca.png",
    "category": "accessory",
    "keywords": ["meia calça plus", "coxa grossa", "tights"],
    "isPlusSize": true,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "plus_20",
    "filename": "plus_outer_jaqueta_jeans.png",
    "category": "plus_outer",
    "keywords": ["jaqueta jeans plus", "oversized plus", "denim plus"],
    "isPlusSize": true,
    "defaultColumns": ["Ombro", "Busto", "Manga", "Comprimento"]
  },
  {
    "id": "plus_21",
    "filename": "plus_swim_tankini.png",
    "category": "plus_swim",
    "keywords": ["tankini", "regata banho", "praia plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Quadril"]
  },
  {
    "id": "plus_22",
    "filename": "plus_swim_dress.png",
    "category": "plus_swim",
    "keywords": ["vestido de banho", "swim dress", "maiô com saia"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "plus_23",
    "filename": "plus_swim_sunquini.png",
    "category": "plus_swim",
    "keywords": ["sunquini", "biquíni short", "praia plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Quadril"]
  },
  {
    "id": "plus_24",
    "filename": "plus_swim_kaftan.png",
    "category": "plus_swim",
    "keywords": ["kaftan", "saída longa", "túnica praia"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_25",
    "filename": "plus_swim_boardshorts_fem.png",
    "category": "plus_swim",
    "keywords": ["short praia plus", "boardshorts feminino", "tactel plus"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_26",
    "filename": "plus_swim_pareo.png",
    "category": "plus_swim",
    "keywords": ["pareô", "canga", "saia praia plus"],
    "isPlusSize": true,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "plus_27",
    "filename": "plus_sleep_babydoll.png",
    "category": "plus_sleep",
    "keywords": ["baby doll plus", "pijama curto plus", "sensual"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_28",
    "filename": "plus_sleep_camisola_longa.png",
    "category": "plus_sleep",
    "keywords": ["camisola longa plus", "dormir", "nightgown"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_29",
    "filename": "plus_underwear_sutia_tomara_caia.png",
    "category": "plus_underwear",
    "keywords": ["sutiã tomara que caia", "sem alça", "plus size"],
    "isPlusSize": true,
    "defaultColumns": ["Busto"]
  },
  {
    "id": "plus_30",
    "filename": "plus_sleep_robe.png",
    "category": "plus_sleep",
    "keywords": ["robe plus", "roupão cetim", "kimono dormir"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_31",
    "filename": "plus_one_jardineira.png",
    "category": "plus_one",
    "keywords": ["jardineira plus", "salopete", "macacão jeans"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_32",
    "filename": "plus_top_colete_jeans.png",
    "category": "plus_top",
    "keywords": ["colete jeans plus", "terceira peça", "denim vest"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_33",
    "filename": "plus_bottom_short_alfaiataria.png",
    "category": "plus_bottom",
    "keywords": ["short alfaiataria plus", "short social", "elástico"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_34",
    "filename": "plus_bottom_saia_midi_plissada.png",
    "category": "plus_bottom",
    "keywords": ["saia midi plus", "saia plissada", "elegante"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_35",
    "filename": "plus_top_ciganinha.png",
    "category": "plus_top",
    "keywords": ["ciganinha", "ombro a ombro", "blusa plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_36",
    "filename": "plus_bottom_calca_jogger.png",
    "category": "plus_bottom",
    "keywords": ["jogger plus", "calça elástico", "viscose"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_37",
    "filename": "plus_one_vestido_tubinho.png",
    "category": "plus_one",
    "keywords": ["vestido tubinho plus", "vestido justo", "malha"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Comprimento"]
  },
  {
    "id": "plus_38",
    "filename": "plus_outer_poncho.png",
    "category": "plus_outer",
    "keywords": ["poncho", "capa", "inverno plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_39",
    "filename": "plus_masc_camiseta.png",
    "category": "plus_masc",
    "keywords": ["camiseta masculina plus", "homem plus", "t-shirt big"],
    "isPlusSize": true,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "plus_40",
    "filename": "plus_masc_polo.png",
    "category": "plus_masc",
    "keywords": ["polo plus size", "masculina plus", "camisa polo"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_41",
    "filename": "plus_masc_bermuda_cargo.png",
    "category": "plus_masc",
    "keywords": ["bermuda cargo plus", "masculina plus", "bolsos"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_42",
    "filename": "plus_masc_jeans.png",
    "category": "plus_masc",
    "keywords": ["calça jeans plus masculina", "big and tall", "denim man"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_43",
    "filename": "plus_masc_sunga.png",
    "category": "plus_masc",
    "keywords": ["sunga plus size", "moda praia masculina", "banho"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril"]
  },
  {
    "id": "plus_44",
    "filename": "plus_masc_moletom.png",
    "category": "plus_masc",
    "keywords": ["moletom masculino plus", "hoodie plus", "abrigo"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_45",
    "filename": "plus_bottom_saia_evase.png",
    "category": "plus_bottom",
    "keywords": ["saia evasê", "saia em A", "saia rodada plus"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_46",
    "filename": "plus_bottom_calca_flare.png",
    "category": "plus_bottom",
    "keywords": ["calça flare plus", "bailarina", "boca de sino"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  },
  {
    "id": "plus_47",
    "filename": "plus_top_cropped.png",
    "category": "plus_top",
    "keywords": ["cropped plus size", "top alongado", "blusa curta plus"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Comprimento"]
  },
  {
    "id": "plus_48",
    "filename": "plus_acc_cinto.png",
    "category": "accessory",
    "keywords": ["cinto plus size", "cinto largo", "acessório plus"],
    "isPlusSize": true,
    "defaultColumns": ["Largura", "Comprimento"],
    "target": ["female", "male"]
  },
  {
    "id": "plus_49",
    "filename": "plus_sleep_short_doll.png",
    "category": "plus_sleep",
    "keywords": ["short doll plus", "pijama curto", "verão"],
    "isPlusSize": true,
    "defaultColumns": ["Busto", "Cintura", "Quadril"]
  },
  {
    "id": "plus_50",
    "filename": "plus_bottom_calca_social_reta.png",
    "category": "plus_bottom",
    "keywords": ["calça social plus", "reta", "elástico cintura", "formal"],
    "isPlusSize": true,
    "defaultColumns": ["Cintura", "Quadril", "Comprimento"]
  }
];

/**
 * Função para encontrar a imagem de medidas baseada na categoria e keywords da IA
 * 
 * Novo Algoritmo de Pontuação Ponderada com 3 Filtros em Cascata:
 * 
 * FILTRO 1 (Público Alvo): O item do manifesto DEVE incluir o targetAudience selecionado.
 *   - Ex: Se selecionei "Masculino", remova todos os Vestidos e Saias da busca.
 * 
 * FILTRO 2 (Grade): 
 *   - Se targetAudience !== 'kids': Aplique a lógica isPlusSize (Standard vs Plus).
 *   - Se targetAudience === 'kids': IGNORE o seletor isPlusSize (Infantil geralmente tem grade única por idade).
 * 
 * FILTRO 3 (Categoria da IA): Se a IA detectou category: 'bottom', ignore qualquer imagem do manifesto que seja top.
 *   - Isso impede que um Vestido (One-Piece) seja confundido com um Colete (Top).
 * 
 * Após os filtros, aplicar pontuação:
 * - Match de Tipo de Produto (Peso 50): Compare o product_type retornado pela IA com as keywords.
 * - Match de Tags (Peso 10): Para cada tag da IA que bate com keywords do manifesto, dê 10 pontos.
 * - Threshold (Corte): Se a pontuação final for menor que 20, retorne null.
 */
export function findMeasurementImage(
  aiCategory?: string,
  aiProductType?: string,
  aiKeywords?: string[],
  isPlusSize?: boolean,
  sizeCategory?: 'standard' | 'plus', // NOVO: Grade de Tamanho selecionada pelo usuário
  targetAudience?: 'female' | 'male' | 'kids' // NOVO: Público Alvo selecionado pelo usuário
): MeasurementManifestItem | null {
  if (!aiCategory && !aiProductType) {
    return null;
  }

  // Normalizar categoria da IA para mapeamento
  const normalizeCategory = (cat?: string): string | null => {
    if (!cat) return null;
    const catLower = cat.toLowerCase();
    // Mapear categorias da IA para categorias do manifesto
    if (catLower.includes('bottom') || catLower.includes('calça') || catLower.includes('short') || catLower.includes('bermuda') || catLower.includes('saia')) {
      return 'bottom';
    }
    if (catLower.includes('top') || catLower.includes('blusa') || catLower.includes('camisa') || catLower.includes('camiseta')) {
      return 'top';
    }
    if (catLower.includes('one-piece') || catLower.includes('vestido') || catLower.includes('macacão') || catLower.includes('macaquinho')) {
      return 'one-piece';
    }
    if (catLower.includes('swimwear') || catLower.includes('biquíni') || catLower.includes('maiô') || catLower.includes('sunga')) {
      return 'swimwear';
    }
    if (catLower.includes('underwear') || catLower.includes('sutiã') || catLower.includes('calcinha') || catLower.includes('cueca')) {
      return 'underwear';
    }
    if (catLower.includes('outerwear') || catLower.includes('jaqueta') || catLower.includes('casaco')) {
      return 'outerwear';
    }
    if (catLower.includes('sleepwear') || catLower.includes('pijama') || catLower.includes('camisola')) {
      return 'sleepwear';
    }
    if (catLower.includes('accessory') || catLower.includes('acessório')) {
      return 'accessory';
    }
    if (catLower.includes('kids')) {
      return 'kids';
    }
    return catLower;
  };

  const normalizedCategory = normalizeCategory(aiCategory);
  const productTypeLower = aiProductType?.toLowerCase() || '';
  const keywordsLower = (aiKeywords || []).map(k => k.toLowerCase());

  // FILTRO 1: FILTRO RÍGIDO DE PÚBLICO ALVO (PRIORIDADE MÁXIMA)
  // Se targetAudience foi fornecido, filtrar RIGIDAMENTE antes de qualquer outra busca
  let candidates = MEASUREMENTS_MANIFEST;
  if (targetAudience !== undefined) {
    candidates = candidates.filter(item => 
      item.target && item.target.includes(targetAudience)
    );
  }

  // FILTRO 2: FILTRO RÍGIDO DE GRADE (apenas se NÃO for Infantil)
  // Se targetAudience === 'kids', IGNORAR o filtro de Grade (Infantil geralmente tem grade única)
  if (targetAudience !== 'kids') {
    if (sizeCategory !== undefined) {
      if (sizeCategory === 'standard') {
        // Grade Padrão: APENAS itens onde isPlusSize === false
        candidates = candidates.filter(item => item.isPlusSize === false);
      } else if (sizeCategory === 'plus') {
        // Plus Size: APENAS itens onde isPlusSize === true
        candidates = candidates.filter(item => item.isPlusSize === true);
      }
    } else if (isPlusSize !== undefined) {
      // Fallback: usar isPlusSize se sizeCategory não foi fornecido (compatibilidade)
      candidates = candidates.filter(item => item.isPlusSize === isPlusSize);
    }
  }

  // FILTRO 3: Filtro Rígido de Categoria (Peso Infinito)
  // Se a IA detectou category: 'bottom', ignore qualquer imagem do manifesto que seja top
  if (normalizedCategory) {
    // Mapear categoria normalizada para categorias do manifesto
    const categoryMap: Record<string, string[]> = {
      'bottom': ['bottom', 'plus_bottom'],
      'top': ['top', 'plus_top', 'plus_masc'],
      'one-piece': ['one-piece', 'plus_one'],
      'swimwear': ['swimwear', 'plus_swim'],
      'underwear': ['underwear', 'plus_underwear'],
      'outerwear': ['outerwear', 'plus_outer'],
      'sleepwear': ['sleepwear', 'plus_sleep'],
      'accessory': ['accessory'],
      'kids': ['kids']
    };

    const allowedCategories = categoryMap[normalizedCategory] || [];
    if (allowedCategories.length > 0) {
      candidates = candidates.filter(item => 
        allowedCategories.some(allowed => item.category.includes(allowed))
      );
    }
  }

  // Se não há candidatos após o filtro de categoria, retornar null
  if (candidates.length === 0) {
    return null;
  }

  // PASSO 2 e 3: Calcular pontuação ponderada
  let bestMatch: MeasurementManifestItem | null = null;
  let bestScore = 0;

  for (const item of candidates) {
    let score = 0;

    // PASSO 2: Match de Tipo de Produto (Peso 50)
    // Compare o product_type retornado pela IA com as keywords
    if (productTypeLower) {
      for (const keyword of item.keywords) {
        const keywordLower = keyword.toLowerCase();
        // Verificar se o product_type contém a keyword ou vice-versa
        if (productTypeLower.includes(keywordLower) || keywordLower.includes(productTypeLower)) {
          score += 50;
          break; // Apenas um match de tipo por item
        }
      }
    }

    // PASSO 3: Match de Tags (Peso 10)
    // Para cada tag da IA que bate com keywords do manifesto, dê 10 pontos
    for (const aiKeyword of keywordsLower) {
      for (const manifestKeyword of item.keywords) {
        const manifestKeywordLower = manifestKeyword.toLowerCase();
        if (manifestKeywordLower.includes(aiKeyword) || aiKeyword.includes(manifestKeywordLower)) {
          score += 10;
          break; // Cada tag da IA pode dar pontos apenas uma vez por keyword do manifesto
        }
      }
    }

    // Bonus: Match exato de categoria (peso 30)
    if (normalizedCategory && item.category.includes(normalizedCategory)) {
      score += 30;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  // PASSO 4: Threshold (Corte)
  // Se a pontuação final for menor que 20, retorne null
  if (bestScore < 20) {
    return null;
  }

  return bestMatch;
}

/**
 * Função para obter a URL da imagem de medidas
 */
export function getMeasurementImageUrl(item: MeasurementManifestItem | null): string | null {
  if (!item) return null;
  return `/assets/measurements/${item.filename}`;
}
