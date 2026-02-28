import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { AuthPayload } from "@/types/api";
import prisma from "@/lib/db/prisma";

const _jwtSecret = process.env.ADMIN_JWT_SECRET;
if (!_jwtSecret) {
  throw new Error("ADMIN_JWT_SECRET environment variable is required");
}
const JWT_SECRET: string = _jwtSecret;
const TOKEN_EXPIRY = "7d";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(userId: number, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user from request
 */
export async function getCurrentUser(request: NextRequest) {
  let token: string | null = null;

  // First check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // If no header, check cookie
  if (!token) {
    token = request.cookies.get("auth_token")?.value || null;
  }

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  const user = await prisma.adminUser.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

/**
 * Middleware to check if user is authenticated
 */
export async function requireAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: { id: number; email: string; name: string | null };
  error?: string;
}> {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      authenticated: false,
      error: "Unauthorized - Please login to access this resource",
    };
  }

  return {
    authenticated: true,
    user,
  };
}

/**
 * Set authentication cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

/**
 * Clear authentication cookie
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
}
