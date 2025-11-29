import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

/**
 * PHASE 16: Scan Displays API
 * Busca displays na mesma rede (mesmo IP) que estão online e disponíveis
 * Endpoint: GET /api/lojista/scan-displays?lojistaId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lojistaId = searchParams.get("lojistaId");

    if (!lojistaId) {
      return NextResponse.json(
        { error: "lojistaId é obrigatório" },
        { status: 400 }
      );
    }

    // Obter IP do lojista (quem está fazendo a requisição)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const retailerIp = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    if (!retailerIp || retailerIp === "unknown") {
      console.warn("[scan-displays] IP do lojista não detectado, retornando lista vazia");
      return NextResponse.json({
        displays: [],
        message: "IP não detectado. Use a opção manual de código.",
      });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase Admin não configurado" },
        { status: 500 }
      );
    }

    // Calcular timestamp de 2 minutos atrás
    const twoMinutesAgo = Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);

    // Buscar displays com:
    // - Mesmo IP do lojista
    // - Status 'idle' (não pareados)
    // - lastHeartbeat recente (últimos 2 minutos)
    const displaysRef = db.collection("displays");
    
    let snapshot;
    try {
      snapshot = await displaysRef
        .where("lastKnownIp", "==", retailerIp)
        .where("status", "==", "idle")
        .where("lastHeartbeat", ">", twoMinutesAgo)
        .get();
    } catch (error: any) {
      // Se não houver índice, buscar todos e filtrar manualmente
      console.warn("[scan-displays] Índice não encontrado, buscando todos e filtrando:", error);
      const allSnapshot = await displaysRef.get();
      const filteredDocs: any[] = [];
      
      allSnapshot.forEach((doc) => {
        const data = doc.data();
        const lastHeartbeat = data.lastHeartbeat?.toMillis?.() || data.lastHeartbeat?.seconds * 1000 || 0;
        const twoMinutesAgoMs = Date.now() - 2 * 60 * 1000;
        
        if (
          data.lastKnownIp === retailerIp &&
          data.status === "idle" &&
          lastHeartbeat > twoMinutesAgoMs
        ) {
          filteredDocs.push({ id: doc.id, data });
        }
      });
      
      snapshot = {
        forEach: (callback: any) => {
          filteredDocs.forEach((item) => {
            callback({
              id: item.id,
              data: () => item.data,
              exists: true,
            });
          });
        },
      } as any;
    }

    const displays: any[] = [];
    snapshot.forEach((doc: any) => {
      const data = typeof doc.data === "function" ? doc.data() : doc.data;
      if (!data) return;

      // Detectar tipo de dispositivo pelo userAgent
      const userAgent = data.userAgent || "";
      let deviceType = "Smart TV";
      let deviceBrand = "Desconhecido";
      
      if (userAgent.includes("Tizen")) {
        deviceType = "Smart TV";
        deviceBrand = "Samsung";
      } else if (userAgent.includes("WebOS")) {
        deviceType = "Smart TV";
        deviceBrand = "LG";
      } else if (userAgent.includes("Chrome")) {
        deviceType = "Navegador";
        deviceBrand = "Chrome";
      } else if (userAgent.includes("Firefox")) {
        deviceType = "Navegador";
        deviceBrand = "Firefox";
      }

      // Calcular tempo desde o último heartbeat
      const lastHeartbeatMs = data.lastHeartbeat?.toMillis?.() || data.lastHeartbeat?.seconds * 1000 || Date.now();
      const timeSinceHeartbeat = Date.now() - lastHeartbeatMs;
      const isOnline = timeSinceHeartbeat < 2 * 60 * 1000; // Online se heartbeat nos últimos 2 minutos

      displays.push({
        id: doc.id,
        displayUuid: doc.id,
        deviceType,
        deviceBrand,
        userAgent: userAgent, // Enviar userAgent completo
        lastHeartbeat: lastHeartbeatMs,
        ip: data.lastKnownIp || "unknown",
        status: data.status || "idle",
        isOnline,
        timeSinceHeartbeat,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt?.seconds * 1000 || null,
        lojistaId: data.lojistaId || null,
      });
    });

    // Ordenar por lastHeartbeat (mais recente primeiro)
    displays.sort((a, b) => b.lastHeartbeat - a.lastHeartbeat);

    console.log("[scan-displays] ✅ Displays encontrados:", {
      retailerIp,
      count: displays.length,
      displays: displays.map(d => ({ id: d.id, deviceType: d.deviceType, deviceBrand: d.deviceBrand })),
    });

    return NextResponse.json({
      displays,
      retailerIp,
      count: displays.length,
    });
  } catch (error: any) {
    console.error("[scan-displays] ❌ Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao escanear displays",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

