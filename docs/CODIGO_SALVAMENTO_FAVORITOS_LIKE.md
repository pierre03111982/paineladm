# Código Completo: Salvamento de Favoritos com LIKE

Este documento contém todo o código utilizado para salvar favoritos quando o usuário dá LIKE em uma imagem gerada no `modelo-2`.

## 📋 Índice

1. [Fluxo Completo](#fluxo-completo)
2. [Frontend - Modelo-2](#frontend---modelo-2)
3. [API Proxy - Modelo-2](#api-proxy---modelo-2)
4. [Backend - Paineladm](#backend---paineladm)
5. [Firestore - Funções de Servidor](#firestore---funções-de-servidor)
6. [Carregamento de Favoritos](#carregamento-de-favoritos)

---

## 🔄 Fluxo Completo

```
1. Usuário clica em LIKE no modelo-2
   ↓
2. handleLike() em resultado/page.tsx
   ↓
3. POST /api/actions (proxy no modelo-2)
   ↓
4. POST /api/actions (backend no paineladm)
   ↓
5. registerFavoriteLook() salva no Firestore
   ↓
6. loadFavorites() recarrega a lista
   ↓
7. GET /api/cliente/favoritos (proxy no modelo-2)
   ↓
8. GET /api/cliente/favoritos (backend no paineladm)
   ↓
9. fetchFavoriteLooks() busca do Firestore
   ↓
10. Exibe favoritos no modal
```

---

## 🎨 Frontend - Modelo-2

### 1. Função `handleLike` - Salvamento do Like

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
// Handle like
const handleLike = useCallback(async () => {
  if (hasVoted) return

  const currentLook = looks[currentLookIndex]
  if (!currentLook || !lojistaId) return

  const stored = localStorage.getItem(`cliente_${lojistaId}`)
  const clienteData = stored ? JSON.parse(stored) : null
  const clienteId = clienteData?.clienteId || null
  const clienteNome = clienteData?.nome || null

  setLoadingAction("like")

  try {
    // Para looks refinados sem compositionId, usar um ID único baseado na imagemUrl
    let compositionId = currentLook.compositionId
    let jobId = currentLook.jobId
    
    // Se não houver compositionId (look refinado), criar um ID único baseado na imagemUrl
    if (!compositionId && currentLook.imagemUrl) {
      // Usar hash da imagemUrl como compositionId para looks refinados
      const imageHash = currentLook.imagemUrl.split('/').pop()?.split('?')[0] || `refined-${Date.now()}`
      compositionId = `refined-${imageHash}`
    }

    // Validar se temos todos os dados necessários
    if (!clienteId) {
      console.error("[ResultadoPage] Erro: clienteId não encontrado no localStorage")
      alert("Erro: Cliente não identificado. Faça login novamente.")
      setLoadingAction(null)
      return
    }

    if (!currentLook.imagemUrl || currentLook.imagemUrl.trim() === "") {
      console.error("[ResultadoPage] Erro: imagemUrl vazia ou ausente:", currentLook)
      alert("Erro: Imagem não disponível. Não é possível salvar como favorito.")
      setLoadingAction(null)
      return
    }

    // Enviar like imediatamente com a imagem original (não bloquear)
    console.log("[ResultadoPage] Salvando like:", {
      lojistaId,
      clienteId,
      imagemUrl: currentLook.imagemUrl?.substring(0, 100),
      compositionId,
      jobId,
      produtoNome: currentLook.produtoNome,
    })

    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lojistaId,
        action: "like",
        compositionId: compositionId || null,
        jobId: jobId || null,
        customerId: clienteId,
        customerName: clienteNome,
        productName: currentLook.produtoNome,
        productPrice: currentLook.produtoPreco || null,
        imagemUrl: currentLook.imagemUrl, // Usar imagem original imediatamente
      }),
    })

    const responseData = await response.json().catch(() => ({}))

    console.log("[ResultadoPage] Resposta do servidor:", response.status, responseData)

    if (response.ok && responseData.success !== false) {
      setHasVoted(true)
      setVotedType("like")
      setLoadingAction(null) // Liberar o botão imediatamente
      
      console.log("[ResultadoPage] Like salvo com sucesso - imagem será salva automaticamente nos favoritos")
      
      // Recarregar favoritos múltiplas vezes para garantir que o último like apareça
      // Primeira tentativa após 300ms
      setTimeout(async () => {
        console.log("[ResultadoPage] Recarregando favoritos (tentativa 1)...")
        await loadFavorites()
      }, 300)
      
      // Segunda tentativa após 800ms
      setTimeout(async () => {
        console.log("[ResultadoPage] Recarregando favoritos (tentativa 2)...")
        await loadFavorites()
      }, 800)
      
      // Terceira tentativa após 1500ms (garantir)
      setTimeout(async () => {
        console.log("[ResultadoPage] Recarregando favoritos (tentativa 3)...")
        await loadFavorites()
      }, 1500)
    } else {
      console.error("[ResultadoPage] Erro ao salvar like:", responseData)
      alert(responseData.error || "Erro ao salvar like. Tente novamente.")
      setLoadingAction(null)
    }
  } catch (error) {
    console.error("[ResultadoPage] Erro ao processar like:", error)
    alert("Erro ao processar like. Tente novamente.")
    setLoadingAction(null)
  }
}, [currentLookIndex, looks, lojistaId, hasVoted, loadFavorites])
```

### 2. Função `loadFavorites` - Carregamento de Favoritos

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
// Carregar favoritos (simplificado como no modelo-3)
const loadFavorites = useCallback(async () => {
  if (!lojistaId) return

  try {
    setIsLoadingFavorites(true)
    const stored = localStorage.getItem(`cliente_${lojistaId}`)
    if (!stored) return

    const clienteData = JSON.parse(stored)
    const clienteId = clienteData.clienteId

    if (!clienteId) return

    // Adicionar timestamp para evitar cache (forçar sempre buscar dados frescos)
    const timestamp = Date.now()
    const url = `/api/cliente/favoritos?lojistaId=${encodeURIComponent(lojistaId)}&customerId=${encodeURIComponent(clienteId)}&_t=${timestamp}`
    console.log("[ResultadoPage] Buscando favoritos:", { lojistaId, clienteId, timestamp })
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    })

    if (response.ok) {
      const data = await response.json()
      const favoritesList = data.favorites || data.favoritos || []
      
      // Filtrar apenas os likes (action === "like" ou tipo === "like" ou votedType === "like")
      const likesOnly = favoritesList.filter((f: any) => {
        const hasImage = f.imagemUrl && f.imagemUrl.trim() !== ""
        const isLike = f.action === "like" || f.tipo === "like" || f.votedType === "like"
        // Se não tiver campo de ação, assumir que é like (compatibilidade com dados antigos)
        return hasImage && (isLike || (!f.action && !f.tipo && !f.votedType))
      })
      
      // Ordenar por data de criação (mais recente primeiro)
      const sortedFavorites = likesOnly.sort((a: any, b: any) => {
        // Tentar diferentes formatos de data
        let dateA: Date
        let dateB: Date
        
        if (a.createdAt?.toDate) {
          dateA = a.createdAt.toDate()
        } else if (a.createdAt?.seconds) {
          dateA = new Date(a.createdAt.seconds * 1000)
        } else if (typeof a.createdAt === 'string') {
          dateA = new Date(a.createdAt)
        } else if (a.createdAt) {
          dateA = new Date(a.createdAt)
        } else {
          dateA = new Date(0) // Data muito antiga se não houver
        }
        
        if (b.createdAt?.toDate) {
          dateB = b.createdAt.toDate()
        } else if (b.createdAt?.seconds) {
          dateB = new Date(b.createdAt.seconds * 1000)
        } else if (typeof b.createdAt === 'string') {
          dateB = new Date(b.createdAt)
        } else if (b.createdAt) {
          dateB = new Date(b.createdAt)
        } else {
          dateB = new Date(0) // Data muito antiga se não houver
        }
        
        // Ordenar do mais recente para o mais antigo
        return dateB.getTime() - dateA.getTime()
      })
      
      // Limitar a 10 favoritos mais recentes
      const limitedFavorites = sortedFavorites.slice(0, 10)
      
      console.log("[ResultadoPage] Favoritos carregados:", limitedFavorites.length, "de", likesOnly.length, "likes totais")
      console.log("[ResultadoPage] Primeiro favorito (mais recente):", limitedFavorites[0] ? {
        id: limitedFavorites[0].id,
        imagemUrl: limitedFavorites[0].imagemUrl?.substring(0, 50),
        createdAt: limitedFavorites[0].createdAt,
        action: limitedFavorites[0].action
      } : "Nenhum")
      console.log("[ResultadoPage] Último favorito (mais antigo):", limitedFavorites[limitedFavorites.length - 1] ? {
        id: limitedFavorites[limitedFavorites.length - 1].id,
        imagemUrl: limitedFavorites[limitedFavorites.length - 1].imagemUrl?.substring(0, 50),
        createdAt: limitedFavorites[limitedFavorites.length - 1].createdAt,
        action: limitedFavorites[limitedFavorites.length - 1].action
      } : "Nenhum")
      
      setFavorites(limitedFavorites)
    }
  } catch (error) {
    console.error("[ResultadoPage] Erro ao carregar favoritos:", error)
  } finally {
    setIsLoadingFavorites(false)
  }
}, [lojistaId])
```

### 3. Recarregamento ao Abrir Modal

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
// Recarregar favoritos quando o modal for aberto OU quando der like (com múltiplas tentativas para garantir)
useEffect(() => {
  if (showFavoritesModal && lojistaId) {
    console.log("[ResultadoPage] Modal de favoritos aberto - recarregando favoritos...")
    // Recarregar imediatamente
    loadFavorites()
    // Recarregar novamente após 300ms para garantir que o último like apareça
    const timeout1 = setTimeout(() => {
      console.log("[ResultadoPage] Recarregando favoritos após abertura do modal (tentativa 2)...")
      loadFavorites()
    }, 300)
    // Recarregar novamente após 800ms
    const timeout2 = setTimeout(() => {
      console.log("[ResultadoPage] Recarregando favoritos após abertura do modal (tentativa 3)...")
      loadFavorites()
    }, 800)
    // Recarregar novamente após 1500ms (garantir)
    const timeout3 = setTimeout(() => {
      console.log("[ResultadoPage] Recarregando favoritos após abertura do modal (tentativa 4)...")
      loadFavorites()
    }, 1500)
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showFavoritesModal, lojistaId, votedType])
```

### 4. Botão de Favoritos - Recarregamento Antes de Abrir

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
<button 
  onClick={async () => {
    console.log("[ResultadoPage] Botão Favoritos clicado - recarregando favoritos antes de abrir modal...")
    // Recarregar favoritos antes de abrir o modal
    await loadFavorites()
    // Aguardar um pouco e recarregar novamente
    setTimeout(async () => {
      await loadFavorites()
    }, 200)
    // Abrir modal
    setShowFavoritesModal(true)
  }} 
  disabled={isRemixing}
  className={`flex items-center justify-center rounded-xl bg-pink-600 py-3 font-semibold text-white text-sm transition shadow-md ${
    isRemixing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-700'
  }`}
>
  <Heart className="h-6 w-6" />
</button>
```

---

## 🔀 API Proxy - Modelo-2

### 1. Proxy de Ações (Like/Dislike)

**Arquivo:** `apps-cliente/modelo-2/src/app/api/actions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

// Forçar renderização dinâmica para evitar erro de build estático
export const dynamic = 'force-dynamic';

/**
 * POST /api/actions
 * Proxy para registrar ações do cliente no backend (paineladm)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Actions Proxy] Recebido:", { action: body.action, lojistaId: body.lojistaId, customerId: body.customerId });
    
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || 
      process.env.NEXT_PUBLIC_PAINELADM_URL || 
      "http://localhost:3000";

    console.log("[Actions Proxy] Backend URL:", backendUrl);

    // Se for dislike, não enviar imagemUrl (não salvar imagem)
    const payload = { ...body };
    if (body.action === "dislike") {
      delete payload.imagemUrl;
    }

    console.log("[Actions Proxy] Enviando para backend:", { action: payload.action, lojistaId: payload.lojistaId });

    const response = await fetch(`${backendUrl}/api/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("[Actions Proxy] Resposta do backend:", response.status, response.statusText);

    const data = await response.json().catch((err) => {
      console.error("[Actions Proxy] Erro ao parsear JSON:", err);
      return { 
        success: false, 
        error: "Erro ao comunicar com o servidor" 
      };
    });

    console.log("[Actions Proxy] Dados recebidos:", data);

    if (!response.ok) {
      console.error("[Actions Proxy] Erro na resposta:", response.status, data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || "Erro interno ao registrar ação." 
        }, 
        { status: response.status }
      );
    }

    console.log("[Actions Proxy] Sucesso:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Actions Proxy] Erro:", error);
    console.error("[Actions Proxy] Stack:", error?.stack);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao registrar ação." },
      { status: 500 }
    );
  }
}
```

### 2. Proxy de Favoritos

**Arquivo:** `apps-cliente/modelo-2/src/app/api/cliente/favoritos/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

// Forçar renderização dinâmica para evitar erro de build estático
export const dynamic = 'force-dynamic';

/**
 * GET /api/cliente/favoritos
 * Proxy para buscar favoritos do cliente no backend (paineladm)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");
    const customerId = searchParams.get("customerId");

    if (!lojistaId || !customerId) {
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

    const response = await fetch(
      `${backendUrl}/api/cliente/favoritos?lojistaId=${encodeURIComponent(lojistaId)}&customerId=${encodeURIComponent(customerId)}`
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Cliente Favoritos Proxy] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar favoritos" },
      { status: 500 }
    );
  }
}
```

---

## 🖥️ Backend - Paineladm

### 1. API de Ações (Like/Dislike)

**Arquivo:** `paineladm/src/app/api/actions/route.ts`

```typescript
import { NextResponse } from "next/server";
import { registerFavoriteLook, updateClienteComposicoesStats } from "@/lib/firestore/server";

const ALLOWED_METHODS = ["POST", "OPTIONS"];

function buildCorsHeaders() {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const {
      action,
      compositionId,
      jobId,
      lojistaId,
      customerId,
      customerName,
      productName,
      productPrice,
      imagemUrl,
    } =
      (await request.json()) as {
        action?: "like" | "dislike" | "share" | "checkout";
        compositionId?: string | null;
        jobId?: string | null;
        lojistaId?: string | null;
        customerId?: string | null;
        customerName?: string | null;
        productName?: string | null;
        productPrice?: number | null;
        imagemUrl?: string | null;
      };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação obrigatória." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "lojistaId obrigatório." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    // Registrar favorito para likes e dislikes (para contabilização)
    if ((action === "like" || action === "dislike") && customerId) {
      if (action === "like") {
        // Registrar like como favorito
        try {
          console.log("[api/actions] Registrando favorito para like:", {
            lojistaId,
            customerId,
            hasImagemUrl: !!imagemUrl,
            imagemUrl: imagemUrl?.substring(0, 100),
            compositionId,
            jobId,
          });
          
          await registerFavoriteLook({
            lojistaId,
            customerId,
            customerName,
            compositionId: compositionId ?? null,
            jobId: jobId ?? null,
            imagemUrl: imagemUrl ?? null,
            productName: productName ?? null,
            productPrice: typeof productPrice === "number" ? productPrice : null,
          });
          
          console.log("[api/actions] Favorito registrado com sucesso");
        } catch (favoriteError: any) {
          console.error("[api/actions] Erro ao registrar favorito:", favoriteError);
          console.error("[api/actions] Stack do erro:", favoriteError?.stack);
          // Não falhar a requisição se o favorito falhar, mas logar o erro
          // O like ainda será contabilizado na composição
        }
      } else if (action === "dislike") {
        // Registrar dislike na coleção de favoritos para contabilização (mas não será exibido como favorito)
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const favoritosRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(customerId)
          .collection("favoritos");
        
        await favoritosRef.add({
          lojistaId,
          customerId,
          customerName: customerName ?? null,
          compositionId: compositionId ?? null,
          jobId: jobId ?? null,
          imagemUrl: imagemUrl ?? null,
          productName: productName ?? null,
          productPrice: typeof productPrice === "number" ? productPrice : null,
          lookType: "criativo",
          action: "dislike",
          tipo: "dislike",
          votedType: "dislike",
          createdAt: new Date(),
        });
      }

      // Atualizar estatísticas do cliente (totalComposicoes, totalLikes, totalDislikes)
      try {
        await updateClienteComposicoesStats(lojistaId, customerId);
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar estatísticas:", updateError);
        // Não falhar a requisição se a atualização falhar
      }
    }

    // Atualizar composição como curtida ou não curtida
    if (compositionId && (action === "like" || action === "dislike")) {
      try {
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const composicaoRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .doc(compositionId);

        await composicaoRef.update({
          curtido: action === "like",
          liked: action === "like",
          disliked: action === "dislike",
          updatedAt: new Date(),
        });

        // Atualizar estatísticas do cliente também para dislike
        if (action === "dislike" && customerId) {
          try {
            await updateClienteComposicoesStats(lojistaId, customerId);
          } catch (updateError) {
            console.error("[api/actions] Erro ao atualizar estatísticas após dislike:", updateError);
          }
        }
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar composição:", updateError);
        // Não falhar a requisição se a atualização falhar
      }
    }

    console.log("[api/actions] Ação registrada:", {
      action,
      lojistaId,
      compositionId,
      customerId,
    });

    return NextResponse.json(
      { success: true, message: "Ação registrada." },
      { status: 200, headers: buildCorsHeaders() }
    );
  } catch (error) {
    console.error("[api/actions] erro ao registrar ação", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao registrar ação.",
      },
      { status: 500, headers: buildCorsHeaders() }
    );
  }
}
```

### 2. API de Favoritos (Buscar)

**Arquivo:** `paineladm/src/app/api/cliente/favoritos/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchFavoriteLooks } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    const customerId = request.nextUrl.searchParams.get("customerId");
    const timestamp = request.nextUrl.searchParams.get("_t");

    console.log("[api/cliente/favoritos] Buscando favoritos:", { lojistaId, customerId, timestamp });

    if (!lojistaId || !customerId) {
      console.error("[api/cliente/favoritos] Parâmetros faltando:", { lojistaId: !!lojistaId, customerId: !!customerId });
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    // Adicionar headers para evitar cache
    const favorites = await fetchFavoriteLooks({ lojistaId, customerId });
    
    console.log(`[api/cliente/favoritos] Favoritos encontrados: ${favorites.length}`);
    if (favorites.length > 0) {
      console.log(`[api/cliente/favoritos] Primeiro favorito (mais recente):`, {
        id: favorites[0].id,
        imagemUrl: favorites[0].imagemUrl?.substring(0, 50),
        createdAt: favorites[0].createdAt,
        action: favorites[0].action
      });
    }

    return NextResponse.json(
      { favorites },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error("[api/cliente/favoritos] Erro ao buscar favoritos:", error);
    console.error("[api/cliente/favoritos] Stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro interno ao buscar favoritos",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
```

---

## 🔥 Firestore - Funções de Servidor

### 1. Função `registerFavoriteLook` - Salvar Favorito

**Arquivo:** `paineladm/src/lib/firestore/server.ts`

```typescript
export async function registerFavoriteLook(params: {
  lojistaId: string;
  customerId: string;
  customerName?: string | null;
  compositionId?: string | null;
  jobId?: string | null;
  imagemUrl?: string | null;
  productName?: string | null;
  productPrice?: number | null;
}) {
  const {
    lojistaId,
    customerId,
    customerName,
    compositionId,
    jobId,
    imagemUrl,
    productName,
    productPrice,
  } = params;

  console.log("[registerFavoriteLook] Iniciando registro de favorito:", {
    lojistaId,
    customerId,
    hasImagemUrl: !!imagemUrl,
    imagemUrl: imagemUrl?.substring(0, 100), // Log parcial da URL
    compositionId,
    jobId,
  });

  if (!lojistaId || !customerId) {
    const error = new Error("lojistaId e customerId são obrigatórios para favoritos");
    console.error("[registerFavoriteLook] Erro de validação:", error);
    throw error;
  }

  // Validar se imagemUrl está presente (obrigatório para favoritos)
  if (!imagemUrl || imagemUrl.trim() === "") {
    console.warn("[registerFavoriteLook] AVISO: imagemUrl vazio ou ausente. Favorito será salvo mesmo assim para contabilização.");
    // Não bloquear, mas avisar
  }

  try {
    const ref = clienteFavoritosRef(lojistaId, customerId);
    const favoriteData = {
      lojistaId,
      customerId,
      customerName: customerName ?? null,
      compositionId: compositionId ?? null,
      jobId: jobId ?? null,
      imagemUrl: imagemUrl ?? null,
      productName: productName ?? null,
      productPrice: typeof productPrice === "number" ? productPrice : null,
      lookType: "criativo",
      action: "like",
      tipo: "like",
      votedType: "like",
      createdAt: new Date(),
    };
    
    console.log("[registerFavoriteLook] Dados do favorito a serem salvos:", {
      ...favoriteData,
      imagemUrl: favoriteData.imagemUrl?.substring(0, 100), // Log parcial
    });
    
    const docRef = await ref.add(favoriteData);
    
    console.log("[registerFavoriteLook] Favorito salvo com sucesso. ID:", docRef.id);
    
    return docRef.id;
  } catch (error: any) {
    console.error("[registerFavoriteLook] Erro ao salvar favorito:", error);
    console.error("[registerFavoriteLook] Stack:", error?.stack);
    throw error;
  }
}
```

### 2. Função `fetchFavoriteLooks` - Buscar Favoritos

**Arquivo:** `paineladm/src/lib/firestore/server.ts`

```typescript
/**
 * Busca os últimos 10 favoritos de um cliente
 */
export async function fetchFavoriteLooks(params: {
  lojistaId: string;
  customerId: string;
}) {
  const { lojistaId, customerId } = params;
  if (!lojistaId || !customerId) return [];

  try {
    let snapshot;
    try {
      // Buscar mais documentos (50) para garantir que temos likes suficientes após filtrar dislikes
      // Depois limitaremos a 10 likes
      snapshot = await clienteFavoritosRef(lojistaId, customerId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    } catch (orderByError: any) {
      if (orderByError?.code === "failed-precondition") {
        // Se não houver índice, buscar mais documentos para garantir que temos likes suficientes
        const allSnapshot = await clienteFavoritosRef(lojistaId, customerId)
          .limit(100)
          .get();
        
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data?.createdAt?.toDate?.() || new Date(data?.createdAt || 0);
          allDocs.push({ id: doc.id, data, createdAt });
        });
        
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, 10).forEach((item) => {
              callback({ id: item.id, data: () => item.data });
            });
          },
          size: Math.min(allDocs.length, 10),
          empty: allDocs.length === 0,
        } as any;
      } else {
        throw orderByError;
      }
    }

    const results: any[] = [];
    let totalDocs = 0;
    let skippedDislikes = 0;
    let skippedNoImage = 0;
    let skippedNoLike = 0;
    
    snapshot.forEach((doc: any) => {
      totalDocs++;
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      
      // IMPORTANTE: Favoritos são apenas imagens com LIKE (não dislike)
      // Dislikes são registrados para contabilização, mas não aparecem como favoritos
      const action = data?.action || data?.tipo || data?.votedType;
      const isLike = action === "like" || (!action && !data?.action && !data?.tipo && !data?.votedType); // Compatibilidade com dados antigos
      const isDislike = action === "dislike";
      
      // Filtrar apenas likes (não mostrar dislikes como favoritos)
      if (isDislike) {
        skippedDislikes++;
        return; // Pular dislikes
      }
      
      if (!isLike) {
        skippedNoLike++;
        return; // Pular se não for like
      }
      
      const hasImage = data?.imagemUrl && data.imagemUrl.trim() !== "";
      
      if (!hasImage) {
        skippedNoImage++;
        console.warn(`[fetchFavoriteLooks] Favorito ${doc.id} sem imagemUrl - será ignorado`);
        return; // Pular se não tiver imagem
      }
      
      // Garantir que createdAt está presente e é um objeto Date válido
      let createdAt = data?.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt?.seconds) {
        createdAt = new Date(createdAt.seconds * 1000);
      } else if (typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      } else if (!createdAt || !(createdAt instanceof Date)) {
        // Se não tiver createdAt válido, usar data atual (favorito recém-criado)
        createdAt = new Date();
        console.warn(`[fetchFavoriteLooks] Favorito ${doc.id} sem createdAt válido - usando data atual`);
      }
      
      results.push({ 
        id: doc.id, 
        ...data,
        createdAt: createdAt // Garantir que createdAt é sempre um Date válido
      });
    });
    
    console.log(`[fetchFavoriteLooks] Total de documentos: ${totalDocs}, Likes com imagem: ${results.length}, Dislikes: ${skippedDislikes}, Sem imagem: ${skippedNoImage}, Sem like: ${skippedNoLike}`);

    // Ordenar por data de criação (mais recente primeiro) - garantir que funciona mesmo com diferentes formatos
    results.sort((a, b) => {
      let dateA: Date;
      let dateB: Date;
      
      // Processar dateA
      if (a.createdAt instanceof Date) {
        dateA = a.createdAt;
      } else if (a.createdAt?.toDate) {
        dateA = a.createdAt.toDate();
      } else if (a.createdAt?.seconds) {
        dateA = new Date(a.createdAt.seconds * 1000);
      } else if (typeof a.createdAt === 'string') {
        dateA = new Date(a.createdAt);
      } else if (a.createdAt) {
        dateA = new Date(a.createdAt);
      } else {
        dateA = new Date(0); // Data muito antiga se não houver
      }
      
      // Processar dateB
      if (b.createdAt instanceof Date) {
        dateB = b.createdAt;
      } else if (b.createdAt?.toDate) {
        dateB = b.createdAt.toDate();
      } else if (b.createdAt?.seconds) {
        dateB = new Date(b.createdAt.seconds * 1000);
      } else if (typeof b.createdAt === 'string') {
        dateB = new Date(b.createdAt);
      } else if (b.createdAt) {
        dateB = new Date(b.createdAt);
      } else {
        dateB = new Date(0); // Data muito antiga se não houver
      }
      
      // Ordenar do mais recente para o mais antigo
      return dateB.getTime() - dateA.getTime();
    });

    const limitedResults = results.slice(0, 10);
    
    if (limitedResults.length > 0) {
      console.log(`[fetchFavoriteLooks] Primeiro favorito (mais recente):`, {
        id: limitedResults[0].id,
        imagemUrl: limitedResults[0].imagemUrl?.substring(0, 50),
        createdAt: limitedResults[0].createdAt,
        action: limitedResults[0].action
      });
    }

    return limitedResults;
  } catch (error) {
    console.error("[fetchFavoriteLooks] Erro:", error);
    return [];
  }
}
```

### 3. Função Helper `clienteFavoritosRef`

**Arquivo:** `paineladm/src/lib/firestore/server.ts`

```typescript
function clienteFavoritosRef(lojistaId: string, customerId: string) {
  return getAdminDb()
    .collection("lojas")
    .doc(lojistaId)
    .collection("clientes")
    .doc(customerId)
    .collection("favoritos");
}
```

---

## 📊 Estrutura de Dados no Firestore

### Documento de Favorito

**Caminho:** `lojas/{lojistaId}/clientes/{customerId}/favoritos/{favoriteId}`

```typescript
{
  lojistaId: string;
  customerId: string;
  customerName: string | null;
  compositionId: string | null;
  jobId: string | null;
  imagemUrl: string | null; // OBRIGATÓRIO para exibição
  productName: string | null;
  productPrice: number | null;
  lookType: "criativo";
  action: "like" | "dislike"; // "like" = favorito, "dislike" = não favorito
  tipo: "like" | "dislike"; // Compatibilidade
  votedType: "like" | "dislike"; // Compatibilidade
  createdAt: Date; // Timestamp do Firestore
}
```

---

## 🔍 Logs e Debug

### Logs no Frontend (Modelo-2)

- `[ResultadoPage] Salvando like:` - Quando inicia o salvamento
- `[ResultadoPage] Resposta do servidor:` - Resposta do backend
- `[ResultadoPage] Like salvo com sucesso` - Confirmação
- `[ResultadoPage] Recarregando favoritos (tentativa X)` - Tentativas de recarregamento
- `[ResultadoPage] Buscando favoritos:` - Quando busca favoritos
- `[ResultadoPage] Favoritos carregados:` - Resultado da busca
- `[ResultadoPage] Primeiro favorito (mais recente):` - Debug do primeiro item
- `[ResultadoPage] Último favorito (mais antigo):` - Debug do último item

### Logs no Backend (Paineladm)

- `[api/actions] Registrando favorito para like:` - Início do registro
- `[api/actions] Favorito registrado com sucesso` - Confirmação
- `[registerFavoriteLook] Iniciando registro de favorito:` - Início da função
- `[registerFavoriteLook] Dados do favorito a serem salvos:` - Dados antes de salvar
- `[registerFavoriteLook] Favorito salvo com sucesso. ID:` - ID do documento criado
- `[fetchFavoriteLooks] Total de documentos:` - Estatísticas da busca
- `[fetchFavoriteLooks] Primeiro favorito (mais recente):` - Debug do primeiro item
- `[api/cliente/favoritos] Buscando favoritos:` - Início da busca
- `[api/cliente/favoritos] Favoritos encontrados:` - Resultado da busca

---

## ⚙️ Configurações e Variáveis de Ambiente

### Modelo-2

```env
NEXT_PUBLIC_BACKEND_URL=https://paineladm.experimenteai.com.br
# ou
NEXT_PUBLIC_PAINELADM_URL=https://paineladm.experimenteai.com.br
```

### Paineladm

```env
NEXT_PUBLIC_CLIENT_APP_URL=https://app2.experimenteai.com.br
```

---

## 🎯 Regras de Negócio

1. **LIKE = FAVORITO**: Apenas imagens com `action: "like"` aparecem nos favoritos
2. **DISLIKE = NÃO SALVA**: Dislikes são registrados para contabilização, mas não aparecem como favoritos
3. **Últimos 10 Favoritos**: Apenas os 10 favoritos mais recentes são exibidos
4. **Ordenação**: Favoritos são ordenados por `createdAt` (mais recente primeiro)
5. **Filtro de Imagem**: Apenas favoritos com `imagemUrl` válida são exibidos
6. **Múltiplas Tentativas**: O frontend tenta recarregar favoritos múltiplas vezes para garantir que o último like apareça

---

## 🐛 Troubleshooting

### Problema: Último like não aparece nos favoritos

**Soluções implementadas:**
1. Múltiplas tentativas de recarregamento (300ms, 800ms, 1500ms)
2. Recarregamento ao abrir modal (4 tentativas)
3. Recarregamento antes de abrir modal
4. Headers anti-cache na API
5. Buscar 50 favoritos antes de filtrar (garantir likes suficientes)
6. Logs detalhados para debug

### Problema: Favoritos antigos aparecem, mas novos não

**Verificar:**
1. Se `imagemUrl` está sendo enviado corretamente
2. Se `action: "like"` está sendo salvo
3. Se `createdAt` está sendo salvo corretamente
4. Logs no console do navegador e do servidor

---

## 📝 Notas Importantes

1. **Compatibilidade com Dados Antigos**: O código suporta favoritos antigos que não têm `action`, `tipo` ou `votedType` (assume que são likes)

2. **Formato de Data**: O código suporta múltiplos formatos de `createdAt`:
   - Objeto Date do Firestore (com `.toDate()`)
   - Timestamp com `.seconds`
   - String ISO
   - Objeto Date nativo

3. **Cache**: Headers anti-cache são adicionados em todas as requisições para garantir dados frescos

4. **Performance**: Buscar 50 favoritos antes de filtrar garante que temos likes suficientes mesmo se houver muitos dislikes

---

**Última atualização:** 2024-12-19
**Versão:** 1.0.0



Este documento contém todo o código utilizado para salvar favoritos quando o usuário dá LIKE em uma imagem gerada no `modelo-2`.

## 📋 Índice

1. [Fluxo Completo](#fluxo-completo)
2. [Frontend - Modelo-2](#frontend---modelo-2)
3. [API Proxy - Modelo-2](#api-proxy---modelo-2)
4. [Backend - Paineladm](#backend---paineladm)
5. [Firestore - Funções de Servidor](#firestore---funções-de-servidor)
6. [Carregamento de Favoritos](#carregamento-de-favoritos)

---

## 🔄 Fluxo Completo

```
1. Usuário clica em LIKE no modelo-2
   ↓
2. handleLike() em resultado/page.tsx
   ↓
3. POST /api/actions (proxy no modelo-2)
   ↓
4. POST /api/actions (backend no paineladm)
   ↓
5. registerFavoriteLook() salva no Firestore
   ↓
6. loadFavorites() recarrega a lista
   ↓
7. GET /api/cliente/favoritos (proxy no modelo-2)
   ↓
8. GET /api/cliente/favoritos (backend no paineladm)
   ↓
9. fetchFavoriteLooks() busca do Firestore
   ↓
10. Exibe favoritos no modal
```

---

## 🎨 Frontend - Modelo-2

### 1. Função `handleLike` - Salvamento do Like

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
// Handle like
const handleLike = useCallback(async () => {
  if (hasVoted) return

  const currentLook = looks[currentLookIndex]
  if (!currentLook || !lojistaId) return

  const stored = localStorage.getItem(`cliente_${lojistaId}`)
  const clienteData = stored ? JSON.parse(stored) : null
  const clienteId = clienteData?.clienteId || null
  const clienteNome = clienteData?.nome || null

  setLoadingAction("like")

  try {
    // Para looks refinados sem compositionId, usar um ID único baseado na imagemUrl
    let compositionId = currentLook.compositionId
    let jobId = currentLook.jobId
    
    // Se não houver compositionId (look refinado), criar um ID único baseado na imagemUrl
    if (!compositionId && currentLook.imagemUrl) {
      // Usar hash da imagemUrl como compositionId para looks refinados
      const imageHash = currentLook.imagemUrl.split('/').pop()?.split('?')[0] || `refined-${Date.now()}`
      compositionId = `refined-${imageHash}`
    }

    // Validar se temos todos os dados necessários
    if (!clienteId) {
      console.error("[ResultadoPage] Erro: clienteId não encontrado no localStorage")
      alert("Erro: Cliente não identificado. Faça login novamente.")
      setLoadingAction(null)
      return
    }

    if (!currentLook.imagemUrl || currentLook.imagemUrl.trim() === "") {
      console.error("[ResultadoPage] Erro: imagemUrl vazia ou ausente:", currentLook)
      alert("Erro: Imagem não disponível. Não é possível salvar como favorito.")
      setLoadingAction(null)
      return
    }

    // Enviar like imediatamente com a imagem original (não bloquear)
    console.log("[ResultadoPage] Salvando like:", {
      lojistaId,
      clienteId,
      imagemUrl: currentLook.imagemUrl?.substring(0, 100),
      compositionId,
      jobId,
      produtoNome: currentLook.produtoNome,
    })

    const response = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lojistaId,
        action: "like",
        compositionId: compositionId || null,
        jobId: jobId || null,
        customerId: clienteId,
        customerName: clienteNome,
        productName: currentLook.produtoNome,
        productPrice: currentLook.produtoPreco || null,
        imagemUrl: currentLook.imagemUrl, // Usar imagem original imediatamente
      }),
    })

    const responseData = await response.json().catch(() => ({}))

    console.log("[ResultadoPage] Resposta do servidor:", response.status, responseData)

    if (response.ok && responseData.success !== false) {
      setHasVoted(true)
      setVotedType("like")
      setLoadingAction(null) // Liberar o botão imediatamente
      
      console.log("[ResultadoPage] Like salvo com sucesso - imagem será salva automaticamente nos favoritos")
      
      // Recarregar favoritos múltiplas vezes para garantir que o último like apareça
      // Primeira tentativa após 300ms
      setTimeout(async () => {
        console.log("[ResultadoPage] Recarregando favoritos (tentativa 1)...")
        await loadFavorites()
      }, 300)
      
      // Segunda tentativa após 800ms
      setTimeout(async () => {
        console.log("[ResultadoPage] Recarregando favoritos (tentativa 2)...")
        await loadFavorites()
      }, 800)
      
      // Terceira tentativa após 1500ms (garantir)
      setTimeout(async () => {
        console.log("[ResultadoPage] Recarregando favoritos (tentativa 3)...")
        await loadFavorites()
      }, 1500)
    } else {
      console.error("[ResultadoPage] Erro ao salvar like:", responseData)
      alert(responseData.error || "Erro ao salvar like. Tente novamente.")
      setLoadingAction(null)
    }
  } catch (error) {
    console.error("[ResultadoPage] Erro ao processar like:", error)
    alert("Erro ao processar like. Tente novamente.")
    setLoadingAction(null)
  }
}, [currentLookIndex, looks, lojistaId, hasVoted, loadFavorites])
```

### 2. Função `loadFavorites` - Carregamento de Favoritos

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
// Carregar favoritos (simplificado como no modelo-3)
const loadFavorites = useCallback(async () => {
  if (!lojistaId) return

  try {
    setIsLoadingFavorites(true)
    const stored = localStorage.getItem(`cliente_${lojistaId}`)
    if (!stored) return

    const clienteData = JSON.parse(stored)
    const clienteId = clienteData.clienteId

    if (!clienteId) return

    // Adicionar timestamp para evitar cache (forçar sempre buscar dados frescos)
    const timestamp = Date.now()
    const url = `/api/cliente/favoritos?lojistaId=${encodeURIComponent(lojistaId)}&customerId=${encodeURIComponent(clienteId)}&_t=${timestamp}`
    console.log("[ResultadoPage] Buscando favoritos:", { lojistaId, clienteId, timestamp })
    
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      }
    })

    if (response.ok) {
      const data = await response.json()
      const favoritesList = data.favorites || data.favoritos || []
      
      // Filtrar apenas os likes (action === "like" ou tipo === "like" ou votedType === "like")
      const likesOnly = favoritesList.filter((f: any) => {
        const hasImage = f.imagemUrl && f.imagemUrl.trim() !== ""
        const isLike = f.action === "like" || f.tipo === "like" || f.votedType === "like"
        // Se não tiver campo de ação, assumir que é like (compatibilidade com dados antigos)
        return hasImage && (isLike || (!f.action && !f.tipo && !f.votedType))
      })
      
      // Ordenar por data de criação (mais recente primeiro)
      const sortedFavorites = likesOnly.sort((a: any, b: any) => {
        // Tentar diferentes formatos de data
        let dateA: Date
        let dateB: Date
        
        if (a.createdAt?.toDate) {
          dateA = a.createdAt.toDate()
        } else if (a.createdAt?.seconds) {
          dateA = new Date(a.createdAt.seconds * 1000)
        } else if (typeof a.createdAt === 'string') {
          dateA = new Date(a.createdAt)
        } else if (a.createdAt) {
          dateA = new Date(a.createdAt)
        } else {
          dateA = new Date(0) // Data muito antiga se não houver
        }
        
        if (b.createdAt?.toDate) {
          dateB = b.createdAt.toDate()
        } else if (b.createdAt?.seconds) {
          dateB = new Date(b.createdAt.seconds * 1000)
        } else if (typeof b.createdAt === 'string') {
          dateB = new Date(b.createdAt)
        } else if (b.createdAt) {
          dateB = new Date(b.createdAt)
        } else {
          dateB = new Date(0) // Data muito antiga se não houver
        }
        
        // Ordenar do mais recente para o mais antigo
        return dateB.getTime() - dateA.getTime()
      })
      
      // Limitar a 10 favoritos mais recentes
      const limitedFavorites = sortedFavorites.slice(0, 10)
      
      console.log("[ResultadoPage] Favoritos carregados:", limitedFavorites.length, "de", likesOnly.length, "likes totais")
      console.log("[ResultadoPage] Primeiro favorito (mais recente):", limitedFavorites[0] ? {
        id: limitedFavorites[0].id,
        imagemUrl: limitedFavorites[0].imagemUrl?.substring(0, 50),
        createdAt: limitedFavorites[0].createdAt,
        action: limitedFavorites[0].action
      } : "Nenhum")
      console.log("[ResultadoPage] Último favorito (mais antigo):", limitedFavorites[limitedFavorites.length - 1] ? {
        id: limitedFavorites[limitedFavorites.length - 1].id,
        imagemUrl: limitedFavorites[limitedFavorites.length - 1].imagemUrl?.substring(0, 50),
        createdAt: limitedFavorites[limitedFavorites.length - 1].createdAt,
        action: limitedFavorites[limitedFavorites.length - 1].action
      } : "Nenhum")
      
      setFavorites(limitedFavorites)
    }
  } catch (error) {
    console.error("[ResultadoPage] Erro ao carregar favoritos:", error)
  } finally {
    setIsLoadingFavorites(false)
  }
}, [lojistaId])
```

### 3. Recarregamento ao Abrir Modal

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
// Recarregar favoritos quando o modal for aberto OU quando der like (com múltiplas tentativas para garantir)
useEffect(() => {
  if (showFavoritesModal && lojistaId) {
    console.log("[ResultadoPage] Modal de favoritos aberto - recarregando favoritos...")
    // Recarregar imediatamente
    loadFavorites()
    // Recarregar novamente após 300ms para garantir que o último like apareça
    const timeout1 = setTimeout(() => {
      console.log("[ResultadoPage] Recarregando favoritos após abertura do modal (tentativa 2)...")
      loadFavorites()
    }, 300)
    // Recarregar novamente após 800ms
    const timeout2 = setTimeout(() => {
      console.log("[ResultadoPage] Recarregando favoritos após abertura do modal (tentativa 3)...")
      loadFavorites()
    }, 800)
    // Recarregar novamente após 1500ms (garantir)
    const timeout3 = setTimeout(() => {
      console.log("[ResultadoPage] Recarregando favoritos após abertura do modal (tentativa 4)...")
      loadFavorites()
    }, 1500)
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [showFavoritesModal, lojistaId, votedType])
```

### 4. Botão de Favoritos - Recarregamento Antes de Abrir

**Arquivo:** `apps-cliente/modelo-2/src/app/[lojistaId]/resultado/page.tsx`

```typescript
<button 
  onClick={async () => {
    console.log("[ResultadoPage] Botão Favoritos clicado - recarregando favoritos antes de abrir modal...")
    // Recarregar favoritos antes de abrir o modal
    await loadFavorites()
    // Aguardar um pouco e recarregar novamente
    setTimeout(async () => {
      await loadFavorites()
    }, 200)
    // Abrir modal
    setShowFavoritesModal(true)
  }} 
  disabled={isRemixing}
  className={`flex items-center justify-center rounded-xl bg-pink-600 py-3 font-semibold text-white text-sm transition shadow-md ${
    isRemixing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-700'
  }`}
>
  <Heart className="h-6 w-6" />
</button>
```

---

## 🔀 API Proxy - Modelo-2

### 1. Proxy de Ações (Like/Dislike)

**Arquivo:** `apps-cliente/modelo-2/src/app/api/actions/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

// Forçar renderização dinâmica para evitar erro de build estático
export const dynamic = 'force-dynamic';

/**
 * POST /api/actions
 * Proxy para registrar ações do cliente no backend (paineladm)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Actions Proxy] Recebido:", { action: body.action, lojistaId: body.lojistaId, customerId: body.customerId });
    
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || 
      process.env.NEXT_PUBLIC_PAINELADM_URL || 
      "http://localhost:3000";

    console.log("[Actions Proxy] Backend URL:", backendUrl);

    // Se for dislike, não enviar imagemUrl (não salvar imagem)
    const payload = { ...body };
    if (body.action === "dislike") {
      delete payload.imagemUrl;
    }

    console.log("[Actions Proxy] Enviando para backend:", { action: payload.action, lojistaId: payload.lojistaId });

    const response = await fetch(`${backendUrl}/api/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    console.log("[Actions Proxy] Resposta do backend:", response.status, response.statusText);

    const data = await response.json().catch((err) => {
      console.error("[Actions Proxy] Erro ao parsear JSON:", err);
      return { 
        success: false, 
        error: "Erro ao comunicar com o servidor" 
      };
    });

    console.log("[Actions Proxy] Dados recebidos:", data);

    if (!response.ok) {
      console.error("[Actions Proxy] Erro na resposta:", response.status, data);
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || "Erro interno ao registrar ação." 
        }, 
        { status: response.status }
      );
    }

    console.log("[Actions Proxy] Sucesso:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Actions Proxy] Erro:", error);
    console.error("[Actions Proxy] Stack:", error?.stack);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao registrar ação." },
      { status: 500 }
    );
  }
}
```

### 2. Proxy de Favoritos

**Arquivo:** `apps-cliente/modelo-2/src/app/api/cliente/favoritos/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

// Forçar renderização dinâmica para evitar erro de build estático
export const dynamic = 'force-dynamic';

/**
 * GET /api/cliente/favoritos
 * Proxy para buscar favoritos do cliente no backend (paineladm)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");
    const customerId = searchParams.get("customerId");

    if (!lojistaId || !customerId) {
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

    const response = await fetch(
      `${backendUrl}/api/cliente/favoritos?lojistaId=${encodeURIComponent(lojistaId)}&customerId=${encodeURIComponent(customerId)}`
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Cliente Favoritos Proxy] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar favoritos" },
      { status: 500 }
    );
  }
}
```

---

## 🖥️ Backend - Paineladm

### 1. API de Ações (Like/Dislike)

**Arquivo:** `paineladm/src/app/api/actions/route.ts`

```typescript
import { NextResponse } from "next/server";
import { registerFavoriteLook, updateClienteComposicoesStats } from "@/lib/firestore/server";

const ALLOWED_METHODS = ["POST", "OPTIONS"];

function buildCorsHeaders() {
  const origin =
    process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOWED_METHODS.join(", "),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}

export async function POST(request: Request) {
  try {
    const {
      action,
      compositionId,
      jobId,
      lojistaId,
      customerId,
      customerName,
      productName,
      productPrice,
      imagemUrl,
    } =
      (await request.json()) as {
        action?: "like" | "dislike" | "share" | "checkout";
        compositionId?: string | null;
        jobId?: string | null;
        lojistaId?: string | null;
        customerId?: string | null;
        customerName?: string | null;
        productName?: string | null;
        productPrice?: number | null;
        imagemUrl?: string | null;
      };

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação obrigatória." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    if (!lojistaId) {
      return NextResponse.json(
        { success: false, error: "lojistaId obrigatório." },
        { status: 400, headers: buildCorsHeaders() }
      );
    }

    // Registrar favorito para likes e dislikes (para contabilização)
    if ((action === "like" || action === "dislike") && customerId) {
      if (action === "like") {
        // Registrar like como favorito
        try {
          console.log("[api/actions] Registrando favorito para like:", {
            lojistaId,
            customerId,
            hasImagemUrl: !!imagemUrl,
            imagemUrl: imagemUrl?.substring(0, 100),
            compositionId,
            jobId,
          });
          
          await registerFavoriteLook({
            lojistaId,
            customerId,
            customerName,
            compositionId: compositionId ?? null,
            jobId: jobId ?? null,
            imagemUrl: imagemUrl ?? null,
            productName: productName ?? null,
            productPrice: typeof productPrice === "number" ? productPrice : null,
          });
          
          console.log("[api/actions] Favorito registrado com sucesso");
        } catch (favoriteError: any) {
          console.error("[api/actions] Erro ao registrar favorito:", favoriteError);
          console.error("[api/actions] Stack do erro:", favoriteError?.stack);
          // Não falhar a requisição se o favorito falhar, mas logar o erro
          // O like ainda será contabilizado na composição
        }
      } else if (action === "dislike") {
        // Registrar dislike na coleção de favoritos para contabilização (mas não será exibido como favorito)
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const favoritosRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("clientes")
          .doc(customerId)
          .collection("favoritos");
        
        await favoritosRef.add({
          lojistaId,
          customerId,
          customerName: customerName ?? null,
          compositionId: compositionId ?? null,
          jobId: jobId ?? null,
          imagemUrl: imagemUrl ?? null,
          productName: productName ?? null,
          productPrice: typeof productPrice === "number" ? productPrice : null,
          lookType: "criativo",
          action: "dislike",
          tipo: "dislike",
          votedType: "dislike",
          createdAt: new Date(),
        });
      }

      // Atualizar estatísticas do cliente (totalComposicoes, totalLikes, totalDislikes)
      try {
        await updateClienteComposicoesStats(lojistaId, customerId);
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar estatísticas:", updateError);
        // Não falhar a requisição se a atualização falhar
      }
    }

    // Atualizar composição como curtida ou não curtida
    if (compositionId && (action === "like" || action === "dislike")) {
      try {
        const { getAdminDb } = await import("@/lib/firebaseAdmin");
        const db = getAdminDb();
        const composicaoRef = db
          .collection("lojas")
          .doc(lojistaId)
          .collection("composicoes")
          .doc(compositionId);

        await composicaoRef.update({
          curtido: action === "like",
          liked: action === "like",
          disliked: action === "dislike",
          updatedAt: new Date(),
        });

        // Atualizar estatísticas do cliente também para dislike
        if (action === "dislike" && customerId) {
          try {
            await updateClienteComposicoesStats(lojistaId, customerId);
          } catch (updateError) {
            console.error("[api/actions] Erro ao atualizar estatísticas após dislike:", updateError);
          }
        }
      } catch (updateError) {
        console.error("[api/actions] Erro ao atualizar composição:", updateError);
        // Não falhar a requisição se a atualização falhar
      }
    }

    console.log("[api/actions] Ação registrada:", {
      action,
      lojistaId,
      compositionId,
      customerId,
    });

    return NextResponse.json(
      { success: true, message: "Ação registrada." },
      { status: 200, headers: buildCorsHeaders() }
    );
  } catch (error) {
    console.error("[api/actions] erro ao registrar ação", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao registrar ação.",
      },
      { status: 500, headers: buildCorsHeaders() }
    );
  }
}
```

### 2. API de Favoritos (Buscar)

**Arquivo:** `paineladm/src/app/api/cliente/favoritos/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { fetchFavoriteLooks } from "@/lib/firestore/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const lojistaId = request.nextUrl.searchParams.get("lojistaId");
    const customerId = request.nextUrl.searchParams.get("customerId");
    const timestamp = request.nextUrl.searchParams.get("_t");

    console.log("[api/cliente/favoritos] Buscando favoritos:", { lojistaId, customerId, timestamp });

    if (!lojistaId || !customerId) {
      console.error("[api/cliente/favoritos] Parâmetros faltando:", { lojistaId: !!lojistaId, customerId: !!customerId });
      return NextResponse.json(
        { error: "lojistaId e customerId são obrigatórios" },
        { status: 400 }
      );
    }

    // Adicionar headers para evitar cache
    const favorites = await fetchFavoriteLooks({ lojistaId, customerId });
    
    console.log(`[api/cliente/favoritos] Favoritos encontrados: ${favorites.length}`);
    if (favorites.length > 0) {
      console.log(`[api/cliente/favoritos] Primeiro favorito (mais recente):`, {
        id: favorites[0].id,
        imagemUrl: favorites[0].imagemUrl?.substring(0, 50),
        createdAt: favorites[0].createdAt,
        action: favorites[0].action
      });
    }

    return NextResponse.json(
      { favorites },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error("[api/cliente/favoritos] Erro ao buscar favoritos:", error);
    console.error("[api/cliente/favoritos] Stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Erro interno ao buscar favoritos",
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
```

---

## 🔥 Firestore - Funções de Servidor

### 1. Função `registerFavoriteLook` - Salvar Favorito

**Arquivo:** `paineladm/src/lib/firestore/server.ts`

```typescript
export async function registerFavoriteLook(params: {
  lojistaId: string;
  customerId: string;
  customerName?: string | null;
  compositionId?: string | null;
  jobId?: string | null;
  imagemUrl?: string | null;
  productName?: string | null;
  productPrice?: number | null;
}) {
  const {
    lojistaId,
    customerId,
    customerName,
    compositionId,
    jobId,
    imagemUrl,
    productName,
    productPrice,
  } = params;

  console.log("[registerFavoriteLook] Iniciando registro de favorito:", {
    lojistaId,
    customerId,
    hasImagemUrl: !!imagemUrl,
    imagemUrl: imagemUrl?.substring(0, 100), // Log parcial da URL
    compositionId,
    jobId,
  });

  if (!lojistaId || !customerId) {
    const error = new Error("lojistaId e customerId são obrigatórios para favoritos");
    console.error("[registerFavoriteLook] Erro de validação:", error);
    throw error;
  }

  // Validar se imagemUrl está presente (obrigatório para favoritos)
  if (!imagemUrl || imagemUrl.trim() === "") {
    console.warn("[registerFavoriteLook] AVISO: imagemUrl vazio ou ausente. Favorito será salvo mesmo assim para contabilização.");
    // Não bloquear, mas avisar
  }

  try {
    const ref = clienteFavoritosRef(lojistaId, customerId);
    const favoriteData = {
      lojistaId,
      customerId,
      customerName: customerName ?? null,
      compositionId: compositionId ?? null,
      jobId: jobId ?? null,
      imagemUrl: imagemUrl ?? null,
      productName: productName ?? null,
      productPrice: typeof productPrice === "number" ? productPrice : null,
      lookType: "criativo",
      action: "like",
      tipo: "like",
      votedType: "like",
      createdAt: new Date(),
    };
    
    console.log("[registerFavoriteLook] Dados do favorito a serem salvos:", {
      ...favoriteData,
      imagemUrl: favoriteData.imagemUrl?.substring(0, 100), // Log parcial
    });
    
    const docRef = await ref.add(favoriteData);
    
    console.log("[registerFavoriteLook] Favorito salvo com sucesso. ID:", docRef.id);
    
    return docRef.id;
  } catch (error: any) {
    console.error("[registerFavoriteLook] Erro ao salvar favorito:", error);
    console.error("[registerFavoriteLook] Stack:", error?.stack);
    throw error;
  }
}
```

### 2. Função `fetchFavoriteLooks` - Buscar Favoritos

**Arquivo:** `paineladm/src/lib/firestore/server.ts`

```typescript
/**
 * Busca os últimos 10 favoritos de um cliente
 */
export async function fetchFavoriteLooks(params: {
  lojistaId: string;
  customerId: string;
}) {
  const { lojistaId, customerId } = params;
  if (!lojistaId || !customerId) return [];

  try {
    let snapshot;
    try {
      // Buscar mais documentos (50) para garantir que temos likes suficientes após filtrar dislikes
      // Depois limitaremos a 10 likes
      snapshot = await clienteFavoritosRef(lojistaId, customerId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();
    } catch (orderByError: any) {
      if (orderByError?.code === "failed-precondition") {
        // Se não houver índice, buscar mais documentos para garantir que temos likes suficientes
        const allSnapshot = await clienteFavoritosRef(lojistaId, customerId)
          .limit(100)
          .get();
        
        const allDocs: any[] = [];
        allSnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data?.createdAt?.toDate?.() || new Date(data?.createdAt || 0);
          allDocs.push({ id: doc.id, data, createdAt });
        });
        
        allDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        snapshot = {
          forEach: (callback: any) => {
            allDocs.slice(0, 10).forEach((item) => {
              callback({ id: item.id, data: () => item.data });
            });
          },
          size: Math.min(allDocs.length, 10),
          empty: allDocs.length === 0,
        } as any;
      } else {
        throw orderByError;
      }
    }

    const results: any[] = [];
    let totalDocs = 0;
    let skippedDislikes = 0;
    let skippedNoImage = 0;
    let skippedNoLike = 0;
    
    snapshot.forEach((doc: any) => {
      totalDocs++;
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      
      // IMPORTANTE: Favoritos são apenas imagens com LIKE (não dislike)
      // Dislikes são registrados para contabilização, mas não aparecem como favoritos
      const action = data?.action || data?.tipo || data?.votedType;
      const isLike = action === "like" || (!action && !data?.action && !data?.tipo && !data?.votedType); // Compatibilidade com dados antigos
      const isDislike = action === "dislike";
      
      // Filtrar apenas likes (não mostrar dislikes como favoritos)
      if (isDislike) {
        skippedDislikes++;
        return; // Pular dislikes
      }
      
      if (!isLike) {
        skippedNoLike++;
        return; // Pular se não for like
      }
      
      const hasImage = data?.imagemUrl && data.imagemUrl.trim() !== "";
      
      if (!hasImage) {
        skippedNoImage++;
        console.warn(`[fetchFavoriteLooks] Favorito ${doc.id} sem imagemUrl - será ignorado`);
        return; // Pular se não tiver imagem
      }
      
      // Garantir que createdAt está presente e é um objeto Date válido
      let createdAt = data?.createdAt;
      if (createdAt?.toDate) {
        createdAt = createdAt.toDate();
      } else if (createdAt?.seconds) {
        createdAt = new Date(createdAt.seconds * 1000);
      } else if (typeof createdAt === 'string') {
        createdAt = new Date(createdAt);
      } else if (!createdAt || !(createdAt instanceof Date)) {
        // Se não tiver createdAt válido, usar data atual (favorito recém-criado)
        createdAt = new Date();
        console.warn(`[fetchFavoriteLooks] Favorito ${doc.id} sem createdAt válido - usando data atual`);
      }
      
      results.push({ 
        id: doc.id, 
        ...data,
        createdAt: createdAt // Garantir que createdAt é sempre um Date válido
      });
    });
    
    console.log(`[fetchFavoriteLooks] Total de documentos: ${totalDocs}, Likes com imagem: ${results.length}, Dislikes: ${skippedDislikes}, Sem imagem: ${skippedNoImage}, Sem like: ${skippedNoLike}`);

    // Ordenar por data de criação (mais recente primeiro) - garantir que funciona mesmo com diferentes formatos
    results.sort((a, b) => {
      let dateA: Date;
      let dateB: Date;
      
      // Processar dateA
      if (a.createdAt instanceof Date) {
        dateA = a.createdAt;
      } else if (a.createdAt?.toDate) {
        dateA = a.createdAt.toDate();
      } else if (a.createdAt?.seconds) {
        dateA = new Date(a.createdAt.seconds * 1000);
      } else if (typeof a.createdAt === 'string') {
        dateA = new Date(a.createdAt);
      } else if (a.createdAt) {
        dateA = new Date(a.createdAt);
      } else {
        dateA = new Date(0); // Data muito antiga se não houver
      }
      
      // Processar dateB
      if (b.createdAt instanceof Date) {
        dateB = b.createdAt;
      } else if (b.createdAt?.toDate) {
        dateB = b.createdAt.toDate();
      } else if (b.createdAt?.seconds) {
        dateB = new Date(b.createdAt.seconds * 1000);
      } else if (typeof b.createdAt === 'string') {
        dateB = new Date(b.createdAt);
      } else if (b.createdAt) {
        dateB = new Date(b.createdAt);
      } else {
        dateB = new Date(0); // Data muito antiga se não houver
      }
      
      // Ordenar do mais recente para o mais antigo
      return dateB.getTime() - dateA.getTime();
    });

    const limitedResults = results.slice(0, 10);
    
    if (limitedResults.length > 0) {
      console.log(`[fetchFavoriteLooks] Primeiro favorito (mais recente):`, {
        id: limitedResults[0].id,
        imagemUrl: limitedResults[0].imagemUrl?.substring(0, 50),
        createdAt: limitedResults[0].createdAt,
        action: limitedResults[0].action
      });
    }

    return limitedResults;
  } catch (error) {
    console.error("[fetchFavoriteLooks] Erro:", error);
    return [];
  }
}
```

### 3. Função Helper `clienteFavoritosRef`

**Arquivo:** `paineladm/src/lib/firestore/server.ts`

```typescript
function clienteFavoritosRef(lojistaId: string, customerId: string) {
  return getAdminDb()
    .collection("lojas")
    .doc(lojistaId)
    .collection("clientes")
    .doc(customerId)
    .collection("favoritos");
}
```

---

## 📊 Estrutura de Dados no Firestore

### Documento de Favorito

**Caminho:** `lojas/{lojistaId}/clientes/{customerId}/favoritos/{favoriteId}`

```typescript
{
  lojistaId: string;
  customerId: string;
  customerName: string | null;
  compositionId: string | null;
  jobId: string | null;
  imagemUrl: string | null; // OBRIGATÓRIO para exibição
  productName: string | null;
  productPrice: number | null;
  lookType: "criativo";
  action: "like" | "dislike"; // "like" = favorito, "dislike" = não favorito
  tipo: "like" | "dislike"; // Compatibilidade
  votedType: "like" | "dislike"; // Compatibilidade
  createdAt: Date; // Timestamp do Firestore
}
```

---

## 🔍 Logs e Debug

### Logs no Frontend (Modelo-2)

- `[ResultadoPage] Salvando like:` - Quando inicia o salvamento
- `[ResultadoPage] Resposta do servidor:` - Resposta do backend
- `[ResultadoPage] Like salvo com sucesso` - Confirmação
- `[ResultadoPage] Recarregando favoritos (tentativa X)` - Tentativas de recarregamento
- `[ResultadoPage] Buscando favoritos:` - Quando busca favoritos
- `[ResultadoPage] Favoritos carregados:` - Resultado da busca
- `[ResultadoPage] Primeiro favorito (mais recente):` - Debug do primeiro item
- `[ResultadoPage] Último favorito (mais antigo):` - Debug do último item

### Logs no Backend (Paineladm)

- `[api/actions] Registrando favorito para like:` - Início do registro
- `[api/actions] Favorito registrado com sucesso` - Confirmação
- `[registerFavoriteLook] Iniciando registro de favorito:` - Início da função
- `[registerFavoriteLook] Dados do favorito a serem salvos:` - Dados antes de salvar
- `[registerFavoriteLook] Favorito salvo com sucesso. ID:` - ID do documento criado
- `[fetchFavoriteLooks] Total de documentos:` - Estatísticas da busca
- `[fetchFavoriteLooks] Primeiro favorito (mais recente):` - Debug do primeiro item
- `[api/cliente/favoritos] Buscando favoritos:` - Início da busca
- `[api/cliente/favoritos] Favoritos encontrados:` - Resultado da busca

---

## ⚙️ Configurações e Variáveis de Ambiente

### Modelo-2

```env
NEXT_PUBLIC_BACKEND_URL=https://paineladm.experimenteai.com.br
# ou
NEXT_PUBLIC_PAINELADM_URL=https://paineladm.experimenteai.com.br
```

### Paineladm

```env
NEXT_PUBLIC_CLIENT_APP_URL=https://app2.experimenteai.com.br
```

---

## 🎯 Regras de Negócio

1. **LIKE = FAVORITO**: Apenas imagens com `action: "like"` aparecem nos favoritos
2. **DISLIKE = NÃO SALVA**: Dislikes são registrados para contabilização, mas não aparecem como favoritos
3. **Últimos 10 Favoritos**: Apenas os 10 favoritos mais recentes são exibidos
4. **Ordenação**: Favoritos são ordenados por `createdAt` (mais recente primeiro)
5. **Filtro de Imagem**: Apenas favoritos com `imagemUrl` válida são exibidos
6. **Múltiplas Tentativas**: O frontend tenta recarregar favoritos múltiplas vezes para garantir que o último like apareça

---

## 🐛 Troubleshooting

### Problema: Último like não aparece nos favoritos

**Soluções implementadas:**
1. Múltiplas tentativas de recarregamento (300ms, 800ms, 1500ms)
2. Recarregamento ao abrir modal (4 tentativas)
3. Recarregamento antes de abrir modal
4. Headers anti-cache na API
5. Buscar 50 favoritos antes de filtrar (garantir likes suficientes)
6. Logs detalhados para debug

### Problema: Favoritos antigos aparecem, mas novos não

**Verificar:**
1. Se `imagemUrl` está sendo enviado corretamente
2. Se `action: "like"` está sendo salvo
3. Se `createdAt` está sendo salvo corretamente
4. Logs no console do navegador e do servidor

---

## 📝 Notas Importantes

1. **Compatibilidade com Dados Antigos**: O código suporta favoritos antigos que não têm `action`, `tipo` ou `votedType` (assume que são likes)

2. **Formato de Data**: O código suporta múltiplos formatos de `createdAt`:
   - Objeto Date do Firestore (com `.toDate()`)
   - Timestamp com `.seconds`
   - String ISO
   - Objeto Date nativo

3. **Cache**: Headers anti-cache são adicionados em todas as requisições para garantir dados frescos

4. **Performance**: Buscar 50 favoritos antes de filtrar garante que temos likes suficientes mesmo se houver muitos dislikes

---

**Última atualização:** 2024-12-19
**Versão:** 1.0.0



