# 🎨 Look Combinado Automático - Documentação

## 📋 Visão Geral

O **Look Combinado Automático** é um sistema inteligente que usa IA para selecionar automaticamente produtos do seu estoque que combinam perfeitamente com o produto sendo editado, criando looks completos e harmoniosos em manequins de estúdio fotográfico.

---

## ✨ Como Funciona

### **1. Interface do Usuário**

Na página de edição de produto, na seção "Estúdio Criativo IA", você encontra:

```
┌─────────────────────────────────────┐
│  Look Combinado                     │
│  ┌───────────────────────────────┐  │
│  │   [Imagem Placeholder]        │  │
│  │   Nenhuma imagem gerada       │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   ✨ Gerar Look IA            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### **2. Seleção Automática de Produtos**

A IA decide automaticamente quantos produtos usar baseado na categoria do produto principal:

- **Vestidos, Macacões, Conjuntos**: 1 produto complementar (geralmente sobretudo ou acessório)
- **Blusas, Tops, Camisas**: 2 produtos complementares (parte de baixo + acessório)
- **Calças, Saias, Shorts**: 2 produtos complementares (parte de cima + acessório)
- **Outros**: 1 produto complementar (default)

### **3. Geração Automática**

Ao clicar em **"Gerar Look IA"**, o sistema:

1. **Busca Produtos**: Lista todos os produtos ativos do seu estoque (com `imagemPrincipal` e `ativo: true`)
2. **Filtro Inteligente**: Remove o produto atual e produtos sem imagem
3. **Análise IA (Gemini 1.5 Flash)**: 
   - Analisa características do produto principal
   - Compara com produtos disponíveis no estoque
   - Seleciona 1-2 produtos complementares baseado em:
     - Compatibilidade física no manequim
     - Harmonia de cores e tecidos
     - Complementaridade lógica (parte de cima + parte de baixo)
     - Coerência de estilo e ocasião
4. **Busca Completa dos Produtos**: Recupera dados completos dos produtos selecionados (incluindo `analiseIA`)
5. **Geração de Imagem (Vertex AI Imagen)**:
   - Extrai o produto principal da imagem original
   - Coloca no manequim selecionado
   - Adiciona os produtos complementares (descritos textualmente)
   - Cria foto de estúdio profissional com todas as peças visíveis
6. **Exibição**: Mostra a imagem do look combinado completo

---

## 🤖 Inteligência Artificial

### **Critérios de Seleção da IA**

A IA analisa múltiplos fatores para selecionar produtos, seguindo uma ordem de prioridade:

#### **1. Compatibilidade Física no Manequim** ⭐ PRIORIDADE MÁXIMA
- **Produtos devem poder ser vestidos JUNTOS** no mesmo manequim
- **Exemplos CORRETOS:**
  - ✅ Vestido + Jaqueta (sobretudo sobre peça única)
  - ✅ Calça + Blusa (parte de baixo + parte de cima)
  - ✅ Short + Top + Kimono (parte de baixo + parte de cima + sobretudo)
  - ✅ Saia + Camisa + Bolsa (parte de baixo + parte de cima + acessório)
- **Exemplos ERRADOS:**
  - ❌ Vestido + Calça (conflito: duas partes de baixo)
  - ❌ Duas blusas (não faz sentido visual)
  - ❌ Duas saias (impossível vestir juntas)

#### **2. Complementaridade Lógica**
A IA segue regras específicas baseadas no produto principal:

- **Se produto é PARTE DE CIMA** (blusa, top, camisa, camiseta):
  - Seleciona PARTE DE BAIXO (calça, saia, short)
  - Pode adicionar ACESSÓRIO (bolsa, sapato, cinto)

- **Se produto é PARTE DE BAIXO** (calça, saia, short):
  - Seleciona PARTE DE CIMA (blusa, top, camisa)
  - Pode adicionar ACESSÓRIO ou SOBRETUDO (jaqueta, blazer)

- **Se produto é PEÇA ÚNICA** (vestido, macacão, conjunto):
  - Seleciona SOBRETUDO (jaqueta, casaco, kimono, blazer)
  - OU ACESSÓRIO (bolsa, sapato, chapéu)

#### **3. Harmonia de Cores**
- Cores que harmonizam (complementares, análogas ou neutras)
- Tons que criam contraste equilibrado
- Neutros (preto, branco, bege, cinza) combinam com tudo
- **Evita conflitos cromáticos** (vermelho + laranja forte, verde + roxo intenso)

#### **4. Coerência de Estilo**
- Casual + Casual
- Elegante + Elegante
- Esportivo + Esportivo
- **Ocasião compatível:** praia, festa, trabalho, academia

#### **5. Diversidade de Categoria** ⚠️ REGRA RÍGIDA
- **NUNCA seleciona produtos da MESMA categoria** do produto principal
- Exemplo: se produto é "Vestido", NÃO seleciona outro "Vestido"
- Busca **COMPLEMENTAR**, não **DUPLICAR**

### **Dados Analisados**

Para cada produto, a IA considera:

```typescript
{
  // Dados básicos do produto
  nome: "Nome do produto",
  categoria: "Categoria (Vestidos, Calças, etc.)",
  preco: 199.90,
  tags: ["Tags de estilo e ocasião"],
  imagemPrincipal: "URL da imagem principal",
  
  // Dados da Análise IA (ESSENCIAL para melhores resultados)
  analiseIA: {
    product_type: "Tipo específico (Vestido Longo, Calça Jeans, etc.)",
    detected_fabric: "Material do tecido (Algodão, Poliéster, etc.)",
    dominant_colors: [
      { name: "Rosa", hex: "#FF69B4" },
      { name: "Branco", hex: "#FFFFFF" }
    ],
    suggested_category: "Categoria sugerida pela IA",
    tecido_estimado: "Tecido estimado (compatibilidade)",
  }
}
```

---

## 📊 Estrutura de Dados Necessária

### **Requisitos Mínimos para Look Combinado Funcionar**

Para que a IA selecione produtos compatíveis, é **essencial** que os produtos tenham:

#### **1. Dados Básicos (Obrigatório)**
```typescript
{
  id: "prod123",              // ID único do produto
  nome: "Vestido Floral",     // Nome descritivo
  categoria: "Vestidos",      // Categoria principal
  preco: 199.90,              // Preço
  ativo: true,                // Produto ativo
  imagemPrincipal: "https://...", // URL da imagem
}
```

#### **2. Análise IA (Altamente Recomendado)**
```typescript
{
  analiseIA: {
    product_type: "Vestido Longo",  // Tipo específico
    detected_fabric: "Algodão",     // Tecido detectado
    dominant_colors: [              // Cores dominantes (ARRAY)
      { name: "Rosa", hex: "#FF69B4" },
      { name: "Branco", hex: "#FFFFFF" }
    ],
    suggested_category: "Vestidos",
    tecido_estimado: "Algodão",
  }
}
```

#### **3. Tags (Recomendado)**
```typescript
{
  tags: [
    "Casual",      // Estilo
    "Verão",       // Ocasião/Estação
    "Feminino",    // Gênero
    "Romântico"    // Mood
  ]
}
```

### **Como Obter a Análise IA dos Produtos**

A análise IA é gerada automaticamente quando você:

1. **Cria um produto novo** no Painel Admin
2. **Faz upload de uma imagem** no editor de produto
3. **Clica em "Regenerar Análise"** (ícone RotateCcw)

A análise inclui:
- ✅ Tipo de produto
- ✅ Tecido detectado
- ✅ Cores dominantes (com nomes e hexadecimais)
- ✅ Categoria sugerida
- ✅ Tags de estilo

### **Produtos Sem Análise IA**

Se um produto NÃO tiver `analiseIA`, a IA ainda funciona, mas:
- ❌ Menor precisão na seleção
- ❌ Menor harmonia de cores
- ❌ Menor coerência de estilo
- ⚠️ Pode selecionar produtos incompatíveis

**Solução:** Execute a análise IA em todos os produtos do estoque antes de usar o Look Combinado

---

## 🛠️ Arquitetura Técnica

### **Fluxo de Dados**

```mermaid
graph LR
    A[Usuário clica "Gerar Look IA"] --> B[Buscar Produtos]
    B --> C[API /api/lojista/products]
    C --> D[Filtrar Produtos Ativos]
    D --> E[Selecionar com IA]
    E --> F[API /api/lojista/products/select-combination]
    F --> G[Gemini 1.5 Flash]
    G --> H[IDs dos Produtos Selecionados]
    H --> I[Gerar Imagem]
    I --> J[API /api/lojista/products/generate-studio]
    J --> K[Vertex AI Imagen]
    K --> L[Imagem do Look]
    L --> M[Exibir na UI]
```

### **APIs Criadas**

#### **1. `/api/lojista/products` (GET)**
- **Função**: Lista produtos do estoque
- **Retorno**: Array de produtos
- **Filtros**: Apenas produtos ativos e com imagem

#### **2. `/api/lojista/products/select-combination` (POST)**
- **Função**: Seleciona produtos compatíveis usando IA
- **Input**:
  ```json
  {
    "lojistaId": "ID do lojista",
    "currentProduct": {
      "nome": "Vestido Floral",
      "categoria": "Vestidos",
      "cores": [{"name": "Rosa"}],
      "tecido": "Algodão",
      "tags": ["Casual", "Verão"]
    },
    "availableProducts": [
      {"id": "prod1", "nome": "Sandália", "categoria": "Calçados"},
      {"id": "prod2", "nome": "Bolsa", "categoria": "Acessórios"}
    ],
    "numProducts": 1
  }
  ```
- **Output**:
  ```json
  {
    "selectedProductIds": ["prod1"],
    "reasoning": "Sandália combina com estilo casual do vestido"
  }
  ```

#### **3. `/api/lojista/products/generate-studio` (POST)**
- **Função**: Gera imagem do look combinado
- **Input**: IDs dos produtos + manequim + dados do produto
- **Output**: URL da imagem gerada

### **Estado do Frontend**

```typescript
// Estado do componente
state.combinationMode: 'auto' | 'manual' | null; // 'auto' para modo IA
state.manualCombinationItems: string[]; // IDs dos produtos selecionados pela IA
state.generatedCombinedImage: string | null; // URL da imagem do look gerada
state.rawImageUrl: string; // URL da imagem original do produto
state.selectedMannequinId: string | null; // ID do manequim selecionado
state.aiAnalysisData: { ... } | null; // Dados da análise IA do produto principal
```

---

## 📊 Fluxo de Execução

### **Passo a Passo Detalhado**

```typescript
async function handleGenerateCombinedAuto() {
  // 1. Validações
  if (!rawImageUrl || !selectedMannequinId || !aiAnalysisData) {
    alert("Preencha todos os dados antes de gerar");
    return;
  }

  // 2. Buscar produtos do estoque
  const products = await fetch("/api/lojista/products?lojistaId=...");
  
  // 3. Filtrar apenas produtos válidos
  const available = products.filter(p => 
    p.ativo && 
    p.imagemPrincipal && 
    p.id !== produtoAtualId
  );

  // 4. Verificar disponibilidade
  if (available.length === 0) {
    alert("Sem produtos disponíveis");
    return;
  }

  // 5. Selecionar com IA (IA decide quantos produtos automaticamente)
  const { selectedProductIds } = await fetch(
    "/api/lojista/products/select-combination",
    {
      method: "POST",
      body: JSON.stringify({
        lojistaId: "...",
        currentProduct: {
          nome: "...",
          categoria: "...",
          tipo: "...",
          cores: [...],
          tecido: "...",
          tags: [...],
          imagemUrl: "..." // URL da imagem do produto
        },
        availableProducts: available.map(p => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          preco: p.preco,
          tags: p.tags || [],
          imagemPrincipal: p.imagemPrincipal,
          analiseIA: p.analiseIA || {} // Dados da análise IA
        })),
        autoDecide: true // Flag para IA decidir automaticamente
      })
    }
  );

  // 6. Validar seleção
  if (selectedProductIds.length === 0) {
    alert("IA não encontrou produtos compatíveis");
    return;
  }

  // 7. Gerar imagem
  const { imageUrl } = await fetch(
    "/api/lojista/products/generate-studio",
    {
      method: "POST",
      body: JSON.stringify({
        tipo: "combined",
        productIds: selectedProductIds,
        mannequinId: selectedMannequinId,
        autoMode: true // Flag para modo automático
      })
    }
  );

  // 8. Atualizar UI
  setState({
    generatedCombinedImage: imageUrl,
    combinationMode: 'auto'
  });
}
```

---

## 🎯 Casos de Uso

### **Exemplo 1: Vestido Floral**

**Produto Atual:**
- Nome: Vestido Floral Rosa
- Categoria: Vestidos
- Cores: Rosa, Branco
- Tags: Casual, Verão

**Produtos Selecionados pela IA:**
1. Sandália Nude (Calçados)
2. Bolsa de Palha (Acessórios)

**Raciocínio:**
"Sandália nude e bolsa de palha complementam perfeitamente o estilo casual e verão do vestido floral, criando um look harmonioso e feminino."

### **Exemplo 2: Calça Jeans**

**Produto Atual:**
- Nome: Calça Jeans Skinny
- Categoria: Calças
- Cores: Azul
- Tags: Casual, Urbano

**Produto Selecionado pela IA:**
1. Blusa Branca Básica (Blusas)

**Raciocínio:**
"Blusa branca básica é um clássico que combina perfeitamente com calça jeans, criando um look casual e atemporal."

---

## ⚙️ Configuração

### **Variáveis de Ambiente Necessárias**

```env
# Google Cloud (Vertex AI)
GOOGLE_CLOUD_PROJECT_ID=seu-projeto-id
GOOGLE_CLOUD_LOCATION=us-central1

# Credenciais
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### **Modelos de IA Utilizados**

1. **Gemini 1.5 Flash** (Seleção de Produtos)
   - Modelo: `gemini-1.5-flash`
   - Função: Análise e seleção de produtos compatíveis
   - Custo: Baixo

2. **Vertex AI Imagen** (Geração de Imagem)
   - Função: Criar foto do look no manequim
   - Custo: Por imagem gerada

---

## 🚨 Tratamento de Erros

### **Erros Possíveis**

| Erro | Causa | Solução |
|------|-------|---------|
| "Nenhum produto disponível" | Estoque vazio ou sem produtos ativos | Adicione mais produtos |
| "IA não encontrou produtos compatíveis" | Nenhum produto combina | Adicione produtos de categorias diferentes |
| "Erro ao gerar look combinado" | Falha na API de geração | Verifique créditos e configuração |
| "Dados incompletos" | Falta análise IA ou manequim | Complete a análise e selecione manequim |

### **Fallback Automático**

Se a IA falhar na seleção, o sistema usa um **fallback inteligente**:

```typescript
// Seleciona produtos aleatórios que:
// 1. Não sejam da mesma categoria do produto atual
// 2. Sejam ativos e tenham imagem
// 3. Limite ao número solicitado
const fallbackIds = availableProducts
  .filter(p => p.categoria !== currentProduct.categoria)
  .slice(0, numProducts)
  .map(p => p.id);
```

---

## 📈 Métricas e Performance

### **Tempo Médio de Execução**

- **Listagem de produtos**: ~500ms
- **Seleção IA**: ~2-3s
- **Geração de imagem**: ~10-15s
- **Total**: ~15-20s

### **Consumo de Créditos**

- **Look com 1 produto**: 1 crédito
- **Look com 2 produtos**: 1 crédito
- **Pack Catálogo** (se disponível): Não consome créditos avulsos

---

## 🔮 Próximas Melhorias

### **Em Desenvolvimento**

1. **Cache de Seleções**: Salvar produtos que combinam bem
2. **Histórico de Looks**: Ver looks gerados anteriormente
3. **Sugestões Personalizadas**: Baseado em vendas e popularidade
4. **Filtros Avançados**: Por preço, ocasião, estilo
5. **Preview 3D**: Visualizar look antes de gerar

### **Roadmap Futuro**

- [ ] Integração com Analytics para rastrear looks mais vendidos
- [ ] Sistema de feedback para melhorar seleções
- [ ] API pública para parceiros
- [ ] Modo "Coleção" (gerar múltiplos looks de uma vez)
- [ ] Suporte a múltiplas imagens de referência (incluir fotos dos produtos complementares)

---

## 🖼️ Como Funciona a Geração de Imagem

### **Processo Atual (Descrição Textual)**

Atualmente, a geração de imagem funciona da seguinte forma:

1. **Imagem Principal**: Extraída da foto original do produto com fidelidade total
2. **Produtos Complementares**: Descritos textualmente no prompt com:
   - Nome e categoria
   - Tipo específico (ex: "Calça Jeans Skinny")
   - Cores dominantes (ex: "Azul Escuro, Preto")
   - Tecido (ex: "Algodão, Elastano")
   - Estilo (ex: "Casual, Urbano")

3. **Manequim**: Posicionado conforme seleção do usuário
4. **Cenário**: Selecionado automaticamente baseado nas características do produto
5. **Instrução**: A IA generativa (Vertex AI Imagen) cria a foto com todas as peças visíveis no manequim

### **Exemplo de Prompt Gerado**

```
**LOOK COMPLETO - MÚLTIPLAS PEÇAS NO MANEQUIM:**

1. **PRODUTO PRINCIPAL (extrair da imagem anexada):**
   - Nome: Vestido Floral Rosa
   - Categoria: Vestidos
   - Extraia da imagem com FIDELIDADE TOTAL

2. **Produto Complementar 1:**
   - Jaqueta Jeans (Jaquetas)
   - Tipo: Jaqueta Jeans Curta
   - Cores: Azul Médio
   - Tecido: Algodão Denim
   - Estilo: Casual

3. **Produto Complementar 2:**
   - Sandália Nude (Calçados)
   - Tipo: Sandália Salto Baixo
   - Cores: Bege, Nude
   - Tecido: Sintético
   - Estilo: Feminino, Casual

**COMPOSIÇÃO:**
- Todas as peças VISÍVEIS no manequim simultaneamente
- Vestido como base
- Jaqueta sobreposta
- Sandália nos pés
- Harmonia visual entre todas as peças
```

### **Vantagens da Abordagem Textual**

✅ **Performance**: Mais rápido que processar múltiplas imagens  
✅ **Custo**: Menor consumo de recursos da API  
✅ **Flexibilidade**: IA pode ajustar proporções e posicionamento  
✅ **Qualidade**: Vertex AI Imagen é excelente em gerar imagens baseadas em descrições textuais ricas  

### **Limitações Atuais**

⚠️ **Fidelidade dos Complementares**: Os produtos complementares são gerados pela IA baseado na descrição, não extraídos de fotos reais  
⚠️ **Variação Visual**: Pequenas variações podem ocorrer nos produtos complementares  

### **Melhoria Futura**

Em desenvolvimento: Suporte a múltiplas imagens de referência, onde a IA extrairá TODOS os produtos de suas fotos originais, garantindo fidelidade total em todas as peças do look

---

## 📞 Suporte

Para dúvidas ou problemas:

1. **Verifique os logs do console** do navegador
2. **Consulte a documentação** do Google Cloud Vertex AI
3. **Teste com produtos simples** primeiro
4. **Verifique créditos disponíveis**

---

## 🎉 Conclusão

O **Look Combinado Automático** transforma a criação de looks de produtos em um processo:

- ✅ **Automático** - Sem seleção manual
- ✅ **Inteligente** - IA analisa compatibilidade
- ✅ **Rápido** - Geração em ~20 segundos
- ✅ **Profissional** - Looks harmoniosos e estilosos

**Resultado:** Aumente suas vendas com fotos de produtos que inspiram e mostram combinações!

---

---

## 💡 Boas Práticas

### **Para Melhores Resultados**

1. **✅ Mantenha o Estoque Organizado**
   - Produtos com análise IA completa
   - Imagens de qualidade (fundo limpo, boa iluminação)
   - Categorias corretas
   - Tags descritivas

2. **✅ Diversifique o Estoque**
   - Tenha produtos de diferentes categorias
   - Misture partes de cima e partes de baixo
   - Inclua acessórios e sobretudos
   - Varie cores e estilos

3. **✅ Atualize Produtos Regularmente**
   - Adicione novos produtos frequentemente
   - Mantenha produtos inativos marcados como `ativo: false`
   - Atualize imagens quando necessário
   - Regenere análise IA periodicamente

4. **✅ Teste Combinações**
   - Gere looks para diferentes produtos
   - Observe quais combinações funcionam melhor
   - Use feedback para ajustar categorias e tags

### **Troubleshooting**

**Problema: "Nenhum produto disponível"**
- **Solução**: Adicione mais produtos ativos com imagens no estoque

**Problema: Produtos incompatíveis selecionados**
- **Solução**: Verifique se os produtos têm `analiseIA` completa. Se não, regenere a análise

**Problema: Look com harmonia ruim**
- **Solução**: Ajuste tags e categorias dos produtos. Certifique-se de que as cores detectadas pela IA estão corretas

**Problema: Demora na geração**
- **Solução**: Normal. O processo leva ~15-20 segundos. Aguarde sem recarregar a página

**Problema: Erro 402 (Saldo Insuficiente)**
- **Solução**: Recarregue créditos ou adquira um Pack Catálogo

---

## 📝 Changelog

### **v2.0.0 (Atual)** - Janeiro 2026
- ✨ Remoção do dropdown de seleção manual (1 ou 2 produtos)
- ✨ IA decide automaticamente quantos produtos usar baseado na categoria
- ✨ Prompt melhorado com foco em compatibilidade física no manequim
- ✨ Inclusão de dados `analiseIA` completos na seleção
- ✨ Descrições textuais detalhadas dos produtos complementares
- ✨ Melhor tratamento de categorias e lógica de complementaridade
- 📄 Documentação expandida com estrutura de dados e boas práticas

### **v1.0.0** - Janeiro 2026
- 🎉 Lançamento inicial do Look Combinado Automático
- 🤖 Seleção inteligente de produtos com Gemini 1.5 Flash
- 🎨 Geração de imagem com Vertex AI Imagen
- 🎛️ Dropdown para escolher 1 ou 2 produtos complementares

---

*Documentação atualizada em: Janeiro 2026*  
*Versão: 2.0.0*
