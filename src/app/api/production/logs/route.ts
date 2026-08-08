import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { orderId, goodCount, rejectCount, downtimeMinutes, downtimeReason, notes } = body;

    if (!orderId) return errorResponse("Order ID is required");

    const log = await db.productionLog.create({
      data: {
        orderId,
        goodCount: goodCount || 0,
        rejectCount: rejectCount || 0,
        downtimeMinutes: downtimeMinutes || 0,
        downtimeReason,
        notes,
        operatorId: session.userId,
      },
    });

    await db.productionOrder.update({
      where: { id: orderId },
      data: {
        completedQty: { increment: goodCount || 0 },
        rejectedQty: { increment: rejectCount || 0 },
        status: "IN_PROGRESS",
      },
    });

    const order = await db.productionOrder.findUnique({ where: { id: orderId } });
    if (order && order.completedQty >= order.quantity) {
      await db.productionOrder.update({
        where: { id: orderId },
        data: { status: "COMPLETED", actualEnd: new Date() },
      });
    }

    return successResponse(log, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
