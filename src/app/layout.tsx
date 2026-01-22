import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { getAdminDb } from "@/lib/firebaseAdmin";
import "./globals.css";

// Fonte para corpo e interface (Pesquisa, Menus, Tabelas)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Fonte para títulos e destaques (Logo, Cabeçalhos)
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

async function getAdminLogo(): Promise<string | null> {
  try {
    const db = getAdminDb();
    const configDoc = await db.collection("admin").doc("config").get();
    
    if (configDoc.exists) {
      const data = configDoc.data();
      return data?.logoUrl || null;
    }
  } catch (error) {
    console.error("[Layout] Erro ao buscar logo do admin:", error);
  }
  return null;
}

export async function generateMetadata(): Promise<Metadata> {
  const adminLogo = await getAdminLogo();
  
  return {
    title: "Painel Experimente AI",
    description: "Gerencie sua loja, clientes e resultados do Provador Virtual.",
    icons: adminLogo ? {
      icon: adminLogo,
      apple: adminLogo,
      shortcut: adminLogo,
    } : {
      icon: '/favicon.ico',
      apple: '/favicon.ico',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="pt-BR" translate="no" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="google" content="notranslate" />
        <meta name="google-translate-customization" content="false" />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-[var(--bg-app)] text-[var(--text-main)]`}
        suppressHydrationWarning
      >
        {/* PHASE 8 REVISION: Aurora Container - Third Blob */}
        <div id="aurora-container">
          <div id="aurora-blob-3" />
        </div>
        {children}
      </body>
    </html>
  );
}
