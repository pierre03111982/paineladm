import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AdminFavicon } from "@/components/admin-favicon";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Painel Experimente AI",
  description: "Gerencie sua loja, clientes e resultados do Provador Virtual.",
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="pt-BR" translate="no" suppressHydrationWarning className="transition-colors duration-300">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="google" content="notranslate" />
        <meta name="google-translate-customization" content="false" />
        <AdminFavicon />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('paineladm-theme') || 'light';
                  const html = document.documentElement;
                  if (theme === 'dark') {
                    html.classList.add('dark');
                  } else {
                    html.classList.remove('dark');
                  }
                } catch (e) {
                  console.error('Erro ao aplicar tema inicial:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased transition-colors duration-300 bg-[var(--bg-app)] text-[var(--text-main)]`}
        translate="no"
      >
        {/* PHASE 8 REVISION: Aurora Container - Third Blob */}
        <div id="aurora-container">
          <div id="aurora-blob-3" />
        </div>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
