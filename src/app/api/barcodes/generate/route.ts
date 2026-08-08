import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { BarcodeService } from "@/services/barcode";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { module, recordId, customCode } = body;

    if (!module || !recordId) {
      return errorResponse("module and recordId are required");
    }

    const barcode = BarcodeService.generateBarcode(module, recordId, customCode);
    return successResponse({ barcode, module, recordId });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
