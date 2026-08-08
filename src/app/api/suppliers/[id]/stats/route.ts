import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { SupplierService } from "@/services/crm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const stats = await SupplierService.getSupplierStats(params.id);
    return successResponse(stats);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
