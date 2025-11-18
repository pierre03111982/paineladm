import { PlanosTable } from "../../(admin)/planos/components/planos-table";
import { PageHeader } from "../../(lojista)/components/page-header";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica (não estática)
export const dynamic = 'force-dynamic';

async function fetchPlanos() {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("planos").get();
    
    // Se não existir, retornar planos padrão
    if (snapshot.empty) {
      return [
        {
          id: "free",
          nome: "Free",
          preco: 0,
          limiteImagens: 10,
          descricao: "Plano gratuito com limite básico",
          ativo: true,
        },
        {
          id: "lite",
          nome: "Lite",
          preco: 99.0,
          limiteImagens: 500,
          descricao: "Plano intermediário para pequenas lojas",
          ativo: true,
        },
        {
          id: "pro",
          nome: "Pro",
          preco: 299.0,
          limiteImagens: 5000,
          descricao: "Plano profissional com recursos avançados",
          ativo: true,
        },
      ];
    }
    
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || doc.id,
        preco: data.preco || 0,
        limiteImagens: data.limiteImagens || 0,
        descricao: data.descricao || "",
        ativo: data.ativo !== false,
      };
    });
  } catch (error) {
    console.error("[AdminPlanos] Erro ao buscar planos:", error);
    // Retornar planos padrão em caso de erro
    return [
      {
        id: "free",
        nome: "Free",
        preco: 0,
        limiteImagens: 10,
        descricao: "Plano gratuito com limite básico",
        ativo: true,
      },
      {
        id: "lite",
        nome: "Lite",
        preco: 99.0,
        limiteImagens: 500,
        descricao: "Plano intermediário para pequenas lojas",
        ativo: true,
      },
      {
        id: "pro",
        nome: "Pro",
        preco: 299.0,
        limiteImagens: 5000,
        descricao: "Plano profissional com recursos avançados",
        ativo: true,
      },
    ];
  }
}

export default async function AdminPlanosPage() {
  // Verificar se o usuário é admin
  await requireAdmin();
  
  const planos = await fetchPlanos();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Planos"
        description="Crie e edite planos de assinatura para os lojistas"
      />

      <PlanosTable initialPlanos={planos} />
    </div>
  );
}




