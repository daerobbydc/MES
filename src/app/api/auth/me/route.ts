import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("mes_session")?.value;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        return successResponse(payload);
      }
    }

    // In dev bypass mode, middleware injects X-User-Role / X-User-Id headers.
    // Read those and return a synthetic session so the Sidebar gets the real role.
    const roleFromHeader = request.headers.get("X-User-Role");
    const userIdFromHeader = request.headers.get("X-User-Id");

    if (roleFromHeader) {
      // Return the role from the header (set by middleware for the authenticated user)
      return successResponse({
        userId: userIdFromHeader || "dev",
        role: roleFromHeader,
        email: "session@mes.com",
        name: "Current User",
      });
    }

    return errorResponse("Not authenticated", 401);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
