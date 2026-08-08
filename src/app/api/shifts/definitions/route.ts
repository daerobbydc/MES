import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const shifts = await db.shiftDefinition.findMany({
      include: { schedules: true },
      orderBy: { startTime: "asc" },
    });
    return successResponse(shifts);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { name, startTime, endTime, isOvernight, breakMinutes } = body;

    if (!name || !startTime || !endTime) {
      return errorResponse("name, startTime, and endTime are required");
    }

    const shift = await db.shiftDefinition.create({
      data: {
        name,
        startTime,
        endTime,
        isOvernight: isOvernight || false,
        breakMinutes: breakMinutes ?? 60,
      },
    });

    return successResponse(shift, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
