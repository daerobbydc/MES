import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse, paginateResponse } from "@/lib/utils";
import { SupplierService } from "@/services/crm";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const isActive = isActiveParam !== undefined ? isActiveParam === "true" : undefined;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { contact: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.supplier.count({ where }),
    ]);

    return paginateResponse(data, total, page, limit);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { code, name } = body;

    if (!code || !name) {
      return errorResponse("Code and name are required");
    }

    const existing = await db.supplier.findUnique({ where: { code } });
    if (existing) {
      return errorResponse("Supplier code already exists");
    }

    const supplier = await SupplierService.createSupplier(body);
    return successResponse(supplier, 201);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
