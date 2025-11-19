import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

type Payload = {
  whatsapp?: string;
  lojistaId?: string;
  code?: string;
};

function buildError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Payload;
    const { whatsapp, lojistaId, code } = body;

    console.log("[verification/validate-code] Iniciando validação:", {
      whatsapp: whatsapp?.substring(0, 5) + "***",
      lojistaId,
      codeLength: code?.length,
    });

    if (!whatsapp || !lojistaId || !code) {
      console.error("[verification/validate-code] Campos obrigatórios faltando:", {
        hasWhatsapp: !!whatsapp,
        hasLojistaId: !!lojistaId,
        hasCode: !!code,
      });
      return buildError("whatsapp, lojistaId e code são obrigatórios");
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    console.log("[verification/validate-code] WhatsApp limpo:", cleanWhatsapp.substring(0, 5) + "***");

    // Código padrão temporário para desenvolvimento/testes - verificar ANTES de tudo
    const DEFAULT_CODE = "4567";
    const isDefaultCode = code === DEFAULT_CODE;

    if (isDefaultCode) {
      console.log("[verification/validate-code] ✅ Código padrão aceito:", DEFAULT_CODE);
      // Não precisa buscar no Firestore para código padrão
      // Retornar sucesso direto
      return NextResponse.json({ 
        ok: true, 
        isDefaultCode: true,
        message: "Código padrão aceito" 
      });
    }

    // Se não for código padrão, buscar no Firestore
    try {
      // Inicializar Firestore dentro da função para evitar problemas de inicialização
      const db = getAdminDb();
      const codesRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("verificationCodes");

      console.log("[verification/validate-code] Buscando códigos no Firestore...");

      // Buscar TODOS os códigos não usados para este WhatsApp
      // Depois filtrar em memória para evitar necessidade de índice composto
      let snapshot;
      try {
        // Tentar buscar apenas por whatsapp primeiro (mais simples)
        snapshot = await codesRef
          .where("whatsapp", "==", cleanWhatsapp)
          .limit(20)
          .get();
        
        console.log("[verification/validate-code] Códigos encontrados (antes do filtro):", snapshot.size);
        
        // Filtrar em memória os não usados
        const unusedDocs = snapshot.docs.filter((doc: any) => {
          const data = doc.data();
          return data.used === false || data.used === undefined;
        });
        
        console.log("[verification/validate-code] Códigos não usados (após filtro):", unusedDocs.length);
        
        // Se não encontrou nenhum, retornar erro
        if (unusedDocs.length === 0) {
          console.warn("[verification/validate-code] Nenhum código não usado encontrado");
          return buildError("Código inválido ou expirado", 400);
        }
        
        // Usar os documentos filtrados
        snapshot = {
          docs: unusedDocs,
          size: unusedDocs.length,
          empty: unusedDocs.length === 0,
        } as any;
      } catch (queryError: any) {
        // Se a query falhar (por exemplo, falta índice), tentar buscar todos e filtrar
        console.warn("[verification/validate-code] Query com where falhou, tentando buscar todos:", {
          error: queryError.message,
          code: queryError.code,
        });
        
        // Buscar todos os códigos recentes (últimos 50) e filtrar em memória
        const allCodes = await codesRef
          .limit(50)
          .get();
        
        const filteredDocs = allCodes.docs.filter((doc: any) => {
          const data = doc.data();
          return (
            data.whatsapp === cleanWhatsapp &&
            (data.used === false || data.used === undefined)
          );
        });
        
        if (filteredDocs.length === 0) {
          return buildError("Código inválido ou expirado", 400);
        }
        
        snapshot = {
          docs: filteredDocs,
          size: filteredDocs.length,
          empty: false,
        } as any;
      }

      console.log("[verification/validate-code] Códigos encontrados:", snapshot.size);

      if (snapshot.empty) {
        console.warn("[verification/validate-code] Nenhum código encontrado para:", {
          whatsapp: cleanWhatsapp.substring(0, 5) + "***",
          lojistaId,
        });
        return buildError("Código inválido ou expirado", 400);
      }

      // Ordenar em memória por createdAt (mais recente primeiro)
      const docs = snapshot.docs.map((doc: any) => ({
        doc,
        data: doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt || 0),
      }));

      docs.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

      // Usamos `any` aqui para evitar dependência direta dos tipos do SDK do Firestore
      // durante o build do Next.js em ambiente serverless.
      let matchDoc: any = null;

      for (const { doc, data: docData } of docs) {
        if (docData.code === code) {
          matchDoc = doc;
          break;
        }
      }

      if (!matchDoc) {
        console.warn("[verification/validate-code] Código não encontrado nos documentos:", {
          codeLength: code.length,
          totalDocs: docs.length,
        });
        return buildError("Código inválido", 400);
      }

      const data = matchDoc.data() as any;
      const expiresAt: Date | null =
        data.expiresAt?.toDate?.() ?? (data.expiresAt ? new Date(data.expiresAt) : null);

      console.log("[verification/validate-code] Verificando expiração:", {
        expiresAt: expiresAt?.toISOString(),
        now: new Date().toISOString(),
        expired: expiresAt ? expiresAt.getTime() < Date.now() : true,
      });

      if (!expiresAt || expiresAt.getTime() < Date.now()) {
        console.warn("[verification/validate-code] Código expirado");
        return buildError("Código expirado", 400);
      }

      await matchDoc.ref.update({ used: true, validatedAt: new Date() });
      console.log("[verification/validate-code] ✅ Código validado com sucesso");

      return NextResponse.json({ ok: true });
    } catch (firestoreError: any) {
      console.error("[verification/validate-code] Erro no Firestore:", {
        message: firestoreError?.message,
        code: firestoreError?.code,
        stack: firestoreError?.stack?.substring(0, 500),
      });
      throw firestoreError;
    }
  } catch (error: any) {
    console.error("[verification/validate-code] Erro geral:", {
      message: error?.message,
      stack: error?.stack?.substring(0, 500),
      name: error?.name,
    });
    return buildError(
      `Erro interno ao validar código: ${error?.message || "Erro desconhecido"}`,
      500
    );
  }
}


