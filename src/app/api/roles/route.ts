import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const roles = await db.rolePermission.groupBy({
      by: ["role"],
      _count: { permissionId: true },
    });

    const data = roles.map((r) => ({
      role: r.role,
      permissionCount: r._count.permissionId,
    }));

    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
