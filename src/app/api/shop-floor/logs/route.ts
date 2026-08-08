import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { ShopFloorService } from "@/services/shopfloor";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    if (orderId) {
      const logs = await ShopFloorService.getProductionLogs(orderId);
      return successResponse(logs);
    }
    const status = await ShopFloorService.getRealTimeStatus();
    return successResponse(status);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    if (body.logType === "DOWNTIME") {
      const log = await ShopFloorService.logDowntime({ ...body, operatorId: session.userId });
      return successResponse(log, 201);
    }
    if (body.logType === "SCRAP") {
      const log = await ShopFloorService.logScrap({ ...body, operatorId: session.userId });
      return successResponse(log, 201);
    }
    const log = await ShopFloorService.logOutput({ ...body, operatorId: session.userId });
    return successResponse(log, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
