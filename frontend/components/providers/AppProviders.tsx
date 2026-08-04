"use client";

import type { ReactNode } from "react";

import RouteGuard from "@/components/auth/RouteGuard";
import InstitutionalDataProvider from "@/context/InstitutionalDataContext";

export default function AppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <InstitutionalDataProvider>
      <RouteGuard>{children}</RouteGuard>
    </InstitutionalDataProvider>
  );
}
