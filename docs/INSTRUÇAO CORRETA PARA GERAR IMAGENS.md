# MASTER PROMPT: UNIFICAÇÃO DE QUALIDADE VISUAL (PROTOCOLO REMIX UNIVERSAL)

**DIAGNÓSTICO:**
Identificamos que as imagens do modo "Remix" têm qualidade superior (melhor luz, integração e naturalidade) comparadas ao modo "Criar Look" e "Trocar Produto".
Isso ocorre porque o Remix usa parâmetros agressivos de regeneração (`gerarNovoLook: true`, `scenePrompts` com poses dinâmicas e `seed` aleatório) que não estão presentes nos outros modos.

**OBJETIVO:**
Aplicar a lógica de "Reconstrução de Cena" do Remix em **TODAS** as gerações, garantindo que mesmo o primeiro look tenha qualidade editorial, iluminação integrada e postura natural.

**ARQUIVOS ALVO:**
1. `apps-cliente/modelo-2/src/app/[lojistaId]/experimentar/page.tsx` (Frontend Payload)
2. `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx` (Frontend Payload de Troca)
3. `paineladm/src/app/api/lojista/composicoes/generate/route.ts` (Backend Logic)

---

## TAREFA 1: ATUALIZAR PAYLOAD NO FRONTEND (Experimentar & Resultado)

Nos arquivos `experimentar/page.tsx` (função `handleVisualize`) e `resultado/page.tsx` (função `handleAddAccessory`), modifique o objeto `payload.options`:

1.  **Ativar `gerarNovoLook: true` SEMPRE:**
    Isso força o backend a não ser rígido com a postura original "travada" da foto do usuário, permitindo que a IA ajuste a luz e o caimento da roupa melhor.

2.  **Injetar `scenePrompts` Dinâmico:**
    Mesmo no primeiro look, precisamos de um prompt de "atitude".
    Adicione uma lógica simples no frontend para enviar um prompt base de alta qualidade:
    `scenePrompts: ["Professional fashion photography, confident pose, natural lighting, looking at camera, high detail"]`

3.  **Enviar `seed`:**
    Gere um `Math.floor(Math.random() * 1000000)` e envie no payload para evitar resultados "médios/plásticos".

---

## TAREFA 2: REFORÇAR BACKEND (generate/route.ts)

No backend, localize onde o `smartContext` é processado.
Se o payload contiver `gerarNovoLook: true` (agora sempre terá), certifique-se de que o **Orchestrator** receba instruções para:
1.  **Relighting:** Recalcular a luz da pessoa baseada no cenário escolhido.
2.  **Pose Adjustment:** Permitir micro-ajustes na pose para que a roupa caia melhor (evitar braços "duros").

**TRECHO DE CÓDIGO SUGERIDO (Orchestrator Prompt):**
Adicione ao System Prompt:
> "FORCE REALISM: Regardless of input pose, adjust the subject's stance slightly to look natural in the environment. RELIGHT the subject completely to match the background atmosphere. NO 'cutout' effect."

---

**EXECUÇÃO:**
1. Modifique o frontend para enviar as opções do Remix (`gerarNovoLook`, `scenePrompts`, `seed`) em todas as chamadas.
2. Atualize o backend para respeitar essas opções agressivamente em todos os endpoints.

# MASTER PROMPT: TRAVAS DE SEGURANÇA (IDENTIDADE & PRODUTO)

**CONTEXTO:**
Estamos unificando a qualidade visual ativando a lógica de "Reconstrução de Cena" (tipo Remix) para todas as gerações.
**RISCO IDENTIFICADO:** Ao dar mais liberdade para a IA criar luz e cenário, aumentamos o risco de ela alterar o rosto da pessoa ou detalhes do produto.
**OBJETIVO:** Blindar a identidade e o produto com instruções de "Alta Fidelidade" no prompt do sistema.

**ARQUIVO ALVO:**
`paineladm/src/lib/ai-services/composition-orchestrator.ts`

**AÇÃO:**
No método de construção do prompt (`systemInstruction`), adicione ou reforce estes **3 BLOCOS DE SEGURANÇA** com linguagem imperativa:

## 1. TRAVA DE MICRO-DETALHES FACIAIS (Identity Shield)
> "👤 FACE PRESERVATION PROTOCOL (NON-NEGOTIABLE):
> - You must treat the face area from [Image 1] as a 'Sacred Zone'.
> - PRESERVE MICRO-DETAILS: Moles, scars, asymmetry, exact eye shape, nose width, and lip volume.
> - NO BEAUTIFICATION: Do not apply 'beauty filters' or make the person look like a generic model. Keep them real.
> - IF THE POSE CHANGES: The head angle may adjust slightly to look natural, BUT the features must remain 100% recognizable as the input person."

## 2. TRAVA DE TEXTURA DO PRODUTO (Fabric Anchor)
> "🧶 PRODUCT TEXTURE LOCK:
> - The clothes from [Image 2..N] are NOT generic references. They are EXACT products.
> - LOGOS & PRINTS: If there is text, a logo, or a pattern on the shirt/pants, it must be VISIBLE and LEGIBLE. Do not hallucinate new text.
> - MATERIAL PHYSICS: If the product looks like heavy denim, render heavy denim wrinkles. If it looks like silk, render silk drapes. Do not change the fabric weight."

## 3. TRAVA DE COERÊNCIA ANATÔMICA (Body Morphing Protection)
> "physics_engine: {
>   'body_volume': 'MATCH_INPUT', // Do not make the person thinner or muscular
>   'skin_tone': 'EXACT_MATCH',   // Do not change lighting so much that skin color changes
>   'height_ratio': 'PRESERVE'    // Keep leg/torso proportions identical to input
> }"

**CONFIGURAÇÃO TÉCNICA:**
- Certifique-se de que o parâmetro `gerarNovoLook` não aumente a `temperature` acima de 0.75. Se passar disso, a identidade quebra.
- Mantenha `aspectRatio: '9:16'` obrigatório.

**EXECUÇÃO:**
Incorpore estas regras de segurança no prompt existente, garantindo que elas tenham prioridade sobre as instruções de criatividade do cenário.