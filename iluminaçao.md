# TASK: PADRONIZAÇÃO DE ILUMINAÇÃO (PROFESSIONAL STUDIO LIGHTING)

**Objetivo:**
Garantir que todas as gerações de imagens (frente, costas, looks) tenham uma iluminação de alta fidelidade, estilo estúdio de e-commerce de luxo. A luz não pode ser nem muito forte (estourada) nem muito escura.

**Ação:**
No arquivo `route.ts`, crie uma constante global chamada `LIGHTING_BLOCK` e insira ela dentro de todos os prompts (frente, costas, outfit).

**Código da Constante:**

```typescript
const LIGHTING_BLOCK = `
--- LIGHTING & ATMOSPHERE (Global Standard) ---
1. SETUP: "Professional Softbox Studio Lighting".
   - Main Light (Key): Large softbox from the top-left (45-degree angle). Soft, diffused light.
   - Fill Light: Subtle reflector on the right to lift shadows (no pitch-black areas).
   - Back Light: Very faint rim light to separate the garment from the white background.

2. QUALITY SPECS:
   - Color Temperature: 5500K (Neutral Daylight White). NO yellow or blue tint.
   - Shadows: Soft, ray-traced ambient occlusion shadows. NO harsh/hard edges.
   - Contrast: Balanced High Dynamic Range (HDR) to highlight fabric texture.

3. LOOK & FEEL:
   - Clean, expensive, and commercial.
   - The fabric must look touchable (micro-contrast on texture).
`;

// Como aplicar:
// Adicione ${LIGHTING_BLOCK} dentro da string 'finalPrompt' de cada variante.