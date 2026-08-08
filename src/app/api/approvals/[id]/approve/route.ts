import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { logChange } from "@/services/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { notes } = body;

    const approvalRequest = await db.approvalRequest.findUnique({ where: { id: params.id } });
    if (!approvalRequest) return errorResponse("Approval request not found", 404);
    if (approvalRequest.status !== "PENDING") return errorResponse("Request is not pending");

    const updated = await db.approvalRequest.update({
      where: { id: params.id },
      data: {
        approvedBy: session.userId,
        status: "APPROVED",
        notes,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    });

    await logChange({
      userId: session.userId,
      action: "APPROVE",
      module: "approval",
      recordId: params.id,
      newValues: { status: "APPROVED", notes },
    });

    return successResponse(updated);
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
