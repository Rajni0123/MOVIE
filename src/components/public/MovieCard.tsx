"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Play } from "lucide-react";
import { Movie } from "@prisma/client";

interface MovieCardProps {
  movie: Movie;
}

export function MovieCard({ movie }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);
  
  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;

  // Clean title - remove year if present
  const cleanTitle = movie.title
    .replace(/\s*\(\d{4}\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <Link 
      href={`/movie/${movie.slug}`} 
      className="group block cursor-pointer transition-all hover:scale-105 active:scale-95"
    >
      <div className="relative overflow-hidden rounded-lg bg-card shadow-md hover:shadow-lg transition-shadow">
        {/* Poster */}
        <div className="relative aspect-[2/3] bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
          {movie.posterUrl && !imageError ? (
            <img
              src={movie.posterUrl}
              alt={cleanTitle}
              className="h-full w-full object-cover object-center transition-transform group-hover:scale-110"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <span className="text-3xl md:text-4xl">🎬</span>
            </div>
          )}

          {/* Rating Badge */}
          {movie.rating && parseFloat(String(movie.rating)) > 0 && (
            <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-md bg-black/80 backdrop-blur-sm px-1.5 py-0.5 md:right-2 md:top-2 md:gap-1 md:px-2 md:py-1">
              <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 md:h-3 md:w-3" />
              <span className="text-[10px] font-bold text-white md:text-xs">
                {Number(movie.rating).toFixed(1)}
              </span>
            </div>
          )}

          {/* Hover Overlay with Play Icon */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300">
              <div className="bg-primary/90 rounded-full p-3 md:p-4 shadow-lg">
                <Play className="h-6 w-6 md:h-8 md:w-8 text-white fill-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-2 md:p-3">
          <h3 className="line-clamp-2 text-xs font-semibold md:text-sm group-hover:text-primary transition-colors min-h-[2.5em]">
            {cleanTitle}
          </h3>
          {year && (
            <p className="mt-1 text-[10px] font-medium text-muted-foreground md:text-xs">
              {year}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
