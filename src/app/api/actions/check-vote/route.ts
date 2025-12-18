import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const dynamic = 'force-dynamic';

/**
 * GET /api/actions/check-vote
 * Verifica se o cliente já votou em uma composição
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const compositionId = searchParams.get("compositionId");
    const customerId = searchParams.get("customerId");
    const lojistaId = searchParams.get("lojistaId");

    if (!compositionId || !customerId || !lojistaId) {
      return NextResponse.json(
        { error: "compositionId, customerId e lojistaId são obrigatórios" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = getAdminDb();
      if (!db) {
        throw new Error("Firebase Admin não inicializado");
      }
    } catch (dbError: any) {
      console.error("[Check Vote] Erro ao inicializar Firebase Admin:", dbError);
      // Retornar resposta padrão (não votou) em vez de erro 500
      return NextResponse.json({
        votedType: null,
        action: null,
        alreadyVoted: false,
      });
    }

    // Verificar na composição se já foi votado
    try {
      const composicaoRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("composicoes")
        .doc(compositionId);

      const composicaoDoc = await composicaoRef.get();

      if (composicaoDoc.exists) {
        const composicaoData = composicaoDoc.data();
        
        // Verificar se o cliente já votou nesta composição
        if (composicaoData?.customerId === customerId) {
          // Verificar se tem like ou dislike
          if (composicaoData?.curtido === true || composicaoData?.liked === true) {
            return NextResponse.json({
              votedType: "like",
              action: "like",
              alreadyVoted: true,
            });
          }
          
          if (composicaoData?.disliked === true) {
            return NextResponse.json({
              votedType: "dislike",
              action: "dislike",
              alreadyVoted: true,
            });
          }
        }
      }
    } catch (error) {
      console.error("[Check Vote] Erro ao verificar composição:", error);
    }

    // Verificar na coleção 'generations' (sistema novo que previne duplicidade)
    try {
      const generationsRef = db.collection("generations");
      const generationsSnapshot = await generationsRef
        .where("compositionId", "==", compositionId)
        .where("userId", "==", customerId)
        .where("lojistaId", "==", lojistaId)
        .limit(1)
        .get();

      if (!generationsSnapshot.empty) {
        const generationData = generationsSnapshot.docs[0].data();
        
        if (generationData?.status === "liked") {
          return NextResponse.json({
            votedType: "like",
            action: "like",
            alreadyVoted: true,
          });
        }
        
        if (generationData?.status === "disliked") {
          return NextResponse.json({
            votedType: "dislike",
            action: "dislike",
            alreadyVoted: true,
          });
        }
      }
    } catch (error) {
      console.error("[Check Vote] Erro ao verificar generations:", error);
    }

    // Verificar na coleção de favoritos se já votou (sistema antigo - compatibilidade)
    try {
      const favoritosRef = db
        .collection("lojas")
        .doc(lojistaId)
        .collection("clientes")
        .doc(customerId)
        .collection("favoritos");

      const favoritosSnapshot = await favoritosRef
        .where("compositionId", "==", compositionId)
        .get();

      if (!favoritosSnapshot.empty) {
        // Verificar o tipo de voto
        let hasLike = false;
        let hasDislike = false;

        favoritosSnapshot.forEach((doc) => {
          const data = doc.data();
          const action = data.action || data.tipo || data.votedType;
          
          if (action === "like") {
            hasLike = true;
          } else if (action === "dislike") {
            hasDislike = true;
          }
        });

        if (hasLike) {
          return NextResponse.json({
            votedType: "like",
            action: "like",
            alreadyVoted: true,
          });
        }

        if (hasDislike) {
          return NextResponse.json({
            votedType: "dislike",
            action: "dislike",
            alreadyVoted: true,
          });
        }
      }
    } catch (error) {
      console.error("[Check Vote] Erro ao verificar favoritos:", error);
    }

    // Não votou ainda
    return NextResponse.json({
      votedType: null,
      action: null,
      alreadyVoted: false,
    });
  } catch (error: any) {
    console.error("[Check Vote] Erro:", error);
    return NextResponse.json(
      {
        votedType: null,
        action: null,
        alreadyVoted: false,
        error: error.message || "Erro ao verificar voto",
      },
      { status: 200 } // Retornar 200 mesmo com erro para não bloquear
    );
  }
}
