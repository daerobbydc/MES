import { db } from "@/lib/db";

// ─── SHOP FLOOR SERVICE ──────────────────────────────
export const ShopFloorService = {
  async logOutput(data: {
    orderId: string;
    workOrderId?: string;
    machineId?: string;
    operatorId: string;
    goodCount: number;
    scrapCount?: number;
    defectCode?: string;
    defectNotes?: string;
    notes?: string;
  }) {
    const log = await db.shopFloorLog.create({
      data: {
        orderId: data.orderId,
        workOrderId: data.workOrderId,
        machineId: data.machineId,
        operatorId: data.operatorId,
        logType: "OUTPUT",
        goodCount: data.goodCount,
        scrapCount: data.scrapCount || 0,
        defectCode: data.defectCode,
        defectNotes: data.defectNotes,
        notes: data.notes,
      },
    });

    if (data.workOrderId) {
      await db.workOrder.update({
        where: { id: data.workOrderId },
        data: {
          completedQty: { increment: data.goodCount },
          rejectedQty: { increment: data.scrapCount || 0 },
        },
      });
    }

    await db.productionOrder.update({
      where: { id: data.orderId },
      data: {
        completedQty: { increment: data.goodCount },
        rejectedQty: { increment: data.scrapCount || 0 },
      },
    });

    return log;
  },

  async logDowntime(data: {
    orderId: string;
    machineId?: string;
    operatorId: string;
    downtimeMinutes: number;
    downtimeReason: string;
    notes?: string;
  }) {
    return db.shopFloorLog.create({
      data: {
        orderId: data.orderId,
        machineId: data.machineId,
        operatorId: data.operatorId,
        logType: "DOWNTIME",
        downtimeMinutes: data.downtimeMinutes,
        downtimeReason: data.downtimeReason,
        notes: data.notes,
      },
    });
  },

  async logScrap(data: {
    orderId: string;
    workOrderId?: string;
    machineId?: string;
    operatorId: string;
    scrapCount: number;
    defectCode: string;
    defectNotes?: string;
  }) {
    const log = await db.shopFloorLog.create({
      data: {
        orderId: data.orderId,
        workOrderId: data.workOrderId,
        machineId: data.machineId,
        operatorId: data.operatorId,
        logType: "SCRAP",
        scrapCount: data.scrapCount,
        defectCode: data.defectCode,
        defectNotes: data.defectNotes,
      },
    });

    if (data.workOrderId) {
      await db.workOrder.update({
        where: { id: data.workOrderId },
        data: { rejectedQty: { increment: data.scrapCount } },
      });
    }

    return log;
  },

  async getProductionLogs(orderId: string) {
    return db.shopFloorLog.findMany({
      where: { orderId },
      include: { machine: true, operator: true },
      orderBy: { timestamp: "desc" },
    });
  },

  async getRealTimeStatus() {
    let activeOrders = await db.productionOrder.findMany({
      where: { status: { in: ["IN_PROGRESS", "RELEASED", "PLANNED", "ON_HOLD"] } },
      include: {
        product: true,
        line: true,
        workOrders: { where: { status: { in: ["IN_PROGRESS", "PENDING", "COMPLETED"] } } },
        shopFloorLogs: {
          orderBy: { timestamp: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });

    if (activeOrders.length === 0) {
      activeOrders = await db.productionOrder.findMany({
        take: 12,
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
          line: true,
          workOrders: true,
          shopFloorLogs: { orderBy: { timestamp: "desc" }, take: 5 },
        },
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayLogs = await db.shopFloorLog.findMany({
      where: { timestamp: { gte: today } },
      include: { order: { include: { product: true } }, machine: true, operator: true },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    // Fallback to recent logs if no log entry created today
    if (todayLogs.length === 0) {
      todayLogs = await db.shopFloorLog.findMany({
        take: 20,
        include: { order: { include: { product: true } }, machine: true, operator: true },
        orderBy: { timestamp: "desc" },
      });
    }

    const todayOutput = todayLogs
      .filter((l) => l.logType === "OUTPUT")
      .reduce((s, l) => s + l.goodCount, 0);
    const todayScrap = todayLogs
      .filter((l) => l.logType === "SCRAP" || l.logType === "OUTPUT")
      .reduce((s, l) => s + l.scrapCount, 0);
    const todayDowntime = todayLogs
      .filter((l) => l.logType === "DOWNTIME")
      .reduce((s, l) => s + l.downtimeMinutes, 0);

    // If still 0, aggregate from active production orders
    const totalOutput = todayOutput > 0 ? todayOutput : activeOrders.reduce((s, o) => s + (o.completedQty || 0), 0);

    return {
      activeOrders,
      todayLogs,
      todayOutput: totalOutput,
      todayScrap,
      todayDowntime,
      scrapRate: totalOutput > 0 ? ((todayScrap / (totalOutput + todayScrap)) * 100).toFixed(1) : "0",
    };
  },
};

// ─── ANDON SERVICE ───────────────────────────────────
export const AndonService = {
  async createAlert(data: {
    orderId?: string;
    machineId?: string;
    workOrderId?: string;
    lineId?: string;
    type: string;
    severity: string;
    message: string;
  }) {
    const alertNumber = `ANDON-${Date.now().toString(36).toUpperCase()}`;
    return db.andonAlert.create({
      data: {
        alertNumber,
        orderId: data.orderId,
        machineId: data.machineId,
        workOrderId: data.workOrderId,
        lineId: data.lineId,
        type: data.type as any,
        severity: data.severity as any,
        message: data.message,
      },
      include: { order: true, machine: true, line: true },
    });
  },

  async acknowledge(alertId: string, userId: string) {
    return db.andonAlert.update({
      where: { id: alertId },
      data: {
        status: "ACKNOWLEDGED",
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  },

  async resolve(alertId: string, userId: string, resolution: string) {
    const alert = await db.andonAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw new Error("Alert not found");

    const responseTime = alert.acknowledgedAt
      ? Math.round((alert.acknowledgedAt.getTime() - alert.createdAt.getTime()) / 60000)
      : 0;

    return db.andonAlert.update({
      where: { id: alertId },
      data: {
        status: "RESOLVED",
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolution,
        responseTime,
      },
    });
  },

  async getActiveAlerts() {
    return db.andonAlert.findMany({
      where: { status: { in: ["ACTIVE", "ACKNOWLEDGED", "IN_PROGRESS"] } },
      include: { order: { include: { product: true } }, machine: true, line: true },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
  },

  async getAlertHistory(limit: number = 50) {
    return db.andonAlert.findMany({
      include: { order: { include: { product: true } }, machine: true, line: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async getAlertStats() {
    const all = await db.andonAlert.findMany();
    const active = all.filter((a) => a.status === "ACTIVE").length;
    const avgResponse = all
      .filter((a) => a.responseTime)
      .reduce((s, a, _, arr) => s + (a.responseTime || 0) / arr.length, 0);

    return {
      total: all.length,
      active,
      resolved: all.filter((a) => a.status === "RESOLVED").length,
      avgResponseTime: Math.round(avgResponse),
      byType: all.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {} as any),
      bySeverity: all.reduce((acc, a) => { acc[a.severity] = (acc[a.severity] || 0) + 1; return acc; }, {} as any),
    };
  },
};

// ─── COST ANALYSIS SERVICE ───────────────────────────
export const CostAnalysisService = {
  async getProductionCosts(orderId?: string) {
    const where = orderId ? { orderId } : {};
    return db.productionCostReport.findMany({
      where,
      include: { order: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async calculateOrderCost(orderId: string) {
    const order = await db.productionOrder.findUnique({
      where: { id: orderId },
      include: {
        product: true,
        materialIssues: true,
        workOrders: true,
        subcontractOrders: true,
        shopFloorLogs: { where: { logType: "SCRAP" } },
      },
    });
    if (!order) throw new Error("Order not found");

    const materialCost = order.materialIssues.reduce((s, m) => s + m.totalCost, 0);
    const laborCost = order.workOrders.reduce((s, w) => s + w.laborHours * 100000, 0);
    const overheadCost = materialCost * 0.15;
    const subconCost = order.subcontractOrders.reduce((s, sc) => s + sc.totalCost, 0);
    const scrapCount = order.shopFloorLogs.reduce((s, l) => s + l.scrapCount, 0);
    const scrapCost = scrapCount * order.unitCost;
    const totalCost = materialCost + laborCost + overheadCost + subconCost + scrapCost;
    const unitCost = order.completedQty > 0 ? totalCost / order.completedQty : 0;

    const report = await db.productionCostReport.create({
      data: {
        orderId,
        period: new Date().toISOString().slice(0, 7),
        materialCost,
        laborCost,
        overheadCost,
        subconCost,
        scrapCost,
        totalCost,
        unitCost,
        efficiency: order.completedQty > 0 ? (order.completedQty / (order.completedQty + order.rejectedQty)) * 100 : 0,
      },
    });

    await db.productionOrder.update({
      where: { id: orderId },
      data: { materialCost, laborCost, overheadCost, totalCost, unitCost },
    });

    return report;
  },

  async getWorkCenterPerformance() {
    const workCenters = await db.workCenter.findMany({
      include: {
        productionOrders: {
          where: { status: { in: ["IN_PROGRESS", "COMPLETED"] } },
        },
        capacityEntries: { orderBy: { date: "desc" }, take: 30 },
      },
    });

    return workCenters.map((wc) => {
      const totalOrders = wc.productionOrders.length;
      const completedOrders = wc.productionOrders.filter((o) => o.status === "COMPLETED").length;
      const totalCost = wc.productionOrders.reduce((s, o) => s + o.totalCost, 0);
      const avgUtilization = wc.capacityEntries.length > 0
        ? wc.capacityEntries.reduce((s, c) => s + c.utilization, 0) / wc.capacityEntries.length
        : 0;

      return {
        id: wc.id,
        code: wc.code,
        name: wc.name,
        costPerHour: wc.costPerHour,
        totalOrders,
        completedOrders,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : "0",
        totalCost,
        avgUtilization: avgUtilization.toFixed(1),
      };
    });
  },

  async getMaterialConsumption() {
    const issues = await db.materialIssue.findMany({
      include: { order: { include: { product: true } } },
      orderBy: { issuedDate: "desc" },
    });

    const byMaterial = issues.reduce((acc, i) => {
      if (!acc[i.materialCode]) {
        acc[i.materialCode] = { materialCode: i.materialCode, totalQty: 0, totalCost: 0, orders: 0 };
      }
      acc[i.materialCode].totalQty += i.quantity;
      acc[i.materialCode].totalCost += i.totalCost;
      acc[i.materialCode].orders += 1;
      return acc;
    }, {} as any);

    return Object.values(byMaterial);
  },

  async getSubcontractReport() {
    const orders = await db.subcontractOrder.findMany({
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    });

    const totalCost = orders.reduce((s, o) => s + o.totalCost, 0);
    const bySupplier = orders.reduce((acc, o) => {
      if (!acc[o.supplierId]) {
        acc[o.supplierId] = { supplier: o.supplier.name, totalCost: 0, orders: 0 };
      }
      acc[o.supplierId].totalCost += o.totalCost;
      acc[o.supplierId].orders += 1;
      return acc;
    }, {} as any);

    return { orders, totalCost, bySupplier: Object.values(bySupplier) };
  },
};

// ─── LOT/SERIAL SERVICE ──────────────────────────────
export const LotSerialService = {
  async createLot(data: {
    productId?: string;
    materialCode?: string;
    quantity: number;
    expiryDate?: Date;
    notes?: string;
  }) {
    const lotNumber = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    return db.lotNumber.create({
      data: {
        lotNumber,
        productId: data.productId,
        materialCode: data.materialCode,
        quantity: data.quantity,
        expiryDate: data.expiryDate,
        notes: data.notes,
      },
    });
  },

  async createSerial(data: {
    productId?: string;
    lotId?: string;
    quantity: number;
  }) {
    const serials = [];
    for (let i = 0; i < data.quantity; i++) {
      const serialNumber = `SN-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(4, "0")}`;
      const sn = await db.serialNumber.create({
        data: {
          serialNumber,
          lotId: data.lotId,
          productId: data.productId,
        },
      });
      serials.push(sn);
    }
    return serials;
  },

  async getLots(productId?: string) {
    const where = productId ? { productId } : {};
    return db.lotNumber.findMany({
      where,
      include: { product: true, serialItems: true },
      orderBy: { producedDate: "desc" },
    });
  },

  async getSerials(productId?: string) {
    const where = productId ? { productId } : {};
    return db.serialNumber.findMany({
      where,
      include: { lot: true, product: true },
      orderBy: { id: "desc" },
    });
  },
};
