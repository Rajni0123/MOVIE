"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import { VisitorTracker } from "@/components/public/VisitorTracker";
import { AdScriptsLoader } from "@/components/public/AdDisplay";

export function ClientComponentsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <VisitorTracker />
      </ErrorBoundary>
      <ErrorBoundary fallback={null}>
        <AdScriptsLoader />
      </ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
