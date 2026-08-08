import { db } from "@/lib/db";

export const ShiftService = {
  async getShifts() {
    return db.shiftDefinition.findMany({
      include: { schedules: true },
      orderBy: { startTime: "asc" },
    });
  },

  async createShift(data: {
    name: string;
    startTime: string;
    endTime: string;
    isOvernight?: boolean;
    breakMinutes?: number;
  }) {
    return db.shiftDefinition.create({
      data: {
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        isOvernight: data.isOvernight || false,
        breakMinutes: data.breakMinutes ?? 60,
      },
    });
  },

  async updateShift(id: string, data: any) {
    return db.shiftDefinition.update({
      where: { id },
      data,
    });
  },

  async deleteShift(id: string) {
    return db.shiftDefinition.delete({ where: { id } });
  },

  async getSchedules(filters: { userId?: string; date?: string; shiftId?: string }) {
    const where: any = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.shiftId) where.shiftId = filters.shiftId;
    if (filters.date) {
      const d = new Date(filters.date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      where.date = { gte: start, lt: end };
    }

    return db.shiftSchedule.findMany({
      where,
      include: { shift: true, user: true },
      orderBy: { date: "asc" },
    });
  },

  async assignShift(data: { shiftId: string; userId: string; date: string; notes?: string }) {
    return db.shiftSchedule.create({
      data: {
        shiftId: data.shiftId,
        userId: data.userId,
        date: new Date(data.date),
        notes: data.notes,
      },
      include: { shift: true, user: true },
    });
  },

  async bulkAssign(data: { userIds: string[]; shiftId: string; dates: string[] }) {
    const results = [];
    for (const userId of data.userIds) {
      for (const date of data.dates) {
        const existing = await db.shiftSchedule.findUnique({
          where: { shiftId_userId_date: { shiftId: data.shiftId, userId, date: new Date(date) } },
        });
        if (!existing) {
          const schedule = await db.shiftSchedule.create({
            data: {
              shiftId: data.shiftId,
              userId,
              date: new Date(date),
            },
          });
          results.push(schedule);
        }
      }
    }
    return results;
  },

  async checkIn(id: string) {
    return db.shiftSchedule.update({
      where: { id },
      data: { status: "CHECKED_IN" },
      include: { shift: true, user: true },
    });
  },

  async checkOut(id: string) {
    return db.shiftSchedule.update({
      where: { id },
      data: { status: "CHECKED_OUT" },
      include: { shift: true, user: true },
    });
  },

  async getShiftDashboard() {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todaySchedules = await db.shiftSchedule.findMany({
      where: { date: { gte: startOfDay, lt: endOfDay } },
      include: { shift: true, user: true },
    });

    return {
      todayShifts: todaySchedules.length,
      checkedIn: todaySchedules.filter((s) => s.status === "CHECKED_IN").length,
      absent: todaySchedules.filter((s) => s.status === "ABSENT").length,
      upcoming: todaySchedules.filter((s) => s.status === "ASSIGNED").length,
    };
  },
};
