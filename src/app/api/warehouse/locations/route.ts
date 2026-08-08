import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.warehouse.findMany({
      include: { locations: true },
      orderBy: { name: "asc" },
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const warehouse = await db.warehouse.create({ data: body });
    return successResponse(warehouse, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
