import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";
import { queueEmail } from "@/services/email";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");

    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.emailQueue.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.emailQueue.count({ where }),
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
    const { to, subject, body: emailBody } = body;

    if (!to || !subject || !emailBody) {
      return errorResponse("to, subject, and body are required");
    }

    const email = await queueEmail(to, subject, emailBody);
    return successResponse(email, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
