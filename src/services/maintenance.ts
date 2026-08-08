import { db } from "@/lib/db";

export const MaintenanceService = {
  async getSchedules(filters: { machineId?: string; type?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters.machineId) where.machineId = filters.machineId;
    if (filters.type) where.type = filters.type;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return db.maintenanceSchedule.findMany({
      where,
      include: { machine: true, tasks: true },
      orderBy: { nextDueDate: "asc" },
    });
  },

  async createSchedule(data: {
    machineId: string;
    type: string;
    title: string;
    description?: string;
    intervalHours?: number;
    intervalDays?: number;
    nextDueDate: string;
    assignedTo?: string;
    priority?: string;
  }) {
    return db.maintenanceSchedule.create({
      data: {
        machineId: data.machineId,
        type: data.type as any,
        title: data.title,
        description: data.description,
        intervalHours: data.intervalHours,
        intervalDays: data.intervalDays,
        nextDueDate: new Date(data.nextDueDate),
        assignedTo: data.assignedTo,
        priority: (data.priority as any) || "MEDIUM",
      },
      include: { machine: true },
    });
  },

  async updateSchedule(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.nextDueDate) updateData.nextDueDate = new Date(data.nextDueDate);
    if (data.lastCompletedAt) updateData.lastCompletedAt = new Date(data.lastCompletedAt);
    if (data.type) updateData.type = data.type;
    if (data.priority) updateData.priority = data.priority;

    return db.maintenanceSchedule.update({
      where: { id },
      data: updateData,
      include: { machine: true },
    });
  },

  async deleteSchedule(id: string) {
    return db.maintenanceSchedule.delete({ where: { id } });
  },

  async getTasks(filters: { machineId?: string; status?: string; from?: string; to?: string }) {
    const where: any = {};
    if (filters.machineId) where.machineId = filters.machineId;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    return db.maintenanceTask.findMany({
      where,
      include: { machine: true, schedule: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async createTask(data: {
    scheduleId?: string;
    machineId: string;
    type: string;
    title: string;
    description?: string;
    assignedTo?: string;
    cost?: number;
    notes?: string;
  }) {
    return db.maintenanceTask.create({
      data: {
        scheduleId: data.scheduleId,
        machineId: data.machineId,
        type: data.type as any,
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        cost: data.cost || 0,
        notes: data.notes,
      },
      include: { machine: true, schedule: true },
    });
  },

  async updateTask(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.startedAt) updateData.startedAt = new Date(data.startedAt);
    if (data.completedAt) updateData.completedAt = new Date(data.completedAt);
    if (data.status) updateData.status = data.status;
    if (data.type) updateData.type = data.type;

    return db.maintenanceTask.update({
      where: { id },
      data: updateData,
      include: { machine: true },
    });
  },

  async getMaintenanceDashboard() {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [overdue, dueThisWeek, completed, costAgg] = await Promise.all([
      db.maintenanceTask.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS", "OVERDUE"] }, createdAt: { lt: now } },
      }),
      db.maintenanceTask.count({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] }, createdAt: { gte: now, lte: weekFromNow } },
      }),
      db.maintenanceTask.count({ where: { status: "COMPLETED" } }),
      db.maintenanceTask.aggregate({ _sum: { cost: true }, where: { status: "COMPLETED" } }),
    ]);

    return {
      overdue,
      dueThisWeek,
      completed,
      totalCost: costAgg._sum.cost || 0,
    };
  },

  async checkOverdueTasks() {
    const now = new Date();
    return db.maintenanceTask.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        createdAt: { lt: now },
      },
      include: { machine: true },
    });
  },
};
