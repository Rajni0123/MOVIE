import { Movie, StreamingLink, SeoIndexStatus } from "@prisma/client";

export type MovieWithRelations = Movie & {
  streamingLinks?: StreamingLink[];
  seoIndexStatus?: SeoIndexStatus | null;
};

export interface MovieFormData {
  title: string;
  slug?: string;
  description?: string;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  cast?: CastMember[];
  director?: string;
  rating?: number;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  status?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  metaTitle?: string;
  metaDescription?: string;
  tmdbId?: string;
  imdbId?: string;
}

export interface CastMember {
  name: string;
  character?: string;
  profilePath?: string;
}

export interface MovieFilters {
  status?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
  genre?: string;
  year?: number;
  search?: string;
}

export interface PaginatedMovies {
  movies: MovieWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  imdb_id?: string;
}

export interface TMDBCredits {
  cast: {
    name: string;
    character: string;
    profile_path?: string;
  }[];
  crew: {
    name: string;
    job: string;
  }[];
}
