/**
 * API Route: Sincronização de E-commerce
 * POST /api/lojista/ecommerce/sync
 * 
 * Sincroniza produtos de plataformas de e-commerce (Shopify, Nuvemshop, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import {
  saveEcommerceSyncConfig,
  getEcommerceSyncConfig,
  syncFromShopify,
  syncFromNuvemshop,
} from "@/lib/ecommerce/sync";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const lojistaId = await getCurrentLojistaId();
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, config } = body;

    if (action === "save-config") {
      // Salvar configuração de sincronização
      if (!config) {
        return NextResponse.json(
          { error: "Configuração não fornecida" },
          { status: 400 }
        );
      }

      await saveEcommerceSyncConfig(lojistaId, config);
      return NextResponse.json({
        success: true,
        message: "Configuração salva com sucesso",
      });
    } else if (action === "sync") {
      // Executar sincronização
      const syncConfig = await getEcommerceSyncConfig(lojistaId);
      if (!syncConfig) {
        return NextResponse.json(
          { error: "Configuração de sincronização não encontrada" },
          { status: 404 }
        );
      }

      let result;
      if (syncConfig.platform === "shopify") {
        result = await syncFromShopify(lojistaId, syncConfig);
      } else if (syncConfig.platform === "nuvemshop") {
        result = await syncFromNuvemshop(lojistaId, syncConfig);
      } else {
        return NextResponse.json(
          { error: "Plataforma não suportada" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Sincronização concluída",
        synced: result.synced,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        { error: "Ação não reconhecida" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[ecommerce/sync] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao sincronizar e-commerce",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const lojistaId = await getCurrentLojistaId();
    if (!lojistaId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const config = await getEcommerceSyncConfig(lojistaId);
    return NextResponse.json({
      success: true,
      config: config || null,
    });
  } catch (error) {
    console.error("[ecommerce/sync] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao buscar configuração",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

