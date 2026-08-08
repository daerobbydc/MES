import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { AndonService } from "@/services/shopfloor";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const stats = searchParams.get("stats");
    if (stats) {
      const data = await AndonService.getAlertStats();
      return successResponse(data);
    }
    const alerts = await AndonService.getActiveAlerts();
    return successResponse(alerts);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    if (body.action === "acknowledge") {
      const alert = await AndonService.acknowledge(body.alertId, session.userId);
      return successResponse(alert);
    }
    if (body.action === "resolve") {
      const alert = await AndonService.resolve(body.alertId, session.userId, body.resolution);
      return successResponse(alert);
    }
    const alert = await AndonService.createAlert(body);
    return successResponse(alert, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
