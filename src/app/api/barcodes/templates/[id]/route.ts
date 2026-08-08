import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const template = await db.barcodeTemplate.findUnique({ where: { id: params.id } });
    if (!template) return errorResponse("Template not found", 404);
    return successResponse(template);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const template = await db.barcodeTemplate.update({
      where: { id: params.id },
      data: body,
    });
    return successResponse(template);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await db.barcodeTemplate.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
