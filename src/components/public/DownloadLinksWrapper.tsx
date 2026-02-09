"use client";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { DownloadLinks } from "./DownloadLinks";

interface DownloadLink {
  id: number;
  linkUrl: string;
  quality: string | null;
  language: string | null;
  sourceName: string;
}

interface DownloadLinksWrapperProps {
  links: DownloadLink[];
  movieTitle?: string;
}

export function DownloadLinksWrapper({ links, movieTitle }: DownloadLinksWrapperProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            Something went wrong loading download links.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-primary hover:underline"
          >
            Reload Page
          </button>
        </div>
      }
    >
      <DownloadLinks links={links} movieTitle={movieTitle} />
    </ErrorBoundary>
  );
}
