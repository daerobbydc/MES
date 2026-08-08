import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const inspectionType = searchParams.get("inspectionType");

    const where: any = {};
    if (status) where.status = status;
    if (inspectionType) where.inspectionType = inspectionType;

    const [data, total] = await Promise.all([
      db.qualityInspection.findMany({
        where,
        include: { order: { include: { product: true } }, inspector: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.qualityInspection.count({ where }),
    ]);

    return paginateResponse(data, total, page, limit);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { orderId, productId, inspectionType, sampleSize, notes } = body;

    if (!productId || !inspectionType || !sampleSize) {
      return errorResponse("Product, inspection type, and sample size are required");
    }

    const inspection = await db.qualityInspection.create({
      data: {
        inspectionNumber: `QC-${Date.now()}`,
        orderId,
        productId,
        inspectorId: session.userId,
        inspectionType,
        sampleSize,
        notes,
      },
      include: { order: true },
    });

    return successResponse(inspection, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
