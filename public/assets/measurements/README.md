# 📏 Pasta de Imagens de Guia de Medidas

## 📍 Onde salvar as imagens

Esta pasta deve conter **todas as 100 imagens PNG** de guia de medidas conforme especificado em `src/data/measurementsManifest.ts`.

## 📋 Lista de Imagens Esperadas

As imagens devem seguir **exatamente** os nomes listados abaixo (case-sensitive):

### Padrão (std_01 a std_65)
- `top_camiseta_basica.png`
- `top_regata.png`
- `top_camisa_social.png`
- `top_cropped.png`
- `top_moletom_hoodie.png`
- `top_blazer.png`
- `top_jaqueta.png`
- `top_body_feminino.png`
- `top_fitness.png`
- `top_colete.png`
- `bottom_calca_jeans.png`
- `bottom_calca_social.png`
- `bottom_shorts_jeans.png`
- `bottom_bermuda_masc.png`
- `bottom_saia_mini.png`
- `bottom_saia_midi.png`
- `bottom_legging.png`
- `bottom_calca_jogger.png`
- `one_vestido_curto.png`
- `one_vestido_longo.png`
- `one_macacao_longo.png`
- `one_macaquinho.png`
- `swim_biquini_conjunto.png`
- `swim_maio.png`
- `swim_sunga_box.png`
- `underwear_cueca_boxer.png`
- `swim_biquini_top.png`
- `acc_bone.png`
- `acc_cinto.png`
- `swim_biquini_bottom.png`
- `kids_body_bebe.png`
- `top_polo_masc.png`
- `top_paleto_masc.png`
- `top_colete_social_masc.png`
- `swim_bermuda_surf.png`
- `top_polo_fem.png`
- `underwear_sutia.png`
- `underwear_calcinha_classica.png`
- `bottom_short_saia.png`
- `top_sueter_trico.png`
- `top_cardigan.png`
- `outer_jaqueta_jeans.png`
- `sleep_pijama_curto.png`
- `sleep_pijama_longo.png`
- `sleep_roupao.png`
- `bottom_jeans_fem_skinny.png`
- `bottom_shorts_fem_hotpants.png`
- `top_camisa_fem_curta.png`
- `top_camisa_masc_curta.png`
- `bottom_calca_pantalona.png`
- `one_vestido_tubinho.png`
- `bottom_bermuda_ciclista.png`
- `sleep_camisola.png`
- `outer_jaqueta_puffer.png`
- `top_corset.png`
- `bottom_calca_cargo.png`
- `top_camiseta_oversized.png`
- `bottom_bermuda_moletom.png`
- `outer_corta_vento.png`
- `outer_parka.png`
- `outer_sobretudo.png`
- `top_polo_masc_longa.png`
- `bottom_saia_lapis.png`
- `bottom_calca_pantacourt.png`
- `bottom_short_runner.png`

### Plus Size (plus_01 a plus_50)
- `plus_top_tshirt.png`
- `plus_top_bata_tunica.png`
- `plus_top_camisa_social.png`
- `plus_top_blazer_longo.png`
- `plus_bottom_calca_jeans.png`
- `plus_bottom_legging.png`
- `plus_bottom_pantalona.png`
- `plus_bottom_short_saia.png`
- `plus_bottom_bermuda_ciclista.png`
- `plus_one_vestido_envelope.png`
- `plus_one_vestido_longo_solto.png`
- `plus_one_macacao_pantalona.png`
- `plus_underwear_sutia_reforcado.png`
- `plus_underwear_calcinha_alta.png`
- `plus_swim_hotpant.png`
- `plus_swim_maio.png`
- `plus_underwear_cinta.png`
- `plus_outer_kimono.png`
- `plus_acc_meia_calca.png`
- `plus_outer_jaqueta_jeans.png`
- `plus_swim_tankini.png`
- `plus_swim_dress.png`
- `plus_swim_sunquini.png`
- `plus_swim_kaftan.png`
- `plus_swim_boardshorts_fem.png`
- `plus_swim_pareo.png`
- `plus_sleep_babydoll.png`
- `plus_sleep_camisola_longa.png`
- `plus_underwear_sutia_tomara_caia.png`
- `plus_sleep_robe.png`
- `plus_one_jardineira.png`
- `plus_top_colete_jeans.png`
- `plus_bottom_short_alfaiataria.png`
- `plus_bottom_saia_midi_plissada.png`
- `plus_top_ciganinha.png`
- `plus_bottom_calca_jogger.png`
- `plus_one_vestido_tubinho.png`
- `plus_outer_poncho.png`
- `plus_masc_camiseta.png`
- `plus_masc_polo.png`
- `plus_masc_bermuda_cargo.png`
- `plus_masc_jeans.png`
- `plus_masc_sunga.png`
- `plus_masc_moletom.png`
- `plus_bottom_saia_evase.png`
- `plus_bottom_calca_flare.png`
- `plus_top_cropped.png`
- `plus_acc_cinto.png`
- `plus_sleep_short_doll.png`
- `plus_bottom_calca_social_reta.png`

## ✅ Validação

Após fazer upload de todas as imagens, você pode verificar se todas estão presentes executando:

```bash
# Verificar quantas imagens existem (deve ser 100)
ls -1 *.png | wc -l
```

## 📝 Notas Importantes

1. **Nomenclatura exata:** Os nomes dos arquivos devem ser **exatamente** como listado acima (sem espaços, com underscores, case-sensitive)

2. **Formato:** Todas as imagens devem ser PNG

3. **Conteúdo:** Cada imagem deve conter:
   - Diagrama técnico do produto
   - Tabela de medidas padrão
   - Legendas e indicações de medidas

4. **Tamanho:** Recomenda-se imagens otimizadas (mas mantendo qualidade para leitura)

5. **Referência:** Consulte `src/data/measurementsManifest.ts` para mapeamento completo de IDs e nomes de arquivos
