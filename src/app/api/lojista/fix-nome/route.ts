import { NextRequest, NextResponse } from "next/server";
import { fetchLojaPerfil, updateLojaPerfil } from "@/lib/firestore/server";

export const dynamic = 'force-dynamic';

/**
 * Rota para corrigir o nome da loja quando está incorreto
 * Corrige "Moda Tailandesa" para "THAIS MODA"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lojistaId } = body;

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    console.log("[Fix Nome] Buscando perfil para lojistaId:", lojistaId);

    // Buscar perfil atual
    const perfil = await fetchLojaPerfil(lojistaId);

    if (!perfil) {
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: 404 }
      );
    }

    console.log("[Fix Nome] Nome atual:", perfil.nome);

    // Verificar se o nome está incorreto
    if (perfil.nome === "Moda Tailandesa" || perfil.nome === "moda tailandesa" || perfil.nome === "MODA TAILANDESA") {
      console.log("[Fix Nome] Corrigindo nome de 'Moda Tailandesa' para 'THAIS MODA'");
      
      // Atualizar o nome
      await updateLojaPerfil(lojistaId, {
        nome: "THAIS MODA"
      });

      return NextResponse.json({
        success: true,
        message: "Nome corrigido com sucesso",
        nomeAnterior: perfil.nome,
        nomeNovo: "THAIS MODA"
      });
    }

    // Se o nome já está correto
    return NextResponse.json({
      success: true,
      message: "Nome já está correto",
      nomeAtual: perfil.nome
    });

  } catch (error) {
    console.error("[Fix Nome] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao corrigir nome" },
      { status: 500 }
    );
  }
}

