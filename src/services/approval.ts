import { db } from "@/lib/db";

export async function createRequest(type: string, recordId: string, requestedBy: string) {
  return db.approvalRequest.create({
    data: {
      type,
      recordId,
      requestedBy,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function approveRequest(id: string, approvedBy: string, notes?: string) {
  const request = await db.approvalRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  return db.approvalRequest.update({
    where: { id },
    data: {
      approvedBy,
      status: "APPROVED",
      notes,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function rejectRequest(id: string, approvedBy: string, notes?: string) {
  const request = await db.approvalRequest.findUnique({ where: { id } });
  if (!request) throw new Error("Approval request not found");
  if (request.status !== "PENDING") throw new Error("Request is not pending");

  return db.approvalRequest.update({
    where: { id },
    data: {
      approvedBy,
      status: "REJECTED",
      notes,
    },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getPendingRequests() {
  return db.approvalRequest.findMany({
    where: { status: "PENDING" },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
