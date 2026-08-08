import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";
import { logChange } from "@/services/audit";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [data, total] = await Promise.all([
      db.approvalRequest.findMany({
        where,
        include: {
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.approvalRequest.count({ where }),
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
    const { type, recordId, notes } = body;

    if (!type || !recordId) {
      return errorResponse("Type and recordId are required");
    }

    const approvalRequest = await db.approvalRequest.create({
      data: {
        type,
        recordId,
        requestedBy: session.userId,
        notes,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    await logChange({
      userId: session.userId,
      action: "CREATE",
      module: "approval",
      recordId: approvalRequest.id,
      newValues: { type, recordId },
    });

    return successResponse(approvalRequest, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
