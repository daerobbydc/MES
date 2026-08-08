import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { BarcodeService } from "@/services/barcode";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return errorResponse("code string is required");
    }

    const result = await BarcodeService.scanAndLookup(code);
    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
