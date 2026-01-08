/**
 * Prompts de Manequins para Estúdio de Criação IA
 * FASE 32: Estúdio de Criação Digital
 * PHASE 33: Correção de Enquadramento 9:16 Full Body
 * 
 * Este arquivo contém os prompts ultra-realistas para diferentes estilos de manequins.
 * Os prompts incluem instruções rígidas de enquadramento vertical 9:16 com full body.
 * O backend substituirá [GENDER] pela categoria do produto (female, male, or androgynous).
 */

export interface MannequinStyle {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  prompt: string;
}

export const MANNEQUIN_STYLES: MannequinStyle[] = [
  {
    id: "modelo_1_jornal",
    name: "Newsprint Collage",
    description: "Decoupage artístico com jornal p/b",
    thumbnailUrl: "/assets/mannequins/modelo-1.jpg",
    prompt: `(Masterpiece, top quality, ultra-realistic), Vertical 9:16 aspect ratio portrait. A full-body photograph of a [GENDER] mannequin with a sculpted physique, defined musculature on arms and torso. The mannequin is completely covered in a textured decoupage collage made from torn pieces of black and white newspapers. The collage features a dense mix of monochrome text headlines and abstract fragments in grayscale tones. Edges of torn paper are visible creating texture. The mannequin stands in a natural pose in a minimalist studio against a plain, neutral grey concrete wall. ABSOLUTELY NO BACKGROUND OBJECTS, NO FRAMES, NO PAINTINGS. Soft diffused studio lighting. CAMERA ANGLE: Wide shot, full body visible from head to toe, centered subject. Ensure a small margin of empty space above the head and below the feet to prevent cropping. Image must fill the entire canvas edge-to-edge. No borders, no padding.`
  },
  {
    id: "modelo_2_aquarela",
    name: "Watercolor Flow",
    description: "Estilo aquarela translúcida",
    thumbnailUrl: "/assets/mannequins/modelo-2.jpg",
    prompt: `(Masterpiece, top quality, ultra-realistic), Vertical 9:16 aspect ratio portrait. A full-body photograph of a naked white mannequin standing in a minimalist studio against a plain neutral grey concrete wall. NO background art frames. The mannequin features sculpted hair volume and defined facial features. The entire surface is covered in a translucent watercolor painting style with abstract geometric shapes and fluid intersecting lines. Soft pastel color palette: blues, aquas, pinks, mint greens, lilacs. Visible watercolor paint drips run down the chest, arms, and legs. Soft diffused studio lighting. CAMERA ANGLE: Wide shot, full body visible from head to toe, centered subject. Ensure a small margin of empty space above the head and below the feet to prevent cropping. Image must fill the entire canvas edge-to-edge. No borders, no padding.`
  },
  {
    id: "modelo_3_revista",
    name: "Glossy Magazine",
    description: "Colagem colorida de revistas",
    thumbnailUrl: "/assets/mannequins/modelo-3.jpg",
    prompt: `(Masterpiece, top quality, ultra-realistic), Vertical 9:16 aspect ratio portrait. A full-body photograph of a [GENDER] mannequin with a sculpted physique. The entire surface is completely covered in a vibrant, chaotic decoupage collage made from torn, colorful glossy magazine pages. Dense mix of high-saturation fashion photographs, advertisements, and headlines. Glossy lacquered finish showing paper edges. Natural pose, minimalist studio, plain grey concrete background. CAMERA ANGLE: Wide shot, full body visible from head to toe, centered subject. Ensure a small margin of empty space above the head and below the feet to prevent cropping. Image must fill the entire canvas edge-to-edge. No borders, no padding.`
  },
  {
    id: "modelo_4_arame",
    name: "Iron Wire Mesh",
    description: "Estrutura industrial de arame",
    thumbnailUrl: "/assets/mannequins/modelo-4.jpg",
    prompt: `(Masterpiece, top quality, ultra-realistic), Vertical 9:16 aspect ratio portrait. A full-body photograph of a sculptural mannequin constructed entirely from intricate iron wire mesh, welded steel rods, and woven metallic lattice. Industrial yet detailed artistic style. Completely unclothed. Detailed head with volume created by dense swirling layers of iron wire. See-through structure showing complex internal framework. Mannequin stands centrally in a minimalist studio against a plain neutral grey concrete wall. Dramatic studio lighting highlighting metallic texture and casting intricate shadows. CAMERA ANGLE: Wide shot, full body visible from head to toe, centered subject. Ensure a small margin of empty space above the head and below the feet to prevent cropping. Image must fill the entire canvas edge-to-edge. No borders, no padding.`
  },
  {
    id: "modelo_5_classico",
    name: "Classic White",
    description: "Manequim clássico branco minimalista",
    thumbnailUrl: "/assets/mannequins/modelo-5.jpg",
    prompt: `(Masterpiece, top quality, ultra-realistic), Vertical 9:16 aspect ratio portrait. A full-body photograph of a [GENDER] mannequin with a classic, minimalist white finish. The mannequin has a smooth, matte white surface that reflects studio lighting softly. The form is elegant and refined, with clean lines and a timeless aesthetic. The pose is fashion-forward and sophisticated, suitable for high-end retail displays. Studio lighting is even and professional, creating subtle shadows that define the form without harsh contrasts. Background is neutral (white, light gray, or soft beige) to create a clean, editorial look. CAMERA ANGLE: Wide shot, full body visible from head to toe, centered subject. Ensure a small margin of empty space above the head and below the feet to prevent cropping. Image must fill the entire canvas edge-to-edge. No borders, no padding.`
  }
];

/**
 * Substitui o placeholder [GENDER] no prompt baseado na categoria do produto
 */
export function resolveGenderFromCategory(categoria: string): string {
  const categoriaLower = categoria.toLowerCase();
  
  // Categorias femininas
  if (
    categoriaLower.includes("vestido") ||
    categoriaLower.includes("saia") ||
    categoriaLower.includes("biquíni") ||
    categoriaLower.includes("maiô") ||
    categoriaLower.includes("sutiã") ||
    categoriaLower.includes("calcinha") ||
    categoriaLower.includes("lingerie")
  ) {
    return "female";
  }
  
  // Categorias masculinas
  if (
    categoriaLower.includes("terno") ||
    categoriaLower.includes("gravata") ||
    categoriaLower.includes("camisa social") ||
    categoriaLower.includes("calça social")
  ) {
    return "male";
  }
  
  // Padrão: andrógino ou neutro
  return "androgynous";
}

/**
 * Obtém o prompt formatado para um estilo de manequim específico
 * PHASE 33: Os prompts já incluem instruções de framing 9:16 integradas
 */
export function getFormattedMannequinPrompt(
  styleId: string,
  categoria: string
): string | null {
  const style = MANNEQUIN_STYLES.find(s => s.id === styleId);
  if (!style) return null;
  
  const gender = resolveGenderFromCategory(categoria);
  // Substituir [GENDER] no prompt - as instruções de framing já estão integradas
  return style.prompt.replace(/\[GENDER\]/g, gender);
}

