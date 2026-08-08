import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";
import { PlanningService } from "@/services/planning";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const plans = await PlanningService.getPlans(status, startDate, endDate);
    return successResponse(plans);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const plan = await PlanningService.createPlan({
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      createdBy: session.userId,
    });
    return successResponse(plan, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
