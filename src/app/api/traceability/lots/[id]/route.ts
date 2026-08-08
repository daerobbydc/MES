import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const lot = await prisma.lotNumber.findUnique({
      where: { id: params.id },
      include: {
        product:   { select: { name: true, sku: true, unit: true, type: true } },
        supplier:  { select: { name: true, code: true, phone: true, email: true } },
        warehouse: { select: { name: true, code: true } },
        parentLot: {
          include: {
            product:  { select: { name: true, sku: true } },
            supplier: { select: { name: true } },
          },
        },
        childLots: {
          include: {
            product: { select: { name: true, sku: true } },
            _count:  { select: { serialItems: true } },
          },
        },
        serialItems: {
          take: 100,
          orderBy: { createdAt: "desc" },
        },
        movements: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!lot) return errorResponse("Lot not found", 404);
    return successResponse(lot);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await request.json();

    const lot = await prisma.lotNumber.findUnique({ where: { id: params.id } });
    if (!lot) return errorResponse("Lot not found", 404);

    const updated = await prisma.lotNumber.update({
      where: { id: params.id },
      data: {
        status:       body.status       || undefined,
        qcStatus:     body.qcStatus     || undefined,
        location:     body.location     !== undefined ? body.location : undefined,
        notes:        body.notes        !== undefined ? body.notes : undefined,
        recallReason: body.recallReason !== undefined ? body.recallReason : undefined,
        recalledAt:   body.status === "RECALLED" ? new Date() : undefined,
        availableQty: body.availableQty !== undefined ? parseFloat(body.availableQty) : undefined,
      },
    });

    // Log the status change as a movement
    if (body.status && body.status !== lot.status) {
      const typeMap: Record<string, string> = {
        QUARANTINE: "QUARANTINE",
        RECALLED: "RECALL",
        DISPOSED: "DISPOSAL",
        CONSUMED: "ADJUSTMENT",
      };
      const movType = typeMap[body.status];
      if (movType) {
        await prisma.lotMovement.create({
          data: {
            lotId:           params.id,
            movementType:    movType as any,
            quantity:        lot.availableQty,
            notes:           body.recallReason || `Status changed to ${body.status}`,
            referenceNumber: body.referenceNumber || null,
          },
        });
      }
    }

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
