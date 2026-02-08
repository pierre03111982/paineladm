"use client";

import { PageTransition } from "@/components/ui/PageTransition";
import { DashboardContent } from "@/app/dashboard/components/DashboardContent";
import type { DashboardMock } from "@/lib/mocks/dashboard";

type DashboardWrapperProps = {
  data: DashboardMock;
  lojistaId?: string;
  lojaLogo?: string | null;
  lojaNome?: string;
  initials?: string;
};

export function DashboardWrapper({ data, lojistaId, lojaLogo, lojaNome, initials }: DashboardWrapperProps) {
  return (
    <PageTransition>
      <DashboardContent
        data={data}
        lojistaId={lojistaId}
        lojaLogo={lojaLogo}
        lojaNome={lojaNome}
        initials={initials}
      />
    </PageTransition>
  );
}
