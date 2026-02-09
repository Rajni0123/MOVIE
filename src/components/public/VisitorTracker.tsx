"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Generate UUID fallback if crypto.randomUUID is not available
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function VisitorTracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
      return;
    }

    try {
      // Get or create session ID
      let sessionId = sessionStorage.getItem("visitor_session_id");
      if (!sessionId) {
        sessionId = generateUUID();
        try {
          sessionStorage.setItem("visitor_session_id", sessionId);
        } catch (e) {
          // Storage might be full or unavailable
          console.debug("Could not save session ID");
        }
      }
      sessionIdRef.current = sessionId;

      // Send initial heartbeat
      sendHeartbeat(sessionId, pathname);

      // Set up interval for heartbeats
      const interval = setInterval(() => {
        if (sessionIdRef.current) {
          sendHeartbeat(sessionIdRef.current, pathname);
        }
      }, HEARTBEAT_INTERVAL);

      // Cleanup on unmount
      return () => {
        clearInterval(interval);
      };
    } catch (error) {
      // Silently fail if any error occurs
      console.debug("Visitor tracking error:", error);
    }
  }, [pathname]);

  // Send heartbeat when page changes
  useEffect(() => {
    if (sessionIdRef.current) {
      sendHeartbeat(sessionIdRef.current, pathname);
    }
  }, [pathname]);

  return null;
}

async function sendHeartbeat(sessionId: string, page: string) {
  try {
    await fetch("/api/analytics/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, page }),
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience
    console.debug("Heartbeat failed:", error);
  }
}
