import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { SupplierService } from "@/services/crm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const supplier = await SupplierService.getSupplier(params.id);
    if (!supplier) return errorResponse("Supplier not found", 404);
    return successResponse(supplier);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();

    const existing = await db.supplier.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("Supplier not found", 404);

    if (body.code && body.code !== existing.code) {
      const duplicate = await db.supplier.findUnique({ where: { code: body.code } });
      if (duplicate) return errorResponse("Supplier code already exists");
    }

    const supplier = await SupplierService.updateSupplier(params.id, body);
    return successResponse(supplier);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const existing = await db.supplier.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("Supplier not found", 404);

    const hasOrders = await db.purchaseOrder.findFirst({ where: { supplierId: params.id } });
    if (hasOrders) return errorResponse("Cannot delete supplier with existing purchase orders");

    await SupplierService.deleteSupplier(params.id);
    return successResponse({ message: "Supplier deleted" });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
