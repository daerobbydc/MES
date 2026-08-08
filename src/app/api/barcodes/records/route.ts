import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { BarcodeService } from "@/services/barcode";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") || "Product";
    const query = searchParams.get("query") || "";

    const records = await BarcodeService.getModuleRecords(module, query);
    return successResponse(records);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
