import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const machine = await db.machine.findUnique({
      where: { id: params.id },
      include: {
        line: true,
        machineData: { orderBy: { timestamp: "desc" }, take: 100 },
        machineAlerts: { orderBy: { createdAt: "desc" }, take: 50 },
        maintenanceLogs: { orderBy: { startDate: "desc" }, take: 20 },
      },
    });

    if (!machine) return errorResponse("Machine not found", 404);
    return successResponse(machine);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();

    const machine = await db.machine.update({
      where: { id: params.id },
      data: body,
      include: { line: true },
    });

    return successResponse(machine);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
