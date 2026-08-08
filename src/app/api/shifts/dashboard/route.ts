import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todaySchedules = await db.shiftSchedule.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
      include: { shift: true, user: true },
    });

    return successResponse({
      todayShifts: todaySchedules.length,
      checkedIn: todaySchedules.filter((s) => s.status === "CHECKED_IN").length,
      absent: todaySchedules.filter((s) => s.status === "ABSENT").length,
      upcoming: todaySchedules.filter((s) => s.status === "ASSIGNED").length,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
