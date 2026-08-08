import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const date = searchParams.get("date") || undefined;
    const shiftId = searchParams.get("shiftId") || undefined;

    const where: any = {};
    if (userId) where.userId = userId;
    if (shiftId) where.shiftId = shiftId;
    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.date = { gte: start, lt: end };
    }

    const schedules = await db.shiftSchedule.findMany({
      where,
      include: { shift: true, user: true },
      orderBy: { date: "asc" },
    });

    return successResponse(schedules);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { shiftId, userId, date, notes, userIds, dates } = body;

    if (userIds && dates) {
      const results = [];
      for (const uid of userIds) {
        for (const d of dates) {
          const existing = await db.shiftSchedule.findUnique({
            where: { shiftId_userId_date: { shiftId, userId: uid, date: new Date(d) } },
          });
          if (!existing) {
            const schedule = await db.shiftSchedule.create({
              data: { shiftId, userId: uid, date: new Date(d) },
            });
            results.push(schedule);
          }
        }
      }
      return successResponse(results, 201);
    }

    if (!shiftId || !userId || !date) {
      return errorResponse("shiftId, userId, and date are required");
    }

    const schedule = await db.shiftSchedule.create({
      data: {
        shiftId,
        userId,
        date: new Date(date),
        notes,
      },
      include: { shift: true, user: true },
    });

    return successResponse(schedule, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
