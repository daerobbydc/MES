import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { DemandService } from "@/services/planning";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const months = parseInt(searchParams.get("months") || "12");

    if (!productId) return errorResponse("productId is required");

    const [history, movingAvg, forecasts] = await Promise.all([
      DemandService.getSalesHistory(productId, months),
      DemandService.calculateMovingAverage(productId),
      DemandService.forecastDemand(productId, 6),
    ]);

    return successResponse({ history, movingAverage: movingAvg, forecasts });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    if (body.action === "recordSale") {
      const sale = await DemandService.recordSale(body);
      return successResponse(sale, 201);
    }

    const forecast = await DemandService.createForecast({ ...body, createdBy: session.userId });
    return successResponse(forecast, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
