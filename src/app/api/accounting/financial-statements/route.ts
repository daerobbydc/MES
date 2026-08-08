import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { CostingService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString();
    const endDate = searchParams.get("endDate") || new Date().toISOString();

    const pl = await CostingService.getProfitLoss(new Date(startDate), new Date(endDate));
    return successResponse(pl);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
