import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse, generateOrderNumber } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const lineId = searchParams.get("lineId");

    const where: any = {};
    if (status) where.status = status;
    if (lineId) where.lineId = lineId;

    const [data, total] = await Promise.all([
      db.productionOrder.findMany({
        where,
        include: {
          product: true,
          line: true,
          workOrders: true,
          materialIssues: true,
          shopFloorLogs: { orderBy: { timestamp: "desc" }, take: 10 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.productionOrder.count({ where }),
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
    const { productId, lineId, quantity, priority, plannedStart, plannedEnd, notes } = body;

    if (!productId || !quantity) {
      return errorResponse("Product and quantity are required");
    }

    const order = await db.productionOrder.create({
      data: {
        orderNumber: generateOrderNumber("PO"),
        productId,
        lineId,
        quantity,
        priority: priority || 0,
        plannedStart: plannedStart ? new Date(plannedStart) : null,
        plannedEnd: plannedEnd ? new Date(plannedEnd) : null,
        notes,
        createdBy: session.userId,
      },
      include: { product: true, line: true },
    });

    return successResponse(order, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
