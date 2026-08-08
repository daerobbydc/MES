import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { CustomerService } from "@/services/crm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const customer = await CustomerService.getCustomer(params.id);
    if (!customer) return errorResponse("Customer not found", 404);
    return successResponse(customer);
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

    const existing = await db.customer.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("Customer not found", 404);

    if (body.code && body.code !== existing.code) {
      const duplicate = await db.customer.findUnique({ where: { code: body.code } });
      if (duplicate) return errorResponse("Customer code already exists");
    }

    const customer = await CustomerService.updateCustomer(params.id, body);
    return successResponse(customer);
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
    const existing = await db.customer.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("Customer not found", 404);

    const hasOrders = await db.salesOrder.findFirst({ where: { customerId: params.id } });
    if (hasOrders) return errorResponse("Cannot delete customer with existing sales orders");

    await CustomerService.deleteCustomer(params.id);
    return successResponse({ message: "Customer deleted" });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
