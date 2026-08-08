import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { LotSerialService } from "@/services/shopfloor";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || undefined;
    const type = searchParams.get("type");

    if (type === "serials") {
      const serials = await LotSerialService.getSerials(productId);
      return successResponse(serials);
    }

    const lots = await LotSerialService.getLots(productId);
    return successResponse(lots);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    if (body.type === "serial") {
      const serials = await LotSerialService.createSerial(body);
      return successResponse(serials, 201);
    }
    const lot = await LotSerialService.createLot(body);
    return successResponse(lot, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
