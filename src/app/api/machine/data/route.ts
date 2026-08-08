import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const {
      machineId,
      oee,
      availability,
      performance,
      quality,
      runTime,
      downtime,
      cycleCount,
      defectCount,
      spindleSpeed,
      temperature,
      powerConsumption,
      metadata,
    } = body;

    if (!machineId) return errorResponse("Machine ID is required");

    const data = await db.machineData.create({
      data: {
        machineId,
        oee,
        availability,
        performance,
        quality,
        runTime,
        downtime,
        cycleCount,
        defectCount,
        spindleSpeed,
        temperature,
        powerConsumption,
        metadata,
      },
    });

    return successResponse(data, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
