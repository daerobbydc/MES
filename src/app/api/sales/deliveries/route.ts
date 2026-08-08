import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { SalesService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.deliveryOrder.findMany({
      include: { so: { include: { customer: true, items: true } } },
      orderBy: { deliveryDate: "desc" },
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const delivery = await SalesService.createDeliveryOrder(body.soId);
    return successResponse(delivery, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "ship") {
      const delivery = await SalesService.shipDelivery(body.doId);
      return successResponse(delivery);
    }
    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
