import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { getPreferences, updatePreferences } from "@/services/notifications";

export async function GET() {
  try {
    const session = await requireAuth();
    const prefs = await getPreferences(session.userId);
    return successResponse(prefs);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const prefs = await updatePreferences(session.userId, body);
    return successResponse(prefs);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
