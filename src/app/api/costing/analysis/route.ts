import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { CostAnalysisService } from "@/services/shopfloor";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const orderId = searchParams.get("orderId");

    if (type === "workcenters") {
      const data = await CostAnalysisService.getWorkCenterPerformance();
      return successResponse(data);
    }
    if (type === "materials") {
      const data = await CostAnalysisService.getMaterialConsumption();
      return successResponse(data);
    }
    if (type === "subcontract") {
      const data = await CostAnalysisService.getSubcontractReport();
      return successResponse(data);
    }

    const costs = await CostAnalysisService.getProductionCosts(orderId || undefined);
    return successResponse(costs);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const report = await CostAnalysisService.calculateOrderCost(body.orderId);
    return successResponse(report, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
