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
    const productId = searchParams.get("productId");

    const where: any = {};
    if (productId) where.productId = productId;

    const [data, total] = await Promise.all([
      db.bOM.findMany({
        where,
        include: { product: true, items: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bOM.count({ where }),
    ]);

    return paginateResponse(data, total, page, limit);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { productId, version, description, isDefault, items } = body;

    if (!productId || !items || items.length === 0) {
      return errorResponse("Product and at least one BOM item are required");
    }

    const bom = await db.bOM.create({
      data: {
        productId,
        version: version || "1.0",
        description,
        isDefault: isDefault || false,
        items: {
          create: items.map((item: any) => ({
            materialCode: item.materialCode,
            materialName: item.materialName,
            quantity: item.quantity,
            unit: item.unit || "PCS",
            wastagePercent: item.wastagePercent || 0,
            notes: item.notes,
          })),
        },
      },
      include: { product: true, items: true },
    });

    return successResponse(bom, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
