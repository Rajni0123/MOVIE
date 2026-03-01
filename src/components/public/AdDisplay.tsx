"use client";

import { useEffect, useState, useRef } from "react";

interface AdSettings {
  popAdsEnabled?: boolean;
  popAdsCode?: string;
  propellerAdsEnabled?: boolean;
  propellerAdsCode?: string;
  adsterraEnabled?: boolean;
  adsterraBannerCode?: string;
  adsterraPopCode?: string;
  adsterraNativeCode?: string;
  headerBannerEnabled?: boolean;
  headerBannerCode?: string;
  sidebarBannerEnabled?: boolean;
  sidebarBannerCode?: string;
  footerBannerEnabled?: boolean;
  footerBannerCode?: string;
  inContentBannerEnabled?: boolean;
  inContentBannerCode?: string;
}

// Check if device is mobile
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Global ad scripts loader (runs once)
let globalAdsLoaded = false;

export function AdScriptsLoader() {
  const [settings, setSettings] = useState<AdSettings | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check device type
    setIsMobile(isMobileDevice());
    
    // Listen for resize
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (globalAdsLoaded) return;
    
    fetch("/api/ads")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSettings(data.data);
          globalAdsLoaded = true;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!settings) return;

    // Pop ads - works as pop-under, doesn't block navigation (all devices)
    if (settings.popAdsEnabled && settings.popAdsCode) {
      injectScript(settings.popAdsCode, "pop-ads");
    }

    // Propeller/Monetag - ONLY on desktop (was blocking mobile navigation)
    if (!isMobile && settings.propellerAdsEnabled && settings.propellerAdsCode) {
      injectScript(settings.propellerAdsCode, "propeller-ads");
    }

    // Adsterra pop - ONLY on desktop (was blocking mobile navigation)
    if (!isMobile && settings.adsterraEnabled && settings.adsterraPopCode) {
      injectScript(settings.adsterraPopCode, "adsterra-pop");
    }
  }, [settings, isMobile]);

  return null;
}

// Banner Ad Component - Desktop Only
interface BannerAdProps {
  position: "header" | "sidebar" | "footer" | "in-content";
  className?: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

export function BannerAd({ position, className = "", mobileOnly = false, desktopOnly = true }: BannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adCode, setAdCode] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(isMobileDevice());
    
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetch("/api/ads")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const settings = data.data;
          
          switch (position) {
            case "header":
              if (settings.headerBannerEnabled && settings.headerBannerCode) {
                setAdCode(settings.headerBannerCode);
              }
              break;
            case "sidebar":
              if (settings.sidebarBannerEnabled && settings.sidebarBannerCode) {
                setAdCode(settings.sidebarBannerCode);
              }
              break;
            case "footer":
              if (settings.footerBannerEnabled && settings.footerBannerCode) {
                setAdCode(settings.footerBannerCode);
              }
              break;
            case "in-content":
              if (settings.inContentBannerEnabled && settings.inContentBannerCode) {
                setAdCode(settings.inContentBannerCode);
              }
              // Also try adsterra banner
              else if (settings.adsterraEnabled && settings.adsterraBannerCode) {
                setAdCode(settings.adsterraBannerCode);
              }
              break;
          }
        }
      })
      .catch(() => {});
  }, [position]);

  useEffect(() => {
    if (!adCode || !containerRef.current) return;

    // Clear previous content
    containerRef.current.innerHTML = "";

    // Create a range and fragment to parse HTML
    const range = document.createRange();
    range.selectNode(document.body);
    const fragment = range.createContextualFragment(adCode);
    
    // Execute scripts
    const scripts = fragment.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      
      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      // Copy inline script content
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    containerRef.current.appendChild(fragment);
  }, [adCode]);

  // Don't render until mounted (to avoid hydration mismatch)
  if (!mounted) return null;
  
  // Check device restrictions
  if (desktopOnly && isMobile) return null;
  if (mobileOnly && !isMobile) return null;
  
  if (!adCode) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-container ad-${position} flex items-center justify-center ${className}`}
    />
  );
}

// Sidebar Ad Component - Desktop Only (for single movie page)
export function SidebarAd({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adCode, setAdCode] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsMobile(isMobileDevice());
    
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    fetch("/api/ads")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const settings = data.data;
          if (settings.sidebarBannerEnabled && settings.sidebarBannerCode) {
            setAdCode(settings.sidebarBannerCode);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!adCode || !containerRef.current) return;

    containerRef.current.innerHTML = "";

    const range = document.createRange();
    range.selectNode(document.body);
    const fragment = range.createContextualFragment(adCode);

    const scripts = fragment.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    containerRef.current.appendChild(fragment);
  }, [adCode]);

  // Don't render until mounted
  if (!mounted) return null;
  
  // Only show on desktop
  if (isMobile) return null;
  
  if (!adCode) return null;

  return (
    <div className={`sidebar-ad-container sticky top-4 ${className}`}>
      <div
        ref={containerRef}
        className="flex items-center justify-center rounded-lg bg-muted/30 p-2"
      />
    </div>
  );
}

// Native Ad Component (for Adsterra native)
export function NativeAd({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [adCode, setAdCode] = useState<string>("");

  useEffect(() => {
    fetch("/api/ads")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const settings = data.data;
          if (settings.adsterraEnabled && settings.adsterraNativeCode) {
            setAdCode(settings.adsterraNativeCode);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!adCode || !containerRef.current) return;

    containerRef.current.innerHTML = "";

    const range = document.createRange();
    range.selectNode(document.body);
    const fragment = range.createContextualFragment(adCode);

    const scripts = fragment.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.textContent) {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    containerRef.current.appendChild(fragment);
  }, [adCode]);

  if (!adCode) return null;

  return (
    <div
      ref={containerRef}
      className={`native-ad-container ${className}`}
    />
  );
}

// Helper function to inject scripts
function injectScript(code: string, id: string) {
  // Check if already injected
  if (document.getElementById(id)) return;

  const container = document.createElement("div");
  container.id = id;
  container.style.display = "none";

  const range = document.createRange();
  range.selectNode(document.body);
  const fragment = range.createContextualFragment(code);

  // Execute scripts
  const scripts = fragment.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    if (oldScript.textContent) {
      newScript.textContent = oldScript.textContent;
    }
    document.head.appendChild(newScript);
  });

  // Append non-script elements
  container.appendChild(fragment);
  document.body.appendChild(container);
}
