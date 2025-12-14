/**
 * Ícone de IA usando a imagem IA.png da pasta public
 */
export function AIIcon({ className = "h-8 w-8", pulse = false }: { className?: string; pulse?: boolean }) {
  if (!pulse) {
    return (
      <img
        src="/IA.png"
        alt="IA"
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  return (
    <div className="relative inline-block">
      {/* Efeito Pulse/Ping - Redondo */}
      <div className="absolute inset-0 rounded-full bg-cyan-400/25 animate-ping"></div>
      
      {/* Imagem */}
      <img
        src="/IA.png"
        alt="IA"
        className={`${className} relative z-10`}
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

