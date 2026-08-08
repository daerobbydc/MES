import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { machineId, type, description, partsReplaced, cost, performedBy, startDate, endDate } = body;

    if (!machineId || !type || !description || !startDate) {
      return errorResponse("Machine ID, type, description, and start date are required");
    }

    const log = await db.machineMaintenanceLog.create({
      data: {
        machineId,
        type,
        description,
        partsReplaced,
        cost,
        performedBy: performedBy || session.userId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    await db.machine.update({
      where: { id: machineId },
      data: { lastMaintAt: new Date() },
    });

    return successResponse(log, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
