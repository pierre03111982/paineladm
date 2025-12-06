import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";

export const dynamic = 'force-dynamic';

/**
 * API para buscar clientes por nome ou WhatsApp (autocomplete)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const lojistaId = searchParams.get('lojistaId');
    
    if (!lojistaId || !query || query.length < 2) {
      return NextResponse.json({ 
        success: true, 
        clientes: [] 
      });
    }

    const db = getAdminDb();
    
    // Buscar clientes que contenham o termo de busca no nome ou WhatsApp
    const clientesRef = db
      .collection("lojas")
      .doc(lojistaId)
      .collection("clientes");
    
    const allClientsSnapshot = await clientesRef.limit(100).get();
    
    const searchLower = query.toLowerCase().trim();
    const searchNumbers = searchLower.replace(/\D/g, ''); // Apenas números para busca de WhatsApp
    
    const matchingClients: Array<{
      id: string;
      nome: string;
      whatsapp?: string;
      label: string;
    }> = [];
    
    allClientsSnapshot.forEach((doc) => {
      const data = doc.data();
      const nome = (data?.nome || '').toLowerCase();
      const whatsapp = (data?.whatsapp || '').replace(/\D/g, ''); // Remover formatação do WhatsApp
      
      // Buscar por nome
      if (nome.includes(searchLower)) {
        matchingClients.push({
          id: doc.id,
          nome: data?.nome || 'Cliente',
          whatsapp: data?.whatsapp || undefined,
          label: data?.whatsapp ? `${data.nome} (${data.whatsapp})` : (data?.nome || 'Cliente'),
        });
      }
      // Buscar por WhatsApp (apenas números)
      else if (searchNumbers && whatsapp && whatsapp.includes(searchNumbers)) {
        matchingClients.push({
          id: doc.id,
          nome: data?.nome || 'Cliente',
          whatsapp: data?.whatsapp || undefined,
          label: data?.whatsapp ? `${data.nome} (${data.whatsapp})` : (data?.nome || 'Cliente'),
        });
      }
    });
    
    // Limitar a 10 resultados para performance
    const results = matchingClients.slice(0, 10);
    
    return NextResponse.json({
      success: true,
      clientes: results,
    });
  } catch (error: any) {
    console.error("[API/ClientesSearch] Erro:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao buscar clientes",
        clientes: [],
      },
      { status: 500 }
    );
  }
}



