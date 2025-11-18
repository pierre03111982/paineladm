/**
 * API Route: Envio Massivo de Promoções
 * POST /api/lojista/composicoes/bulk-promotion
 * 
 * Envia mensagens promocionais para múltiplos clientes baseado em composições selecionadas
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { getClientesFromComposicoes } from "@/lib/firestore/composition-promotions";

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
    const { composicaoIds, mensagemTemplate } = body;

    if (!Array.isArray(composicaoIds) || composicaoIds.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma composição selecionada" },
        { status: 400 }
      );
    }

    // Buscar clientes das composições selecionadas
    const clientes = await getClientesFromComposicoes(lojistaId, composicaoIds);

    if (clientes.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente encontrado nas composições selecionadas" },
        { status: 404 }
      );
    }

    // Filtrar apenas clientes com WhatsApp
    const clientesComWhatsapp = clientes.filter(
      (cliente) => cliente.clienteWhatsapp && cliente.clienteWhatsapp.length > 0
    );

    if (clientesComWhatsapp.length === 0) {
      return NextResponse.json(
        { error: "Nenhum cliente com WhatsApp encontrado" },
        { status: 404 }
      );
    }

    // Preparar mensagens personalizadas
    const mensagens = clientesComWhatsapp.map((cliente) => {
      let mensagem = mensagemTemplate || "Olá {{cliente}}! Temos uma promoção especial para você!";
      
      // Substituir placeholders
      mensagem = mensagem.replace(/{{cliente}}/gi, cliente.clienteNome);
      mensagem = mensagem.replace(/{{produto}}/gi, cliente.produtoNome);
      
      return {
        clienteId: cliente.clienteId,
        clienteNome: cliente.clienteNome,
        clienteWhatsapp: cliente.clienteWhatsapp,
        mensagem,
        composicaoId: cliente.composicaoId,
      };
    });

    // Por enquanto, retornar as mensagens preparadas
    // Em produção, aqui seria feita a integração com WhatsApp Business API
    return NextResponse.json({
      success: true,
      message: `${mensagens.length} mensagens preparadas para envio`,
      mensagens,
      totalClientes: clientesComWhatsapp.length,
    });
  } catch (error) {
    console.error("[bulk-promotion] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao preparar envio massivo",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

