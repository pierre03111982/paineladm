import { NextRequest, NextResponse } from "next/server";
import { fetchLojaPerfil, updateLojaPerfil } from "@/lib/firestore/server";

export const dynamic = 'force-dynamic';

// Função helper para adicionar CORS
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return addCorsHeaders(response);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      const response = NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Buscar perfil sem cache
    let perfil;
    try {
      perfil = await fetchLojaPerfil(lojistaId);
    } catch (fetchError: any) {
      console.error("[API Perfil] Erro ao buscar perfil:", fetchError);
      console.error("[API Perfil] Stack:", fetchError?.stack);
      // Retornar perfil vazio em vez de erro 500
      perfil = {
        nome: null,
        descricao: null,
        logoUrl: null,
        app_icon_url: null,
        instagram: null,
        facebook: null,
        tiktok: null,
        whatsapp: null,
        checkoutLink: null,
        descontoRedesSociais: null,
        descontoRedesSociaisExpiraEm: null,
        appModel: "modelo-1",
        displayOrientation: "horizontal",
        salesConfig: null,
        planTier: null,
        planBillingStatus: null,
      };
    }
    
    // Garantir que não retorne "Moda Tailandesa" - corrigir se necessário
    if (perfil && perfil.nome && (perfil.nome === "Moda Tailandesa" || perfil.nome === "moda tailandesa" || perfil.nome === "MODA TAILANDESA")) {
      console.warn("[API Perfil] Nome incorreto detectado:", perfil.nome);
      // Não corrigir automaticamente aqui, apenas logar
    }
    
    const response = NextResponse.json(perfil || null);
    // Adicionar headers para evitar cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return addCorsHeaders(response);
  } catch (error: any) {
    console.error("[API Perfil] Erro crítico:", error);
    console.error("[API Perfil] Stack:", error?.stack);
    const response = NextResponse.json(
      { 
        error: "Erro ao buscar perfil",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lojistaId,
      nome,
      descricao,
      instagram,
      facebook,
      tiktok,
      logoUrl,
      app_icon_url, // PHASE 17: Ícone do aplicativo PWA
      descontoRedesSociais,
      descontoRedesSociaisExpiraEm,
      appModel, // Campo adicionado
      salesConfig,
    } = body;

    if (!lojistaId) {
      const response = NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    console.log("[API Perfil POST] 📥 Recebido:", { lojistaId, appModel, nome }); // Log melhorado

    // Preparar dados para atualização
    const updateData: any = {};

    if (nome !== undefined) updateData.nome = nome;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (instagram !== undefined) updateData.instagram = instagram;
    if (facebook !== undefined) updateData.facebook = facebook;
    if (tiktok !== undefined) updateData.tiktok = tiktok;
    if (descontoRedesSociais !== undefined) updateData.descontoRedesSociais = descontoRedesSociais;
    if (descontoRedesSociaisExpiraEm !== undefined) updateData.descontoRedesSociaisExpiraEm = descontoRedesSociaisExpiraEm;
    if (appModel !== undefined) {
        updateData.appModel = appModel;
        console.log("[API Perfil POST] ✅ appModel incluído no update:", appModel);
    } else {
        console.warn("[API Perfil POST] ⚠️ appModel é undefined no body!");
    }

    // LogoUrl - sempre incluir se fornecido
    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl || null;
      // Se logoUrl está vazio, remover logo
      if (!logoUrl) {
        updateData.logoStoragePath = null;
      }
    }

    // PHASE 17: App Icon URL - sempre incluir se fornecido
    if (app_icon_url !== undefined) {
      updateData.app_icon_url = app_icon_url || null;
      // Se app_icon_url está vazio, remover ícone
      if (!app_icon_url) {
        updateData.app_icon_storage_path = null;
      }
    }

    // SalesConfig - sempre incluir se fornecido
    if (salesConfig !== undefined) {
      updateData.salesConfig = {
        channel: salesConfig.channel || "whatsapp",
        salesWhatsapp: salesConfig.salesWhatsapp || null,
        checkoutLink: salesConfig.checkoutLink || null,
      };
      console.log("[API Perfil POST] salesConfig preparado:", updateData.salesConfig);
    }

    console.log("[API Perfil POST] 💾 Dados para atualizar:", JSON.stringify(updateData, null, 2));

    await updateLojaPerfil(lojistaId, updateData);
    
    console.log("[API Perfil POST] ✅ Perfil atualizado com sucesso");

    const response = NextResponse.json({ success: true });
    return addCorsHeaders(response);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    const response = NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}
