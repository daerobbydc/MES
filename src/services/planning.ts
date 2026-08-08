import { db } from "@/lib/db";

// ─── DEMAND FORECASTING SERVICE ──────────────────────
export const DemandService = {
  async calculateMovingAverage(productId: string, periods: number = 6) {
    const history = await db.salesHistory.findMany({
      where: { productId },
      orderBy: { saleDate: "desc" },
      take: periods,
    });

    if (history.length === 0) return { average: 0, trend: "stable", data: [] };

    const avg = history.reduce((s, h) => s + h.quantity, 0) / history.length;
    const recent = history.slice(0, 3);
    const older = history.slice(3);
    const recentAvg = recent.reduce((s, h) => s + h.quantity, 0) / (recent.length || 1);
    const olderAvg = older.reduce((s, h) => s + h.quantity, 0) / (older.length || 1);

    const trend = recentAvg > olderAvg * 1.1 ? "increasing" : recentAvg < olderAvg * 0.9 ? "decreasing" : "stable";

    return { average: Math.round(avg), trend, data: history };
  },

  async forecastDemand(productId: string, months: number = 6) {
    const history = await db.salesHistory.findMany({
      where: { productId },
      orderBy: { saleDate: "asc" },
    });

    const forecasts = [];
    const now = new Date();

    for (let i = 1; i <= months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthStr = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, "0")}`;

      const sameMonthHistory = history.filter((h) => {
        const d = new Date(h.saleDate);
        return d.getMonth() === forecastDate.getMonth();
      });

      const avgForMonth = sameMonthHistory.length > 0
        ? sameMonthHistory.reduce((s, h) => s + h.quantity, 0) / sameMonthHistory.length
        : history.length > 0
        ? history.reduce((s, h) => s + h.quantity, 0) / history.length
        : 0;

      // Deterministic forecast using monthly average and recent trend
      const trendFactor = history.length >= 3 ? 1.02 : 1.0;
      const forecastedQty = Math.round(avgForMonth * trendFactor);

      forecasts.push({
        forecastPeriod: monthStr,
        forecastDate,
        forecastedQty,
        method: "MOVING_AVERAGE",
        confidenceLevel: sameMonthHistory.length > 2 ? 0.8 : 0.5,
      });
    }

    return forecasts;
  },

  async createForecast(data: {
    productId: string;
    forecastPeriod: string;
    forecastDate: Date;
    forecastedQty: number;
    method?: string;
    notes?: string;
    createdBy: string;
  }) {
    return db.demandForecast.create({
      data: {
        productId: data.productId,
        forecastPeriod: data.forecastPeriod,
        forecastDate: data.forecastDate,
        forecastedQty: data.forecastedQty,
        method: (data.method as any) || "MANUAL",
        notes: data.notes,
        createdBy: data.createdBy,
      },
    });
  },

  async getSalesHistory(productId: string, months: number = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return db.salesHistory.findMany({
      where: {
        productId,
        saleDate: { gte: startDate },
      },
      orderBy: { saleDate: "asc" },
    });
  },

  async recordSale(data: {
    productId: string;
    quantity: number;
    revenue: number;
    customerId?: string;
  }) {
    return db.salesHistory.create({
      data: {
        productId: data.productId,
        saleDate: new Date(),
        quantity: data.quantity,
        revenue: data.revenue,
        customerId: data.customerId,
      },
    });
  },

  async getTopProducts(limit: number = 10) {
    const products = await db.product.findMany({
      where: { type: "FINISHED_GOOD", isActive: true },
      include: {
        salesOrderItems: {
          select: { quantity: true, totalPrice: true },
        },
        salesHistories: {
          orderBy: { saleDate: "desc" },
          take: 30,
        },
      },
    });

    return products
      .map((p) => {
        const totalSold = p.salesOrderItems.reduce((s, i) => s + i.quantity, 0);
        const totalRevenue = p.salesOrderItems.reduce((s, i) => s + i.totalPrice, 0);
        const recentSales = p.salesHistories.reduce((s, h) => s + h.quantity, 0);
        return { ...p, totalSold, totalRevenue, recentSales };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  },
};

// ─── PRODUCTION PLANNING SERVICE ─────────────────────
export const PlanningService = {
  async createPlan(data: {
    productId: string;
    plannedQty: number;
    startDate: Date;
    endDate: Date;
    lineId?: string;
    workCenterId?: string;
    priority?: number;
    notes?: string;
    createdBy: string;
  }) {
    const planNumber = `PP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    const plan = await db.productionPlan.create({
      data: {
        planNumber,
        productId: data.productId,
        plannedQty: data.plannedQty,
        startDate: data.startDate,
        endDate: data.endDate,
        lineId: data.lineId,
        workCenterId: data.workCenterId,
        priority: data.priority || 0,
        notes: data.notes,
        createdBy: data.createdBy,
      },
      include: { product: true, line: true },
    });

    return plan;
  },

  async calculateMRP(planId: string) {
    const plan = await db.productionPlan.findUnique({
      where: { id: planId },
      include: { product: true },
    });
    if (!plan) throw new Error("Plan not found");

    const bom = await db.bOM.findFirst({
      where: { productId: plan.productId, isDefault: true, isActive: true },
      include: { items: true },
    });

    if (!bom) throw new Error("No default BOM found for this product");

    await db.materialRequirement.deleteMany({ where: { planId } });

    const requirements = [];
    for (const bomItem of bom.items) {
      const invItem = await db.inventoryItem.findFirst({
        where: { materialCode: bomItem.materialCode },
      });

      // Calculate total allocated to other active/scheduled plans
      const existingAllocated = await db.materialRequirement.aggregate({
        where: {
          materialCode: bomItem.materialCode,
          planId: { not: planId },
          status: "FULFILLED",
          plan: { status: { in: ["PLANNED", "SCHEDULED", "IN_PROGRESS"] } },
        },
        _sum: { requiredQty: true },
      });

      const allocatedQty = existingAllocated._sum.requiredQty || 0;
      const rawAvailable = invItem?.availableStock || 0;
      const netAvailableStock = Math.max(0, rawAvailable - allocatedQty);

      const requiredQty = plan.plannedQty * bomItem.quantity * (1 + bomItem.wastagePercent / 100);
      const shortageQty = Math.max(0, requiredQty - netAvailableStock);

      const leadTimeDays = 7; // Standard lead time
      const requiredDate = new Date(plan.startDate);

      const req = await db.materialRequirement.create({
        data: {
          planId,
          materialCode: bomItem.materialCode,
          materialName: bomItem.materialName,
          requiredQty,
          availableQty: netAvailableStock,
          shortageQty,
          unitCost: invItem?.unitCost || bomItem.unitCost,
          totalCost: requiredQty * (invItem?.unitCost || bomItem.unitCost),
          leadTimeDays,
          requiredDate,
          status: shortageQty > 0 ? "SHORTAGE" : "FULFILLED",
        },
      });

      requirements.push(req);
    }

    return requirements;
  },

  async generateSchedule(planId: string) {
    const plan = await db.productionPlan.findUnique({
      where: { id: planId },
      include: { product: true },
    });
    if (!plan) throw new Error("Plan not found");

    await db.productionSchedule.deleteMany({ where: { planId } });

    const days = Math.ceil((plan.endDate.getTime() - plan.startDate.getTime()) / 86400000) || 1;
    const qtyPerDay = Math.ceil(plan.plannedQty / days);
    const schedules = [];

    let remainingQty = plan.plannedQty;
    let currentDate = new Date(plan.startDate);

    for (let day = 0; day < days && remainingQty > 0; day++) {
      const shiftQty = Math.min(qtyPerDay, remainingQty);

      const startTime = new Date(currentDate);
      startTime.setHours(7, 0, 0);
      const endTime = new Date(currentDate);
      endTime.setHours(15, 0, 0);

      const schedule = await db.productionSchedule.create({
        data: {
          planId,
          scheduledDate: new Date(currentDate),
          shift: "Shift 1",
          startTime,
          endTime,
          quantity: shiftQty,
          lineId: plan.lineId,
          status: "PLANNED",
        },
      });

      schedules.push(schedule);
      remainingQty -= shiftQty;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    await db.productionPlan.update({
      where: { id: planId },
      data: { status: "SCHEDULED" },
    });

    return schedules;
  },

  async getPlans(status?: string, startDate?: string, endDate?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    return db.productionPlan.findMany({
      where,
      include: {
        product: true,
        line: true,
        workCenter: true,
        schedules: { orderBy: { scheduledDate: "asc" } },
        materialReqs: true,
      },
      orderBy: [{ priority: "desc" }, { startDate: "asc" }],
    });
  },

  async getPlanById(id: string) {
    return db.productionPlan.findUnique({
      where: { id },
      include: {
        product: true,
        line: true,
        workCenter: true,
        schedules: {
          include: { machine: true, operator: true },
          orderBy: { scheduledDate: "asc" },
        },
        materialReqs: true,
      },
    });
  },

  async updatePlanStatus(id: string, status: string) {
    return db.productionPlan.update({
      where: { id },
      data: { status: status as any },
    });
  },

  async deletePlan(id: string) {
    await db.productionSchedule.deleteMany({ where: { planId: id } });
    await db.materialRequirement.deleteMany({ where: { planId: id } });
    return db.productionPlan.delete({ where: { id } });
  },

  async getCapacityUtilization(lineId: string, startDate: Date, endDate: Date) {
    const line = await db.productionLine.findUnique({ where: { id: lineId } });
    if (!line) throw new Error("Line not found");

    const schedules = await db.productionSchedule.findMany({
      where: {
        lineId,
        scheduledDate: { gte: startDate, lte: endDate },
        status: { not: "CANCELLED" },
      },
    });

    const totalScheduledHours = schedules.reduce((s, sch) => {
      const hours = (sch.endTime.getTime() - sch.startTime.getTime()) / 3600000;
      return s + hours;
    }, 0);

    const totalAvailableHours = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) * 8;
    const utilization = totalAvailableHours > 0 ? (totalScheduledHours / totalAvailableHours) * 100 : 0;

    return {
      lineId,
      lineName: line.name,
      totalScheduledHours,
      totalAvailableHours,
      utilization: Math.round(utilization * 10) / 10,
      scheduledCount: schedules.length,
    };
  },
};
