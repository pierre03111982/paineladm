/**
 * API Route: Enviar composições por WhatsApp
 * POST /api/lojista/composicoes/send-whatsapp
 * 
 * Envia as imagens geradas automaticamente para o WhatsApp do cliente
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchLojaPerfil } from "@/lib/firestore/server";

const db = getAdminDb();

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get("origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ?? "Content-Type, Authorization"
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    request.headers.get("access-control-request-method") ?? "POST, GET, OPTIONS"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  return applyCors(request, response);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId, composicaoId, customerWhatsapp } = body;

    if (!lojistaId || !composicaoId) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "lojistaId e composicaoId são obrigatórios" },
          { status: 400 }
        )
      );
    }

    if (!customerWhatsapp) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "WhatsApp do cliente não fornecido" },
          { status: 400 }
        )
      );
    }

    // Buscar composição no Firestore
    const composicaoDoc = await db
      .collection("lojas")
      .doc(lojistaId)
      .collection("composicoes")
      .doc(composicaoId)
      .get();

    if (!composicaoDoc.exists) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Composição não encontrada" },
          { status: 404 }
        )
      );
    }

    const composicaoData = composicaoDoc.data();
    const looks = composicaoData?.looks || [];

    if (looks.length === 0) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Nenhuma imagem encontrada na composição" },
          { status: 400 }
        )
      );
    }

    // Buscar perfil do lojista para verificar configuração do WhatsApp
    const perfil = await fetchLojaPerfil(lojistaId);
    
    if (!perfil) {
      return applyCors(
        request,
        NextResponse.json(
          { error: "Perfil do lojista não encontrado" },
          { status: 404 }
        )
      );
    }

    // Verificar se a API do WhatsApp está configurada
    const hasWhatsAppAPI = (perfil as any).whatsappApiKey && (perfil as any).whatsappPhoneId;

    if (hasWhatsAppAPI) {
      // Enviar via API do WhatsApp Business
      try {
        const sanitizedPhone = customerWhatsapp.replace(/\D/g, "");
        
        // Construir mensagem com links das imagens
        const produtoNome = composicaoData?.primaryProductName || looks[0]?.produtoNome || "produto";
        const produtoPreco = composicaoData?.primaryProductPrice 
          ? `R$ ${Number(composicaoData.primaryProductPrice).toFixed(2)}`
          : looks[0]?.produtoPreco
          ? `R$ ${Number(looks[0].produtoPreco).toFixed(2)}`
          : "";

        const messageText = `🎉 Olá! Suas imagens do Experimente AI estão prontas!\n\n` +
          `📦 ${produtoNome}${produtoPreco ? ` - ${produtoPreco}` : ""}\n\n` +
          `✨ Você gerou ${looks.length} look(s) exclusivo(s):\n\n` +
          looks.map((look: any, index: number) => 
            `${index + 1}. ${look.titulo}\n${look.imagemUrl}`
          ).join("\n\n") +
          `\n\n💬 Quer comprar? Entre em contato conosco!`;

        // Enviar via API do WhatsApp
        const apiUrl = `https://graph.facebook.com/v19.0/${(perfil as any).whatsappPhoneId}/messages`;
        
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(perfil as any).whatsappApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: sanitizedPhone,
            type: "text",
            text: {
              preview_url: true,
              body: messageText,
            },
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok) {
          // Atualizar composição como compartilhada
          await composicaoDoc.ref.update({
            compartilhado: true,
            compartilhadoEm: new Date(),
          });

          return applyCors(
            request,
            NextResponse.json({
              success: true,
              method: "api",
              message: "Imagens enviadas com sucesso via WhatsApp Business API",
            })
          );
        } else {
          console.error("[API] Erro ao enviar via WhatsApp API:", result);
          // Continuar para fallback
        }
      } catch (apiError) {
        console.error("[API] Erro ao enviar via WhatsApp API:", apiError);
        // Continuar para fallback
      }
    }

    // Fallback: retornar link do WhatsApp
    const whatsappNumber = (perfil as any).salesConfig?.salesWhatsapp || (perfil as any).whatsapp;
    if (!whatsappNumber) {
      return applyCors(
        request,
        NextResponse.json(
          { 
            error: "WhatsApp do lojista não configurado",
            fallback: true,
          },
          { status: 400 }
        )
      );
    }

    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    const produtoNome = composicaoData?.primaryProductName || looks[0]?.produtoNome || "produto";
    const produtoPreco = composicaoData?.primaryProductPrice 
      ? `R$ ${Number(composicaoData.primaryProductPrice).toFixed(2)}`
      : looks[0]?.produtoPreco
      ? `R$ ${Number(looks[0].produtoPreco).toFixed(2)}`
      : "";

    const whatsappText = `🎉 Olá! Suas imagens do Experimente AI estão prontas!\n\n` +
      `📦 ${produtoNome}${produtoPreco ? ` - ${produtoPreco}` : ""}\n\n` +
      `✨ Você gerou ${looks.length} look(s) exclusivo(s):\n\n` +
      looks.map((look: any, index: number) => 
        `${index + 1}. ${look.titulo}\n${look.imagemUrl}`
      ).join("\n\n") +
      `\n\n💬 Quer comprar? Entre em contato conosco!`;

    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(whatsappText)}`;

    return applyCors(
      request,
      NextResponse.json({
        success: true,
        method: "link",
        whatsappUrl,
        message: "Use o link do WhatsApp para enviar as imagens",
      })
    );
  } catch (error) {
    console.error("[API] Erro ao enviar composições por WhatsApp:", error);
    return applyCors(
      request,
      NextResponse.json(
        {
          error: "Erro ao enviar composições por WhatsApp",
          details: error instanceof Error ? error.message : "Erro desconhecido",
        },
        { status: 500 }
      )
    );
  }
}




