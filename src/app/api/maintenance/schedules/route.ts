import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const type = searchParams.get("type") || undefined;
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (machineId) where.machineId = machineId;
    if (type) where.type = type;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === "true";

    const schedules = await db.maintenanceSchedule.findMany({
      where,
      include: { machine: true, tasks: true },
      orderBy: { nextDueDate: "asc" },
    });

    return successResponse(schedules);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { machineId, type, title, description, intervalHours, intervalDays, nextDueDate, assignedTo, priority } = body;

    if (!machineId || !type || !title || !nextDueDate) {
      return errorResponse("machineId, type, title, and nextDueDate are required");
    }

    const schedule = await db.maintenanceSchedule.create({
      data: {
        machineId,
        type,
        title,
        description,
        intervalHours,
        intervalDays,
        nextDueDate: new Date(nextDueDate),
        assignedTo,
        priority: priority || "MEDIUM",
      },
      include: { machine: true },
    });

    return successResponse(schedule, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
