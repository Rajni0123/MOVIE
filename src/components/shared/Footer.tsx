"use client";

import Link from "next/link";
import { Film, Clapperboard, Play, Tv, Star, Video } from "lucide-react";
import { useEffect, useState } from "react";

interface FooterSettings {
  siteName: string;
  siteDescription: string;
  logoType: string;
  logoText: string;
  logoUrl: string;
  logoIcon: string;
  telegramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  footerText: string;
}

interface FooterLink {
  id: number;
  label: string;
  url: string;
  sortOrder: number;
}

interface FooterLinks {
  quick_links: FooterLink[];
  legal: FooterLink[];
  genres: FooterLink[];
}

const iconMap: Record<string, React.ElementType> = {
  Film: Film,
  Clapperboard: Clapperboard,
  Play: Play,
  TV: Tv,
  Star: Star,
  Video: Video,
};

// Default links if none configured
const DEFAULT_QUICK_LINKS: FooterLink[] = [
  { id: 1, label: "Home", url: "/", sortOrder: 0 },
  { id: 2, label: "All Movies", url: "/movies", sortOrder: 1 },
  { id: 3, label: "Genres", url: "/genres", sortOrder: 2 },
  { id: 4, label: "Popular", url: "/popular", sortOrder: 3 },
];

const DEFAULT_LEGAL_LINKS: FooterLink[] = [
  { id: 5, label: "Privacy Policy", url: "/privacy", sortOrder: 0 },
  { id: 6, label: "Terms of Service", url: "/terms", sortOrder: 1 },
  { id: 7, label: "DMCA", url: "/dmca", sortOrder: 2 },
  { id: 8, label: "Contact Us", url: "/contact", sortOrder: 3 },
];

const DEFAULT_GENRE_LINKS: FooterLink[] = [
  { id: 9, label: "Action", url: "/genres/action", sortOrder: 0 },
  { id: 10, label: "Comedy", url: "/genres/comedy", sortOrder: 1 },
  { id: 11, label: "Drama", url: "/genres/drama", sortOrder: 2 },
  { id: 12, label: "Horror", url: "/genres/horror", sortOrder: 3 },
];

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [settings, setSettings] = useState<FooterSettings>({
    siteName: "MovieHub",
    siteDescription: "Discover and download movies for free. Browse our collection of movies with high-quality download links.",
    logoType: "text",
    logoText: "MovieHub",
    logoUrl: "",
    logoIcon: "Film",
    telegramUrl: "",
    twitterUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    footerText: `© ${currentYear} MovieHub. All rights reserved.`,
  });

  const [footerLinks, setFooterLinks] = useState<FooterLinks>({
    quick_links: DEFAULT_QUICK_LINKS,
    legal: DEFAULT_LEGAL_LINKS,
    genres: DEFAULT_GENRE_LINKS,
  });

  useEffect(() => {
    // Fetch settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setSettings((prev) => ({
            ...prev,
            siteName: data.data.siteName || prev.siteName,
            siteDescription: data.data.siteDescription || prev.siteDescription,
            logoType: data.data.logoType || "text",
            logoText: data.data.logoText || data.data.siteName || prev.logoText,
            logoUrl: data.data.logoUrl || "",
            logoIcon: data.data.logoIcon || "Film",
            telegramUrl: data.data.telegramUrl || "",
            twitterUrl: data.data.twitterUrl || "",
            facebookUrl: data.data.facebookUrl || "",
            instagramUrl: data.data.instagramUrl || "",
            footerText: data.data.footerText || prev.footerText,
          }));
        }
      })
      .catch(() => {});

    // Fetch footer links
    fetch("/api/footer-links")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setFooterLinks({
            quick_links: data.data.quick_links?.length > 0 ? data.data.quick_links : DEFAULT_QUICK_LINKS,
            legal: data.data.legal?.length > 0 ? data.data.legal : DEFAULT_LEGAL_LINKS,
            genres: data.data.genres?.length > 0 ? data.data.genres : DEFAULT_GENRE_LINKS,
          });
        }
      })
      .catch(() => {});
  }, []);

  const LogoIcon = iconMap[settings.logoIcon] || Film;

  return (
    <footer className="border-t bg-background">
      <div className="container py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              {settings.logoType === "image" && settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.logoText || settings.siteName}
                  className="h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <>
                  <LogoIcon className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">{settings.logoText || settings.siteName}</span>
                </>
              )}
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              {settings.siteDescription}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {footerLinks.quick_links.map((link) => (
                <li key={link.id}>
                  {link.url.startsWith("http") ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.url}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h3 className="mb-4 font-semibold">Popular Genres</h3>
            <ul className="space-y-2 text-sm">
              {footerLinks.genres.map((link) => (
                <li key={link.id}>
                  {link.url.startsWith("http") ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.url}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Social */}
          <div>
            <h3 className="mb-4 font-semibold">Legal</h3>
            <ul className="space-y-2 text-sm">
              {footerLinks.legal.map((link) => (
                <li key={link.id}>
                  {link.url.startsWith("http") ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.url}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>

            {/* Social Links */}
            {(settings.twitterUrl || settings.facebookUrl || settings.instagramUrl) && (
              <div className="mt-4 flex gap-3">
                {settings.twitterUrl && (
                  <a
                    href={settings.twitterUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Twitter
                  </a>
                )}
                {settings.facebookUrl && (
                  <a
                    href={settings.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Facebook
                  </a>
                )}
                {settings.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Instagram
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>{settings.footerText}</p>
        </div>
      </div>
    </footer>
  );
}
