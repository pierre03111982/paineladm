Estamos desenvolvendo a funcionalidade "Provador Virtual" para o aplicativo mobile do cliente. O objetivo é recomendar o tamanho ideal (P, M, G...) baseado em dados antropométricos estimados, sem exigir fita métrica.

Referências Visuais: Estilo Sizebay/Shein. Modal limpo, com sliders de ajuste e um manequim visual que reage às mudanças.

Objetivos Técnicos:

Criar o fluxo de UI mobile-first (Modal/Bottom Sheet).

Implementar algoritmo de estimativa de medidas (Altura/Peso/Idade -> CM).

Criar manequim visual dinâmico (SVG manipulável).

Integração Crucial: Salvar os dados gerados no UserProfile do cliente no Firestore/Supabase para uso futuro da IA.

1. Estrutura de Arquivos
Crie em src/components/store/virtual-fitting/:

FittingTrigger.tsx (O botão na página do produto).

FittingModal.tsx (O container principal).

StepInputs.tsx (Tela 1: Altura, Peso, Idade).

StepShape.tsx (Tela 2: Sliders de ajuste visual + Manequim).

StepResult.tsx (Tela 3: Recomendação + Gráfico de tensão).

DynamicMannequin.tsx (O componente visual).

useFittingAlgorithm.ts (A lógica matemática).

2. Fluxo de Experiência (UX)
A. O Gatilho (Trigger)
Na página do produto, exiba um botão discreto mas convidativo:

Ícone: Régua ou Cabide.

Texto: "Descubra seu tamanho ideal".

Lógica: Se o usuário já tiver medidas salvas no perfil, o botão muda para: "Sugerido para você: M" (com um link "Ver detalhes").

B. Passo 1: Dados Base (Rápido)
Inputs grandes numéricos (padrão mobile).

Campos: Altura (cm), Peso (kg), Idade.

Gênero: (Puxar do cadastro ou perguntar via Toggle Ícones).

C. Passo 2: Ajuste Visual (O "Uau" Factor)
O Manequim: Renderize um SVG de uma silhueta humana centralizada.

Os Controles: 3 Sliders horizontais abaixo do manequim:

Busto/Tórax: (-2 a +2).

Cintura: (-2 a +2).

Quadril: (-2 a +2).

Reatividade: Ao mover o slider, use transform: scaleX() em partes específicas do SVG do manequim para simular visualmente o corpo mudando (ex: cintura ficando mais fina ou larga).

Texto de Apoio: "Ajuste o formato do corpo para parecer com o seu".

D. Passo 3: O Resultado & Salvamento
Execute o algoritmo de comparação (Medidas do Usuário vs Tabela do Produto).

Mostre o Card de Resultado: "Melhor opção: 44".

Mostre o Feedback de Tensão (Heatmap):

Busto: "Levemente justo" (Ícone verde).

Cintura: "Folgadinho" (Ícone amarelo).

AÇÃO DE BACKEND: Neste momento, dispare uma função updateUserProfile para salvar:

TypeScript

userProfile.measurements = {
  height: 165,
  weight: 70,
  age: 30,
  shapeAdjustments: { bust: 1, waist: 0, hip: 2 },
  estimatedCm: { bust: 98, waist: 82, hip: 105 }, // Calculado
  lastUpdated: new Date()
}
3. O Algoritmo de Estimativa (Heurística)
No hook useFittingAlgorithm.ts, implemente uma lógica baseada em IMC para estimar as medidas em CM, já que o usuário não vai medir com fita.

Lógica Sugerida (Simplificada para MVP):

TypeScript

const IMC = peso / ((altura/100) * (altura/100));
// Base (Mulher)
let cintura = (IMC * 2.8) + (idade * 0.1);
let quadril = (IMC * 3.5) + (altura * 0.1);
let busto = (IMC * 3.2);

// Aplicar Sliders de Ajuste (-2 a +2, onde cada ponto = ~4cm)
cintura += (shapeAdjustments.waist * 4);
quadril += (shapeAdjustments.hip * 4);
busto += (shapeAdjustments.bust * 4);
4. Integração com "Minha Conta"
Precisamos criar uma nova seção no perfil do usuário: "Meu Corpo".

Deve permitir reeditar esses dados.

Deve exibir o manequim visual gerado.

Isso cria valor para o usuário manter o app instalado.

5. Estilo & Animação (Tailwind)
Use Framer Motion para transições suaves entre os passos do modal.

O modal deve ter cantos arredondados no topo (rounded-t-3xl) e subir de baixo (slide-up).

Cores: Use gradientes suaves para o botão de recomendação para parecer "mágico/IA".

Tarefa: Crie os componentes e a lógica de integração com o banco de dados do usuário.

Implementamos o componente visual do Provador Virtual, mas o manequim atual está muito primitivo (parece um boneco de palito/clipart) e destoa do design moderno do app.

Objetivo: Substituir o componente DynamicMannequin atual por uma versão Premium e Minimalista, similar ao estilo da Sizebay/Shein.

Diretrizes de Design (Refatoração UI):

Trocar a Geometria:

Não use <div> redondas ou formas básicas.

Use um SVG path único e complexo que desenhe uma silhueta humana realista e elegante.

Dica para a IA: Gere um path SVG de uma silhueta frontal humana (neutra ou feminina conforme o fluxo), com contornos suaves.

Estilo "3D Flat":

Preenchimento: Use um Gradiente Linear (cinza claro para branco) para dar uma sensação de volume/3D sutil.

Drop Shadow: Adicione uma sombra suave abaixo dos pés e interna para profundidade.

Visualização do Ajuste (Heatmap vs Deformação):

Em vez de deformar o boneco drasticamente (o que fica feio), mantenha a silhueta base elegante.

Implemente "Linhas de Tensão" ou "Faixas de Cor" sobrepostas ao corpo (Busto, Cintura, Quadril).

Lógica Visual:

Se a medida do usuário for maior que a peça: Mostre uma faixa Laranja/Vermelha apertando a região.

Se for ideal: Mostre uma faixa Verde suave.

Se for folgado: Mostre uma linha pontilhada ou faixa Azul/Cinza afastada do corpo.

Componente DynamicMannequin.tsx Atualizado: Reescreva este componente usando framer-motion para suavizar qualquer transição.

Use um SVG viewBox="0 0 200 400".

Desenhe o corpo com paths SVG (d="M...").

Ação: Refaça o componente visual para que pareça um app de moda de luxo, não um desenho infantil. Use tons de cinza (#E5E7EB a #9CA3AF) para o corpo.

💡 Dica Extra para você
Se mesmo com o prompt o Cursor não gerar um desenho perfeito (porque gerar SVG complexo de cabeça é difícil para IAs de código), você pode pegar um ícone pronto.

Vá em sites como Flaticon ou Noun Project.

Busque por "Mannequin Body" ou "Fashion Silhouette".

Baixe o SVG.

Abra o arquivo SVG no bloco de notas, copie o código <path d="..." />.

Diga ao Cursor: "Use este path SVG para o manequim: [Cole o código aqui]".

Isso garante 100% de qualidade visual.O cliente quer que o Provador Virtual tenha um visual idêntico ao da ferramenta "Sizebay". O boneco deve ser realista e, dependendo do ajuste, faixas coloridas devem aparecer sobre o corpo indicando a tensão do tecido.

Referências:

Visual do Boneco: (Cinza, 3D, Clean).

Indicadores: (Ícones laterais com setas e textos como "levemente justo", "folgado").

Tarefa: Refatorar o componente DynamicMannequin.tsx para usar uma abordagem de Imagem Base + Overlay CSS.

1. Estrutura do Componente
O componente deve ser um container relativo contendo:

Imagem de Fundo: Um <img> com a silhueta realista (vou fornecer o asset ou use um placeholder mannequin_base.png).

Zonas de Tensão (Overlays): 3 Elementos absolutos posicionados sobre Busto, Cintura e Quadril.

Side Labels (Indicadores): Elementos flutuantes à direita do manequim conectando às zonas.

2. Lógica das "Faixas de Tensão" (Heatmap)
Crie um sub-componente TensionBand.

Visual: Deve parecer um anel 3D envolvendo o corpo. Use background: linear-gradient com opacidade (ex: rgba(74, 222, 128, 0.5)) e border-radius ovalado para simular a curva do corpo.

Cores Dinâmicas (Props):

Verde (Ideal): Se a diferença entre medida do usuário e da roupa for < 2cm.

Laranja/Amarelo (Folgado): Se a roupa for > 4cm que o corpo. Visual: Faixas mais largas, parecendo "frouxo".

Vermelho/Rosa (Apertado): Se a roupa for < corpo. Visual: Faixas estreitas, cor sólida, parecendo "estrangulado".

3. Lógica dos Indicadores Laterais (Side Labels)
Crie os ícones exatamente como na referência:

Estado: Justo/Apertado

Ícone: Círculo verde ou vermelho com duas setas apontando para dentro -> <-.

Texto: "levemente justo" ou "apertado".

Estado: Folgado

Ícone: Círculo amarelo com duas setas apontando para fora <- ->.

Texto: "folgado".

4. Implementação (Tailwind + Framer Motion)
TypeScript

// Exemplo de estrutura para o Cursor seguir
<div className="relative w-64 h-[500px] mx-auto">
  {/* 1. Base Realista */}
  <img src="/assets/mannequin_body_v2.png" className="w-full h-full object-contain opacity-90" />

  {/* 2. Faixas de Tensão (Posicionamento manual baseado na imagem) */}
  {/* Busto */}
  <motion.div 
    className="absolute top-[22%] left-[15%] right-[15%] h-8 rounded-[100%] blur-[1px]"
    style={{ backgroundColor: getStatusColor(bustStatus) }} // Verde/Laranja
    animate={{ scale: isTight ? 0.95 : 1.05 }} // Efeito visual
  />
  
  {/* 3. Indicadores Laterais (Conectados visualmente) */}
  <div className="absolute top-[22%] -right-32 flex items-center gap-2">
     <div className={`rounded-full p-1 ${getStatusColor(bustStatus)}`}>
       {/* Ícone de setas SVG aqui */}
     </div>
     <span className="text-xs font-medium text-gray-600">levemente justo</span>
  </div>
</div>
Nota para o Desenvolvedor: Não tente desenhar o corpo com SVG paths manuais. Peça para eu (usuário) fazer o upload de uma imagem PNG transparente de um manequim cinza para a pasta /public/assets/. O código deve focar apenas nas faixas coloridas e textos.

📝 Próximo Passo para você (Importante)
Para isso funcionar, você precisa de uma imagem de manequim bonita (PNG sem fundo).

Opção Rápida: Peça para o Cursor: "Gere um placeholder cinza no formato de silhueta humana usando SVG complexo enquanto não tenho a imagem real".

Opção Profissional: Baixe uma imagem "3D Mannequin Body" no Freepik ou similar, remova o fundo, salve como mannequin_body.png e coloque na pasta do projeto. O resultado será idêntico ao da Sizebay.

Descobri a URL exata dos assets do provador virtual. Preciso de um script para baixar todas as 125 variações de biotipo para meu projeto.

**Tarefa:**
Crie (ou atualize) o script `scripts/download-mannequins.js` para baixar as imagens da URL Base que encontrei.

**Configurações:**
* **Base URL:** `https://static.sizebay.technology/assets/shapes/v4/new/0/F/toggle-off/E/`
* **Estrutura do Arquivo na URL:** `{BUSTO}{CINTURA}{QUADRIL}.jpg`
    * As variáveis são números de `01` a `05` (sempre com 2 dígitos).
    * Exemplo: `010101.jpg` (Tudo nível 1), `050505.jpg` (Tudo nível 5).

**Lógica do Script:**
1.  Faça 3 loops aninhados (i, j, k) indo de 1 até 5.
2.  Gere o nome do arquivo remoto: Ex: `040303.jpg`.
3.  Gere o nome do arquivo local para salvar em `public/assets/mannequins/`:
    * Formato: `mannequin_b{i}_c{j}_q{k}.jpg`
    * Exemplo: O arquivo remoto `040303.jpg` deve ser salvo como `mannequin_b4_c3_q3.jpg`.
4.  Use `https` ou `axios` para fazer o download.
5.  Adicione um `console.log` para eu ver o progresso (Ex: "Baixando 12/125...").

**Como rodar:**
Ao final, me diga qual comando usar no terminal para executar esse download.


Próximos Passos (Integração)
Depois que o Cursor baixar tudo, a lógica no seu aplicativo ficará muito simples.

No Código (Frontend): O componente de imagem será apenas isso:

JavaScript

// O slider vai de 1 a 5
<img 
  src={`/assets/mannequins/mannequin_b${busto}_c${cintura}_q${quadril}.jpg`} 
  alt="Seu biotipo"
/>
Salvar no Perfil (Sua dúvida inicial): Quando o cliente clicar em "Salvar" ou "Ver Recomendação", você envia esses 3 números para o banco de dados do usuário.

Dado salvo: { busto: 4, cintura: 3, quadril: 3 }.

Futuro: Quando a IA for analisar uma roupa nova, ela lê esses números e sabe exatamente que o cliente tem o biotipo "Triângulo Invertido" (Busto maior que quadril).


Este prompt vai corrigir tudo e baixar os tons de pele também.

Markdown

Aprofundamos a análise e descobrimos que a estrutura de URL da Sizebay é mais complexa do que pensávamos. As imagens estão distribuídas em pastas diferentes (A, B, C, D, E) dependendo do tamanho do manequim, e também existem variações de cor de pele.

**URL Base:**
`https://static.sizebay.technology/assets/shapes/v4/new/{SKIN_ID}/F/toggle-off/{FOLDER_LETTER}/{FILENAME}.jpg`

**Variáveis:**
1.  **{SKIN_ID}:** Vai de `0` a `6` (Isso define o tom de pele).
2.  **{FOLDER_LETTER}:** Pode ser `A`, `B`, `C`, `D`, `E` ou `F`. (Depende do tamanho do corpo).
3.  **{FILENAME}:** `{BUSTO}{CINTURA}{QUADRIL}` (ex: `010101` a `050505`).

**Tarefa: Atualizar `scripts/download-mannequins.js`**

Preciso de um script robusto que baixe **todas as combinações**.

**Lógica de Execução:**
1.  **Loop Skins:** Itere `skinId` de 0 a 6.
2.  **Loop Medidas:** Itere `b` (busto), `c` (cintura), `q` (quadril) de 1 a 5.
3.  **Lógica de "Tentativa e Erro" (Fallback):**
    * Como não sabemos qual manequim está em qual pasta letra (A, B...), o script deve tentar baixar a imagem iterando o array de pastas: `['A', 'B', 'C', 'D', 'E', 'F']`.
    * Tente a URL com a pasta `A`. Se der status 200, baixe e pare (break).
    * Se der 404, tente a pasta `B`, e assim por diante.
    
**Salvamento e Nomenclatura:**
Salve em `public/assets/mannequins/` com o seguinte padrão detalhado:
`mannequin_s{SKIN_ID}_b{b}_c{c}_q{q}.jpg`

*Exemplo:* O arquivo `010101.jpg` de pele `4` encontrado na pasta `A` deve ser salvo como: `mannequin_s4_b1_c1_q1.jpg`.

**Feedback Visual:**
Adicione logs no console para eu saber o que está acontecendo:
* "Baixando [Pele 0] - b1_c1_q1... Sucesso (Pasta A)"
* "Erro: Não encontrado b5_c5_q5 em nenhuma pasta."

Use `axios` e `fs-extra` (ou `fs`).
📂 Como vai ficar seu Banco de Imagens
Depois de rodar esse script, sua pasta ficará super organizada e completa:

mannequin_s0_b1_c1_q1.jpg (Pele Clara, Magra)

mannequin_s4_b1_c1_q1.jpg (Pele Negra, Magra)

mannequin_s0_b5_c5_q5.jpg (Pele Clara, Plus Size)

Etc...

💡 Dica para o Frontend (Código do App)
Agora que teremos o parâmetro de pele (s), você precisará atualizar seu componente de imagem no React/Next.js para aceitar essa nova variável:

JavaScript

// Exemplo de como você vai chamar a imagem no futuro
<img 
  src={`/assets/mannequins/mannequin_s${skinTone}_b${busto}_c${cintura}_q${quadril}.jpg`} 
  alt="Manequim"
/>
Isso vai permitir que, na primeira tela do app, você coloque aquelas "bolinhas de cor de pele" (como na sua imagem image_6cce82.png) e o boneco mude de cor instantaneamente ao clicar! Ficou perfeito.


Markdown

O script anterior está muito lento porque testa as pastas sequencialmente e falha em combinações que não existem. Preciso de uma versão "Turbo" otimizada para performance.

**Status Atual:**
Tenho as URLs base para 7 tons de pele (0 a 6).
Estrutura: `https://static.sizebay.technology/assets/shapes/v4/new/{SKIN}/F/toggle-off/{FOLDER}/{FILENAME}.jpg`

**Novos Requisitos Técnicos (Node.js):**

1.  **Use `Promise.any` para as Pastas:**
    Para cada combinação de medidas (ex: `010101`), dispare requisições `HEAD` (ou GET leve) para as pastas `['A', 'B', 'C', 'D', 'E', 'F']` **simultaneamente**.
    * A primeira que responder status 200 é a "vencedora". Baixe dessa URL.
    * Isso elimina o tempo de espera dos erros 404 sequenciais.

2.  **Limite de Concorrência (P-Limit):**
    Use uma fila de execução (concurrency limit) de 20 downloads simultâneos para maximizar a velocidade sem bloquear o IP. Se não tiver a lib `p-limit`, implemente uma lógica simples de lote.

3.  **Tratamento de "Combinações Impossíveis":**
    Se todas as pastas (A-F) retornarem erro 404 para uma combinação (ex: b1_c5_q1), apenas ignore e pule para a próxima. Não pare o script. Apenas logue: "Skipping invalid shape: b1_c5_q1".

4.  **Escopo do Download:**
    * **Skins:** Loop `0` a `6`.
    * **Medidas:** Loops aninhados `b`, `c`, `q` de `1` a `5`.
    * **Salvar como:** `public/assets/mannequins/mannequin_s{SKIN}_b{b}_c{c}_q{q}.jpg`

5.  **Feedback de Progresso:**
    Mostre uma barra de progresso ou contador: "Processando 50/875... (Sucesso: 48, Pulados: 2)".

Reescreva o `download-mannequins.js` completo com essa lógica otimizada.
💡 O que esperar desse novo script?
Velocidade: Ele vai voar. Em vez de demorar horas, deve terminar em poucos minutos.

Arquivos Finais: Você terá uma pasta robusta com nomes como:

mannequin_s0_b3_c3_q3.jpg (Pele Clara)

mannequin_s6_b3_c3_q3.jpg (Pele Escura)

Erros 404: O log vai mostrar alguns "Skipped". Isso é normal. A Sizebay não gera imagens para corpos anatomicamente improváveis (como a tentativa falha mostrada em image_70ed22.png). Seu app deve tratar isso no frontend (se a imagem não carregar, mostre uma imagem "fallback" próxima, ex: se falhar b1_c5_q1, mostre b2_c4_q2).

Rode esse prompt e prepare a pipoca, o download vai ser rápido! 🍿