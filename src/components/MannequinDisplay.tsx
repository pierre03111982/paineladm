'use client';

import { useState, useEffect } from 'react';
import { 
  selectMannequinFolder, 
  getMannequinImagePath,
  type UserPhysicalCharacteristics 
} from '@/lib/mannequin-selector';

interface MannequinDisplayProps {
  skinTone: number; // 0-6
  userCharacteristics: UserPhysicalCharacteristics;
  busto: number; // 1-5
  cintura: number; // 1-5
  quadril: number; // 1-5
  className?: string;
}

/**
 * Componente para exibir o manequim baseado nas características do usuário
 * 
 * Este componente:
 * 1. Calcula automaticamente qual pasta (A-E) usar baseado em altura/peso/idade
 * 2. Monta o caminho da imagem correta
 * 3. Exibe o manequim com fallback caso a imagem não exista
 */
export default function MannequinDisplay({
  skinTone,
  userCharacteristics,
  busto,
  cintura,
  quadril,
  className = ''
}: MannequinDisplayProps) {
  const [imagePath, setImagePath] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');

  useEffect(() => {
    // Calcular qual pasta usar
    const folder = selectMannequinFolder(userCharacteristics);
    setSelectedFolder(folder);

    // Gerar caminho da imagem
    const path = getMannequinImagePath(
      skinTone,
      userCharacteristics,
      busto,
      cintura,
      quadril
    );
    setImagePath(path);
    setImageError(false);
  }, [skinTone, userCharacteristics, busto, cintura, quadril]);

  const handleImageError = () => {
    setImageError(true);
  };

  // Fallback: tentar outras pastas se a imagem não carregar
  const getFallbackPath = (): string => {
    const folders: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    const currentIndex = folders.indexOf(selectedFolder as any);
    
    // Tentar próxima pasta
    const nextIndex = (currentIndex + 1) % folders.length;
    const fallbackFolder = folders[nextIndex];
    
    return `/assets/mannequins/mannequin_s${skinTone}_f${fallbackFolder}_b${busto}_c${cintura}_q${quadril}.jpg`;
  };

  if (imageError) {
    const fallbackPath = getFallbackPath();
    return (
      <div className={className}>
        <img
          src={fallbackPath}
          alt="Manequim (fallback)"
          onError={() => {
            // Se o fallback também falhar, mostrar placeholder
            console.warn(`Imagem não encontrada: ${imagePath} e ${fallbackPath}`);
          }}
          className="w-full h-auto"
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <img
        src={imagePath}
        alt={`Manequim - Pele ${skinTone}, Pasta ${selectedFolder}, Medidas B${busto}C${cintura}Q${quadril}`}
        onError={handleImageError}
        className="w-full h-auto"
      />
      {/* Debug info (remover em produção) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-500 mt-2">
          Pasta: {selectedFolder} | Altura: {userCharacteristics.altura}cm | 
          Peso: {userCharacteristics.peso}kg | Idade: {userCharacteristics.idade}anos
        </div>
      )}
    </div>
  );
}
