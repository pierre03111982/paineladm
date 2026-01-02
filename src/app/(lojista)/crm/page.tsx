import { fetchActiveClients } from "@/lib/firestore/crm-queries"
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth"
import { IconPageHeader } from "../components/icon-page-header";
import { getPageHeaderColors } from "../components/page-header-colors";
import { CRMTable } from "./crm-table"
import { Radar } from "lucide-react"

export const dynamic = 'force-dynamic'

type CRMPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CRMPage({ searchParams }: CRMPageProps) {
  const params = await searchParams
  const lojistaIdFromQuery = (params.lojistaId || params.lojistald) as string | undefined
  
  const lojistaIdFromAuth = lojistaIdFromQuery ? null : await getCurrentLojistaId()
  const lojistaId =
    lojistaIdFromQuery ||
    lojistaIdFromAuth ||
    process.env.NEXT_PUBLIC_LOJISTA_ID ||
    process.env.LOJISTA_ID ||
    ""

  const activeClients = lojistaId ? await fetchActiveClients(lojistaId, 168) : []
  const colors = getPageHeaderColors('/crm');

  return (
    <div className="space-y-6">
      <IconPageHeader
        icon={Radar}
        title="Radar de Oportunidades"
        description={`${activeClients.length} cliente${activeClients.length !== 1 ? "s" : ""} ativo${activeClients.length !== 1 ? "s" : ""} na última semana`}
        gradientFrom={colors.from}
        gradientTo={colors.to}
        shadowColor={colors.shadow}
      />
      <CRMTable activeClients={activeClients} />
    </div>
  )
}
