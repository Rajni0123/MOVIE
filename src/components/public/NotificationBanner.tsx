"use client";

import { useState, useEffect } from "react";
import { X, Bell, AlertTriangle, CheckCircle, Info, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  linkUrl?: string;
  linkText?: string;
}

const typeStyles: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: <Info className="h-4 w-4 text-blue-500" />,
  },
  warning: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  },
  success: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
  error: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
  },
};

export function NotificationBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load dismissed notifications from localStorage
    const stored = localStorage.getItem("dismissedNotifications");
    if (stored) {
      setDismissed(JSON.parse(stored));
    }

    // Fetch notifications
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setNotifications(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const dismissNotification = (id: number) => {
    const newDismissed = [...dismissed, id];
    setDismissed(newDismissed);
    localStorage.setItem("dismissedNotifications", JSON.stringify(newDismissed));
  };

  // Filter out dismissed notifications
  const visibleNotifications = notifications.filter(
    (n) => !dismissed.includes(n.id)
  );

  if (loading || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 px-2 pt-2 md:px-0 md:pt-0">
      {visibleNotifications.map((notification) => {
        const style = typeStyles[notification.type] || typeStyles.info;
        
        return (
          <div
            key={notification.id}
            className={`relative flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} px-3 py-2.5 md:px-4 md:py-3`}
          >
            <div className="flex-shrink-0 pt-0.5">{style.icon}</div>
            
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{notification.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground md:text-sm">
                {notification.message}
              </p>
              {notification.linkUrl && (
                <Link
                  href={notification.linkUrl}
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline md:text-sm"
                >
                  {notification.linkText || "Learn more"}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

            <button
              onClick={() => dismissNotification(notification.id)}
              className="flex-shrink-0 rounded-full p-1 hover:bg-foreground/10"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
