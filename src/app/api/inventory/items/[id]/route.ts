import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const item = await db.inventoryItem.findUnique({
      where: { id: params.id },
      include: { supplier: true, product: true, movements: { orderBy: { createdAt: "desc" }, take: 50 } },
    });

    if (!item) return errorResponse("Item not found", 404);
    return successResponse(item);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();

    const item = await db.inventoryItem.update({
      where: { id: params.id },
      data: body,
      include: { supplier: true, product: true },
    });

    return successResponse(item);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
