import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireRole, ADMIN_ROLES, hashPassword } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { logChange } from "@/services/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(ADMIN_ROLES);
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return errorResponse("New password must be at least 8 characters");
    }

    const user = await db.user.findUnique({ where: { id: params.id } });
    if (!user) return errorResponse("User not found", 404);

    const hashedPassword = await hashPassword(password);

    await db.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    await logChange({
      userId: session.userId,
      action: "RESET_PASSWORD",
      module: "users",
      recordId: params.id,
    });

    return successResponse({ message: "Password reset successfully" });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
