import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get("search") || "";
    const type     = searchParams.get("type") || "";
    const status   = searchParams.get("status") || "";
    const productId = searchParams.get("productId") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = {};
    if (search) {
      where.OR = [
        { lotNumber: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        { suppliersLotNo: { contains: search, mode: "insensitive" } },
      ];
    }
    if (type)      where.type      = type;
    if (status)    where.status    = status;
    if (productId) where.productId = productId;

    const [lots, total] = await Promise.all([
      prisma.lotNumber.findMany({
        where,
        include: {
          product:  { select: { name: true, sku: true, unit: true } },
          supplier: { select: { name: true, code: true } },
          warehouse:{ select: { name: true, code: true } },
          _count:   { select: { serialItems: true, childLots: true, movements: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lotNumber.count({ where }),
    ]);

    return successResponse({ lots, total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    if (!body.lotNumber) return errorResponse("Lot number is required", 400);
    if (!body.productId) return errorResponse("Product is required", 400);

    const lot = await prisma.lotNumber.create({
      data: {
        lotNumber:         body.lotNumber,
        productId:         body.productId,
        materialCode:      body.materialCode || null,
        supplierId:        body.supplierId || null,
        orderId:           body.orderId || null,
        type:              body.type || "FINISHED_GOOD",
        quantity:          parseFloat(body.quantity) || 0,
        availableQty:      parseFloat(body.quantity) || 0,
        unit:              body.unit || "PCS",
        manufacturingDate: body.manufacturingDate ? new Date(body.manufacturingDate) : null,
        expiryDate:        body.expiryDate ? new Date(body.expiryDate) : null,
        status:            body.status || "ACTIVE",
        qcStatus:          body.qcStatus || "PENDING",
        parentLotId:       body.parentLotId || null,
        warehouseId:       body.warehouseId || null,
        location:          body.location || null,
        suppliersLotNo:    body.suppliersLotNo || null,
        notes:             body.notes || null,
      },
    });

    // Create the initial RECEIPT movement
    await prisma.lotMovement.create({
      data: {
        lotId:           lot.id,
        movementType:    body.type === "RAW_MATERIAL" ? "RECEIPT" : "PRODUCTION_OUT",
        quantity:        parseFloat(body.quantity) || 0,
        toLocation:      body.location || null,
        referenceNumber: body.referenceNumber || null,
        notes:           `Lot created: ${body.type || "FINISHED_GOOD"}`,
      },
    });

    return successResponse(lot, 201);
  } catch (err: any) {
    if (err.code === "P2002") return errorResponse("Lot number already exists", 409);
    return errorResponse(err.message, 500);
  }
}
