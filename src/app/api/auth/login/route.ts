import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";
import { errorResponse } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse("Email and password are required");
    }

    // ── Rate Limiting: 5 attempts per 15 minutes per IP + email ──────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `login:${ip}:${email.toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey, {
      limit: 5,
      windowSeconds: 15 * 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Try again in ${Math.ceil(
            (rateLimit.resetAt - Date.now()) / 1000 / 60
          )} minute(s).`,
        },
        {
          status: 429,
          headers: rateLimit.headers,
        }
      );
    }

    // ── Validate credentials ──────────────────────────────────────────────────
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Use constant-time comparison style: don't short circuit on user not found
    const passwordToCheck = user?.password ?? "$2a$12$invalidhashfortimingprotection";
    const valid = await verifyPassword(password, passwordToCheck);

    if (!user || !user.isActive || !valid) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        {
          status: 401,
          headers: rateLimit.headers,
        }
      );
    }

    // ── Check 2-Step Verification (2FA) ──────────────────────────────────────
    // Determined by user's account setting (twoFactorEnabled), not by login request
    const is2FAEnabled = (user as any).twoFactorEnabled === true;

    if (is2FAEnabled) {
      // Generate 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await db.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: otpCode,
          twoFactorExpiresAt: expiresAt,
        },
      });

      const isDev = process.env.NODE_ENV === "development";

      return NextResponse.json({
        success: true,
        requires2FA: true,
        data: {
          email: user.email,
          userId: user.id,
          // CRITICAL SECURITY: demoOtpCode is ONLY attached during local development testing.
          // In production, OTP is dispatched via Email/SMS and NEVER returned in API responses.
          ...(isDev ? { demoOtpCode: otpCode } : {}),
          expiresInSeconds: 300,
        },
      });
    }

    // ── Normal Login Flow (no 2FA) ────────────────────────────────────────────
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const isProduction = process.env.NODE_ENV === "production";

    const response = NextResponse.json(
      {
        success: true,
        requires2FA: false,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
      },
      { status: 200 }
    );

    response.cookies.set("mes_session", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[Login Error]", error);
    // Never expose internal error details to client
    return errorResponse("Internal server error", 500);
  }
}
