import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const templates = await db.barcodeTemplate.findMany({
      orderBy: { name: "asc" },
    });
    return successResponse(templates);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { name, module, format, width, height, showLabel, showDate } = body;

    if (!name || !module) {
      return errorResponse("name and module are required");
    }

    const template = await db.barcodeTemplate.create({
      data: {
        name,
        module,
        format: format || "CODE128",
        width: width || 200,
        height: height || 100,
        showLabel: showLabel ?? true,
        showDate: showDate ?? false,
      },
    });

    return successResponse(template, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
