PHASE 32: Implementação do "Estúdio de Criação IA" e Refatoração de UX

Contexto:
Estamos transformando o antigo modal de upload em um Estúdio de Criação Digital. O objetivo é dar ao lojista controle total sobre o custo (geração sob demanda) e a estética (seleção de manequins), além de organizar o formulário de cadastro separando dados manuais de dados de IA.

Princípios Chave:

Geração Sob Demanda: Nenhuma imagem de estúdio é gerada automaticamente. O lojista deve clicar em "Gerar" e confirmar o débito de créditos.

Pacote de Catálogo: O sistema deve priorizar o débito de um "Pacote de Créditos de Catálogo" (se existir). Se acabar, usa o saldo normal.

Organização Visual: Separar claramente o que é input humano do que é output de IA.

1. Backend: Configuração de Manequins (Prompts)

Arquivo Alvo: src/lib/ai-services/mannequin-prompts.ts (Criar novo)

Exporte uma constante contendo os prompts ultra-realistas.

export const MANNEQUIN_STYLES = [
  {
    id: "modelo_1_jornal",
    name: "Newsprint Collage",
    description: "Decoupage artístico com jornal p/b",
    thumbnailUrl: "/assets/mannequins/thumb_news.jpg",
    // Prompt base: O backend deve substituir [GENDER] pela categoria do produto
    prompt: "A full-body photograph of a [GENDER] mannequin with a sculpted physique... (Copiar do prompt manequins.txt - Modelo 1)..."
  },
  {
    id: "modelo_2_aquarela",
    name: "Watercolor Flow",
    description: "Estilo aquarela translúcida",
    thumbnailUrl: "/assets/mannequins/thumb_water.jpg",
    prompt: "A full-body photograph of a naked white mannequin... (Copiar do prompt manequins.txt - Modelo 2)..."
  },
  {
    id: "modelo_3_revista",
    name: "Glossy Magazine",
    description: "Colagem colorida de revistas",
    thumbnailUrl: "/assets/mannequins/thumb_glossy.jpg",
    prompt: "A full-body photograph of a [GENDER] mannequin... (Copiar do prompt manequins.txt - Modelo 3)..."
  },
  {
    id: "modelo_4_arame",
    name: "Iron Wire Mesh",
    description: "Estrutura industrial de arame",
    thumbnailUrl: "/assets/mannequins/thumb_wire.jpg",
    prompt: "A full-body photograph of a sculptural mannequin... (Copiar do prompt manequins.txt - Modelo 4)..."
  }
];


2. Frontend: Componente ProductStudioModal (O Hub)

Arquivo Alvo: src/components/admin/products/ProductStudioModal.tsx

ESBOÇO DO LAYOUT (Wireframe):
O Cursor deve seguir rigorosamente esta estrutura visual.

+---------------------------------------------------------------+
|  ESTÚDIO DE CRIAÇÃO IA             [💎 450 Créditos | 📦 10 ] |  <-- Header com Badges
+---------------------------------------------------------------+
|  Selecione o Manequim:                                        |
|  [ (O) ]  [ (O) ]  [ (O) ]  [ (O) ]                           |  <-- Carrossel Horizontal
|  Jornal   Water    Glossy   Arame                             |      (Obrigatório selecionar)
+---------------------------------------------------------------+
|                                                               |
|  +----------------+  +----------------+  +----------------+   |
|  |                |  |                |  |                |   |
|  |  FOTO ORIGINAL |  |  FOTO CATÁLOGO |  | LOOK COMBINADO |   |
|  |  (Input)       |  |  (Output 1)    |  | (Output 2)     |   |
|  |                |  |                |  |                |   |
|  |   [Imagem]     |  |   [Manequim]   |  |   [Manequim    |   |
|  |                |  |                |  |    + Peça 2]   |   |
|  |                |  |                |  |                |   |
|  +----------------+  +----------------+  +----------------+   |
|  | ✅ Base        |  | [✨ GERAR ]    |  | [✨ GERAR ]    |   | <-- Botões habilitam só
|  |                |  | Custo: 1 Pack  |  | Custo: 2 Pack  |   |     após selecionar manequim
|  +----------------+  +----------------+  +----------------+   |
|                      | Ações (aparecem após gerar):           |
|                      | [v] Capa  [O] Display  [⭐] Promo      |
|                      +----------------------------------------+
+---------------------------------------------------------------+


Comportamento dos Botões:

Seleção de Manequim: Ao clicar na miniatura, define o estado selectedMannequinId.

Botões "Gerar": Ficam desabilitados (disabled={!selectedMannequinId}) até que um manequim seja escolhido.

Botões de Ação (Abaixo da imagem gerada):

[Definir Capa]: Define imageUrl principal.

[Enviar p/ Display]: Envia para a TV da loja.

[⭐ Promocional]: Marca isPromotional=true (Destaque no App).

3. Backend: API de Geração Inteligente

Arquivo Alvo: src/app/api/lojista/products/generate-studio/route.ts

Regras de Negócio:

Resolução de Gênero ([GENDER]):

Analisar a categoria do produto (via metadados da Fase 28).

Se Vestido, Saia, Biquíni -> Substituir [GENDER] por "female".

Se Terno, Gravata -> Substituir [GENDER] por "male".

Caso contrário -> "androgynous" ou manter o padrão do prompt.

Lógica "Look Combinado" (catalog_combined):

O sistema deve buscar no estoque 1 peça complementar.

Algoritmo:

Se Produto Original é "Blusa" -> Buscar "Calça" ou "Saia" com cores harmônicas (usar dados da Fase 28).

Se Produto Original é "Calça" -> Buscar "Blusa" ou "Camisa".

Adicionar a imagem dessa peça secundária ao prompt do Gemini ("...wearing also a [secondary_product_description]").

Overlay de Etiqueta (Preço):

Usar sharp para desenhar uma etiqueta discreta no canto inferior.

Conteúdo: Nome curto + Preço.

Estilo: Minimalista, semi-transparente.

4. Frontend: Refatoração do Formulário de Edição (Organização)

Arquivo Alvo: src/app/(admin)/produtos/[id]/edit/product-edit-form.tsx

Objetivo: Separar claramente os dados.

Estrutura Visual:

<div className="grid gap-8">
  
  {/* COLUNA ESQUERDA: DADOS MANUAIS (Obrigatórios) */}
  <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-800">
    <h3 className="font-bold text-gray-800 mb-4 uppercase text-sm tracking-wider">
      1. Dados do Lojista
    </h3>
    {/* Inputs: Preço, Estoque, SKU, Variações */}
  </div>

  {/* COLUNA DIREITA (ou ABAIXO): DADOS DE IA (Sugestões) */}
  <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl shadow-sm border border-indigo-100 relative">
    
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-bold text-indigo-700 uppercase text-sm tracking-wider flex items-center">
        <SparklesIcon className="w-4 h-4 mr-2"/> 2. Análise Automática
      </h3>
      <button className="text-xs text-indigo-600 hover:text-indigo-800 underline">
        Regenerar Análise
      </button>
    </div>

    {/* Inputs preenchidos automaticamente */}
    <div className="space-y-4">
      <Input label="Título SEO" className="border-indigo-200 bg-white" />
      <Textarea label="Descrição Comercial" className="border-indigo-200 bg-white" />
      
      {/* Área de Tags */}
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full border border-indigo-200">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  </div>

</div>
