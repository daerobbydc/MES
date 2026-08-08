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
    const bom = await db.bOM.findUnique({
      where: { id: params.id },
      include: { product: true, items: true },
    });

    if (!bom) return errorResponse("BOM not found", 404);
    return successResponse(bom);
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
    const { items, ...bomData } = body;

    if (items) {
      await db.bOMItem.deleteMany({ where: { bomId: params.id } });
      await db.bOMItem.createMany({
        data: items.map((item: any) => ({
          bomId: params.id,
          materialCode: item.materialCode,
          materialName: item.materialName,
          quantity: item.quantity,
          unit: item.unit || "PCS",
          wastagePercent: item.wastagePercent || 0,
          notes: item.notes,
        })),
      });
    }

    const bom = await db.bOM.update({
      where: { id: params.id },
      data: bomData,
      include: { product: true, items: true },
    });

    return successResponse(bom);
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
    await db.bOM.delete({ where: { id: params.id } });
    return successResponse({ message: "BOM deleted" });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
