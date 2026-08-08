import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/utils";

// GET — fetch current 2FA status for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get("X-User-Id");
    if (!userId) return errorResponse("Unauthorized", 401);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return errorResponse("User not found", 404);

    return NextResponse.json({
      success: true,
      data: {
        twoFactorEnabled: (user as any).twoFactorEnabled ?? false,
      },
    });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

// POST — enable or disable 2FA for the authenticated user
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get("X-User-Id");
    if (!userId) return errorResponse("Unauthorized", 401);

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return errorResponse("Field 'enabled' must be a boolean", 400);
    }

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: enabled,
        // Clear any pending OTP when toggling
        twoFactorCode: null,
        twoFactorExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        twoFactorEnabled: enabled,
        message: enabled
          ? "2-Step Verification has been enabled for your account."
          : "2-Step Verification has been disabled.",
      },
    });
  } catch (error: any) {
    console.error("[2FA Toggle Error]", error);
    return errorResponse(error.message || "Internal server error", 500);
  }
}
