import { getAdminDb } from "@/lib/firebaseAdmin";
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth";
import { redirect } from "next/navigation";
import Image from "next/image";

async function fetchComposicao(lojistaId: string, composicaoId: string) {
  if (!lojistaId || !composicaoId) {
    return null;
  }

  try {
    const db = getAdminDb();
    const composicaoDoc = await db.collection("composicoes").doc(composicaoId).get();

    if (!composicaoDoc.exists) {
      return null;
    }

    const data = composicaoDoc.data();
    
    // Verificar se a composição pertence ao lojista
    if (data?.lojistaId !== lojistaId) {
      return null;
    }

    return {
      id: composicaoDoc.id,
      productName: data?.productName || "Produto",
      productKey: data?.productKey || null,
      customerName: data?.customerName || "Cliente",
      customerKey: data?.customerKey || null,
      imageUrl: data?.imageUrl || data?.previewUrl || null,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt || new Date(),
      liked: data?.liked || false,
      shares: data?.shares || 0,
    };
  } catch (error) {
    console.error("[ComposicaoPage] Erro ao buscar composição:", error);
    return null;
  }
}

export default async function ComposicaoPage({
  params,
}: {
  params: { id: string };
}) {
  const lojistaId = await getCurrentLojistaId();

  if (!lojistaId) {
    redirect("/login");
  }

  const composicao = await fetchComposicao(lojistaId, params.id);

  if (!composicao) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Composição não encontrada</h1>
          <p className="text-gray-500 mb-4">
            A composição que você está procurando não existe ou não pertence à sua loja.
          </p>
          <a
            href="/composicoes"
            className="text-indigo-600 hover:text-indigo-700 underline"
          >
            Voltar para Composições
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <a
          href="/composicoes"
          className="text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-2 mb-4"
        >
          ← Voltar para Composições
        </a>
        <h1 className="text-3xl font-bold mb-2">{composicao.productName}</h1>
        <p className="text-gray-500">
          Cliente: {composicao.customerName} •{" "}
          {composicao.createdAt.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {composicao.imageUrl ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: "80vh" }}>
            <Image
              src={composicao.imageUrl}
              alt={composicao.productName}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500">Imagem não disponível</p>
        </div>
      )}

      <div className="mt-6 flex gap-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="font-medium">Curtidas:</span>
          <span>{composicao.liked ? "Sim" : "Não"}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="font-medium">Compartilhamentos:</span>
          <span>{composicao.shares}</span>
        </div>
      </div>
    </div>
  );
}



