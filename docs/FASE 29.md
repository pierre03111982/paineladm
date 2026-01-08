PHASE 29: Deep Customer Profiling (Integração com AI Tags)

**Contexto:**
Agora que temos produtos com metadados ricos gerados pelo Gemini (Fase 28: tags de contexto, tecido, cor, estilo), precisamos usar esses dados para criar um **"DNA de Estilo"** do cliente. Atualmente, o `ClienteDoc` (Seção 5.3 da Auditoria) tem apenas segmentações básicas (`fa-vestidos`). Queremos saber granularmente o que ele gosta.

**Objetivo:**
Evoluir a estrutura do perfil do cliente no Firestore e a lógica de atualização para rastrear preferências detalhadas baseadas nas interações (Try-on/Like/Compra) com os produtos enriquecidos pela IA.

---

## 1. Backend: Atualização do Schema (Firestore)

**Arquivo Alvo:** `src/lib/types.ts` ou onde `ClienteDoc` estiver definido.

Expanda a interface `ClienteDoc` para incluir o objeto `dnaEstilo`:

```typescript
export interface ClienteDoc {
  // ... campos existentes (id, nome, whatsapp...)
  
  // NOVO CAMPO: DNA de Estilo Agregado
  dnaEstilo?: {
    coresPreferidas: Record<string, number>;    // ex: { "preto": 15, "azul": 4 }
    tecidosPreferidos: Record<string, number>;  // ex: { "linho": 8, "couro": 2 }
    tagsInteresse: Record<string, number>;      // ex: { "festa": 10, "inverno": 5, "decote-v": 3 }
    faixaPrecoMedia: number;                    // Média de preço dos produtos interagidos
    tamanhosProvados: Record<string, number>;   // ex: { "M": 10, "G": 2 }
    ultimaAtualizacao: string; // ISO Date
  };
  
  // Manter compatibilidade com estrutura anterior
  segmentacao?: {
    tipo?: string; 
    // ...
  };
}
2. Backend: Lógica de Agregação (Engine de Profiling)
Arquivo Alvo: src/lib/firestore/client-profiling.ts (Criar novo ou atualizar updateClienteComposicoesStats)

Crie uma função updateClientDNA(lojistaId: string, clienteId: string, interactionType: 'try-on' | 'like' | 'buy', productData: ProdutoDoc):

Lógica de Pesos: Defina pesos para cada tipo de interação para tornar o perfil preciso:

Try-on (Gerou look): Peso 1

Like (Curtiu resultado): Peso 3

Buy (Comprou/Checkout): Peso 10 (Intenção máxima)

Algoritmo:

Buscar o documento atual do cliente.

Ler os dados do produto interagido (que agora vêm da IA: cor_predominante, tecido_estimado, tags).

Iterar sobre os atributos e somar o peso correspondente no dnaEstilo do cliente.

Exemplo: Se o cliente comprou (peso 10) um vestido de linho preto:

dnaEstilo.coresPreferidas['preto'] += 10

dnaEstilo.tecidosPreferidos['linho'] += 10

dnaEstilo.tagsInteresse['vestido'] += 10

Recalcular a faixaPrecoMedia.

Salvar no Firestore.

3. Frontend: Visualização no Painel do Lojista
Arquivo Alvo: src/app/(admin)/clientes/[id]/page.tsx (Perfil do Cliente)

Adicione uma nova seção visual "Insights de IA" ou "DNA do Cliente" usando componentes visuais (barras de progresso ou tags coloridas):

Top Cores: Mostrar as 3 cores com maior pontuação (bolinhas coloridas).

Tecidos Favoritos: Listar os materiais que ele mais prova/compra.

Nuvem de Interesse: Mostrar as tags mais fortes (ex: "Festa", "Verão", "Fitness").

Sugestão de Abordagem (IA Gerada): - Use esses dados para gerar um texto de sugestão para o vendedor.

Ex: "Este cliente ama tons escuros e tecidos naturais (linho/algodão). Foca muito em looks de inverno. Ofereça a nova jaqueta de couro preta."

4. Integração com Automação (Gatilho)
Arquivo Alvo: src/app/api/lojista/composicoes/generate/route.ts

Garanta que toda vez que um look for gerado com sucesso (Try-on), a função updateClientDNA seja chamada em background (fire-and-forget ou via Job) para manter o perfil sempre atualizado em tempo real.

Comando para o Cursor: "Implemente a expansão do ClienteDoc para incluir o dnaEstilo. Em seguida, crie a lógica de updateClientDNA que pondera Try-on/Like/Buy baseada nos metadados ricos do produto (cor, tecido, tags). Por fim, atualize a view do perfil do cliente no admin para exibir esses gráficos de preferência."


### O que essa implementação muda no seu sistema:

1.  **Do "Achismo" para a Ciência de Dados:** O sistema deixa de "achar" que o cliente gosta de vestidos e passa a "saber" que o cliente gosta de *Vestidos de Linho Pretos na faixa de R$ 300,00*.
2.  **Vendas Cirúrgicas:** O vendedor, ao abrir o perfil, não precisa perguntar "o que você gosta?". O painel diz: *"Ofereça linho e cores escuras"*.
3.  **Valorização do Produto:** O trabalho da IA na Fase 28 (descrever o produto) paga dividendo