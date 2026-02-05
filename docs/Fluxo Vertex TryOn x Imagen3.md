=# Fluxo Vertex Try-On × Vertex Imagen 3

> Atualizado em 11/11/2025  
> Fonte oficial de preços: [Google Vertex AI – Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)

---

## 1. Visão Geral

- **Imagem 1** sempre representa a pessoa no cenário original da foto enviada.
- **Imagem 2** mantém características da pessoa/produtos da Imagem 1, mudando apenas cenário, iluminação e itens adicionais.
- **Prioridade da escolha** deixa de ser custo (Try-On e Imagen 3 custam o mesmo) e passa a ser **tecnologia adequada** ao tipo de produto:
  - **Vertex Try-On**: veste roupas/vestuário na pessoa sem alterar o fundo.
  - **Vertex Imagen 3**: edita/cria imagens mantendo traços da pessoa, permitindo incluir novos objetos e alterar ambientes.

---

## 2. Custos oficiais

| API / Modelo | Operação | Custo (USD) | Uso no fluxo |
|--------------|----------|-------------|--------------|
| Vertex Try-On (`virtual-try-on-preview-08-04`) | Geração de imagem vestindo a peça | **US$ 0,04 / imagem** | Sempre que houver roupas/vestuário |
| Vertex Imagen 3 | Geração/Edição de imagem | **US$ 0,04 / imagem** | Editar cenário e/ou incluir itens adicionais |

> Como os preços de Try-On e Imagen 3 são equivalentes, utilizamos ambos de acordo com a necessidade tecnológica, não mais para otimização exclusiva de custo.

---

## 3. Regras principais do fluxo

| Cenário | Imagem 1 (resultado final) | Imagem 2 (variação) | Observações |
|---------|----------------------------|----------------------|-------------|
| **Apenas roupas/vestuário** | Vertex Try-On (mantém cenário original, troca a peça) | Vertex Imagen 3 gera novo cenário com a mesma pessoa e roupa | Permite entregar look base + look ambientado |
| **Roupa + outros itens** | Vertex Try-On veste a roupa → resultado é reutilizado | Vertex Imagen 3 recebe a imagem da Try-On, insere o item extra e altera cenário/iluminação | Garante consistência dos traços da pessoa e evita reenviar a foto original |
| **Somente itens “outros”** (acessórios, decoração etc.) | Vertex Imagen 3 gera a cena mantendo a foto original como referência | Vertex Imagen 3 cria variação de ambiente com os mesmos itens | Try-On não é usado |
| **Combinação “outros + outros” (máx. 2)** | Vertex Imagen 3 (item 1 + item 2 no cenário original) | Vertex Imagen 3 (item 1 + item 2 com novo cenário) | Fluxo 100% Imagen 3. Sempre preservar as características da pessoa na foto original e de ambos os produtos em todas as imagens geradas (Imagem 1 = cenário original, Imagem 2 = cenário alternativo). |

### Resumo textual
1. **Identificar** se há pelo menos uma peça de vestuário.
2. **Try-On** só roda quando existe roupa; ele gera a Imagem Base mantendo a foto original.
3. **Imagen 3** entra sempre que precisamos alterar cenário, iluminação ou incluir itens extras.  
   - Recebe preferencialmente a Imagem 1 como entrada (em vez da foto original) para preservar os ajustes feitos e aplicar os novos elementos.
4. **Prompt detalhado** descreve cenário desejado, iluminação, itens extras e restrições (ex.: manter rosto, postura, cor da peça).

---

## 4. Custo por composição (2 imagens)

### Opção padrão (qualidade máxima)
```
1 × Vertex Try-On              = US$ 0,04
1 × Vertex Imagen 3 (edição)   = US$ 0,04
----------------------------------------
Total por composição           = US$ 0,08
```

---

## 5. Impacto no pipeline

- **Orchestrator**:
  - Roda Try-On quando detectar categoria “vestuário”.
  - Sempre prepara um prompt completo para Imagen 3 (com dados do produto, estilo desejado e instruções de manter características).
  - Reaproveita a imagem anterior como `base_image` na chamada de edição do Imagen 3.
- **Painéis / Métricas**:
  - Dashboard passa a registrar totais “Try-On” vs “Imagen 3” (sem Nano Banana).
  - Custos agregados = `n_tryon * 0.04 + n_imagen3 * 0.04`.
- **Documentos antigos**:
  - Referências a “Nano Banana” ou “Stability AI” foram substituídas por Vertex Imagen 3.

---

## 6. Próximos passos
1. Ajustar orchestrator para refletir as regras da tabela (condicionais por tipo de produto).
2. Atualizar logs/custos armazenados no Firestore com os novos valores.
3. Revisar prompts padrão do Imagen 3 (cenários, iluminação, composição com item extra).
4. Atualizar material de comunicação e treinamentos para os lojistas (novo nome das APIs).

