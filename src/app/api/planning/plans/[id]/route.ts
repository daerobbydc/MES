import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PlanningService } from "@/services/planning";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const plan = await PlanningService.getPlanById(params.id);
    if (!plan) return errorResponse("Plan not found", 404);
    return successResponse(plan);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();

    if (body.action === "calculateMRP") {
      const mrp = await PlanningService.calculateMRP(params.id);
      return successResponse(mrp);
    }

    if (body.action === "generateSchedule") {
      const schedule = await PlanningService.generateSchedule(params.id);
      return successResponse(schedule);
    }

    if (body.action === "updateStatus") {
      const plan = await PlanningService.updatePlanStatus(params.id, body.status);
      return successResponse(plan);
    }

    const plan = await db.productionPlan.update({
      where: { id: params.id },
      data: body,
      include: { product: true, line: true },
    });
    return successResponse(plan);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await PlanningService.deletePlan(params.id);
    return successResponse({ message: "Plan deleted" });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
