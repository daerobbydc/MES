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
    const lineId = searchParams.get("lineId");

    const where: any = {};
    if (status) where.status = status;
    if (lineId) where.lineId = lineId;

    const [data, total] = await Promise.all([
      db.machine.findMany({
        where,
        include: {
          line: true,
          machineData: { orderBy: { timestamp: "desc" }, take: 1 },
          machineAlerts: { where: { isResolved: false } },
        },
        orderBy: { code: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.machine.count({ where }),
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
    const { code, name, lineId, type, manufacturer, model, serialNumber, installDate } = body;

    if (!code || !name) {
      return errorResponse("Code and name are required");
    }

    const machine = await db.machine.create({
      data: {
        code,
        name,
        lineId,
        type,
        manufacturer,
        model,
        serialNumber,
        installDate: installDate ? new Date(installDate) : null,
      },
      include: { line: true },
    });

    return successResponse(machine, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
