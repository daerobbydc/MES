import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { itemId, type, quantity, referenceType, referenceId, notes } = body;

    if (!itemId || !type || !quantity) {
      return errorResponse("Item, type, and quantity are required");
    }

    if (quantity <= 0) {
      return errorResponse("Quantity must be greater than 0");
    }

    const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return errorResponse("Item not found", 404);

    const INBOUND_TYPES = ["INBOUND", "PRODUCTION_OUTPUT", "RETURN"];
    const OUTBOUND_TYPES = ["OUTBOUND", "PRODUCTION_CONSUME", "TRANSFER_OUT", "SCRAP"];

    let stockDelta = 0;
    if (INBOUND_TYPES.includes(type)) {
      stockDelta = +quantity;
    } else if (OUTBOUND_TYPES.includes(type)) {
      // FIX #7 (partial): Check currentStock before allowing outbound
      if (quantity > item.currentStock) {
        return errorResponse(
          `Insufficient stock. Current: ${item.currentStock}, Requested: ${quantity}`
        );
      }
      stockDelta = -quantity;
    } else {
      return errorResponse(`Unknown movement type: ${type}`);
    }

    // FIX #6: Update BOTH currentStock AND availableStock atomically
    const [movement] = await db.$transaction([
      db.inventoryMovement.create({
        data: {
          itemId,
          type,
          quantity,
          unitCost: item.unitCost,
          totalCost: quantity * item.unitCost,
          referenceType,
          referenceId,
          performedBy: session.userId,
          notes,
        },
      }),
      db.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: { increment: stockDelta },
          // availableStock reflects what's available for MRP planning
          // For OUTBOUND this decreases, for INBOUND this increases
          availableStock: { increment: stockDelta },
        },
      }),
    ]);

    return successResponse(movement, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
