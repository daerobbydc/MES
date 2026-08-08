import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PurchasingService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.goodsReceipt.findMany({
      include: { supplier: true, items: true, po: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const grn = await PurchasingService.receiveGoods({ ...body, receivedBy: session.userId });
    return successResponse(grn, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
