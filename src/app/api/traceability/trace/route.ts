import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/traceability/trace?q=LOT-001
 * Traces a lot or serial number and returns the full forward + backward genealogy chain.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q) return errorResponse("Query parameter 'q' is required", 400);

    // Try to find as LotNumber first
    const lot = await prisma.lotNumber.findFirst({
      where: {
        OR: [
          { lotNumber: { equals: q, mode: "insensitive" } },
          { suppliersLotNo: { equals: q, mode: "insensitive" } },
        ],
      },
      include: {
        product:   { select: { name: true, sku: true, type: true } },
        supplier:  { select: { name: true, code: true } },
        warehouse: { select: { name: true } },
        movements: { orderBy: { createdAt: "asc" } },
        parentLot: {
          include: {
            product:  { select: { name: true, sku: true } },
            supplier: { select: { name: true } },
            movements: { orderBy: { createdAt: "asc" } },
            parentLot: {
              include: {
                product:  { select: { name: true, sku: true } },
                supplier: { select: { name: true } },
              },
            },
          },
        },
        childLots: {
          include: {
            product:  { select: { name: true, sku: true } },
            warehouse: { select: { name: true } },
            movements: { orderBy: { createdAt: "asc" } },
            _count: { select: { serialItems: true } },
          },
        },
        serialItems: {
          take: 50,
          include: {
            customer: { select: { name: true, code: true } },
          },
        },
      },
    });

    if (lot) {
      return successResponse({
        type: "LOT",
        found: true,
        data: lot,
        chain: buildChain(lot),
      });
    }

    // Try as SerialNumber
    const serial = await prisma.serialNumber.findFirst({
      where: { serialNumber: { equals: q, mode: "insensitive" } },
      include: {
        product:  { select: { name: true, sku: true } },
        customer: { select: { name: true, code: true, email: true } },
        lot: {
          include: {
            product:   { select: { name: true, sku: true } },
            supplier:  { select: { name: true } },
            warehouse: { select: { name: true } },
            parentLot: {
              include: {
                product:  { select: { name: true, sku: true } },
                supplier: { select: { name: true } },
              },
            },
            movements: { orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    if (serial) {
      return successResponse({
        type: "SERIAL",
        found: true,
        data: serial,
        chain: buildSerialChain(serial),
      });
    }

    return successResponse({ found: false, query: q });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

function buildChain(lot: any) {
  const nodes = [];

  // Grandparent
  if (lot.parentLot?.parentLot) {
    nodes.push({
      level: -2,
      label: "Raw Material Source",
      lotNumber: lot.parentLot.parentLot.lotNumber,
      product: lot.parentLot.parentLot.product?.name,
      supplier: lot.parentLot.parentLot.supplier?.name,
      status: lot.parentLot.parentLot.status,
      type: lot.parentLot.parentLot.type,
    });
  }

  // Parent
  if (lot.parentLot) {
    nodes.push({
      level: -1,
      label: "Input Lot",
      lotNumber: lot.parentLot.lotNumber,
      product: lot.parentLot.product?.name,
      supplier: lot.parentLot.supplier?.name,
      status: lot.parentLot.status,
      type: lot.parentLot.type,
    });
  }

  // This lot
  nodes.push({
    level: 0,
    label: "This Lot",
    lotNumber: lot.lotNumber,
    product: lot.product?.name,
    sku: lot.product?.sku,
    supplier: lot.supplier?.name,
    status: lot.status,
    type: lot.type,
    quantity: lot.quantity,
    availableQty: lot.availableQty,
    qcStatus: lot.qcStatus,
    manufacturingDate: lot.manufacturingDate,
    expiryDate: lot.expiryDate,
    warehouse: lot.warehouse?.name,
  });

  // Child lots (FG produced from this raw material)
  for (const child of lot.childLots || []) {
    nodes.push({
      level: 1,
      label: "Output Lot",
      lotNumber: child.lotNumber,
      product: child.product?.name,
      status: child.status,
      type: child.type,
      quantity: child.quantity,
      serialCount: child._count?.serialItems || 0,
    });
  }

  return nodes;
}

function buildSerialChain(serial: any) {
  const nodes: any[] = [];

  if (serial.lot?.parentLot) {
    nodes.push({
      level: -1,
      label: "Source Raw Material Lot",
      lotNumber: serial.lot.parentLot.lotNumber,
      product: serial.lot.parentLot.product?.name,
      supplier: serial.lot.parentLot.supplier?.name,
      status: serial.lot.parentLot.status,
    });
  }

  if (serial.lot) {
    nodes.push({
      level: 0,
      label: "Production Lot",
      lotNumber: serial.lot.lotNumber,
      product: serial.lot.product?.name,
      status: serial.lot.status,
      warehouse: serial.lot.warehouse?.name,
    });
  }

  nodes.push({
    level: 1,
    label: "Serial Unit",
    serialNumber: serial.serialNumber,
    product: serial.product?.name,
    status: serial.status,
    soldDate: serial.soldDate,
    warrantyExpiry: serial.warrantyExpiry,
    customer: serial.customer?.name,
  });

  return nodes;
}
