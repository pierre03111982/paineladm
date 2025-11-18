import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage, getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo") as File;
    const sessionId = formData.get("sessionId") as string;
    const lojistaId = formData.get("lojistaId") as string;

    if (!photo || !sessionId || !lojistaId) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // Upload para Firebase Storage
    const storage = getAdminStorage();
    const buffer = Buffer.from(await photo.arrayBuffer());
    const fileName = `display/${lojistaId}/${sessionId}/${Date.now()}-${photo.name}`;
    const file = storage.bucket().file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: photo.type,
      },
    });

    // Tornar público temporariamente
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${storage.bucket().name}/${fileName}`;

    // Armazenar referência no Firestore para o display buscar
    const db = getAdminDb();
    await db
      .collection("display_sessions")
      .doc(sessionId)
      .set({
        lojistaId,
        photoUrl: publicUrl,
        createdAt: new Date(),
      });

    return NextResponse.json({ success: true, photoUrl: publicUrl });
  } catch (error) {
    console.error("Erro ao fazer upload da foto:", error);
    return NextResponse.json(
      { error: "Erro ao processar foto" },
      { status: 500 }
    );
  }
}

