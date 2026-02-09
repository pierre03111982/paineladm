/**
 * GET /api/lojista/wallpapers-list
 * 
 * Lista automaticamente todas as imagens disponíveis na pasta public/wallpapers
 */

import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const wallpapersDir = join(process.cwd(), "public", "wallpapers");
    
    // Ler todos os arquivos da pasta
    const files = await readdir(wallpapersDir);
    
    // Filtrar apenas arquivos de imagem
    const imageFiles = files.filter((file) => {
      const ext = file.toLowerCase();
      return ext.endsWith(".jpg") || 
             ext.endsWith(".jpeg") || 
             ext.endsWith(".png") || 
             ext.endsWith(".webp");
    });

    // Criar lista de wallpapers com informações básicas
    const wallpapers = imageFiles.map((filename) => ({
      id: filename.replace(/\.[^/.]+$/, ""), // Remove extensão
      filename: filename,
      thumbnail: `/wallpapers/${filename}`,
    }));

    return NextResponse.json({ wallpapers });
  } catch (error) {
    console.error("[wallpapers-list] Erro ao listar wallpapers:", error);
    return NextResponse.json({ wallpapers: [] }, { status: 200 });
  }
}
