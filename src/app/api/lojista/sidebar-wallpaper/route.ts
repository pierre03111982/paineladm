/**
 * GET /api/lojista/sidebar-wallpaper?lojistaId=xxx
 * POST /api/lojista/sidebar-wallpaper
 * 
 * Gerencia o wallpaper da sidebar do lojista
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { fetchLojaPerfil, updateLojaPerfil } from "@/lib/firestore/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lojistaId = searchParams.get("lojistaId") || await getCurrentLojistaId();
    
    if (!lojistaId) {
      return NextResponse.json({ error: "lojistaId é obrigatório" }, { status: 400 });
    }

    const perfil = await fetchLojaPerfil(lojistaId);
    const wallpaper = perfil?.settings?.sidebarWallpaper || null;

    return NextResponse.json({ wallpaper });
  } catch (error) {
    console.error("[sidebar-wallpaper GET] Erro:", error);
    return NextResponse.json({ error: "Erro ao carregar wallpaper" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, wallpaper } = body;

    if (!lojistaId) {
      return NextResponse.json({ error: "lojistaId é obrigatório" }, { status: 400 });
    }

    // Buscar perfil atual para preservar outros settings
    const perfil = await fetchLojaPerfil(lojistaId);
    const currentSettings = perfil?.settings || {};

    await updateLojaPerfil(lojistaId, {
      settings: {
        ...currentSettings,
        sidebarWallpaper: wallpaper || null,
      },
    });

    return NextResponse.json({ success: true, wallpaper });
  } catch (error) {
    console.error("[sidebar-wallpaper POST] Erro:", error);
    return NextResponse.json({ error: "Erro ao salvar wallpaper" }, { status: 500 });
  }
}
