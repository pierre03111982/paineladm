import { NextRequest, NextResponse } from "next/server";
import { fetchClienteByWhatsapp } from "@/lib/firestore/server";
import bcrypt from "bcryptjs";

/**
 * POST /api/cliente/auth
 * Autentica cliente com WhatsApp e senha
 * Body: { lojistaId: string, whatsapp: string, password: string }
 */
export async function POST(request: NextRequest) {
  let lojistaId: string | undefined;
  let whatsapp: string | undefined;
  
  try {
    const body = await request.json();
    ({ lojistaId, whatsapp } = body);
    const { password } = body;

    if (!lojistaId || !whatsapp || !password) {
      return NextResponse.json(
        { error: "lojistaId, whatsapp e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    
    // Verificar se o Firebase Admin está configurado antes de fazer a busca
    let cliente;
    try {
      cliente = await fetchClienteByWhatsapp(lojistaId, cleanWhatsapp);
    } catch (fetchError: any) {
      console.error("[API Cliente Auth] Erro ao buscar cliente:", fetchError);
      if (fetchError?.message?.includes("Firebase Admin SDK não configurado")) {
        return NextResponse.json(
          { error: "Erro de configuração do servidor. Entre em contato com o suporte." },
          { status: 500 }
        );
      }
      throw fetchError;
    }

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    // Buscar dados completos do cliente para verificar senha
    const { getAdminDb } = await import("@/lib/firebaseAdmin");
    const db = getAdminDb();
    const clienteRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes")
      .doc(cliente.id);

    const clienteSnapshot = await clienteRef.get();
    if (!clienteSnapshot.exists) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const clienteData = clienteSnapshot.data();
    const hashedPassword = clienteData?.passwordHash;

    if (!hashedPassword) {
      return NextResponse.json(
        { error: "Cliente não possui senha cadastrada. Faça o cadastro primeiro." },
        { status: 400 }
      );
    }

    // Verificar se o acesso está bloqueado
    if (clienteData?.acessoBloqueado === true || clienteData?.arquivado === true) {
      return NextResponse.json(
        { error: "Seu acesso ao aplicativo foi bloqueado. Entre em contato com a loja." },
        { status: 403 }
      );
    }

    // Verificar senha
    const passwordMatch = await bcrypt.compare(password, hashedPassword);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Senha incorreta" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        whatsapp: cliente.whatsapp,
        email: cliente.email,
      },
    });
  } catch (error: any) {
    console.error("[API Cliente Auth] Erro:", error);
    console.error("[API Cliente Auth] Stack:", error.stack);
    console.error("[API Cliente Auth] Detalhes:", {
      lojistaId: lojistaId || "não disponível",
      whatsapp: whatsapp ? whatsapp.substring(0, 5) + "..." : "não disponível",
      errorName: error?.name,
      errorMessage: error?.message,
    });
    
    // Retornar mensagem de erro mais específica
    let errorMessage = "Erro ao autenticar cliente";
    if (error?.message?.includes("Firebase")) {
      errorMessage = "Erro de configuração do Firebase. Verifique as credenciais.";
    } else if (error?.message?.includes("permission") || error?.message?.includes("permissão")) {
      errorMessage = "Erro de permissão ao acessar o banco de dados.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
