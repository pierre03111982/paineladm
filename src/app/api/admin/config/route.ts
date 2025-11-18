import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

const db = getAdminDb();

export const dynamic = 'force-dynamic';

// GET - Buscar configurações
export async function GET() {
  try {
    await requireAdmin();

    const configDoc = await db.collection("admin").doc("config").get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      return NextResponse.json({
        success: true,
        config: {
          nome: data?.nome || null,
          marca: data?.marca || null,
          logoUrl: data?.logoUrl || null,
          emailSuporte: data?.emailSuporte || null,
          emailNotificacoes: data?.emailNotificacoes || null,
        },
      });
    }

    // Retornar valores padrão se não existir
    return NextResponse.json({
      success: true,
      config: {
        nome: "Painel Administrativo",
        marca: "EXPERIMENTE AI",
        logoUrl: null,
        emailSuporte: "suporte@experimente.ai",
        emailNotificacoes: "notificacoes@experimente.ai",
      },
    });
  } catch (error: any) {
    console.error("[API Admin Config] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar configurações",
      },
      { status: 500 }
    );
  }
}

// POST - Salvar configurações
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { nome, marca, logoUrl, emailSuporte, emailNotificacoes } = body;

    const updateData: any = {};
    
    if (nome !== undefined) updateData.nome = nome;
    if (marca !== undefined) updateData.marca = marca;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (emailSuporte !== undefined) updateData.emailSuporte = emailSuporte;
    if (emailNotificacoes !== undefined) updateData.emailNotificacoes = emailNotificacoes;

    updateData.updatedAt = new Date();

    await db.collection("admin").doc("config").set(updateData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Configurações salvas com sucesso",
    });
  } catch (error: any) {
    console.error("[API Admin Config] Erro ao salvar:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao salvar configurações",
      },
      { status: 500 }
    );
  }
}

