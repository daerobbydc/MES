import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        bom: { include: { items: true } },
        inventoryItems: true,
        productionOrders: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!product) return errorResponse("Product not found", 404);
    return successResponse(product);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();
    const product = await prisma.product.update({
      where: { id: params.id },
      data: body,
    });
    return successResponse(product);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await prisma.product.delete({ where: { id: params.id } });
    return successResponse({ message: "Product deleted" });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
