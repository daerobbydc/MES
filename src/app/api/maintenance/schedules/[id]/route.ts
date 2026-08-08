import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const schedule = await db.maintenanceSchedule.findUnique({
      where: { id: params.id },
      include: { machine: true, tasks: true },
    });

    if (!schedule) return errorResponse("Schedule not found", 404);
    return successResponse(schedule);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const updateData: any = { ...body };
    if (body.nextDueDate) updateData.nextDueDate = new Date(body.nextDueDate);
    if (body.lastCompletedAt) updateData.lastCompletedAt = new Date(body.lastCompletedAt);

    const schedule = await db.maintenanceSchedule.update({
      where: { id: params.id },
      data: updateData,
      include: { machine: true },
    });

    return successResponse(schedule);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.maintenanceSchedule.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
