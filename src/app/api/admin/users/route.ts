import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminDb, getAdminApp } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/auth/admin-auth";

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Lista todos os usuários do sistema
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const auth = getAuth(getAdminApp());
    const db = getAdminDb();

    // Listar usuários do Firebase Auth
    const listUsersResult = await auth.listUsers(1000);
    const users = listUsersResult.users;

    // Buscar informações adicionais do Firestore
    const usersWithRoles = await Promise.all(
      users.map(async (userRecord) => {
        const customClaims = userRecord.customClaims || {};
        const role = customClaims.role || "cliente";

        // Buscar dados adicionais no Firestore
        let additionalData: any = {};
        
        if (role === "lojista") {
          // Buscar na coleção lojas
          const lojaDoc = await db
            .collection("lojas")
            .where("email", "==", userRecord.email)
            .limit(1)
            .get();
          
          if (!lojaDoc.empty) {
            const lojaData = lojaDoc.docs[0].data();
            additionalData = {
              lojaId: lojaDoc.docs[0].id,
              nome: lojaData.nome,
              planoAtual: lojaData.planoAtual,
              status: lojaData.status,
            };
          }
        } else if (role === "cliente") {
          // Buscar na coleção clientes
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
            };
          }
        }

        return {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          emailVerified: userRecord.emailVerified,
          disabled: userRecord.disabled,
          role: role,
          createdAt: userRecord.metadata.creationTime,
          lastSignIn: userRecord.metadata.lastSignInTime,
          ...additionalData,
        };
      })
    );

    return NextResponse.json({ users: usersWithRoles });
  } catch (error) {
    console.error("[API Users GET] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao listar usuários" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Cria um novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { email, password, displayName, role, lojaData, clienteData } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    if (!role || !["admin", "lojista", "cliente"].includes(role)) {
      return NextResponse.json(
        { error: "Role deve ser: admin, lojista ou cliente" },
        { status: 400 }
      );
    }

    const auth = getAuth(getAdminApp());
    const db = getAdminDb();

    // Criar usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    // Definir custom claims (role)
    await auth.setCustomUserClaims(userRecord.uid, {
      role: role,
    });

    // Criar dados adicionais no Firestore baseado no role
    if (role === "lojista") {
      const lojaRef = db.collection("lojas").doc();
      await lojaRef.set({
        email,
        nome: displayName || lojaData?.nome || "Loja sem nome",
        planoAtual: lojaData?.planoAtual || "free",
        status: lojaData?.status || "pendente",
        statusPagamento: lojaData?.statusPagamento || "pendente",
        limiteImagens: lojaData?.limiteImagens || 10,
        imagensGeradasMes: 0,
        createdAt: new Date(),
        ...lojaData,
      });

      return NextResponse.json({
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: role,
          lojaId: lojaRef.id,
        },
      });
    } else if (role === "cliente") {
      if (!clienteData?.lojistaId) {
        return NextResponse.json(
          { error: "É obrigatório selecionar uma loja para o cliente" },
          { status: 400 }
        );
      }

      const clienteRef = db.collection("clientes").doc();
      await clienteRef.set({
        email,
        nome: displayName || clienteData?.nome || "Cliente sem nome",
        lojistaId: clienteData.lojistaId,
        createdAt: new Date(),
        ...clienteData,
      });

      return NextResponse.json({
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: role,
          clienteId: clienteRef.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        role: role,
      },
    });
  } catch (error: any) {
    console.error("[API Users POST] Erro:", error);
    
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Este email já está cadastrado" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}

