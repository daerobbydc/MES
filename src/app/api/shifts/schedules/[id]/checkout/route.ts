import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const schedule = await db.shiftSchedule.update({
      where: { id: params.id },
      data: { status: "CHECKED_OUT" },
      include: { shift: true, user: true },
    });
    return successResponse(schedule);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
