"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  movieId: number;
}

export function ViewTracker({ movieId }: ViewTrackerProps) {
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
      return;
    }

    try {
      // Track view only once per session per movie
      const viewedKey = `viewed_movie_${movieId}`;
      const alreadyViewed = sessionStorage.getItem(viewedKey);

      if (!alreadyViewed) {
        // Send view tracking request
        fetch(`/api/movies/${movieId}/view`, {
          method: "POST",
        })
          .then(() => {
            // Mark as viewed in this session
            try {
              sessionStorage.setItem(viewedKey, "true");
            } catch (e) {
              // Silently fail if storage is unavailable
              console.debug("Could not save view tracking");
            }
          })
          .catch((err) => {
            // Silently fail - don't disrupt user experience
            console.debug("Failed to track view:", err);
          });
      }
    } catch (error) {
      // Silently fail if any error occurs
      console.debug("View tracking error:", error);
    }
  }, [movieId]);

  // This component doesn't render anything
  return null;
}
