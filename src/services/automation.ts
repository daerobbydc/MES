import { PrismaClient, OrderStatus, POStatus, MovementType } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ═══════════════════════════════════════════════════════
// NOTIFICATION SERVICE
// ═══════════════════════════════════════════════════════

export interface NotificationData {
  type: "LOW_STOCK" | "QUALITY_FAIL" | "ANDON_ALERT" | "ORDER_COMPLETE" | "REORDER_POINT" | "MACHINE_DOWN" | "PO_OVERDUE";
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  referenceType?: string;
  referenceId?: string;
  userId?: string;
}

// In-memory notification store (in production, use DB table)
const notifications: (NotificationData & { id: string; createdAt: Date; read: boolean })[] = [];

export function createNotification(data: NotificationData) {
  const notification = {
    ...data,
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date(),
    read: false,
  };
  notifications.unshift(notification);
  if (notifications.length > 100) notifications.pop();
  console.log(`[NOTIFICATION] ${data.severity}: ${data.title} - ${data.message}`);
  return notification;
}

export function getNotifications(unreadOnly = false) {
  return unreadOnly ? notifications.filter(n => !n.read) : notifications;
}

export function markNotificationRead(id: string) {
  const notif = notifications.find(n => n.id === id);
  if (notif) notif.read = true;
  return notif;
}

// ═══════════════════════════════════════════════════════
// REORDER POINT CHECKER
// ═══════════════════════════════════════════════════════

export async function checkReorderPoints() {
  const lowStockItems = await db.inventoryItem.findMany({
    where: {
      isActive: true,
      currentStock: { lte: db.inventoryItem.fields.reorderPoint as any },
    },
  });

  // Check items where currentStock <= reorderPoint via InventoryItem
  const allItems = await db.inventoryItem.findMany({
    where: { isActive: true },
  });

  const reorderAlerts = [];
  for (const item of allItems) {
    const reorderPoint = (item as any).reorderPoint || 0;
    if (reorderPoint > 0 && item.currentStock <= reorderPoint) {
      const alert = createNotification({
        type: "REORDER_POINT",
        title: `Low Stock: ${item.name || item.materialCode}`,
        message: `Stock level ${item.currentStock} is at or below reorder point ${reorderPoint}. Consider placing a purchase order.`,
        severity: item.currentStock <= reorderPoint * 0.5 ? "CRITICAL" : "WARNING",
        referenceType: "INVENTORY_ITEM",
        referenceId: item.id,
      });
      reorderAlerts.push(alert);
    }
  }

  return reorderAlerts;
}

// ═══════════════════════════════════════════════════════
// QUALITY GATE — AUTO-TRIGGER INSPECTION
// ═══════════════════════════════════════════════════════

export async function triggerQualityInspection(orderId: string) {
  const order = await db.productionOrder.findUnique({
    where: { id: orderId },
    include: { product: true },
  });
  if (!order) return null;

  const inspectionNumber = `QC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

  const inspection = await db.qualityInspection.create({
    data: {
      inspectionNumber,
      orderId,
      productId: order.productId,
      inspectorId: order.createdBy,
      inspectionType: "FINAL",
      sampleSize: Math.max(1, Math.floor(order.completedQty * 0.1)), // 10% sample
      status: "PENDING",
      notes: `Auto-triggered on production completion of ${order.orderNumber}`,
    },
  });

  createNotification({
    type: "QUALITY_FAIL",
    title: `Quality Inspection Required: ${order.orderNumber}`,
    message: `Production order ${order.orderNumber} completed. Final quality inspection ${inspectionNumber} pending.`,
    severity: "INFO",
    referenceType: "QUALITY_INSPECTION",
    referenceId: inspection.id,
  });

  return inspection;
}

// ═══════════════════════════════════════════════════════
// SCRAP JOURNAL ENTRY
// ═══════════════════════════════════════════════════════

export async function createScrapJournal(data: {
  orderId: string;
  scrapCount: number;
  unitCost: number;
  createdBy: string;
  orderNumber: string;
}) {
  const scrapValue = data.scrapCount * data.unitCost;
  if (scrapValue <= 0) return null;

  const ACCOUNTS = {
    INVENTORY_WIP: "1202",
    GAIN_LOSS: "9101",
  };

  return db.journalEntry.create({
    data: {
      entryNumber: `JE-SCRAP-${data.orderNumber}-${Date.now()}`,
      description: `Scrap Loss - ${data.orderNumber}: ${data.scrapCount} units`,
      referenceType: "PRODUCTION_ORDER",
      referenceId: data.orderId,
      totalDebit: scrapValue,
      totalCredit: scrapValue,
      isPosted: true,
      postedAt: new Date(),
      createdBy: data.createdBy,
      lines: {
        create: [
          { accountCode: ACCOUNTS.GAIN_LOSS, debit: scrapValue, credit: 0 },
          { accountCode: ACCOUNTS.INVENTORY_WIP, debit: 0, credit: scrapValue },
        ],
      },
    },
  });
}

// ═══════════════════════════════════════════════════════
// MRP → AUTO PURCHASE REQUISITION
// ═══════════════════════════════════════════════════════

export async function autoCreatePurchaseRequisition(shortages: { materialCode: string; materialName: string; shortageQty: number; unitCost: number }[]) {
  const requisitions = [];

  for (const shortage of shortages) {
    if (shortage.shortageQty <= 0) continue;

    const poNumber = `PR-AUTO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    // Find or use default supplier
    const supplier = await db.supplier.findFirst({ where: { isActive: true } });
    if (!supplier) continue;

    const po = await db.purchaseOrder.create({
      data: {
        poNumber: poNumber,
        supplierId: supplier.id,
        status: POStatus.DRAFT,
        expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        totalAmount: shortage.shortageQty * shortage.unitCost,
        grandTotal: shortage.shortageQty * shortage.unitCost,
        notes: `Auto-generated from MRP shortage for ${shortage.materialName}`,
        createdBy: "system",
        items: {
          create: {
            materialCode: shortage.materialCode,
            description: shortage.materialName,
            quantity: shortage.shortageQty,
            receivedQty: 0,
            unitPrice: shortage.unitCost,
            totalPrice: shortage.shortageQty * shortage.unitCost,
            unit: "PCS",
          },
        },
      },
      include: { items: true },
    });

    createNotification({
      type: "REORDER_POINT",
      title: `Auto PO Created: ${poNumber}`,
      message: `Purchase order ${poNumber} auto-created for ${shortage.materialName} (qty: ${shortage.shortageQty})`,
      severity: "INFO",
      referenceType: "PURCHASE_ORDER",
      referenceId: po.id,
    });

    requisitions.push(po);
  }

  return requisitions;
}

// ═══════════════════════════════════════════════════════
// SO → AUTO PRODUCTION ORDER
// ═══════════════════════════════════════════════════════

export async function autoCreateProductionFromSO(soId: string) {
  const so = await db.salesOrder.findUnique({
    where: { id: soId },
    include: { items: { include: { product: true } } },
  });
  if (!so) return null;

  const productionOrders = [];

  for (const item of so.items) {
    // Only create PO for FINISHED_GOOD products
    if (item.product?.type !== "FINISHED_GOOD") continue;

    // Check if there's already enough finished goods stock
    const fgItem = await db.inventoryItem.findFirst({ where: { productId: item.productId } });
    const availableStock = fgItem?.availableStock || 0;
    const neededQty = item.quantity - availableStock;

    if (neededQty <= 0) continue; // Already have enough stock

    const orderNumber = `MO-SO-${so.soNumber}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    const prodOrder = await db.productionOrder.create({
      data: {
        orderNumber,
        salesOrderId: soId,
        productId: item.productId,
        quantity: neededQty,
        status: OrderStatus.PLANNED,
        createdBy: "system",
        notes: `Auto-generated from Sales Order ${so.soNumber}`,
      },
    });

    productionOrders.push(prodOrder);
  }

  if (productionOrders.length > 0) {
    createNotification({
      type: "ORDER_COMPLETE",
      title: `Production Orders Created from SO ${so.soNumber}`,
      message: `${productionOrders.length} production order(s) auto-created for Sales Order ${so.soNumber}`,
      severity: "INFO",
      referenceType: "SALES_ORDER",
      referenceId: soId,
    });
  }

  return productionOrders;
}

// ═══════════════════════════════════════════════════════
// FEFO / EXPIRY CHECK
// ═══════════════════════════════════════════════════════

export async function checkExpiryDuringIssue(materialCode: string, quantity: number) {
  const lots = await db.lotNumber.findMany({
    where: {
      materialCode,
      expiryDate: { not: null },
      quantity: { gt: 0 },
    },
    orderBy: { expiryDate: "asc" },
  });

  const now = new Date();
  const expiredLots = lots.filter(l => l.expiryDate && l.expiryDate < now);
  const expiringSoonLots = lots.filter(l => {
    if (!l.expiryDate) return false;
    const daysUntilExpiry = (l.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  if (expiredLots.length > 0) {
    createNotification({
      type: "QUALITY_FAIL",
      title: `Expired Material: ${materialCode}`,
      message: `${expiredLots.length} lot(s) of ${materialCode} have expired. FEFO violation risk.`,
      severity: "CRITICAL",
      referenceType: "LOT_NUMBER",
      referenceId: expiredLots[0].id,
    });
  }

  if (expiringSoonLots.length > 0) {
    createNotification({
      type: "LOW_STOCK",
      title: `Material Expiring Soon: ${materialCode}`,
      message: `${expiringSoonLots.length} lot(s) of ${materialCode} expire within 30 days.`,
      severity: "WARNING",
      referenceType: "LOT_NUMBER",
      referenceId: expiringSoonLots[0].id,
    });
  }

  return { expiredLots, expiringSoonLots };
}

// ═══════════════════════════════════════════════════════
// CAPACITY CONFLICT DETECTION
// ═══════════════════════════════════════════════════════

export async function checkCapacityConflict(lineId: string, startDate: Date, endDate: Date, excludeOrderId?: string) {
  const conflictingOrders = await db.productionOrder.findMany({
    where: {
      lineId,
      status: { in: ["PLANNED", "RELEASED", "IN_PROGRESS"] },
      id: excludeOrderId ? { not: excludeOrderId } : undefined,
      OR: [
        { plannedStart: { lte: endDate }, plannedEnd: { gte: startDate } },
        { plannedStart: { lte: endDate }, plannedEnd: null },
      ],
    },
    include: { product: true },
  });

  return conflictingOrders;
}

// ═══════════════════════════════════════════════════════
// AUTO-SAVE DEMAND FORECAST
// ═══════════════════════════════════════════════════════

export async function autoSaveForecast(productId: string, forecastData: { period: string; forecastedQty: number; confidenceLevel: number; method?: string }[]) {
  const forecasts = [];
  for (const f of forecastData) {
    const forecast = await db.demandForecast.create({
      data: {
        productId,
        forecastPeriod: f.period,
        forecastDate: new Date(),
        forecastedQty: f.forecastedQty,
        confidenceLevel: f.confidenceLevel,
        method: (f.method as any) || "MOVING_AVERAGE",
        createdBy: "system",
      },
    });
    forecasts.push(forecast);
  }
  return forecasts;
}
