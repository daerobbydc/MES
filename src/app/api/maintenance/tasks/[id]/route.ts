import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const task = await db.maintenanceTask.findUnique({
      where: { id: params.id },
      include: { machine: true, schedule: true },
    });

    if (!task) return errorResponse("Task not found", 404);
    return successResponse(task);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const updateData: any = { ...body };
    if (body.startedAt) updateData.startedAt = new Date(body.startedAt);
    if (body.completedAt) updateData.completedAt = new Date(body.completedAt);

    const task = await db.maintenanceTask.update({
      where: { id: params.id },
      data: updateData,
      include: { machine: true },
    });

    return successResponse(task);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
