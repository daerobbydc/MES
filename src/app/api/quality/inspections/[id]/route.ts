import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const inspection = await db.qualityInspection.findUnique({
      where: { id: params.id },
      include: { order: { include: { product: true } }, inspector: true },
    });

    if (!inspection) return errorResponse("Inspection not found", 404);
    return successResponse(inspection);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();

    // FIX #4: Business validation before allowing inspection update
    const existing = await db.qualityInspection.findUnique({ where: { id: params.id } });
    if (!existing) return errorResponse("Inspection not found", 404);

    // Prevent modifying a finished inspection
    if (existing.status === "PASSED" || existing.status === "FAILED") {
      return errorResponse(`Inspection is already ${existing.status} and cannot be modified`, 400);
    }

    // Validate pass/fail counts if being updated
    const newPassCount = body.passCount !== undefined ? Number(body.passCount) : existing.passCount;
    const newFailCount = body.failCount !== undefined ? Number(body.failCount) : existing.failCount;
    const newSampleSize = body.sampleSize !== undefined ? Number(body.sampleSize) : existing.sampleSize;

    if (newPassCount < 0) return errorResponse("passCount cannot be negative", 400);
    if (newFailCount < 0) return errorResponse("failCount cannot be negative", 400);
    if (newSampleSize <= 0) return errorResponse("sampleSize must be greater than 0", 400);
    if (newPassCount + newFailCount > newSampleSize) {
      return errorResponse(
        `passCount (${newPassCount}) + failCount (${newFailCount}) cannot exceed sampleSize (${newSampleSize})`,
        400
      );
    }

    // Auto-derive inspection result based on pass ratio (if counts are provided)
    let autoResult = body.result;
    if (body.passCount !== undefined || body.failCount !== undefined) {
      const passRatio = newSampleSize > 0 ? newPassCount / newSampleSize : 0;
      if (newFailCount === 0) {
        autoResult = "PASS";
      } else if (passRatio >= 0.95) {
        autoResult = "CONDITIONAL";
      } else {
        autoResult = "FAIL";
      }
    }

    // Build safe update payload (prevent overwriting immutable fields)
    const { inspectionNumber, orderId, productId, inspectorId, createdAt, ...updateFields } = body;

    const updated = await db.qualityInspection.update({
      where: { id: params.id },
      data: {
        ...updateFields,
        passCount: newPassCount,
        failCount: newFailCount,
        result: autoResult,
      },
      include: { order: true, inspector: true },
    });

    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
