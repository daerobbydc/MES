import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { SalesService } from "@/services";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const so = await db.salesOrder.findUnique({
      where: { id: params.id },
      include: { customer: true, items: { include: { product: true } }, deliveryOrders: true, salesInvoices: true },
    });
    if (!so) return errorResponse("SO not found", 404);
    return successResponse(so);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const so = await db.salesOrder.update({ where: { id: params.id }, data: body, include: { customer: true, items: true } });
    return successResponse(so);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
