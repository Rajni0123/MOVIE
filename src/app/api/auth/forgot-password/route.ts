import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth";
import { ApiResponse } from "@/types/api";

// POST /api/auth/forgot-password - Generate new password for admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      return NextResponse.json<ApiResponse>(
        { 
          success: true, 
          message: "If an account with that email exists, a password reset link has been sent." 
        },
        { status: 200 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Account is deactivated. Please contact administrator." },
        { status: 403 }
      );
    }

    // Generate a new random password
    const newPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    // In a production environment, you would send an email here
    // For now, we'll return the password in the response (only for development)
    // TODO: Implement email sending service
    
    console.log(`Password reset for ${email}. New password: ${newPassword}`);
    
    // For development: return password in response
    // For production: send email and don't return password
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json<ApiResponse>(
        { 
          success: true, 
          message: `Password reset successful. Your new password is: ${newPassword}. Please change it after logging in.`,
          data: { newPassword } // Only in development
        },
        { status: 200 }
      );
    } else {
      // Production: Send email (implement email service here)
      return NextResponse.json<ApiResponse>(
        { 
          success: true, 
          message: "Password reset instructions have been sent to your email address." 
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: "An error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

// Generate a random password
function generateRandomPassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // Uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // Lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // Number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // Special char
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
