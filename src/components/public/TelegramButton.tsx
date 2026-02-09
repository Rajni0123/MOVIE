"use client";

import { Send } from "lucide-react";
import { useEffect, useState } from "react";

interface TelegramButtonProps {
  className?: string;
  defaultUrl?: string;
}

export function TelegramButton({ className = "", defaultUrl = "https://t.me/moviehub" }: TelegramButtonProps) {
  const [telegramUrl, setTelegramUrl] = useState<string>(defaultUrl);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Use default URL immediately for better UX
    setTelegramUrl(defaultUrl);
    
    // Try to fetch custom URL from settings
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data?.telegramUrl && data.data.telegramUrl.trim() !== "") {
          setTelegramUrl(data.data.telegramUrl);
        }
      })
      .catch((err) => {
        // Silently fail and use default URL
        console.log("Using default Telegram URL");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [defaultUrl]);

  // Always show the button, even if loading
  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-blue-500/50 bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-500/20 active:scale-95 md:gap-1.5 md:px-3 md:py-1.5 md:text-sm ${className} ${isLoading ? 'opacity-70' : ''}`}
    >
      <Send className="h-3 w-3 md:h-3.5 md:w-3.5" />
      Telegram
    </a>
  );
}
