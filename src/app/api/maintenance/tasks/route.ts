import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId") || undefined;
    const status = searchParams.get("status") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const where: any = {};
    if (machineId) where.machineId = machineId;
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const tasks = await db.maintenanceTask.findMany({
      where,
      include: { machine: true, schedule: true },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(tasks);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { scheduleId, machineId, type, title, description, assignedTo, cost, notes } = body;

    if (!machineId || !type || !title) {
      return errorResponse("machineId, type, and title are required");
    }

    const task = await db.maintenanceTask.create({
      data: {
        scheduleId,
        machineId,
        type,
        title,
        description,
        assignedTo,
        cost: cost || 0,
        notes,
      },
      include: { machine: true, schedule: true },
    });

    return successResponse(task, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
