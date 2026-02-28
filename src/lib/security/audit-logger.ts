/**
 * Audit Logger - Track admin actions for security and compliance
 */

import prisma from "@/lib/db/prisma";
import { getClientIP } from "./rate-limiter";

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "BULK_ACTION"
  | "SETTINGS_CHANGE"
  | "SCRAPING_START";

export type AuditResource =
  | "auth"
  | "movie"
  | "settings"
  | "ads"
  | "notification"
  | "link"
  | "scraping";

export interface AuditLogEntry {
  userId?: number;
  userEmail?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, unknown>;
  request?: Request;
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (entry.request) {
      ipAddress = getClientIP(entry.request);
      userAgent = entry.request.headers.get("user-agent") || undefined;
    }

    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw - audit logging should not break the main flow
    console.error("Audit log error:", error);
  }
}

/**
 * Helper to log login events
 */
export async function logLogin(
  userId: number,
  email: string,
  success: boolean,
  request: Request
): Promise<void> {
  await logAudit({
    userId: success ? userId : undefined,
    userEmail: email,
    action: success ? "LOGIN" : "LOGIN_FAILED",
    resource: "auth",
    request,
  });
}

/**
 * Helper to log movie changes
 */
export async function logMovieAction(
  userId: number,
  userEmail: string,
  action: "CREATE" | "UPDATE" | "DELETE",
  movieId: number,
  movieTitle: string,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    userEmail,
    action,
    resource: "movie",
    resourceId: String(movieId),
    details: { title: movieTitle },
    request,
  });
}

/**
 * Helper to log settings changes
 */
export async function logSettingsChange(
  userId: number,
  userEmail: string,
  settingKey: string,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    userEmail,
    action: "SETTINGS_CHANGE",
    resource: "settings",
    details: { key: settingKey },
    request,
  });
}

/**
 * Helper to log bulk actions
 */
export async function logBulkAction(
  userId: number,
  userEmail: string,
  actionType: string,
  count: number,
  request?: Request
): Promise<void> {
  await logAudit({
    userId,
    userEmail,
    action: "BULK_ACTION",
    resource: "movie",
    details: { actionType, count },
    request,
  });
}
