"use client";

import { FittingTrigger } from "@/components/store/virtual-fitting";
// import { saveUserMeasurements } from "@/lib/firestore/user-profile"; // Removido - não usado em teste
import { useState, useEffect } from "react";
import { firebaseAuth } from "@/lib/firebaseConfig";

/**
 * Página de teste do Ajustador de Medidas / Provador Virtual
 * 
 * Acesse em: http://localhost:3000/ajustador-medidas-test
 */
export default function AjustadorMedidasTestPage() {
  const [userId, setUserId] = useState<string | null>(null);

  // Obter ID do usuário logado
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Se não estiver logado, usar um ID de teste
        setUserId("test-user-id");
      }
    });

    return () => unsubscribe();
  }, []);

  // Dados de exemplo do produto (medidas em cm)
  const productMeasurements = {
    "P": { "Busto": 88, "Cintura": 72, "Quadril": 92 },
    "M": { "Busto": 92, "Cintura": 76, "Quadril": 96 },
    "G": { "Busto": 96, "Cintura": 80, "Quadril": 100 },
    "GG": { "Busto": 100, "Cintura": 84, "Quadril": 104 },
    "XG": { "Busto": 104, "Cintura": 88, "Quadril": 108 },
  };

  // Removido: handleSaveMeasurements - Página de teste não salva medidas
  // const handleSaveMeasurements = async (measurements: Parameters<typeof saveUserMeasurements>[1]) => {
  //   // Desabilitado para teste - não salva no Firebase
  // };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🧪 Teste do Ajustador de Medidas
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Página de teste para o Provador Virtual / Ajustador de Medidas
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-600 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Como Testar:
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
            <li>Clique no botão abaixo para abrir o Provador Virtual</li>
            <li>Preencha os dados básicos (Altura, Peso, Idade, Gênero)</li>
            <li>Ajuste os sliders e o tom de pele no manequim</li>
            <li>Veja a recomendação de tamanho baseada nas medidas</li>
          </ol>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Provador Virtual
          </h2>
          
          <div className="flex flex-col items-start gap-4">
            <FittingTrigger
              productId="produto-teste-123"
              productMeasurements={productMeasurements}
              sizeOrder={["P", "M", "G", "GG", "XG"]}
              // onSaveMeasurements removido - página de teste não salva medidas
              className="w-full sm:w-auto"
            />

            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium mb-2 text-gray-900 dark:text-white">📊 Medidas do Produto (para teste):</p>
              <div className="bg-gray-50 dark:bg-slate-700 rounded p-3 text-xs font-mono text-gray-900 dark:text-gray-100">
                {JSON.stringify(productMeasurements, null, 2)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>💡 Dica:</strong> Esta é uma página de teste. Para usar no app modelo-2, 
            você precisará integrar o componente <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">FittingTrigger</code> 
            na página de produtos ou onde desejar exibir o ajustador de medidas.
          </p>
        </div>
      </div>
    </div>
  );
}
