import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { errorResponse } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rateLimit";

// Generic error — same message always, prevents user enumeration
const INVALID_CODE_ERROR = "Invalid or expired verification code.";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return errorResponse("Email and verification code are required.", 400);
    }

    // ── Rate Limiting: 5 attempts per 10 minutes per IP+email ─────────────────
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimitKey = `verify-2fa:${ip}:${email.toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey, {
      limit: 5,
      windowSeconds: 10 * 60, // 10 minutes
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many verification attempts. Try again in ${Math.ceil(
            (rateLimit.resetAt - Date.now()) / 1000 / 60
          )} minute(s).`,
        },
        { status: 429, headers: rateLimit.headers }
      );
    }

    // ── Lookup user ────────────────────────────────────────────────────────────
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // SECURITY: Use same generic error for all failure cases to prevent enumeration
    if (!user || !user.isActive || !(user as any).twoFactorEnabled) {
      return errorResponse(INVALID_CODE_ERROR, 401);
    }

    const storedCode: string | null = (user as any).twoFactorCode ?? null;
    const expiresAt: Date | null = (user as any).twoFactorExpiresAt ?? null;

    // Check: code must exist (from Step 1 login), be correct, and not expired
    if (!storedCode) {
      return errorResponse(INVALID_CODE_ERROR, 401);
    }

    if (expiresAt && new Date(expiresAt) < new Date()) {
      // Clear expired code
      await db.user.update({
        where: { id: user.id },
        data: { twoFactorCode: null, twoFactorExpiresAt: null },
      });
      return errorResponse(INVALID_CODE_ERROR, 401);
    }

    if (storedCode !== code.toString().trim()) {
      return errorResponse(INVALID_CODE_ERROR, 401);
    }

    // ── Success: clear OTP, update last login, issue session ──────────────────
    await db.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: null,
        twoFactorExpiresAt: null,
        lastLoginAt: new Date(),
      },
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
    console.error("[Verify 2FA Error]", error);
    // Never expose internal error details to client
    return errorResponse("Internal server error", 500);
  }
}
