import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const shift = await db.shiftDefinition.findUnique({
      where: { id: params.id },
      include: { schedules: true },
    });

    if (!shift) return errorResponse("Shift not found", 404);
    return successResponse(shift);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const shift = await db.shiftDefinition.update({
      where: { id: params.id },
      data: body,
    });
    return successResponse(shift);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.shiftDefinition.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
