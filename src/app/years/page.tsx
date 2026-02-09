import Link from "next/link";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

const currentYear = new Date().getFullYear();

export const metadata = {
  title: "Browse Movies by Year - Download HD Movies | MovieHub",
  description: `Browse and download movies by release year. Find movies from 1980 to ${currentYear} for free in HD quality (480p, 720p, 1080p).`,
  keywords: `movies by year, ${currentYear} movies, ${currentYear - 1} movies, yearly movies, movie archive, download movies by year, HD movies by year`,
};

// Generate years from current year to 1980
function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 1980; year--) {
    years.push(year);
  }
  return years;
}

export default function YearsPage() {
  const years = getYears();
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6 md:py-12">
          <div className="mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold md:text-3xl">Browse by Year</h1>
          </div>

          {/* Recent Years - Featured */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-muted-foreground">Recent Years</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 md:gap-3 lg:grid-cols-8">
              {years.slice(0, 8).map((year) => (
                <Link
                  key={year}
                  href={`/years/${year}`}
                  className="flex flex-col items-center justify-center rounded-xl border bg-card p-4 transition-all hover:border-primary hover:bg-primary/5 active:scale-95 md:p-6"
                >
                  <span className="text-xl font-bold md:text-2xl">{year}</span>
                  {year === currentYear && (
                    <span className="mt-1 text-[10px] text-primary md:text-xs">Latest</span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* All Years */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-muted-foreground">All Years</h2>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-8 md:gap-3 lg:grid-cols-10">
              {years.slice(8).map((year) => (
                <Link
                  key={year}
                  href={`/years/${year}`}
                  className="flex items-center justify-center rounded-lg border bg-card px-3 py-2 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5 active:scale-95 md:px-4 md:py-3"
                >
                  {year}
                </Link>
              ))}
            </div>
          </div>

          {/* Decades Quick Links */}
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-muted-foreground">Browse by Decade</h2>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {["2020s", "2010s", "2000s", "1990s", "1980s"].map((decade) => (
                <Link
                  key={decade}
                  href={`/years?decade=${decade}`}
                  className="rounded-full border bg-card px-4 py-2 text-sm font-medium transition-all hover:border-primary hover:bg-primary/5 active:scale-95"
                >
                  {decade}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
      <div className="h-16 md:hidden" suppressHydrationWarning />
    </div>
  );
}
