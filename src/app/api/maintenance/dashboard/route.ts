import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [overdue, dueThisWeek, completed, costAgg] = await Promise.all([
      db.maintenanceTask.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] }, createdAt: { lt: now } },
      }),
      db.maintenanceTask.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] }, createdAt: { gte: now, lte: weekFromNow } },
      }),
      db.maintenanceTask.count({ where: { status: "COMPLETED" } }),
      db.maintenanceTask.aggregate({ _sum: { cost: true }, where: { status: "COMPLETED" } }),
    ]);

    return successResponse({
      overdue,
      dueThisWeek,
      completed,
      totalCost: costAgg._sum.cost || 0,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
