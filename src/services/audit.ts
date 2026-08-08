import { db } from "@/lib/db";

interface LogChangeParams {
  userId?: string;
  action: string;
  module: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logChange(data: LogChangeParams) {
  return db.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      module: data.module,
      recordId: data.recordId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  });
}

interface AuditFilters {
  module?: string;
  userId?: string;
  recordId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export async function getAuditLogs(filters: AuditFilters) {
  const where: any = {};

  if (filters.module) where.module = filters.module;
  if (filters.userId) where.userId = filters.userId;
  if (filters.recordId) where.recordId = filters.recordId;
  if (filters.action) where.action = filters.action;

  if (filters.from || filters.to) {
    where.createdAt = {};
    if (filters.from) where.createdAt.gte = new Date(filters.from);
    if (filters.to) where.createdAt.lte = new Date(filters.to);
  }

  return db.auditLog.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}
