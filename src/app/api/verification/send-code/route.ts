import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

type Payload = {
  whatsapp?: string;
  lojistaId?: string;
};

function buildError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload;
    const { whatsapp, lojistaId } = body;

    console.log("[verification/send-code] Iniciando envio de código:", {
      whatsapp: whatsapp?.substring(0, 5) + "***",
      lojistaId,
    });

    if (!whatsapp || !lojistaId) {
      console.error("[verification/send-code] Campos obrigatórios faltando");
      return buildError("whatsapp e lojistaId são obrigatórios");
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    if (cleanWhatsapp.length < 10) {
      console.error("[verification/send-code] WhatsApp inválido:", cleanWhatsapp.length, "dígitos");
      return buildError("WhatsApp inválido");
    }

    // Gerar código de 4 dígitos
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("[verification/send-code] Código gerado:", code);

    try {
      // Inicializar Firestore dentro da função
      const db = getAdminDb();
      const codesRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("verificationCodes");

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

      await codesRef.add({
        whatsapp: cleanWhatsapp,
        code,
        createdAt: new Date(),
        expiresAt,
        used: false,
      });

      console.log("[verification/send-code] ✅ Código salvo no Firestore");
    } catch (firestoreError: any) {
      console.error("[verification/send-code] Erro ao salvar no Firestore:", {
        message: firestoreError?.message,
        code: firestoreError?.code,
      });
      throw firestoreError;
    }

    // Enviar via WhatsApp Cloud API, se configurado
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    console.log("[verification/send-code] Verificando configuração WhatsApp:", {
      hasPhoneId: !!phoneId,
      hasToken: !!token,
      phoneIdLength: phoneId?.length || 0,
      tokenLength: token?.length || 0,
    });

    if (phoneId && token) {
      // Garantir código do Brasil (55) se ainda não tiver
      let toNumber = cleanWhatsapp;
      if (!toNumber.startsWith("55")) {
        toNumber = `55${toNumber}`;
      }

      console.log("[verification/send-code] Enviando via WhatsApp Cloud API:", {
        phoneId,
        toNumber: toNumber.substring(0, 5) + "***",
        code,
      });

      const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;
      const payload = {
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: {
          body: `Seu código de verificação Experimente AI é: ${code}`,
        },
      };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const responseText = await res.text();
        console.log("[verification/send-code] Resposta WhatsApp API:", {
          status: res.status,
          statusText: res.statusText,
          response: responseText.substring(0, 500),
        });

        if (!res.ok) {
          console.error("[verification/send-code] ❌ Erro ao enviar WhatsApp:", {
            status: res.status,
            response: responseText,
          });
          
          // Tentar parsear erro da API do WhatsApp
          try {
            const errorData = JSON.parse(responseText);
            console.error("[verification/send-code] Detalhes do erro:", errorData);
          } catch {
            // Não é JSON, já logamos o texto
          }
          
          // IMPORTANTE: Retornar erro para o cliente saber que não foi enviado
          return NextResponse.json(
            {
              ok: false,
              error: "Erro ao enviar código via WhatsApp. Verifique os logs.",
              code: code, // Retornar código para debug (remover em produção)
              debug: process.env.NODE_ENV === "development" ? {
                whatsappError: responseText.substring(0, 200),
              } : undefined,
            },
            { status: 500 }
          );
        } else {
          console.log("[verification/send-code] ✅ Código enviado via WhatsApp com sucesso");
        }
      } catch (fetchError: any) {
        console.error("[verification/send-code] ❌ Erro na requisição WhatsApp:", {
          message: fetchError?.message,
          stack: fetchError?.stack?.substring(0, 500),
        });
        
        return NextResponse.json(
          {
            ok: false,
            error: "Erro ao conectar com WhatsApp API",
            code: code, // Retornar código para debug (remover em produção)
          },
          { status: 500 }
        );
      }
    } else {
      console.warn(
        "[verification/send-code] ⚠️ WHATSAPP_PHONE_ID/WHATSAPP_TOKEN não configurados. Código não enviado pelo WhatsApp."
      );
      console.log("[verification/send-code] 📋 Código gerado (para debug):", code);
      
      // Em desenvolvimento, retornar o código para facilitar testes
      return NextResponse.json({
        ok: true,
        message: "Código gerado mas não enviado (WhatsApp não configurado)",
        code: process.env.NODE_ENV === "development" ? code : undefined,
        warning: "Configure WHATSAPP_PHONE_ID e WHATSAPP_TOKEN no Vercel",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[verification/send-code] ❌ Erro geral:", {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
    });
    return buildError(`Erro interno ao enviar código: ${error?.message || "Erro desconhecido"}`, 500);
  }
}


