import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://movpix.xyz";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Allow all major search engines
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      {
        userAgent: "Googlebot-Image",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      {
        userAgent: "Slurp", // Yahoo
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      {
        userAgent: "DuckDuckBot",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      {
        userAgent: "Baiduspider",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      {
        userAgent: "YandexBot",
        allow: "/",
        disallow: ["/admin/", "/api/admin/"],
      },
      // Default rule for all other crawlers
      {
        userAgent: "*",
        allow: [
          "/",
          "/movie/",
          "/movies",
          "/genres",
          "/genres/",
          "/years",
          "/years/",
          "/search",
        ],
        disallow: [
          "/admin/",
          "/api/admin/",
          "/api/auth/",
          "/*?*", // Block URL parameters to avoid duplicate content
          "/404",
          "/500",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
