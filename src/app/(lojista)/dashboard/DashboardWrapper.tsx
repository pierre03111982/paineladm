"use client";

import { PageTransition } from "@/components/ui/PageTransition";
import { DashboardContent } from "../../dashboard/components/DashboardContent";
import type { DashboardMock } from "@/lib/mocks/dashboard";

type DashboardWrapperProps = {
  data: DashboardMock;
  lojistaId?: string;
};

export function DashboardWrapper({ data, lojistaId }: DashboardWrapperProps) {
  return (
    <PageTransition>
      <DashboardContent data={data} lojistaId={lojistaId} />
    </PageTransition>
  );
}





















