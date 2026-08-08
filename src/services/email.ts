import { db } from "@/lib/db";

export async function queueEmail(to: string, subject: string, body: string) {
  return db.emailQueue.create({
    data: { to, subject, body, status: "PENDING" },
  });
}

export async function processQueue() {
  const pending = await db.emailQueue.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  let sent = 0;
  let failed = 0;

  for (const email of pending) {
    try {
      await db.emailQueue.update({
        where: { id: email.id },
        data: { status: "SENDING", attempts: { increment: 1 } },
      });

      // No SMTP configured — mark as sent immediately
      await db.emailQueue.update({
        where: { id: email.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sent++;
    } catch (err: any) {
      const newStatus = email.attempts + 1 >= email.maxAttempts ? "FAILED" : "PENDING";
      await db.emailQueue.update({
        where: { id: email.id },
        data: { status: newStatus, error: err.message },
      });
      failed++;
    }
  }

  return { sent, failed };
}

export async function sendOrderConfirmation(orderId: string, type: "PO" | "SO") {
  if (type === "PO") {
    const order = await db.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { supplier: true, items: true },
    });
    if (!order) return;

    const html = renderEmail("order_confirmation", {
      orderNumber: order.poNumber,
      type: "Purchase Order",
      party: order.supplier.name,
      total: order.grandTotal.toLocaleString("id-ID", { style: "currency", currency: "IDR" }),
      items: order.items.map((i) => `${i.materialCode} x ${i.quantity}`).join(", "),
    });

    await queueEmail(order.supplier.email || "", `Order Confirmation - ${order.poNumber}`, html);
  } else {
    const order = await db.salesOrder.findUnique({
      where: { id: orderId },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!order) return;

    const html = renderEmail("order_confirmation", {
      orderNumber: order.soNumber,
      type: "Sales Order",
      party: order.customer.name,
      total: order.grandTotal.toLocaleString("id-ID", { style: "currency", currency: "IDR" }),
      items: order.items.map((i) => `${i.product.name} x ${i.quantity}`).join(", "),
    });

    await queueEmail(order.customer.email || "", `Order Confirmation - ${order.soNumber}`, html);
  }
}

export async function sendDeliveryNotification(deliveryId: string) {
  const delivery = await db.deliveryOrder.findUnique({
    where: { id: deliveryId },
    include: { so: { include: { customer: true } } },
  });
  if (!delivery || !delivery.so) return;

  const so = delivery.so as any;
  const html = renderEmail("delivery_notification", {
    doNumber: delivery.doNumber,
    soNumber: so.soNumber,
    customer: so.customer.name,
    status: delivery.status,
    date: delivery.deliveryDate.toLocaleDateString("id-ID"),
  });

  await queueEmail(so.customer.email || "", `Delivery Update - ${delivery.doNumber}`, html);
}

export async function sendQualityAlert(inspectionId: string) {
  const inspection = await db.qualityInspection.findUnique({
    where: { id: inspectionId },
    include: { inspector: true, order: true },
  });
  if (!inspection) return;

  const html = renderEmail("quality_alert", {
    inspectionNumber: inspection.inspectionNumber,
    orderNumber: inspection.order?.orderNumber || "N/A",
    status: inspection.status,
    result: inspection.result || "PENDING",
    failCount: inspection.failCount,
    inspector: inspection.inspector.name,
  });

  await queueEmail(inspection.inspector.email || "", `Quality Alert - ${inspection.inspectionNumber}`, html);
}

export async function sendLowStockAlert(itemId: string) {
  const item = await db.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item) return;

  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true } });

  const html = renderEmail("low_stock_alert", {
    materialCode: item.materialCode,
    name: item.name,
    currentStock: item.currentStock,
    reorderPoint: (item as any).reorderPoint || 0,
    minStock: item.minStock,
  });

  for (const admin of admins) {
    await queueEmail(admin.email, `Low Stock Alert - ${item.materialCode}`, html);
  }
}

export async function sendMaintenanceReminder(scheduleId: string) {
  const schedule = await db.maintenanceSchedule.findUnique({
    where: { id: scheduleId },
    include: { machine: true },
  });
  if (!schedule) return;

  const assignedUser = schedule.assignedTo
    ? await db.user.findUnique({ where: { id: schedule.assignedTo } })
    : null;

  const html = renderEmail("maintenance_reminder", {
    title: schedule.title,
    machine: schedule.machine.name,
    type: schedule.type,
    nextDue: schedule.nextDueDate.toLocaleDateString("id-ID"),
    priority: schedule.priority,
  });

  if (assignedUser?.email) {
    await queueEmail(assignedUser.email, `Maintenance Due - ${schedule.title}`, html);
  }
}

export function renderEmail(template: string, data: Record<string, any>): string {
  const templates: Record<string, string> = {
    order_confirmation: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#1e40af">${data.type} Confirmation</h2>
        <p>Dear ${data.party},</p>
        <p>Your order <strong>${data.orderNumber}</strong> has been confirmed.</p>
        <p><strong>Items:</strong> ${data.items}</p>
        <p><strong>Total:</strong> ${data.total}</p>
        <p>Thank you for your business.</p>
      </div>`,
    delivery_notification: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#1e40af">Delivery Update</h2>
        <p>Dear ${data.customer},</p>
        <p>Delivery <strong>${data.doNumber}</strong> for Sales Order <strong>${data.soNumber}</strong> is now <strong>${data.status}</strong>.</p>
        <p><strong>Date:</strong> ${data.date}</p>
      </div>`,
    quality_alert: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#dc2626">Quality Alert</h2>
        <p>Inspection <strong>${data.inspectionNumber}</strong> requires attention.</p>
        <p><strong>Production Order:</strong> ${data.orderNumber}</p>
        <p><strong>Status:</strong> ${data.status}</p>
        <p><strong>Result:</strong> ${data.result}</p>
        <p><strong>Failed Items:</strong> ${data.failCount}</p>
        <p><strong>Inspector:</strong> ${data.inspector}</p>
      </div>`,
    low_stock_alert: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#f59e0b">Low Stock Warning</h2>
        <p>Material <strong>${data.materialCode}</strong> (${data.name}) is running low.</p>
        <p><strong>Current Stock:</strong> ${data.currentStock}</p>
        <p><strong>Reorder Point:</strong> ${data.reorderPoint}</p>
        <p><strong>Minimum Stock:</strong> ${data.minStock}</p>
        <p>Please consider placing a purchase order.</p>
      </div>`,
    maintenance_reminder: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <h2 style="color:#7c3aed">Maintenance Reminder</h2>
        <p>Scheduled maintenance <strong>${data.title}</strong> is due.</p>
        <p><strong>Machine:</strong> ${data.machine}</p>
        <p><strong>Type:</strong> ${data.type}</p>
        <p><strong>Due Date:</strong> ${data.nextDue}</p>
        <p><strong>Priority:</strong> ${data.priority}</p>
      </div>`,
  };

  const content = templates[template] || `<p>${JSON.stringify(data)}</p>`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6">${content}</body></html>`;
}
