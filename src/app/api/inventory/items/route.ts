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
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { materialCode: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.inventoryItem.findMany({
        where,
        include: { supplier: true, product: true },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.inventoryItem.count({ where }),
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
    const { materialCode, name, description, category, unit, currentStock, minStock, maxStock, location, supplierId, productId } = body;

    if (!materialCode || !name) {
      return errorResponse("Material code and name are required");
    }

    const item = await db.inventoryItem.create({
      data: {
        materialCode,
        name,
        description,
        type: category || "RAW_MATERIAL",
        unit: unit || "PCS",
        currentStock: currentStock || 0,
        minStock: minStock || 0,
        maxStock,
        location,
        supplierId,
        productId,
      },
      include: { supplier: true, product: true },
    });

    return successResponse(item, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
