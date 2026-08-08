import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  PLANNED: ["RELEASED", "CANCELLED", "IN_PROGRESS", "COMPLETED"],
  RELEASED: ["IN_PROGRESS", "CANCELLED", "COMPLETED", "ON_HOLD"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED", "COMPLETED"],
  COMPLETED: ["IN_PROGRESS", "PLANNED"], // Allow reopening/reverting if marked completed by mistake
  CANCELLED: ["PLANNED"],
};

async function handleCompleteOrder(orderId: string, userId?: string) {
  const currentOrder = await db.productionOrder.findUnique({
    where: { id: orderId },
    include: { product: true, line: true },
  });

  if (!currentOrder) throw new Error("Order not found");
  if (currentOrder.status === "COMPLETED") return currentOrder;

  const outputQty = currentOrder.completedQty > 0 ? currentOrder.completedQty : currentOrder.quantity;

  return await db.$transaction(async (tx) => {
    // 1. Update Production Order status
    const updatedOrder = await tx.productionOrder.update({
      where: { id: orderId },
      data: {
        status: "COMPLETED",
        completedQty: outputQty,
        actualEnd: new Date(),
      },
      include: { product: true, line: true },
    });

    // 2. Increase Finished Goods stock if product item exists in inventory
    if (currentOrder.productId) {
      const fgItem = await tx.inventoryItem.findFirst({
        where: { productId: currentOrder.productId },
      });

      if (fgItem) {
        await tx.inventoryItem.update({
          where: { id: fgItem.id },
          data: {
            currentStock: { increment: outputQty },
            availableStock: { increment: outputQty },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            itemId: fgItem.id,
            type: "PRODUCTION_OUTPUT",
            quantity: outputQty,
            unitCost: currentOrder.unitCost || 0,
            totalCost: outputQty * (currentOrder.unitCost || 0),
            referenceType: "PRODUCTION_ORDER",
            referenceId: orderId,
            notes: `Completed Production Order ${currentOrder.orderNumber}`,
          },
        });
      }
    }

    // 3. Update linked Sales Order status to PICKING if applicable
    if (currentOrder.salesOrderId) {
      await tx.salesOrder.update({
        where: { id: currentOrder.salesOrderId },
        data: { status: "PICKING" },
      });
    }

    // 4. Auto-create Quality Inspection record if missing and productId is present
    if (currentOrder.productId) {
      const existingInspection = await tx.qualityInspection.findFirst({
        where: { orderId: orderId },
      });

      if (!existingInspection) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const count = await tx.qualityInspection.count();
        const insNum = `QC-${dateStr}-${(count + 1).toString().padStart(3, "0")}`;

        // Get an active user to assign as inspector if userId is missing
        let inspectorId = userId;
        if (!inspectorId || inspectorId === "admin-dev-id") {
          const firstUser = await tx.user.findFirst({ select: { id: true } });
          inspectorId = firstUser?.id || "admin-dev-id";
        }

        await tx.qualityInspection.create({
          data: {
            inspectionNumber: insNum,
            orderId: orderId,
            productId: currentOrder.productId,
            inspectorId: inspectorId,
            inspectionType: "FINAL",
            status: "PASSED",
            sampleSize: Math.min(outputQty, 10),
            passCount: Math.min(outputQty, 10),
            failCount: 0,
            result: "PASS",
            notes: `Auto-generated QC inspection for completed order ${currentOrder.orderNumber}`,
          },
        });
      }
    }

    return updatedOrder;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const order = await db.productionOrder.findUnique({
      where: { id: params.id },
      include: { product: true, line: true, productionLogs: true },
    });

    if (!order) return errorResponse("Order not found", 404);
    return successResponse(order);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const action = body.action || body.status;

    if (action === "complete" || action === "COMPLETED") {
      const completedOrder = await handleCompleteOrder(params.id, session.userId);
      return successResponse(completedOrder);
    }

    if (action === "start" || action === "IN_PROGRESS" || action === "resume") {
      const order = await db.productionOrder.update({
        where: { id: params.id },
        data: {
          status: "IN_PROGRESS",
          actualStart: new Date(),
        },
        include: { product: true, line: true },
      });
      return successResponse(order);
    }

    if (action === "hold" || action === "ON_HOLD") {
      const order = await db.productionOrder.update({
        where: { id: params.id },
        data: { status: "ON_HOLD" },
        include: { product: true, line: true },
      });
      return successResponse(order);
    }

    if (action === "reopen") {
      const order = await db.productionOrder.update({
        where: { id: params.id },
        data: { status: "IN_PROGRESS", actualEnd: null },
        include: { product: true, line: true },
      });
      return successResponse(order);
    }

    if (action === "cancel" || action === "CANCELLED") {
      const order = await db.productionOrder.update({
        where: { id: params.id },
        data: { status: "CANCELLED" },
        include: { product: true, line: true },
      });
      return successResponse(order);
    }

    // Default PUT update
    const order = await db.productionOrder.update({
      where: { id: params.id },
      data: body,
      include: { product: true, line: true },
    });

    return successResponse(order);
  } catch (error: any) {
    return errorResponse(error.message || "Failed to update production order", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    if (body.action === "complete" || body.status === "COMPLETED") {
      const completedOrder = await handleCompleteOrder(params.id, session.userId);
      return successResponse(completedOrder);
    }

    if (body.action === "reopen") {
      const order = await db.productionOrder.update({
        where: { id: params.id },
        data: { status: "IN_PROGRESS", actualEnd: null },
        include: { product: true, line: true },
      });
      return successResponse(order);
    }

    // Validate status transitions if status is being changed
    if (body.status) {
      const currentOrder = await db.productionOrder.findUnique({ where: { id: params.id } });
      if (!currentOrder) return errorResponse("Order not found", 404);

      const allowed = ALLOWED_STATUS_TRANSITIONS[currentOrder.status] || [];
      if (!allowed.includes(body.status)) {
        return errorResponse(
          `Cannot transition from ${currentOrder.status} to ${body.status}. Allowed: ${allowed.join(", ") || "none"}`,
          400
        );
      }
    }

    const safeBody = { ...body };
    delete safeBody.action;

    const order = await db.productionOrder.update({
      where: { id: params.id },
      data: safeBody,
      include: { product: true, line: true },
    });

    return successResponse(order);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const order = await db.productionOrder.findUnique({ where: { id: params.id } });
    if (order?.status === "IN_PROGRESS" || order?.status === "RELEASED") {
      return errorResponse("Cannot delete orders in progress or released", 400);
    }
    await db.productionOrder.delete({ where: { id: params.id } });
    return successResponse({ message: "Order deleted" });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
