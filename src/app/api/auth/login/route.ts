import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { verifyPassword, generateToken } from "@/lib/auth";
import { ApiResponse, LoginResponse } from "@/types/api";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/security/rate-limiter";
import { logLogin } from "@/lib/security/audit-logger";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP, RATE_LIMITS.login);

    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: `Too many login attempts. Try again in ${rateLimit.retryAfter} seconds.`
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          }
        }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      // Log failed login attempt
      logLogin(0, email, false, request);
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      logLogin(user.id, email, false, request);
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Account is deactivated" },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Log failed login attempt
      logLogin(user.id, email, false, request);
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log successful login
    logLogin(user.id, user.email, true, request);

    const token = generateToken(user.id, user.email);

    const responseData: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    };

    // Create response and set cookie properly
    const response = NextResponse.json(responseData);
    
    // Set HTTP-only cookie in the response
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
