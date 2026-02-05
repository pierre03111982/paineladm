// TASK: UNIFICAÇÃO DE LÓGICA (USAR O SUCESSO DA FRENTE NAS COSTAS)

// 1. Definição de Biometria (Mantém o que funcionou)
let biometricsBlock = "";
const audience = (targetAudience || 'adulto').toLowerCase();

if (audience.includes('infantil') || audience.includes('bebe') || audience.includes('kids')) {
    biometricsBlock = `
    - ANATOMY: CHILD PROPORTIONS.
    - TORSO: Boxy, short, and rectangular.
    - CHEST: Completely FLAT.
    - RATIO: Maintain original Width-to-Height ratio.
    `;
} else {
    biometricsBlock = `
    - ANATOMY: STANDARD MANNEQUIN.
    `;
}

// 2. Definição da Vista (A única diferença real)
let viewBlock = "";
if (variante === 'costas') {
    viewBlock = `
    --- VIEW: BACK SIDE ---
    - INPUT REFERENCE: Look at the Input Back Image.
    - GEOMETRY: Trace the EXACT pockets and seams from the input.
    - CRITICAL: Do NOT create a glass body. The volume must be HOLLOW (filled with air).
    - TEXTURE: Copy the denim/fabric texture from the input.
    `;
} else {
    viewBlock = `
    --- VIEW: FRONT SIDE ---
    - INPUT REFERENCE: Look at the Input Front Image.
    - GEOMETRY: If it looks like a skirt panel, keep it flat.
    - DETAILS: Preserve button count.
    `;
}

// 3. O Prompt Unificado (Baseado no que ficou bom na frente)
finalPrompt = `
Role: You are an Expert 3D Fashion Scanner.
Task: Reconstruct the INPUT IMAGE as a high-end Ghost Mannequin Product Photo.

${biometricsBlock}

${viewBlock}

--- GHOST MANNEQUIN PHYSICS ---
- INVISIBLE MODE: ON.
- NO BODY PARTS: No head, arms, legs, or skin.
- MATERIAL: The clothes are filled by AIR.
- FORBIDDEN: Do NOT render a glass, plastic, or transparent mannequin body.
- NECK OPENING: Show the inside back fabric with shadow to prove it's hollow.

--- LIGHTING & RENDER ---
- Lighting: Soft studio lighting.
- Shadows: Volumetric shadows inside the garment.
- Background: Pure White.

NEGATIVE PROMPT: (glass body, transparent mannequin, plastic skin, acrylic body, visible legs, distorted details, changed pockets, illustration, low resolution).
`;

// TASK: TRAVAR CONSISTÊNCIA DA IMAGEM (ELIMINAR ALEATORIEDADE)

// Problema: O cliente relata que cada geração sai diferente da outra (inconsistência total).
// Causa: O parâmetro 'seed' está aleatório e a 'temperature' está alta.
// Solução: Fixar a seed e zerar a temperatura para garantir reprodutibilidade.

// 1. Localize a parte do código onde você chama `model.generateContent` ou define a `generationConfig`.
// 2. FORCE estes parâmetros exatos dentro da configuração:

const generationConfig = {
    temperature: 0.1,        // BAIXÍSSIMO: Força a IA a escolher a opção mais óbvia (fidelidade), sem inventar.
    topP: 0.95,              // Padrão de segurança.
    topK: 40,                // Padrão de segurança.
    candidateCount: 1,       // Gera apenas 1 opção (foca todo o poder nela).
    seed: 45678,             // A TRAVA MÁGICA: Um número fixo qualquer.
                             // Enquanto este número for 45678, o resultado será SEMPRE IGUAL.
};

// 3. Certifique-se de que essa config está sendo passada para o modelo:
// Exemplo: const result = await model.generateContent({ contents: [...], generationConfig: generationConfig });

// 4. NO PROMPT (Reforço de Estabilidade):
// Adicione esta linha no topo do seu `finalPrompt`:
// "STABILITY MODE: ON. Do not vary the output. Use deterministic frente original.png