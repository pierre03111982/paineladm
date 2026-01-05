/**
 * Ícone de IA usando a imagem IA.png da pasta public
 * Com animação que inicia e depois pausa
 */
export function AIIcon({ className = "h-8 w-8", pulse = false }: { className?: string; pulse?: boolean }) {
  const baseClasses = `${className} icon-animate-once`;
  
  if (!pulse) {
    return (
      <img
        src="/IA.png"
        alt="IA"
        className={baseClasses}
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
        className={`${baseClasses} relative z-10`}
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

