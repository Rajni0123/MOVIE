import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import { MobileNav } from "@/components/shared/MobileNav";
import { Badge } from "@/components/ui/badge";
import { Star, Play, Calendar, Clock, User, Download, Film, Images, Tag } from "lucide-react";
import { ShareButton } from "@/components/public/ShareButton";
import { TelegramButton } from "@/components/public/TelegramButton";
import { DownloadLinksWrapper } from "@/components/public/DownloadLinksWrapper";
import { ViewTracker } from "@/components/public/ViewTracker";
import { BannerAd, SidebarAd } from "@/components/public/AdDisplay";
import prisma from "@/lib/db/prisma";
import { generateMovieMetadata } from "@/lib/seo/meta-generator";
import { generateMovieSchema, schemaToScript } from "@/lib/seo/schema-generator";
import { formatDate, formatRuntime } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Keyword tag component for SEO
function KeywordTag({ text }: { text: string }) {
  const searchQuery = encodeURIComponent(text);
  return (
    <Link
      href={`/search?q=${searchQuery}`}
      className="rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:px-2.5 md:py-1 md:text-xs"
    >
      {text}
    </Link>
  );
}


interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

async function getMovie(slug: string, allowDraft: boolean = false) {
  // If preview mode, allow DRAFT and PUBLISHED
  if (allowDraft) {
    return prisma.movie.findFirst({
      where: {
        slug,
        status: { in: ["PUBLISHED", "DRAFT"] }
      },
      include: {
        streamingLinks: {
          where: { isActive: true },
          orderBy: { priority: "desc" },
        },
      },
    });
  }

  return prisma.movie.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      streamingLinks: {
        where: { isActive: true },
        orderBy: { priority: "desc" },
      },
    },
  });
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;
  const movie = await getMovie(slug, preview === "true");

  if (!movie) {
    return { title: "Movie Not Found" };
  }

  // Parse genres for keywords
  let genres: string[] = [];
  try {
    genres = movie.genres ? JSON.parse(movie.genres) : [];
  } catch {
    genres = [];
  }

  return generateMovieMetadata(movie, genres);
}

export default async function MoviePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "true";
  const movie = await getMovie(slug, isPreview);

  if (!movie) {
    notFound();
  }

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;

  // Clean title - remove year if present (since we show it separately)
  const cleanTitle = movie.title
    .replace(/\s*\(\d{4}\)\s*/g, " ")  // Remove (2025) etc
    .replace(/\s+/g, " ")
    .trim();

  // Parse JSON strings from SQLite
  let genres: string[] = [];
  let cast: { name: string; character?: string }[] = [];
  let screenshots: string[] = [];
  
  try {
    genres = movie.genres ? JSON.parse(movie.genres) : [];
  } catch { genres = []; }
  
  try {
    cast = movie.cast ? JSON.parse(movie.cast) : [];
  } catch { cast = []; }
  
  try {
    screenshots = movie.screenshots ? JSON.parse(movie.screenshots) : [];
  } catch { screenshots = []; }

  const schema = generateMovieSchema(movie);

  // Download links
  const downloadLinks = movie.streamingLinks;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Preview Banner for Draft Movies */}
      {isPreview && movie.status === "DRAFT" && (
        <div className="bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-black">
          ⚠️ Preview Mode - This movie is not published yet. Only admins can see this page.
        </div>
      )}

      {/* Track view for popularity */}
      <ViewTracker movieId={movie.id} />

      {/* Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaToScript(schema) }}
      />

      {/* Backdrop - Use poster stretched if no backdrop available */}
      <div className="relative h-[30vh] w-full md:h-[40vh] overflow-hidden">
        {movie.backdropUrl ? (
          <img
            src={movie.backdropUrl}
            alt={cleanTitle}
            className="h-full w-full object-cover"
          />
        ) : movie.posterUrl ? (
          /* Use poster as backdrop - stretched and blurred for cinematic effect */
          <div className="relative h-full w-full">
            <img
              src={movie.posterUrl}
              alt={cleanTitle}
              className="absolute inset-0 h-full w-full object-cover blur-sm scale-110"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
        ) : (
          <div className="h-full w-full bg-gradient-to-b from-slate-800 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative -mt-20 pb-6 md:-mt-32 md:pb-12">
        {/* Mobile: Poster + Title Row */}
        <div className="flex gap-3 md:hidden">
          <div className="w-36 flex-shrink-0">
            <div className="aspect-[2/3] overflow-hidden rounded-lg shadow-xl bg-muted">
              {movie.posterUrl ? (
                <img 
                  src={movie.posterUrl} 
                  alt={cleanTitle} 
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Film className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 flex flex-col pt-2">
            <h1 className="text-lg font-bold leading-tight">
              {cleanTitle}
              {year && <span className="text-muted-foreground"> ({year})</span>}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              {movie.rating && (
                <div className="flex items-center gap-1 rounded bg-yellow-500/20 px-2 py-0.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  <span className="font-bold text-yellow-500">{Number(movie.rating).toFixed(1)}</span>
                </div>
              )}
              {movie.runtime && (
                <span className="text-muted-foreground">{formatRuntime(movie.runtime)}</span>
              )}
            </div>
            {/* Genres - Mobile */}
            {genres.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="secondary" className="px-2 py-0.5 text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Action Buttons - Right side of poster, horizontal row */}
            <div className="mt-auto pt-3 flex items-center gap-1.5 flex-nowrap overflow-x-auto">
              {/* Trailer Button */}
              {movie.trailerUrl && (
                <a 
                  href={movie.trailerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-red-500/50 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500 active:scale-95"
                >
                  <Play className="h-3 w-3" />
                  Trailer
                </a>
              )}
              {/* Telegram Button */}
              <TelegramButton />
              {/* Share Button */}
              <ShareButton 
                title={movie.title} 
                slug={movie.slug} 
                movieId={movie.id}
                initialShareCount={movie.shareCount}
              />
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden gap-8 md:grid lg:grid-cols-[280px_1fr]">
          {/* Poster */}
          <div>
            <div className="aspect-[2/3] overflow-hidden rounded-xl shadow-2xl bg-muted">
              {movie.posterUrl ? (
                <img 
                  src={movie.posterUrl} 
                  alt={cleanTitle} 
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Film className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Quick Stats under poster */}
            <div className="mt-4 space-y-2">
              {movie.rating && Number(movie.rating) > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-yellow-500/10 p-3">
                  <span className="text-sm text-muted-foreground">IMDB Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-yellow-500">{Number(movie.rating).toFixed(1)}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg bg-blue-500/10 p-3">
                <span className="text-sm text-muted-foreground">Quality</span>
                <span className="font-medium text-blue-500">HD 1080p</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
                <span className="text-sm text-muted-foreground">Audio</span>
                <span className="font-medium text-green-500">Hindi / English</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-5">
            {/* Title & Rating */}
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                {cleanTitle}
                {year && <span className="ml-2 text-muted-foreground">({year})</span>}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {movie.rating && (
                  <div className="flex items-center gap-1 rounded-lg bg-yellow-500/20 px-3 py-1.5">
                    <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-bold text-yellow-500">{Number(movie.rating).toFixed(1)}/10</span>
                  </div>
                )}
                {movie.releaseDate && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(movie.releaseDate)}</span>
                  </div>
                )}
                {movie.runtime && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatRuntime(movie.runtime)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <Badge key={genre} variant="secondary" className="px-3 py-1">{genre}</Badge>
                ))}
              </div>
            )}

            {/* Available Qualities */}
            <div className="rounded-lg border bg-card/50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">AVAILABLE IN</h3>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-bold text-white">4K Ultra HD</span>
                <span className="rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1 text-xs font-bold text-white">1080p Full HD</span>
                <span className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 px-3 py-1 text-xs font-bold text-white">720p HD</span>
                <span className="rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 px-3 py-1 text-xs font-bold text-white">480p</span>
              </div>
            </div>

            {/* Description */}
            {movie.description ? (
              <div>
                <h2 className="mb-3 text-xl font-semibold">Storyline</h2>
                <p className="leading-relaxed text-muted-foreground">{movie.description}</p>
              </div>
            ) : (
              <div>
                <h2 className="mb-3 text-xl font-semibold">About {cleanTitle}</h2>
                <p className="leading-relaxed text-muted-foreground">
                  <strong>{cleanTitle}</strong> ({year}) is a captivating {genres.length > 0 ? genres[0].toLowerCase() : "movie"} that 
                  promises an unforgettable viewing experience. {movie.director && `Directed by ${movie.director}, `}this film 
                  delivers exceptional entertainment with stunning visuals and engaging storytelling. 
                  Download now in your preferred quality - 480p, 720p, or 1080p Full HD.
                </p>
              </div>
            )}

            {/* Movie Info Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {movie.director && (
                <div className="rounded-lg border bg-card/50 p-3 text-center">
                  <User className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Director</p>
                  <p className="text-sm font-medium truncate">{movie.director}</p>
                </div>
              )}
              {movie.runtime && (
                <div className="rounded-lg border bg-card/50 p-3 text-center">
                  <Clock className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{formatRuntime(movie.runtime)}</p>
                </div>
              )}
              {year && (
                <div className="rounded-lg border bg-card/50 p-3 text-center">
                  <Calendar className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="text-xs text-muted-foreground">Year</p>
                  <p className="text-sm font-medium">{year}</p>
                </div>
              )}
              <div className="rounded-lg border bg-card/50 p-3 text-center">
                <Download className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="text-xs text-muted-foreground">Downloads</p>
                <p className="text-sm font-medium">{movie.viewCount || 0}+</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Trailer Button */}
              {movie.trailerUrl && (
                <a 
                  href={movie.trailerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
                >
                  <Play className="h-4 w-4" />
                  Watch Trailer
                </a>
              )}

              {/* Telegram Button */}
              <TelegramButton />

              {/* Share Button */}
              <ShareButton 
                title={movie.title} 
                slug={movie.slug} 
                movieId={movie.id}
                initialShareCount={movie.shareCount}
              />
            </div>

            {/* Quick Info Tags */}
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <span className="rounded-full bg-muted px-3 py-1 text-xs">🎬 {genres[0] || "Movie"}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs">🌐 Hindi / English</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs">📁 MKV / MP4</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs">🎧 Dual Audio</span>
              {movie.runtime && <span className="rounded-full bg-muted px-3 py-1 text-xs">⏱️ {movie.runtime} min</span>}
            </div>
          </div>
        </div>

        {/* Mobile: Description */}
        {movie.description && (
          <div className="mt-6 md:hidden">
            <h2 className="mb-2 text-lg font-semibold">Storyline</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{movie.description}</p>
          </div>
        )}

        {/* Main Content + Sidebar Layout for Desktop */}
        <div className="mt-6 flex gap-8 md:mt-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Ad before Download - Desktop Only */}
            <div className="mb-6 hidden md:block">
              <BannerAd position="in-content" className="mx-auto" />
            </div>

            {/* Download Section */}
            <div className="w-full overflow-hidden rounded-xl border bg-card p-4 md:p-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold md:mb-4 md:text-xl">
                <Download className="h-5 w-5" />
                Download Links
              </h2>
              <div className="w-full overflow-hidden">
                <DownloadLinksWrapper links={downloadLinks} movieTitle={movie.title} />
              </div>
            </div>

            {/* Cast Section */}
            {cast.length > 0 && (
              <div className="mt-6 md:mt-8">
                <h2 className="mb-2 text-lg font-bold md:mb-3 md:text-xl">Cast</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0">
                  {cast.map((member, index) => (
                    <span
                      key={index}
                      className="flex-shrink-0 rounded-full bg-muted px-3 py-1 text-xs md:text-sm"
                    >
                      {member.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Screenshots Section */}
            {screenshots.length > 0 && (
              <div className="mt-6 md:mt-8">
                <h2 className="mb-2 flex items-center gap-2 text-lg font-bold md:mb-3 md:text-xl">
                  <Images className="h-4 w-4 md:h-5 md:w-5" />
                  Screenshots
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {screenshots.map((image, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 overflow-hidden rounded-lg"
                    >
                      <img
                        src={image}
                        alt={`${movie.title} Screenshot ${index + 1}`}
                        className="h-20 w-32 object-cover md:h-24 md:w-40"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Movie Specifications - Desktop Only */}
            <div className="mt-6 hidden rounded-xl border bg-card p-4 md:mt-8 md:block md:p-6">
              <h2 className="mb-4 text-lg font-bold">Movie Specifications</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Movie Name</span>
                    <span className="font-medium">{cleanTitle}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Release Year</span>
                    <span className="font-medium">{year || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Quality</span>
                    <span className="font-medium">480p, 720p, 1080p</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-medium">MKV / MP4</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Audio</span>
                    <span className="font-medium">Hindi, English</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Subtitles</span>
                    <span className="font-medium">English</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Runtime</span>
                    <span className="font-medium">{movie.runtime ? `${movie.runtime} min` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Director</span>
                    <span className="font-medium">{movie.director || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* How to Download - Desktop Only */}
            <div className="mt-6 hidden rounded-xl border bg-gradient-to-br from-primary/5 to-transparent p-4 md:mt-8 md:block md:p-6">
              <h2 className="mb-4 text-lg font-bold">How to Download {cleanTitle}</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                  <p>Click on your preferred quality download link (480p, 720p, or 1080p)</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                  <p>Wait for the page to load and click the download button</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                  <p>Your download will start automatically. Enjoy {cleanTitle}!</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-yellow-500/10 p-3 text-xs text-yellow-600 dark:text-yellow-400">
                <strong>Note:</strong> Use a download manager like IDM for faster downloads. If links don&apos;t work, try a different quality or refresh the page.
              </div>
            </div>

            {/* Movie Highlights - Desktop Only */}
            {(movie.rating || genres.length > 0) && (
              <div className="mt-6 hidden rounded-xl border bg-card p-4 md:mt-8 md:block md:p-6">
                <h2 className="mb-4 text-lg font-bold">Why Watch {cleanTitle}?</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {movie.rating && Number(movie.rating) > 0 && (
                    <div className="rounded-lg bg-yellow-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                        <span className="font-bold text-yellow-600">{Number(movie.rating).toFixed(1)}/10 Rating</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Highly rated by critics and audiences</p>
                    </div>
                  )}
                  {genres.length > 0 && (
                    <div className="rounded-lg bg-blue-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <Film className="h-5 w-5 text-blue-500" />
                        <span className="font-bold text-blue-600">{genres[0]} Movie</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Perfect for {genres[0].toLowerCase()} lovers</p>
                    </div>
                  )}
                  {movie.runtime && (
                    <div className="rounded-lg bg-green-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-500" />
                        <span className="font-bold text-green-600">{movie.runtime} Minutes</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Engaging runtime with no filler</p>
                    </div>
                  )}
                  {year && (
                    <div className="rounded-lg bg-purple-500/10 p-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-500" />
                        <span className="font-bold text-purple-600">{year} Release</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">Latest cinematic experience</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Ads - Desktop Only */}
          <div className="hidden w-[300px] flex-shrink-0 lg:block">
            <SidebarAd className="mb-4" />
            <div className="sticky top-20">
              <BannerAd position="sidebar" className="mb-4" />
              <BannerAd position="sidebar" className="mt-4" />
            </div>
          </div>
        </div>

        {/* SEO Content Section - Auto Generated */}
        <div className="mt-8 border-t pt-6 md:mt-10 md:pt-8">
          <h2 className="mb-4 text-lg font-bold md:text-xl">
            About {cleanTitle} {year && `(${year})`}
          </h2>
          <div className="space-y-4 text-sm text-muted-foreground md:text-base">
            <p>
              <strong>{cleanTitle}</strong> is {year ? `a ${year}` : "an"} {genres.length > 0 ? genres.slice(0, 2).join(" and ") : "entertainment"} movie 
              {movie.director ? ` directed by ${movie.director}` : ""} that has captivated audiences worldwide. 
              {movie.runtime ? ` With a runtime of ${movie.runtime} minutes,` : ""} this {genres[0]?.toLowerCase() || "film"} delivers 
              an unforgettable cinematic experience that keeps viewers engaged from start to finish.
            </p>
            
            <p>
              <strong>{cleanTitle}</strong> is available in multiple video qualities including 480p, 720p, and 1080p Full HD. 
              The movie can be enjoyed on various devices from mobile phones to large screen televisions.
              {year && ` ${cleanTitle} (${year}) has gained significant popularity among movie enthusiasts.`}
            </p>

            {genres.length > 0 && (
              <p>
                As a {genres.join(", ")} movie, <strong>{cleanTitle}</strong> stands out with its compelling storyline 
                and impressive performances. Fans of {genres[0]} movies will definitely appreciate what this film has to offer. 
                {movie.rating && Number(movie.rating) > 0 ? ` With a rating of ${movie.rating}/10, it has received positive reviews from critics and audiences alike.` : ""}
              </p>
            )}

            <p>
              <strong>{cleanTitle}</strong> is available in Hindi, English, and Dual Audio formats. 
              This page provides complete information about the movie including cast, storyline, and technical details.
              {year && ` Explore everything about ${cleanTitle} ${year} on this page.`}
            </p>
          </div>

          {/* Hashtags Section */}
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
              Trending Hashtags
            </h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-primary">#{cleanTitle.replace(/\s+/g, "")}</span>
              {year && <span className="text-primary">#{cleanTitle.replace(/\s+/g, "")}{year}</span>}
              <span className="text-primary">#Movies</span>
              <span className="text-primary">#HDMovies</span>
              <span className="text-primary">#Cinema</span>
              {genres.slice(0, 2).map((genre) => (
                <span key={genre} className="text-primary">#{genre.replace(/\s+/g, "")}Movies</span>
              ))}
              {year && <span className="text-primary">#{year}Movies</span>}
              <span className="text-primary">#FullMovie</span>
              <span className="text-primary">#MovieReview</span>
              {movie.director && <span className="text-primary">#{movie.director.replace(/\s+/g, "")}</span>}
              <span className="text-primary">#Bollywood</span>
              <span className="text-primary">#Hollywood</span>
              <span className="text-primary">#LatestMovies</span>
              <span className="text-primary">#Entertainment</span>
            </div>
          </div>
        </div>

        {/* Keywords/Tags Section - Auto Generated */}
        <div className="mt-8 border-t pt-6 md:mt-10 md:pt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground md:text-base">
            <Tag className="h-4 w-4" />
            Related Keywords
          </h2>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {/* Movie title keywords */}
            <KeywordTag text={`${cleanTitle} download`} />
            <KeywordTag text={`${cleanTitle} full movie`} />
            <KeywordTag text={`download ${cleanTitle}`} />
            {year && <KeywordTag text={`${cleanTitle} ${year}`} />}
            
            {/* Quality keywords */}
            <KeywordTag text={`${cleanTitle} 480p`} />
            <KeywordTag text={`${cleanTitle} 720p`} />
            <KeywordTag text={`${cleanTitle} 1080p`} />
            <KeywordTag text={`${cleanTitle} HD`} />
            
            {/* Language keywords */}
            <KeywordTag text={`${cleanTitle} Hindi`} />
            <KeywordTag text={`${cleanTitle} English`} />
            <KeywordTag text={`${cleanTitle} dual audio`} />
            
            {/* Genre keywords */}
            {genres.slice(0, 3).map((genre) => (
              <KeywordTag key={genre} text={`${genre} movies download`} />
            ))}
            
            {/* Year keywords */}
            {year && (
              <>
                <KeywordTag text={`${year} movies`} />
                <KeywordTag text={`best movies ${year}`} />
              </>
            )}
            
            {/* Director keywords */}
            {movie.director && <KeywordTag text={`${movie.director} movies`} />}
            
            {/* General keywords */}
            <KeywordTag text="free movie download" />
            <KeywordTag text="HD movies" />
          </div>
        </div>
      </div>

      {/* Footer Ad - Desktop Only */}
      <div className="container py-4 hidden md:block">
        <BannerAd position="footer" className="mx-auto" desktopOnly={true} />
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
      {/* Bottom padding for mobile nav */}
      <div className="h-20 md:hidden" suppressHydrationWarning />
    </div>
  );
}
