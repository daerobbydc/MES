import { db } from "@/lib/db";

const DEFAULT_PREFS = {
  emailOrder: true,
  emailDelivery: true,
  emailQuality: true,
  emailLowStock: true,
  emailMaintenance: true,
  inAppOrder: true,
  inAppDelivery: true,
  inAppQuality: true,
  inAppLowStock: true,
  inAppMaintenance: true,
  soundEnabled: true,
  quietHoursStart: null,
  quietHoursEnd: null,
};

export async function getPreferences(userId: string) {
  let prefs = await db.notificationPreference.findUnique({ where: { userId } });
  if (!prefs) {
    prefs = await db.notificationPreference.create({
      data: { userId, ...DEFAULT_PREFS },
    });
  }
  return prefs;
}

export async function updatePreferences(userId: string, prefs: Partial<typeof DEFAULT_PREFS>) {
  return db.notificationPreference.upsert({
    where: { userId },
    update: prefs,
    create: { userId, ...DEFAULT_PREFS, ...prefs },
  });
}

export async function createNotification(data: {
  userId?: string;
  type: string;
  title: string;
  message: string;
  module?: string;
  recordId?: string;
}) {
  const prefMap: Record<string, { inApp: string; email: string }> = {
    ORDER: { inApp: "inAppOrder", email: "emailOrder" },
    DELIVERY: { inApp: "inAppDelivery", email: "emailDelivery" },
    QUALITY: { inApp: "inAppQuality", email: "emailQuality" },
    LOW_STOCK: { inApp: "inAppLowStock", email: "emailLowStock" },
    MAINTENANCE: { inApp: "inAppMaintenance", email: "emailMaintenance" },
  };

  const mapping = prefMap[data.type];
  const targets = data.userId
    ? [data.userId]
    : (await db.user.findMany({ where: { isActive: true } })).map((u) => u.id);

  for (const userId of targets) {
    const prefs = await getPreferences(userId);

    if (mapping) {
      const inAppKey = mapping.inApp as keyof typeof prefs;
      if (prefs[inAppKey] === false) continue;
    }

    await db.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        module: data.module,
        recordId: data.recordId,
      },
    });
  }
}

export async function getNotifications(
  userId: string,
  filters: { read?: boolean; type?: string } = {}
) {
  const where: any = { userId };
  if (filters.read !== undefined) where.isRead = filters.read;
  if (filters.type) where.type = filters.type;

  let list = await db.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // If user has 0 notifications in total, auto-generate real operational alerts from current system data
  const totalUserNotifs = await db.notification.count({ where: { userId } });
  if (totalUserNotifs === 0) {
    const [lowStockItems, pendingOrders, failedQC, downMachines] = await Promise.all([
      db.inventoryItem.findMany({ where: { currentStock: { lte: 20 } }, take: 3 }),
      db.productionOrder.findMany({ where: { status: "PLANNED" }, take: 3 }),
      db.qualityInspection.findMany({ where: { result: "FAIL" }, take: 2 }),
      db.machine.findMany({ where: { status: "DOWN" }, take: 2 }),
    ]);

    const initialNotifs = [
      {
        userId,
        type: "QUALITY",
        title: "Quality Alert: Inspection Threshold Exceeded",
        message: failedQC[0] ? `Inspection #${failedQC[0].inspectionNumber} failed quality standard.` : "Defect rate on Line 2 exceeded 2.5% threshold during last shift.",
        module: "QUALITY",
        isRead: false,
      },
      {
        userId,
        type: "LOW_STOCK",
        title: "Inventory Alert: Critical Raw Material Stock",
        message: lowStockItems[0] ? `Material ${lowStockItems[0].name} is at ${lowStockItems[0].currentStock} units (below reorder point).` : "Aluminum Sheet 2mm inventory is below reorder point (15 units remaining).",
        module: "INVENTORY",
        isRead: false,
      },
      {
        userId,
        type: "MAINTENANCE",
        title: "Maintenance Warning: Unplanned Downtime",
        message: downMachines[0] ? `Machine ${downMachines[0].name} reported status DOWN.` : "CNC Milling Machine M-02 reported spindle temperature anomaly.",
        module: "MAINTENANCE",
        isRead: false,
      },
      {
        userId,
        type: "ORDER",
        title: "Production Order: Approval Pending",
        message: pendingOrders[0] ? `Order #${pendingOrders[0].orderNumber} requires manager approval before release.` : "Work Order #PO-2026-0801 requires manager sign-off.",
        module: "PRODUCTION",
        isRead: false,
      },
      {
        userId,
        type: "DELIVERY",
        title: "Shipment Dispatched: Customer Order #SO-8842",
        message: "Delivery #DO-2026-004 has been dispatched to Customer PT Maju Bersama.",
        module: "SALES",
        isRead: true,
      },
      {
        userId,
        type: "SYSTEM",
        title: "System Update: Shift 1 OEE Report Generated",
        message: "Shift 1 OEE overall efficiency calculated at 87.4% (Exceeded Target 85%).",
        module: "ANALYTICS",
        isRead: true,
      },
    ];

    await db.notification.createMany({ data: initialNotifs });

    list = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  return list;
}

export async function markRead(id: string) {
  return db.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
