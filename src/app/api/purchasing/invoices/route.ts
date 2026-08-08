import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PurchasingService } from "@/services";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const data = await db.purchaseInvoice.findMany({
      include: { po: { include: { supplier: true } }, payments: true },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const invoice = await PurchasingService.createInvoice(body);
    return successResponse(invoice, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
