import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { getNotifications, markRead, markAllRead } from "@/services/notifications";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const read = searchParams.get("read");
    const type = searchParams.get("type") || undefined;

    const filters: { read?: boolean; type?: string } = {};
    if (read !== null) filters.read = read === "true";
    if (type) filters.type = type;

    const notifications = await getNotifications(session.userId, filters);
    return successResponse(notifications);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    if (body.action === "read" && body.id) {
      const notif = await markRead(body.id);
      return successResponse(notif);
    }
    if (body.action === "readAll") {
      await markAllRead(session.userId);
      return successResponse({ ok: true });
    }
    return errorResponse("Invalid action");
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
