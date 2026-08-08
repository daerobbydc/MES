import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - List NCR records (failed quality inspections)
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      result: { in: ["FAIL", "CONDITIONAL"] },
    };

    if (search) {
      where.OR = [
        { notes: { contains: search, mode: "insensitive" } },
        { inspectionNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, records] = await Promise.all([
      prisma.qualityInspection.count({ where }),
      prisma.qualityInspection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: {
            select: {
              orderNumber: true,
              product: { select: { name: true } },
            },
          },
          inspector: { select: { name: true } },
        },
      }),
    ]);

    const ncrs = records.map((r, idx) => ({
      id: r.id,
      ncrNumber: `NCR-${String(r.createdAt.getFullYear()).slice(2)}${String(r.createdAt.getMonth() + 1).padStart(2, "0")}-${String(idx + 1).padStart(4, "0")}`,
      type: r.inspectionType,
      severity: r.failCount > 10 ? "CRITICAL" : r.failCount > 5 ? "MAJOR" : "MINOR",
      status: r.result === "FAIL" ? "OPEN" : "UNDER_REVIEW",
      productName: r.order?.product?.name || "N/A",
      orderNumber: r.order?.orderNumber || "N/A",
      defectQty: r.failCount || 0,
      sampleSize: r.sampleSize || 0,
      defectRate: r.sampleSize > 0 ? parseFloat(((r.failCount / r.sampleSize) * 100).toFixed(1)) : 0,
      inspector: r.inspector?.name || "N/A",
      description: r.notes || "",
      createdAt: r.createdAt,
    }));

    return successResponse({ ncrs, total, page, limit });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

// POST - Create NCR
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { orderId, inspectorId, productId, sampleSize, defectQty, defectType, description, severity } = body;

    if (!sampleSize || defectQty === undefined) {
      return errorResponse("Sample size and defect quantity are required", 400);
    }

    const passCount = Math.max(0, (sampleSize || 0) - (defectQty || 0));

    // Get product from order if orderId is provided
    let resolvedProductId = productId;
    if (orderId && !productId) {
      const order = await prisma.productionOrder.findUnique({
        where: { id: orderId },
        select: { productId: true },
      });
      resolvedProductId = order?.productId;
    }

    if (!resolvedProductId) {
      return errorResponse("Product ID is required (either directly or via orderId)", 400);
    }

    // Auto-generate inspection number
    const count = await prisma.qualityInspection.count();
    const inspectionNumber = `NCR-${String(count + 1).padStart(6, "0")}`;

    const ncr = await prisma.qualityInspection.create({
      data: {
        inspectionNumber,
        inspectionType: "IN_PROCESS",
        orderId: orderId || undefined,
        productId: resolvedProductId,
        inspectorId: inspectorId || (await prisma.user.findFirst({ where: { role: "QUALITY_INSPECTOR" }, select: { id: true } }))?.id || "",
        sampleSize: parseInt(sampleSize),
        passCount,
        failCount: parseInt(defectQty),
        result: "FAIL",
        status: "PASSED",
        notes: `[NCR][${severity || "MAJOR"}][${defectType || "Process Defect"}] ${description || ""}`,
        inspectedAt: new Date(),
      },
      include: {
        order: { select: { orderNumber: true, product: { select: { name: true } } } },
      },
    });

    return successResponse(ncr, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
