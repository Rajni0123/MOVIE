import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { generateDefaultMetadata } from "@/lib/seo/meta-generator";
import { ClientComponentsWrapper } from "@/components/shared/ClientComponentsWrapper";
import { VerificationMetaTags } from "@/components/shared/VerificationMetaTags";
import { AdScriptsHead } from "@/components/shared/AdScriptsHead";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...generateDefaultMetadata(),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MovPix",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <VerificationMetaTags />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased overscroll-none`}
        suppressHydrationWarning
      >
        {/* Server-side ad scripts for verification */}
        <AdScriptsHead />
        <ClientComponentsWrapper>
          {children}
        </ClientComponentsWrapper>
      </body>
    </html>
  );
}
