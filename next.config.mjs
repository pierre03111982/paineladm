/** @type {import('next').NextConfig} */
const finalConfig = {
  // A função `headers` não tem acesso ao `req`, então não podemos fazer isso dinamicamente aqui.
  // A solução correta é usar um middleware ou ajustar cada rota da API.
  // Para uma correção rápida, vamos permitir qualquer origem, mas isso não é ideal para produção.
  // Para uma solução mais robusta, teríamos que criar `middleware.ts`.
  async headers() {
    return [
        {
            // matching all API routes
            source: "/api/:path*",
            headers: [
                { key: "Access-Control-Allow-Credentials", value: "true" },
                { key: "Access-Control-Allow-Origin", value: "*" },  // ATENÇÃO: Permitindo todas as origens
                { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
                { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
            ]
        }
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "**.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.googleapis.com",
      },
    ],
    unoptimized: false,
  },
};

export default finalConfig;


