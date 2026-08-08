import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const permissions = await db.permission.findMany({
      orderBy: [{ module: "asc" }, { action: "asc" }],
    });

    return successResponse(permissions);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
