import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { CustomerService } from "@/services/crm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const stats = await CustomerService.getCustomerStats(params.id);
    return successResponse(stats);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
