"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LojistasTable } from "../../../(admin)/lojistas/components/lojistas-table";
import { PageHeader } from "../../../(lojista)/components/page-header";
import { CriarLojaModal } from "./CriarLojaModal";
import { useRouter } from "next/navigation";

type Lojista = {
  id: string;
  nome: string;
  email: string;
  planoAtual: string;
  statusPagamento: string;
  dataVencimento: Date | null;
  createdAt: Date;
  status: string;
  logoUrl: string | null;
  limiteImagens: number;
  imagensGeradasMes: number;
};

type LojistasPageClientProps = {
  initialLojistas: Lojista[];
};

export function LojistasPageClient({ initialLojistas }: LojistasPageClientProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Gerenciamento de Lojistas"
            description="Aprove, suspenda e gerencie todos os lojistas da plataforma"
          />
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-400/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:border-indigo-300/60 hover:bg-indigo-500/20"
          >
            <Plus className="h-4 w-4" />
            Nova Loja
          </button>
        </div>

        <LojistasTable initialLojistas={initialLojistas} />
      </div>

      <CriarLojaModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
}




