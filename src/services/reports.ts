import { db } from "@/lib/db";

export interface DateFilter {
  from?: string;
  to?: string;
}

function dateRange(where: any, field: string, filters: DateFilter) {
  if (filters.from || filters.to) {
    where[field] = {};
    if (filters.from) where[field].gte = new Date(filters.from);
    if (filters.to) where[field].lte = new Date(filters.to);
  }
  return where;
}

export const ReportsService = {
  async getProductionReport(filters: { from?: string; to?: string; status?: string }) {
    const where: any = {};
    dateRange(where, "createdAt", filters);
    if (filters.status) where.status = filters.status;

    const [orders, statusGroup, totalProduced, totalRejected, costSummary] = await Promise.all([
      db.productionOrder.findMany({
        where,
        include: { product: true, line: true },
        orderBy: { createdAt: "desc" },
      }),
      db.productionOrder.groupBy({ by: ["status"], _count: true, where }),
      db.productionOrder.aggregate({ _sum: { completedQty: true }, where: { ...where, status: "COMPLETED" } }),
      db.productionOrder.aggregate({ _sum: { rejectedQty: true }, where }),
      db.productionOrder.aggregate({
        _sum: { materialCost: true, laborCost: true, overheadCost: true, totalCost: true },
        where,
      }),
    ]);

    const totalPlanned = orders.reduce((s, o) => s + o.quantity, 0);
    const produced = totalProduced._sum.completedQty || 0;
    const rejected = totalRejected._sum.rejectedQty || 0;
    const yieldRate = produced > 0 ? ((produced - rejected) / produced * 100).toFixed(1) : "0";

    return {
      summary: {
        totalOrders: orders.length,
        totalPlanned,
        totalProduced: produced,
        totalRejected: rejected,
        yieldRate,
        materialCost: costSummary._sum.materialCost || 0,
        laborCost: costSummary._sum.laborCost || 0,
        overheadCost: costSummary._sum.overheadCost || 0,
        totalCost: costSummary._sum.totalCost || 0,
        statusBreakdown: statusGroup.map(s => ({ status: s.status, count: s._count })),
      },
      details: orders,
    };
  },

  async getSalesReport(filters: { from?: string; to?: string }) {
    const where: any = {};
    dateRange(where, "createdAt", filters);

    const [orders, totalAgg, byCustomer, byProduct, monthlyRaw] = await Promise.all([
      db.salesOrder.findMany({
        where,
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.salesOrder.aggregate({ _sum: { grandTotal: true, totalAmount: true }, _count: true, where }),
      db.salesOrder.groupBy({
        by: ["customerId"],
        _sum: { grandTotal: true },
        _count: true,
        where,
      }),
      db.salesOrderItem.groupBy({
        by: ["productId"],
        _sum: { totalPrice: true, quantity: true },
        where: { so: where },
      }),
      db.salesOrder.findMany({
        where,
        select: { createdAt: true, grandTotal: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const customerMap = new Map<string, { name: string; total: number; orders: number }>();
    for (const c of byCustomer) {
      const cust = await db.customer.findUnique({ where: { id: c.customerId } });
      const existing = customerMap.get(c.customerId) || { name: cust?.name || "Unknown", total: 0, orders: 0 };
      existing.total += c._sum.grandTotal || 0;
      existing.orders += c._count;
      customerMap.set(c.customerId, existing);
    }

    const productMap = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const p of byProduct) {
      const prod = await db.product.findUnique({ where: { id: p.productId } });
      const existing = productMap.get(p.productId) || { name: prod?.name || "Unknown", revenue: 0, quantity: 0 };
      existing.revenue += p._sum.totalPrice || 0;
      existing.quantity += p._sum.quantity || 0;
      productMap.set(p.productId, existing);
    }

    const monthlyMap = new Map<string, { month: string; revenue: number; orders: number }>();
    for (const m of monthlyRaw) {
      const key = m.createdAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(key) || { month: key, revenue: 0, orders: 0 };
      existing.revenue += m.grandTotal || 0;
      existing.orders += 1;
      monthlyMap.set(key, existing);
    }

    return {
      summary: {
        totalOrders: totalAgg._count,
        totalRevenue: totalAgg._sum.grandTotal || 0,
        avgOrderValue: totalAgg._count > 0 ? ((totalAgg._sum.grandTotal || 0) / totalAgg._count).toFixed(0) : 0,
      },
      byProduct: Array.from(productMap.values()),
      byCustomer: Array.from(customerMap.values()).sort((a, b) => b.total - a.total),
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    };
  },

  async getPurchaseReport(filters: { from?: string; to?: string }) {
    const where: any = {};
    dateRange(where, "createdAt", filters);

    const [orders, totalAgg, bySupplier, monthlyRaw] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        include: { supplier: true, items: true },
        orderBy: { createdAt: "desc" },
      }),
      db.purchaseOrder.aggregate({ _sum: { grandTotal: true, totalAmount: true }, _count: true, where }),
      db.purchaseOrder.groupBy({
        by: ["supplierId"],
        _sum: { grandTotal: true },
        _count: true,
        where,
      }),
      db.purchaseOrder.findMany({
        where,
        select: { createdAt: true, grandTotal: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const supplierMap = new Map<string, { name: string; total: number; orders: number }>();
    for (const s of bySupplier) {
      const sup = await db.supplier.findUnique({ where: { id: s.supplierId } });
      const existing = supplierMap.get(s.supplierId) || { name: sup?.name || "Unknown", total: 0, orders: 0 };
      existing.total += s._sum.grandTotal || 0;
      existing.orders += s._count;
      supplierMap.set(s.supplierId, existing);
    }

    const monthlyMap = new Map<string, { month: string; spend: number; orders: number }>();
    for (const m of monthlyRaw) {
      const key = m.createdAt.toISOString().slice(0, 7);
      const existing = monthlyMap.get(key) || { month: key, spend: 0, orders: 0 };
      existing.spend += m.grandTotal || 0;
      existing.orders += 1;
      monthlyMap.set(key, existing);
    }

    const statusGroup = await db.purchaseOrder.groupBy({ by: ["status"], _count: true, where });

    return {
      summary: {
        totalOrders: totalAgg._count,
        totalSpend: totalAgg._sum.grandTotal || 0,
        avgOrderValue: totalAgg._count > 0 ? ((totalAgg._sum.grandTotal || 0) / totalAgg._count).toFixed(0) : 0,
        statusBreakdown: statusGroup.map(s => ({ status: s.status, count: s._count })),
      },
      bySupplier: Array.from(supplierMap.values()).sort((a, b) => b.total - a.total),
      monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    };
  },

  async getInventoryReport() {
    const [items, byType, lowStock, overStock, totalValue] = await Promise.all([
      db.inventoryItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      db.inventoryItem.groupBy({ by: ["type"], _count: true, _sum: { currentStock: true }, where: { isActive: true } }),
      db.inventoryItem.findMany({
        where: { isActive: true, currentStock: { lte: db.inventoryItem.fields.minStock } },
      }),
      db.inventoryItem.findMany({
        where: { isActive: true, maxStock: { not: null }, currentStock: { gte: db.inventoryItem.fields.maxStock! } },
      }),
      db.inventoryItem.aggregate({ _sum: { currentStock: true }, where: { isActive: true } }),
    ]);

    const totalStock = items.reduce((s, i) => s + i.currentStock, 0);
    const totalValueCalc = items.reduce((s, i) => s + i.currentStock * i.unitCost, 0);

    return {
      summary: {
        totalItems: items.length,
        totalStock,
        totalValue: totalValueCalc,
        lowStockCount: lowStock.length,
        overStockCount: overStock.length,
      },
      byCategory: byType.map(t => ({
        type: t.type,
        count: t._count,
        totalStock: t._sum.currentStock || 0,
      })),
      lowStock: lowStock.map(i => ({
        id: i.id,
        name: i.name,
        materialCode: i.materialCode,
        currentStock: i.currentStock,
        minStock: i.minStock,
        unit: i.unit,
      })),
      overStock: overStock.map(i => ({
        id: i.id,
        name: i.name,
        materialCode: i.materialCode,
        currentStock: i.currentStock,
        maxStock: i.maxStock,
        unit: i.unit,
      })),
    };
  },

  async getFinancialReport(filters: { from?: string; to?: string }) {
    const start = filters.from ? new Date(filters.from) : new Date(new Date().getFullYear(), 0, 1);
    const end = filters.to ? new Date(filters.to) : new Date();

    const [journalLines, accounts] = await Promise.all([
      db.journalLine.findMany({
        where: { entry: { entryDate: { gte: start, lte: end }, isPosted: true } },
        include: { account: true, entry: true },
      }),
      db.account.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    ]);

    const byAccountMap = new Map<string, { code: string; name: string; type: string; debit: number; credit: number }>();
    for (const line of journalLines) {
      const existing = byAccountMap.get(line.accountCode) || {
        code: line.accountCode,
        name: line.account.name,
        type: line.account.type,
        debit: 0,
        credit: 0,
      };
      existing.debit += line.debit;
      existing.credit += line.credit;
      byAccountMap.set(line.accountCode, existing);
    }

    const byAccount = Array.from(byAccountMap.values()).map(a => ({
      ...a,
      balance: a.debit - a.credit,
    }));

    const revenue = byAccount.filter(a => a.type === "REVENUE").reduce((s, a) => s + a.credit - a.debit, 0);
    const cogs = byAccount.filter(a => a.type === "COST_OF_GOODS").reduce((s, a) => s + a.debit - a.credit, 0);
    const expenses = byAccount.filter(a => a.type === "EXPENSE").reduce((s, a) => s + a.debit - a.credit, 0);
    const assets = byAccount.filter(a => a.type === "ASSET").reduce((s, a) => s + a.debit - a.credit, 0);
    const liabilities = byAccount.filter(a => a.type === "LIABILITY").reduce((s, a) => s + a.credit - a.debit, 0);
    const equity = byAccount.filter(a => a.type === "EQUITY").reduce((s, a) => s + a.credit - a.debit, 0);

    return {
      summary: {
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        expenses,
        netIncome: revenue - cogs - expenses,
        assets,
        liabilities,
        equity,
        grossMargin: revenue > 0 ? ((revenue - cogs) / revenue * 100).toFixed(1) : "0",
        netMargin: revenue > 0 ? ((revenue - cogs - expenses) / revenue * 100).toFixed(1) : "0",
      },
      byAccount,
      incomeStatement: {
        revenue,
        cogs,
        grossProfit: revenue - cogs,
        operatingExpenses: expenses,
        netIncome: revenue - cogs - expenses,
      },
    };
  },

  async getQualityReport(filters: { from?: string; to?: string }) {
    const where: any = {};
    dateRange(where, "createdAt", filters);

    const [inspections, byType, byStatus] = await Promise.all([
      db.qualityInspection.findMany({
        where,
        include: { order: true, inspector: true },
        orderBy: { createdAt: "desc" },
      }),
      db.qualityInspection.groupBy({
        by: ["inspectionType"],
        _count: true,
        _sum: { passCount: true, failCount: true },
        where,
      }),
      db.qualityInspection.groupBy({
        by: ["status"],
        _count: true,
        where,
      }),
    ]);

    const totalInspections = inspections.length;
    const passed = inspections.filter(i => i.status === "PASSED").length;
    const failed = inspections.filter(i => i.status === "FAILED").length;
    const totalPass = inspections.reduce((s, i) => s + i.passCount, 0);
    const totalFail = inspections.reduce((s, i) => s + i.failCount, 0);
    const passRate = (totalPass + totalFail) > 0 ? (totalPass / (totalPass + totalFail) * 100).toFixed(1) : "0";

    const defectMap = new Map<string, number>();
    for (const insp of inspections) {
      if (insp.defectDetails && Array.isArray(insp.defectDetails)) {
        for (const d of insp.defectDetails as any[]) {
          const code = d.code || d.type || "Unknown";
          defectMap.set(code, (defectMap.get(code) || 0) + (d.count || 1));
        }
      }
    }

    return {
      summary: {
        totalInspections,
        passed,
        failed,
        totalPassCount: totalPass,
        totalFailCount: totalFail,
        passRate,
      },
      byType: byType.map(t => ({
        type: t.inspectionType,
        count: t._count,
        passCount: t._sum.passCount || 0,
        failCount: t._sum.failCount || 0,
      })),
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
      topDefects: Array.from(defectMap.entries())
        .map(([code, count]) => ({ code, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  },

  async getDashboardKPIs() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      revenue,
      cogs,
      expenses,
      activeOrders,
      completedOrders,
      totalOrders,
      qualityInspections,
      failedInspections,
      machines,
      runningMachines,
      lowStockItems,
      openSOs,
      openPOs,
    ] = await Promise.all([
      db.salesOrder.aggregate({
        _sum: { grandTotal: true },
        where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      }),
      db.journalLine.aggregate({
        _sum: { debit: true },
        where: { accountCode: "5101", entry: { entryDate: { gte: startOfMonth }, isPosted: true } },
      }),
      db.journalLine.aggregate({
        _sum: { debit: true },
        where: { accountCode: { startsWith: "6" }, entry: { entryDate: { gte: startOfMonth }, isPosted: true } },
      }),
      db.productionOrder.count({ where: { status: "IN_PROGRESS" } }),
      db.productionOrder.count({ where: { status: "COMPLETED", createdAt: { gte: startOfMonth } } }),
      db.productionOrder.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.qualityInspection.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.qualityInspection.count({ where: { createdAt: { gte: startOfMonth }, status: "FAILED" } }),
      db.machine.count({ where: { isActive: true } }),
      db.machine.count({ where: { isActive: true, status: "RUNNING" } }),
      db.inventoryItem.count({
        where: { isActive: true, currentStock: { lte: db.inventoryItem.fields.minStock } },
      }),
      db.salesOrder.count({ where: { status: { in: ["DRAFT", "CONFIRMED", "IN_PRODUCTION", "PICKING"] } } }),
      db.purchaseOrder.count({ where: { status: { in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] } } }),
    ]);

    const rev = revenue._sum.grandTotal || 0;
    const cog = cogs._sum.debit || 0;
    const exp = expenses._sum.debit || 0;

    return {
      revenue: rev,
      costs: cog + exp,
      profit: rev - cog - exp,
      orders: { active: activeOrders, completed: completedOrders, total: totalOrders },
      production: { active: activeOrders, completed: completedOrders, total: totalOrders },
      quality: {
        inspections: qualityInspections,
        failed: failedInspections,
        passRate: qualityInspections > 0 ? ((qualityInspections - failedInspections) / qualityInspections * 100).toFixed(1) : "0",
      },
      machines: { total: machines, running: runningMachines, down: machines - runningMachines },
      inventory: { lowStockCount: lowStockItems },
      sales: { openSOs },
      purchasing: { openPOs },
    };
  },
};
