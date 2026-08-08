import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { CostingService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (productId) {
      const cost = await CostingService.calculateProductCost(productId);
      return successResponse(cost);
    }

    const products = await db.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
    const costs = await Promise.all(products.map(async (p) => {
      const c = await CostingService.calculateProductCost(p.id);
      return { ...p, costBreakdown: c };
    }));

    return successResponse(costs);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
