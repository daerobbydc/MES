import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const search    = searchParams.get("search") || "";
    const status    = searchParams.get("status") || "";
    const productId = searchParams.get("productId") || "";
    const lotId     = searchParams.get("lotId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (status)    where.status    = status;
    if (productId) where.productId = productId;
    if (lotId)     where.lotId     = lotId;

    const serials = await prisma.serialNumber.findMany({
      where,
      include: {
        product:  { select: { name: true, sku: true } },
        lot:      { select: { lotNumber: true } },
        customer: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return successResponse(serials);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    // Bulk create serials for a lot
    if (body.bulk && body.prefix && body.count) {
      const count  = parseInt(body.count);
      const prefix = body.prefix;
      const results = [];

      for (let i = 1; i <= count; i++) {
        const sn = `${prefix}-${String(i).padStart(4, "0")}`;
        try {
          const s = await prisma.serialNumber.create({
            data: {
              serialNumber:  sn,
              productId:     body.productId || null,
              lotId:         body.lotId     || null,
              status:        "IN_STOCK",
              warrantyMonths: body.warrantyMonths ? parseInt(body.warrantyMonths) : null,
              warrantyExpiry: body.warrantyMonths && body.soldDate
                ? (() => { const d = new Date(body.soldDate); d.setMonth(d.getMonth() + parseInt(body.warrantyMonths)); return d; })()
                : null,
              notes: body.notes || null,
            },
          });
          results.push(s);
        } catch { /* skip duplicates */ }
      }
      return successResponse({ created: results.length, serials: results }, 201);
    }

    // Single serial
    const serial = await prisma.serialNumber.create({
      data: {
        serialNumber:    body.serialNumber,
        productId:       body.productId || null,
        lotId:           body.lotId     || null,
        status:          body.status    || "IN_STOCK",
        soldToCustomerId: body.soldToCustomerId || null,
        soldDate:        body.soldDate ? new Date(body.soldDate) : null,
        warrantyMonths:  body.warrantyMonths ? parseInt(body.warrantyMonths) : null,
        warrantyExpiry:  body.warrantyExpiry ? new Date(body.warrantyExpiry) : null,
        notes:           body.notes || null,
      },
    });

    return successResponse(serial, 201);
  } catch (err: any) {
    if (err.code === "P2002") return errorResponse("Serial number already exists", 409);
    return errorResponse(err.message, 500);
  }
}
