import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "summary") {
      const [total, passed, failed] = await Promise.all([
        prisma.qualityInspection.count(),
        prisma.qualityInspection.count({ where: { status: "PASSED" } }),
        prisma.qualityInspection.count({ where: { status: "FAILED" } }),
      ]);

      const failedInspections = await prisma.qualityInspection.findMany({
        where: { status: "FAILED" },
        select: { defectDetails: true },
      });

      const defectMap: Record<string, number> = {};
      failedInspections.forEach((i) => {
        const details = i.defectDetails as any;
        if (details?.type) {
          defectMap[details.type] = (defectMap[details.type] || 0) + 1;
        } else if (details?.defectType) {
          defectMap[details.defectType] = (defectMap[details.defectType] || 0) + 1;
        }
      });
      const defects = Object.entries(defectMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      return successResponse({
        total,
        passed,
        failed,
        pending: total - passed - failed,
        passRate: total > 0 ? (passed / total) * 100 : 0,
        defects,
      });
    }

    const inspections = await prisma.qualityInspection.findMany({
      include: {
        order: { include: { product: true } },
        inspector: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return successResponse(inspections);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
