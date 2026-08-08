import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PlanningService } from "@/services/planning";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    if (body.action === "calculateMRP") {
      const mrp = await PlanningService.calculateMRP(body.planId);
      return successResponse(mrp);
    }

    if (body.action === "generateSchedule") {
      const schedule = await PlanningService.generateSchedule(body.planId);
      return successResponse(schedule);
    }

    if (body.action === "capacity") {
      const capacity = await PlanningService.getCapacityUtilization(
        body.lineId,
        new Date(body.startDate),
        new Date(body.endDate)
      );
      return successResponse(capacity);
    }

    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
