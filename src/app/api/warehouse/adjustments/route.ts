import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { WarehouseService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.stockAdjustment.findMany({
      include: { item: true, location: true, adjuster: true },
      orderBy: { createdAt: "desc" },
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
    const adjustment = await WarehouseService.adjustStock({ ...body, adjustedBy: session.userId });
    return successResponse(adjustment, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
