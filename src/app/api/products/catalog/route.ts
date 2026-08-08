import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: any = {};
    if (category) where.category = category;

    const products = await prisma.product.findMany({
      where,
      include: {
        bom: { include: { items: true } },
        inventoryItems: true,
      },
      orderBy: { name: "asc" },
    });

    return successResponse(products);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
