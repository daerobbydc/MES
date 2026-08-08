import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { WarehouseService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.stockTransfer.findMany({
      include: { fromWarehouse: true, toWarehouse: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transfer = await WarehouseService.createTransfer(body);
    return successResponse(transfer, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "receive") {
      const transfer = await WarehouseService.receiveTransfer(body.transferId);
      return successResponse(transfer);
    }
    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
