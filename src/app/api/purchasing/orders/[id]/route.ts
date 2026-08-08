import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PurchasingService } from "@/services";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const po = await db.purchaseOrder.findUnique({
      where: { id: params.id },
      include: { supplier: true, items: true, goodsReceipts: true, purchaseInvoices: true },
    });
    if (!po) return errorResponse("PO not found", 404);
    return successResponse(po);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    if (body.action === "approve") {
      const po = await PurchasingService.approveOrder(params.id, session.userId);
      return successResponse(po);
    }
    const po = await db.purchaseOrder.update({ where: { id: params.id }, data: body, include: { supplier: true, items: true } });
    return successResponse(po);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
