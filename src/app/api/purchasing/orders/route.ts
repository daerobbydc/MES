import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";
import { PurchasingService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: { supplier: true, items: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.purchaseOrder.count({ where }),
    ]);

    return paginateResponse(data, total, page, limit);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const po = await PurchasingService.createOrder({ ...body, createdBy: session.userId });
    return successResponse(po, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
