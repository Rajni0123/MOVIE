"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";

interface ShareButtonProps {
  title: string;
  slug: string;
  movieId: number;
  initialShareCount?: number;
}

export function ShareButton({ title, slug, movieId, initialShareCount = 0 }: ShareButtonProps) {
  const [shareCount, setShareCount] = useState(initialShareCount);
  const [isSharing, setIsSharing] = useState(false);
  
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://moviehub.com'}/movie/${slug}`;
  const shareText = `Download ${title} - Free HD Movie`;
  
  const trackShare = async (platform: string) => {
    try {
      const res = await fetch(`/api/movies/${movieId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (data.success) {
        setShareCount(data.data.totalShares);
      }
    } catch (err) {
      console.error("Failed to track share:", err);
    }
  };
  
  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    
    try {
      // Check if native share is available (mobile browsers)
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: shareText,
            url: shareUrl,
          });
          // Track successful native share
          await trackShare("native");
        } catch (err: any) {
          // User cancelled or error - don't track cancellation
          if (err.name !== "AbortError") {
            console.debug("Share error:", err);
          }
        }
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        // Fallback: copy to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          await trackShare("copy");
          if (typeof window !== "undefined") {
            alert('Link copied to clipboard!');
          }
        } catch (err) {
          console.debug("Copy failed:", err);
          // Last resort: show URL in prompt
          if (typeof window !== "undefined") {
            prompt("Copy this link:", shareUrl);
            await trackShare("copy");
          }
        }
      } else {
        // Last resort: show URL in prompt
        if (typeof window !== "undefined") {
          prompt("Copy this link:", shareUrl);
          await trackShare("copy");
        }
      }
    } catch (error) {
      console.debug("Share handler error:", error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button 
      onClick={handleShare}
      disabled={isSharing}
      className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-green-500/50 bg-green-500/10 px-2 py-1 text-xs font-medium text-green-500 transition-colors hover:bg-green-500/20 active:scale-95 disabled:opacity-50 md:gap-1.5 md:px-3 md:py-1.5 md:text-sm"
    >
      <Share2 className="h-3 w-3 md:h-3.5 md:w-3.5" />
      Share
      {shareCount > 0 && (
        <span className="ml-0.5 rounded bg-green-500/20 px-1 py-0.5 text-[10px]">
          {shareCount}
        </span>
      )}
    </button>
  );
}
