"use client";

import { PageTransition } from "./PageTransition";
import type { ReactNode } from "react";

type PageWrapperProps = {
  children: ReactNode;
};

export function PageWrapper({ children }: PageWrapperProps) {
  return <PageTransition>{children}</PageTransition>;
}





















