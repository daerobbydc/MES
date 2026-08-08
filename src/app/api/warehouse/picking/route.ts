import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.pickingList.findMany({
      include: { items: true, warehouse: true },
      orderBy: { pickDate: "desc" },
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const picking = await db.pickingList.create({
      data: {
        doNumber: body.doNumber,
        soId: body.soId,
        warehouseId: body.warehouseId,
        pickedBy: body.pickedBy,
        items: {
          create: body.items.map((i: any) => ({
            materialCode: i.materialCode,
            quantity: i.quantity,
            unit: i.unit || "PCS",
            locationId: i.locationId,
          })),
        },
      },
      include: { items: true },
    });
    return successResponse(picking, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const picking = await db.pickingList.update({
      where: { id: body.pickingId },
      data: { status: body.status, pickedBy: body.pickedBy },
      include: { items: true },
    });
    return successResponse(picking);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
