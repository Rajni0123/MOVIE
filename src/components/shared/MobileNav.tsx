"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Search, Flame, Calendar, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Home", matchExact: true },
  { href: "/movies", icon: Film, label: "Movies", matchExact: false },
  { href: "/genres", icon: Layers, label: "Genre", matchExact: false },
  { href: "/years", icon: Calendar, label: "Years", matchExact: false },
  { href: "/popular", icon: Flame, label: "Popular", matchExact: true },
];

export function MobileNav() {
  const pathname = usePathname();

  const isActiveRoute = (href: string, matchExact: boolean) => {
    if (matchExact) {
      return pathname === href;
    }
    // For /movies, also match /movie/[slug]
    if (href === "/movies") {
      return pathname === "/movies" || pathname.startsWith("/movie/");
    }
    // For /years, also match /years/[year]
    if (href === "/years") {
      return pathname === "/years" || pathname.startsWith("/years/");
    }
    // For /genres, also match /genres/[genre]
    if (href === "/genres") {
      return pathname === "/genres" || pathname.startsWith("/genres/");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around" suppressHydrationWarning>
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.href, item.matchExact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-all duration-200 active:scale-90",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute -top-0.5 h-0.5 w-8 rounded-full bg-primary" />
              )}
              <div 
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}
                suppressHydrationWarning
              >
                <item.icon 
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "scale-110"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={cn(
                "transition-all duration-200",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
