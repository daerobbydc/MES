import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { ShopFloorService, AndonService } from "@/services/shopfloor";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const status = await ShopFloorService.getRealTimeStatus();
    const alerts = await AndonService.getActiveAlerts();
    return successResponse({ ...status, activeAlerts: alerts });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    if (body.action === "output") {
      const log = await ShopFloorService.logOutput({ ...body, operatorId: session.userId });
      return successResponse(log, 201);
    }
    if (body.action === "downtime") {
      const log = await ShopFloorService.logDowntime({ ...body, operatorId: session.userId });
      return successResponse(log, 201);
    }
    if (body.action === "andon") {
      const alert = await AndonService.createAlert(body);
      return successResponse(alert, 201);
    }
    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
