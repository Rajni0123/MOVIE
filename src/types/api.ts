export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface AuthPayload {
  userId: number;
  email: string;
  exp: number;
  iat: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

export interface SEOSubmitRequest {
  urls: string[];
}

export interface SEOSubmitResponse {
  submitted: number;
  failed: number;
  errors?: string[];
}

export interface IndexingStatus {
  movieId: number;
  url: string;
  googleSubmitted: boolean;
  googleIndexed: boolean;
  indexNowSubmitted: boolean;
  lastSubmitted?: Date;
}
