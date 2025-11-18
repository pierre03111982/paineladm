import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb, getAdminApp } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[userId]
 * Busca informações de um usuário específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();

    const { userId } = await params;
    const auth = getAuth(getAdminApp());
    const db = getAdminDb();

    const userRecord = await auth.getUser(userId);
    const customClaims = userRecord.customClaims || {};
    const role = customClaims.role || "cliente";

    let additionalData: any = {};

    if (role === "lojista") {
      const lojaDoc = await db
        .collection("lojas")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!lojaDoc.empty) {
        additionalData = {
          lojaId: lojaDoc.docs[0].id,
          ...lojaDoc.docs[0].data(),
        };
      }
    } else if (role === "cliente") {
      const clienteDoc = await db
        .collection("clientes")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!clienteDoc.empty) {
        const clienteData = clienteDoc.docs[0].data();
        additionalData = {
          clienteId: clienteDoc.docs[0].id,
          nome: clienteData.nome,
          lojistaId: clienteData.lojistaId || null,
          ...clienteData,
        };
      }
    }

    return NextResponse.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      role: role,
      createdAt: userRecord.metadata.creationTime,
      lastSignIn: userRecord.metadata.lastSignInTime,
      ...additionalData,
    });
  } catch (error: any) {
    console.error("[API Users GET] Erro:", error);
    
    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao buscar usuário" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Atualiza um usuário
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();

    const { userId } = await params;
    const body = await request.json();
    const auth = getAuth(getAdminApp());
    const db = getAdminDb();

    const updateData: any = {};

    // Atualizar dados do Firebase Auth
    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName;
    }
    if (body.email !== undefined) {
      updateData.email = body.email;
    }
    if (body.password !== undefined) {
      updateData.password = body.password;
    }
    if (body.disabled !== undefined) {
      updateData.disabled = body.disabled;
    }
    if (body.emailVerified !== undefined) {
      updateData.emailVerified = body.emailVerified;
    }

    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(userId, updateData);
    }

    // Atualizar role se fornecido
    if (body.role && ["admin", "lojista", "cliente"].includes(body.role)) {
      await auth.setCustomUserClaims(userId, {
        role: body.role,
      });
    }

    // Atualizar dados no Firestore baseado no role
    const userRecord = await auth.getUser(userId);
    const currentClaims = userRecord.customClaims || {};
    const currentRole = currentClaims.role || body.role || "cliente";
    const role = body.role || currentRole;

    if (role === "lojista") {
      const lojaDoc = await db
        .collection("lojas")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!lojaDoc.empty && body.lojaData) {
        await lojaDoc.docs[0].ref.update(body.lojaData);
      } else if (lojaDoc.empty && body.lojaData) {
        // Criar loja se não existir (apenas para lojistas)
        const lojaRef = db.collection("lojas").doc();
        await lojaRef.set({
          email: body.email || userRecord.email,
          nome: body.displayName || body.lojaData?.nome || "Loja sem nome",
          planoAtual: body.lojaData?.planoAtual || "free",
          status: body.lojaData?.status || "pendente",
          statusPagamento: body.lojaData?.statusPagamento || "pendente",
          limiteImagens: body.lojaData?.limiteImagens || 10,
          imagensGeradasMes: body.lojaData?.imagensGeradasMes || 0,
          createdAt: new Date(),
          ...body.lojaData,
        });
      }
    } else if (role === "cliente" && body.clienteData) {
      // Validar se lojistaId foi fornecido
      if (!body.clienteData.lojistaId) {
        return NextResponse.json(
          { error: "É obrigatório selecionar uma loja para o cliente" },
          { status: 400 }
        );
      }

      const clienteDoc = await db
        .collection("clientes")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!clienteDoc.empty) {
        const updateData: any = { ...body.clienteData };
        if (updateData.lojistaId === "") {
          return NextResponse.json(
            { error: "É obrigatório selecionar uma loja para o cliente" },
            { status: 400 }
          );
        }
        await clienteDoc.docs[0].ref.update(updateData);
      } else {
        // Criar cliente se não existir
        const clienteRef = db.collection("clientes").doc();
        await clienteRef.set({
          email: body.email || userRecord.email,
          nome: body.displayName || body.clienteData?.nome || "Cliente sem nome",
          lojistaId: body.clienteData.lojistaId,
          createdAt: new Date(),
          ...body.clienteData,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Users PATCH] Erro:", error);

    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Este email já está em uso" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Exclui um usuário
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();

    const { userId } = await params;
    const auth = getAuth(getAdminApp());
    const db = getAdminDb();

    // Buscar informações do usuário antes de excluir
    const userRecord = await auth.getUser(userId);
    const customClaims = userRecord.customClaims || {};
    const role = customClaims.role || "cliente";

    // Excluir dados do Firestore
    if (role === "lojista" || role === "admin") {
      const lojaDoc = await db
        .collection("lojas")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!lojaDoc.empty) {
        await lojaDoc.docs[0].ref.delete();
      }
    } else if (role === "cliente") {
      const clienteDoc = await db
        .collection("clientes")
        .where("email", "==", userRecord.email)
        .limit(1)
        .get();

      if (!clienteDoc.empty) {
        await clienteDoc.docs[0].ref.delete();
      }
    }

    // Excluir usuário do Firebase Auth
    await auth.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API Users DELETE] Erro:", error);

    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao excluir usuário" },
      { status: 500 }
    );
  }
}

