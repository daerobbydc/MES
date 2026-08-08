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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = {};
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      db.journalEntry.findMany({
        where,
        include: { lines: { include: { account: true } }, createdByUser: true },
        orderBy: { entryDate: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.journalEntry.count({ where }),
    ]);

    return paginateResponse(data, total, page, limit);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
