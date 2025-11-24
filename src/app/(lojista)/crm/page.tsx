import { fetchActiveClients } from "@/lib/firestore/crm-queries"
import { getCurrentLojistaId } from "@/lib/auth/lojista-auth"
import { PageHeader } from "../components/page-header"
import { CRMTable } from "./crm-table"

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

  const activeClients = lojistaId ? await fetchActiveClients(lojistaId, 24) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Radar de Oportunidades"
        description={`${activeClients.length} cliente${activeClients.length !== 1 ? "s" : ""} ativo${activeClients.length !== 1 ? "s" : ""} nas últimas 24h`}
      />
      <CRMTable activeClients={activeClients} />
    </div>
  )
}
