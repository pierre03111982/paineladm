import { NextResponse } from "next/server";
import { fetchLojaPerfil } from "@/lib/firestore/server";

type SendWhatsAppPayload = {
  to?: string;
  message?: string;
  templateName?: string;
  mediaUrl?: string | null;
};

function sanitizePhone(value: string | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

export async function POST(request: Request) {
  const lojistaId =
    process.env.NEXT_PUBLIC_LOJISTA_ID || process.env.LOJISTA_ID || "";

  if (!lojistaId) {
    return NextResponse.json(
      { error: "lojistaId não configurado." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as SendWhatsAppPayload;
    const sanitizedPhone = sanitizePhone(body?.to);
    if (!sanitizedPhone) {
      return NextResponse.json(
        { error: "Informe um número de destino válido." },
        { status: 400 }
      );
    }

    const perfil = await fetchLojaPerfil(lojistaId);
    if (!perfil) {
      return NextResponse.json(
        { error: "Perfil do lojista não encontrado." },
        { status: 404 }
      );
    }

    const token = (perfil as any).whatsappApiKey ?? undefined;
    const phoneId = (perfil as any).whatsappPhoneId ?? undefined;
    if (!token || !phoneId) {
      return NextResponse.json(
        { error: "Configure o token e o Phone ID do WhatsApp Business." },
        { status: 400 }
      );
    }

    const templateName =
      body.templateName?.trim() || (perfil as any).whatsappTemplateName || undefined;

    const apiUrl = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    let payload: Record<string, unknown>;

    if (templateName) {
      const messageText =
        body.message?.trim() ||
        "Olá! Você tem novidades do provador ExperimenteAI.";
      payload = {
        messaging_product: "whatsapp",
        to: sanitizedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "pt_BR" },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: messageText,
                },
              ],
            },
          ],
        },
      };
    } else {
      const messageText =
        body.message?.trim() ||
        "Olá! Você tem novidades do provador ExperimenteAI.";
      payload = {
        messaging_product: "whatsapp",
        to: sanitizedPhone,
        type: "text",
        text: {
          preview_url: true,
          body: messageText,
        },
      };
    }

    if (body.mediaUrl && payload.type === "text") {
      // append link ao texto quando não há template
      payload = {
        ...payload,
        text: {
          preview_url: true,
          body: `${(payload.text as any).body}\n${body.mediaUrl}`,
        },
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "[api/lojista/mensagens/whatsapp] erro ao enviar mensagem",
        result
      );
      return NextResponse.json(
        {
          error:
            result?.error?.message ||
            "Falha ao enviar mensagem pelo WhatsApp Business.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { success: true, result },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[api/lojista/mensagens/whatsapp] erro inesperado:",
      error
    );
    return NextResponse.json(
      { error: "Erro interno ao enviar mensagem." },
      { status: 500 }
    );
  }
}



