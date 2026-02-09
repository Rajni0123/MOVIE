import { NextResponse } from "next/server";
import { ApiResponse } from "@/types/api";

export async function POST() {
  try {
    const response = NextResponse.json<ApiResponse>({
      success: true,
      message: "Logged out successfully",
    });

    // Clear the auth cookie properly in the response
    response.cookies.set("auth_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // Expire immediately
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
