import { ScrapingSource, ScrapingJob } from "@prisma/client";

export type ScrapingSourceWithJobs = ScrapingSource & {
  scrapingJobs?: ScrapingJob[];
};

export interface ScrapingRule {
  type: "css" | "xpath" | "api";
  selector?: string;
  endpoint?: string;
  field: string;
  transform?: string;
}

export interface ScrapingSourceFormData {
  name: string;
  baseUrl: string;
  scrapingRules?: ScrapingRule[];
  isActive?: boolean;
}

export interface ScrapingJobResult {
  success: boolean;
  moviesFound: number;
  moviesAdded: number;
  errors?: ScrapingError[];
  duration: number;
}

export interface ScrapingError {
  url?: string;
  message: string;
  timestamp: Date;
}

export interface ScrapingStatus {
  jobId: number;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress?: number;
  moviesFound: number;
  moviesAdded: number;
  errors?: ScrapingError[];
  startedAt?: Date;
  completedAt?: Date;
}
