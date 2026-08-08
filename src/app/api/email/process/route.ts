import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { processQueue } from "@/services/email";

export async function POST() {
  try {
    await requireAuth();
    const result = await processQueue();
    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
