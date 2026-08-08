import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { machineId, type, severity, message } = body;

    if (!machineId || !type || !severity || !message) {
      return errorResponse("Machine ID, type, severity, and message are required");
    }

    const alert = await db.machineAlert.create({
      data: {
        machineId,
        type,
        severity,
        message,
      },
      include: { machine: true },
    });

    return successResponse(alert, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { alertId, isResolved, acknowledged } = body;

    if (!alertId) return errorResponse("Alert ID is required");

    const updateData: any = {};
    if (isResolved !== undefined) {
      updateData.isResolved = isResolved;
      if (isResolved) updateData.resolvedAt = new Date();
    }
    if (acknowledged) {
      updateData.acknowledgedBy = session.userId;
      updateData.acknowledgedAt = new Date();
    }

    const alert = await db.machineAlert.update({
      where: { id: alertId },
      data: updateData,
      include: { machine: true },
    });

    return successResponse(alert);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
