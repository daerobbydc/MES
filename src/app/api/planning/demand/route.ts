import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { DemandService } from "@/services/planning";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const topProducts = await DemandService.getTopProducts(10);
    return successResponse(topProducts);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
