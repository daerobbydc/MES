import { PrismaClient, AccountType, MovementType, POStatus, GRStatus, SOStatus, DOStatus, OrderStatus, InvoiceStatus } from "@prisma/client";
import { checkReorderPoints, triggerQualityInspection, createScrapJournal, autoCreateProductionFromSO, checkExpiryDuringIssue } from "./automation";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// ─── ACCOUNT MAP ─────────────────────────────────────
const ACCOUNTS = {
  CASH: "1101",
  ACCOUNTS_RECEIVABLE: "1102",
  INVENTORY_RAW: "1201",
  INVENTORY_WIP: "1202",
  INVENTORY_FG: "1203",
  ACCOUNTS_PAYABLE: "2101",
  TAX_PAYABLE: "2102",
  SALES_REVENUE: "4101",
  SALES_returns: "4102",
  COST_OF_GOODS_SOLD: "5101",
  LABOR_COST: "5201",
  OVERHEAD_COST: "5301",
  PURCHASE_EXPENSE: "6101",
  PURCHASE_DISCOUNT: "6102",
  GAIN_LOSS: "9101",
} as const;

// ─── JOURNAL ENTRY SERVICE ───────────────────────────
async function createJournalEntry(data: {
  entryNumber: string;
  description: string;
  referenceType: string;
  referenceId: string;
  lines: { accountCode: string; debit: number; credit: number; description?: string }[];
  createdBy: string;
}) {
  const totalDebit = data.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal不平衡: Debit ${totalDebit} != Credit ${totalCredit}`);
  }

  return db.journalEntry.create({
    data: {
      entryNumber: data.entryNumber,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      description: data.description,
      totalDebit,
      totalCredit,
      isPosted: true,
      postedAt: new Date(),
      createdBy: data.createdBy,
      lines: {
        create: data.lines.map((l) => ({
          accountCode: l.accountCode,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
    },
  });
}

// ─── PURCHASING SERVICE ──────────────────────────────
export const PurchasingService = {
  async createOrder(data: {
    supplierId: string;
    items: { productId?: string; materialCode: string; description?: string; quantity: number; unitPrice: number; unit?: string }[];
    expectedDate?: Date;
    notes?: string;
    createdBy: string;
  }) {
    const poNumber = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const po = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: data.supplierId,
        expectedDate: data.expectedDate,
        totalAmount,
        grandTotal: totalAmount,
        notes: data.notes,
        createdBy: data.createdBy,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            materialCode: i.materialCode,
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.quantity * i.unitPrice,
            unit: i.unit || "PCS",
          })),
        },
      },
      include: { items: true, supplier: true },
    });

    await createJournalEntry({
      entryNumber: `JE-PO-${poNumber}`,
      description: `Purchase Order ${poNumber} to ${po.supplier.name}`,
      referenceType: "PURCHASE_ORDER",
      referenceId: po.id,
      lines: [
        { accountCode: ACCOUNTS.PURCHASE_EXPENSE, debit: totalAmount, credit: 0 },
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: 0, credit: totalAmount },
      ],
      createdBy: data.createdBy,
    });

    return po;
  },

  async approveOrder(poId: string, approvedBy: string) {
    return db.purchaseOrder.update({
      where: { id: poId },
      data: { status: POStatus.APPROVED, approvedBy, approvedAt: new Date() },
    });
  },

  async receiveGoods(data: {
    poId?: string;
    supplierId: string;
    warehouseId?: string;
    items: { poItemId?: string; materialCode: string; quantity: number; unitPrice: number; locationId?: string }[];
    receivedBy: string;
  }) {
    const grnNumber = `GRN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const grn = await db.goodsReceipt.create({
      data: {
        grnNumber,
        poId: data.poId,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        receivedBy: data.receivedBy,
        totalAmount,
        items: {
          create: data.items.map((i) => ({
            poItemId: i.poItemId,
            materialCode: i.materialCode,
            quantity: i.quantity,
            acceptedQty: i.quantity,
            unitPrice: i.unitPrice,
            locationId: i.locationId,
          })),
        },
      },
      include: { items: true },
    });

    for (const item of data.items) {
      const existing = await db.inventoryItem.findFirst({ where: { materialCode: item.materialCode } });
      if (existing) {
        await db.inventoryItem.update({
          where: { id: existing.id },
          data: {
            currentStock: { increment: item.quantity },
            availableStock: { increment: item.quantity },
            lastPurchasePrice: item.unitPrice,
          },
        });
      } else {
        await db.inventoryItem.create({
          data: {
            materialCode: item.materialCode,
            name: item.materialCode,
            type: "RAW_MATERIAL",
            currentStock: item.quantity,
            availableStock: item.quantity,
            unitCost: item.unitPrice,
            lastPurchasePrice: item.unitPrice,
            locationId: item.locationId,
            defaultWarehouseId: data.warehouseId,
          },
        });
      }

      await db.inventoryMovement.create({
        data: {
          itemId: existing?.id || (await db.inventoryItem.findFirst({ where: { materialCode: item.materialCode } }))!.id,
          type: MovementType.INBOUND,
          quantity: item.quantity,
          unitCost: item.unitPrice,
          totalCost: item.quantity * item.unitPrice,
          referenceType: "GOODS_RECEIPT",
          referenceId: grn.id,
          performedBy: data.receivedBy,
        },
      });
    }

    for (const item of data.items) {
      if (item.poItemId) {
        await db.purchaseOrderItem.update({
          where: { id: item.poItemId },
          data: { receivedQty: { increment: item.quantity } },
        });
      }
    }

    if (data.poId) {
      const po = await db.purchaseOrder.findUnique({ where: { id: data.poId }, include: { items: true } });
      if (po) {
        const allReceived = po.items.every((pi) => pi.receivedQty >= pi.quantity);
        const anyReceived = po.items.some((pi) => pi.receivedQty > 0);
        await db.purchaseOrder.update({
          where: { id: data.poId },
          data: {
            status: allReceived ? POStatus.RECEIVED : anyReceived ? POStatus.PARTIALLY_RECEIVED : po.status,
            receivedDate: allReceived ? new Date() : undefined,
          },
        });
      }
    }

    await createJournalEntry({
      entryNumber: `JE-${grnNumber}`,
      description: `Goods Receipt ${grnNumber}`,
      referenceType: "GOODS_RECEIPT",
      referenceId: grn.id,
      lines: [
        { accountCode: ACCOUNTS.INVENTORY_RAW, debit: totalAmount, credit: 0 },
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: 0, credit: totalAmount },
      ],
      createdBy: data.receivedBy,
    });

    // Auto-check reorder points after GRN
    await checkReorderPoints();

    return grn;
  },

  async createInvoice(data: {
    poId: string;
    supplierId: string;
    invoiceNumber: string;
    totalAmount: number;
    taxAmount?: number;
    dueDate?: Date;
  }) {
    return db.purchaseInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        poId: data.poId,
        supplierId: data.supplierId,
        totalAmount: data.totalAmount,
        taxAmount: data.taxAmount || 0,
        dueDate: data.dueDate,
      },
    });
  },

  async payInvoice(invoiceId: string, amount: number, paymentMethod: string, reference?: string) {
    const invoice = await db.purchaseInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    await db.purchasePayment.create({
      data: {
        invoiceId,
        amount,
        paymentMethod,
        reference,
      },
    });

    const newPaid = invoice.paidAmount + amount;
    await db.purchaseInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaid,
        status: newPaid >= invoice.totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
      },
    });

    await createJournalEntry({
      entryNumber: `JE-PAY-${invoice.invoiceNumber}`,
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      referenceType: "PURCHASE_PAYMENT",
      referenceId: invoiceId,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_PAYABLE, debit: amount, credit: 0 },
        { accountCode: ACCOUNTS.CASH, debit: 0, credit: amount },
      ],
      createdBy: "system",
    });

    return invoice;
  },
};

// ─── SALES SERVICE ───────────────────────────────────
export const SalesService = {
  async createOrder(data: {
    customerId: string;
    items: { productId: string; quantity: number; unitPrice: number; discount?: number }[];
    shippingAddress?: string;
    requiredDate?: Date;
    notes?: string;
    createdBy: string;
  }) {
    const soNumber = `SO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
    const totalAmount = data.items.reduce((s, i) => s + i.quantity * i.unitPrice - (i.discount || 0), 0);

    const so = await db.salesOrder.create({
      data: {
        soNumber,
        customerId: data.customerId,
        totalAmount,
        grandTotal: totalAmount,
        shippingAddress: data.shippingAddress,
        requiredDate: data.requiredDate,
        notes: data.notes,
        createdBy: data.createdBy,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount || 0,
            totalPrice: i.quantity * i.unitPrice - (i.discount || 0),
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    for (const item of so.items) {
      const invItem = await db.inventoryItem.findFirst({ where: { productId: item.productId } });
      if (invItem) {
        await db.inventoryItem.update({
          where: { id: invItem.id },
          data: { reservedStock: { increment: item.quantity } },
        });
      }
    }

    await db.salesOrder.update({
      where: { id: so.id },
      data: { status: SOStatus.CONFIRMED },
    });

    // Auto-create production orders for finished goods items if stock is insufficient
    await autoCreateProductionFromSO(so.id);

    return so;
  },

  async createDeliveryOrder(soId: string) {
    const so = await db.salesOrder.findUnique({ where: { id: soId }, include: { items: true } });
    if (!so) throw new Error("Sales Order not found");

    const doNumber = `DO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    const delivery = await db.deliveryOrder.create({
      data: {
        doNumber,
        soId,
        status: DOStatus.PENDING,
      },
    });

    await db.salesOrder.update({
      where: { id: soId },
      data: { status: SOStatus.PICKING },
    });

    return delivery;
  },

  async shipDelivery(doId: string) {
    const delivery = await db.deliveryOrder.findUnique({
      where: { id: doId },
      include: { so: { include: { items: { include: { product: true } } } } },
    });
    if (!delivery) throw new Error("Delivery Order not found");

    const cogsLines: { materialCode: string; deliveredQty: number; unitCost: number }[] = [];
    for (const item of delivery.so.items) {
      const invItem = await db.inventoryItem.findFirst({ where: { productId: item.productId } });
      if (invItem) {
        await db.inventoryItem.update({
          where: { id: invItem.id },
          data: {
            currentStock: { decrement: item.deliveredQty || item.quantity },
            reservedStock: { decrement: item.quantity },
          },
        });

        await db.inventoryMovement.create({
          data: {
            itemId: invItem.id,
            type: MovementType.OUTBOUND,
            quantity: item.deliveredQty || item.quantity,
            unitCost: invItem.unitCost,
            totalCost: (item.deliveredQty || item.quantity) * invItem.unitCost,
            referenceType: "DELIVERY_ORDER",
            referenceId: doId,
          },
        });

        cogsLines.push({ materialCode: invItem.materialCode, deliveredQty: item.deliveredQty || item.quantity, unitCost: invItem.unitCost });
      }
    }

    await db.deliveryOrder.update({
      where: { id: doId },
      data: { status: DOStatus.SHIPPED },
    });

    await db.salesOrder.update({
      where: { id: delivery.soId },
      data: { status: SOStatus.SHIPPED, shippedDate: new Date() },
    });

    const totalCOGS = cogsLines.reduce((s, i) => s + i.deliveredQty * i.unitCost, 0);

    await createJournalEntry({
      entryNumber: `JE-DO-${delivery.doNumber}`,
      description: `Shipment - Delivery Order ${delivery.doNumber}`,
      referenceType: "DELIVERY_ORDER",
      referenceId: doId,
      lines: [
        { accountCode: ACCOUNTS.COST_OF_GOODS_SOLD, debit: totalCOGS, credit: 0 },
        { accountCode: ACCOUNTS.INVENTORY_FG, debit: 0, credit: totalCOGS },
      ],
      createdBy: "system",
    });

    return delivery;
  },

  async createInvoice(data: {
    soId: string;
    customerId: string;
    invoiceNumber: string;
    totalAmount: number;
    taxAmount?: number;
    dueDate?: Date;
  }) {
    const invoice = await db.salesInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        soId: data.soId,
        customerId: data.customerId,
        totalAmount: data.totalAmount,
        taxAmount: data.taxAmount || 0,
        dueDate: data.dueDate,
      },
    });

    await createJournalEntry({
      entryNumber: `JE-SI-${data.invoiceNumber}`,
      description: `Sales Invoice ${data.invoiceNumber}`,
      referenceType: "SALES_INVOICE",
      referenceId: invoice.id,
      lines: [
        { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: data.totalAmount, credit: 0 },
        { accountCode: ACCOUNTS.SALES_REVENUE, debit: 0, credit: data.totalAmount },
      ],
      createdBy: "system",
    });

    return invoice;
  },

  async receivePayment(invoiceId: string, amount: number, paymentMethod: string, reference?: string) {
    const invoice = await db.salesInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Invoice not found");

    await db.salesPayment.create({
      data: { invoiceId, amount, paymentMethod, reference },
    });

    const newPaid = invoice.paidAmount + amount;
    await db.salesInvoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaid,
        status: newPaid >= invoice.totalAmount ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL,
      },
    });

    await createJournalEntry({
      entryNumber: `JE-REC-${invoice.invoiceNumber}`,
      description: `Payment received - ${invoice.invoiceNumber}`,
      referenceType: "SALES_PAYMENT",
      referenceId: invoiceId,
      lines: [
        { accountCode: ACCOUNTS.CASH, debit: amount, credit: 0 },
        { accountCode: ACCOUNTS.ACCOUNTS_RECEIVABLE, debit: 0, credit: amount },
      ],
      createdBy: "system",
    });

    return invoice;
  },
};

// ─── PRODUCTION SERVICE ──────────────────────────────
export const ProductionService = {
  async createOrder(data: {
    productId: string;
    quantity: number;
    salesOrderId?: string;
    lineId?: string;
    workCenterId?: string;
    plannedStart?: Date;
    plannedEnd?: Date;
    createdBy: string;
  }) {
    const orderNumber = `MO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    const order = await db.productionOrder.create({
      data: {
        orderNumber,
        salesOrderId: data.salesOrderId,
        productId: data.productId,
        lineId: data.lineId,
        workCenterId: data.workCenterId,
        quantity: data.quantity,
        plannedStart: data.plannedStart,
        plannedEnd: data.plannedEnd,
        createdBy: data.createdBy,
      },
      include: { product: true },
    });

    return order;
  },

  async releaseOrder(orderId: string) {
    const order = await db.productionOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");

    const bom = await db.bOM.findFirst({
      where: { productId: order.productId, isDefault: true, isActive: true },
      include: { items: true },
    });

    if (bom) {
      for (const bomItem of bom.items) {
        const invItem = await db.inventoryItem.findFirst({ where: { materialCode: bomItem.materialCode } });
        if (invItem) {
          const requiredQty = order.quantity * bomItem.quantity * (1 + bomItem.wastagePercent / 100);
          if (invItem.availableStock < requiredQty) {
            throw new Error(`Insufficient stock for ${bomItem.materialName}: available ${invItem.availableStock}, required ${requiredQty}`);
          }
        }
      }
    }

    if (bom) {
      let totalMaterialCost = 0;
      for (const bomItem of bom.items) {
        const invItem = await db.inventoryItem.findFirst({ where: { materialCode: bomItem.materialCode } });
        if (invItem) {
          const requiredQty = order.quantity * bomItem.quantity * (1 + bomItem.wastagePercent / 100);
          const cost = requiredQty * invItem.unitCost;
          totalMaterialCost += cost;

          await db.materialIssue.create({
            data: {
              orderId,
              materialCode: bomItem.materialCode,
              quantity: requiredQty,
              unitCost: invItem.unitCost,
              totalCost: cost,
            },
          });

          await db.inventoryItem.update({
            where: { id: invItem.id },
            data: {
              currentStock: { decrement: requiredQty },
              availableStock: { decrement: requiredQty },
            },
          });

          await db.inventoryMovement.create({
            data: {
              itemId: invItem.id,
              type: MovementType.PRODUCTION_CONSUME,
              quantity: requiredQty,
              unitCost: invItem.unitCost,
              totalCost: cost,
              referenceType: "PRODUCTION_ORDER",
              referenceId: orderId,
            },
          });

          // FEFO / Expiry check during material issue
          await checkExpiryDuringIssue(bomItem.materialCode, requiredQty);
        }
      }

      const workCenter = await db.workCenter.findUnique({ where: { id: order.workCenterId || "" } });
      const laborCost = workCenter ? (workCenter.costPerHour * order.quantity * 0.5) : 0;
      const overheadCost = totalMaterialCost * 0.15;

      await db.productionOrder.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.RELEASED,
          materialCost: totalMaterialCost,
          laborCost,
          overheadCost,
          totalCost: totalMaterialCost + laborCost + overheadCost,
          unitCost: (totalMaterialCost + laborCost + overheadCost) / order.quantity,
        },
      });

      await createJournalEntry({
        entryNumber: `JE-MO-${order.orderNumber}`,
        description: `Material Issue - Production Order ${order.orderNumber}`,
        referenceType: "PRODUCTION_ORDER",
        referenceId: orderId,
        lines: [
          { accountCode: ACCOUNTS.INVENTORY_WIP, debit: totalMaterialCost, credit: 0 },
          { accountCode: ACCOUNTS.INVENTORY_RAW, debit: 0, credit: totalMaterialCost },
        ],
        createdBy: order.createdBy,
      });

      // Auto-check reorder points after material consumption
      await checkReorderPoints();
    }

    return db.productionOrder.findUnique({ where: { id: orderId } });
  },

  async logProduction(data: {
    orderId: string;
    goodCount: number;
    rejectCount: number;
    operatorId: string;
    downtimeMinutes?: number;
    downtimeReason?: string;
  }) {
    const log = await db.productionLog.create({
      data: {
        orderId: data.orderId,
        goodCount: data.goodCount,
        rejectCount: data.rejectCount,
        downtimeMinutes: data.downtimeMinutes || 0,
        downtimeReason: data.downtimeReason,
        operatorId: data.operatorId,
      },
    });

    const order = await db.productionOrder.update({
      where: { id: data.orderId },
      data: {
        completedQty: { increment: data.goodCount },
        rejectedQty: { increment: data.rejectCount },
        status: OrderStatus.IN_PROGRESS,
        actualStart: undefined,
      },
    });

    if (order.completedQty + data.goodCount >= order.quantity) {
      const fgItem = await db.inventoryItem.findFirst({ where: { productId: order.productId } });
      if (fgItem) {
        const outputQty = order.completedQty + data.goodCount;
        await db.inventoryItem.update({
          where: { id: fgItem.id },
          data: {
            currentStock: { increment: outputQty },
            availableStock: { increment: outputQty },
          },
        });

        await db.inventoryMovement.create({
          data: {
            itemId: fgItem.id,
            type: MovementType.PRODUCTION_OUTPUT,
            quantity: outputQty,
            unitCost: order.unitCost,
            totalCost: outputQty * order.unitCost,
            referenceType: "PRODUCTION_ORDER",
            referenceId: data.orderId,
          },
        });
      }

      await db.productionOrder.update({
        where: { id: data.orderId },
        data: { status: OrderStatus.COMPLETED, actualEnd: new Date() },
      });

      await createJournalEntry({
        entryNumber: `JE-COMP-${order.orderNumber}`,
        description: `Production Completed - ${order.orderNumber}`,
        referenceType: "PRODUCTION_ORDER",
        referenceId: data.orderId,
        lines: [
          { accountCode: ACCOUNTS.INVENTORY_FG, debit: order.totalCost, credit: 0 },
          { accountCode: ACCOUNTS.INVENTORY_WIP, debit: 0, credit: order.totalCost },
        ],
        createdBy: data.operatorId,
      });

      if (order.salesOrderId) {
        await db.salesOrder.update({
          where: { id: order.salesOrderId },
          data: { status: SOStatus.PICKING },
        });
      }

      // Auto-trigger quality inspection on production completion
      await triggerQualityInspection(data.orderId);

      // Auto-create scrap journal entry if there are rejects
      if (data.rejectCount > 0) {
        await createScrapJournal({
          orderId: data.orderId,
          scrapCount: data.rejectCount,
          unitCost: order.unitCost,
          createdBy: data.operatorId,
          orderNumber: order.orderNumber,
        });
      }
    }

    return log;
  },

  async createWorkOrder(data: {
    orderId: string;
    workCenterId?: string;
    operation: string;
    sequence: number;
    plannedQty: number;
  }) {
    const workOrderNumber = `WO-${String(Math.floor(Math.random() * 100000)).padStart(5, "0")}`;
    return db.workOrder.create({
      data: {
        workOrderNumber,
        orderId: data.orderId,
        workCenterId: data.workCenterId,
        operation: data.operation,
        sequence: data.sequence,
        plannedQty: data.plannedQty,
      },
    });
  },
};

// ─── WAREHOUSE SERVICE ───────────────────────────────
export const WarehouseService = {
  async createTransfer(data: {
    fromWarehouseId: string;
    toWarehouseId: string;
    items: { materialCode: string; quantity: number; unit?: string }[];
    notes?: string;
  }) {
    const transferNumber = `ST-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

    const transfer = await db.stockTransfer.create({
      data: {
        transferNumber,
        fromWarehouseId: data.fromWarehouseId,
        toWarehouseId: data.toWarehouseId,
        notes: data.notes,
        items: {
          create: data.items.map((i) => ({
            materialCode: i.materialCode,
            quantity: i.quantity,
            unit: i.unit || "PCS",
          })),
        },
      },
      include: { items: true },
    });

    return transfer;
  },

  async receiveTransfer(transferId: string) {
    const transfer = await db.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw new Error("Transfer not found");

    for (const item of transfer.items) {
      const invItem = await db.inventoryItem.findFirst({ where: { materialCode: item.materialCode } });
      if (invItem) {
        await db.inventoryMovement.create({
          data: {
            itemId: invItem.id,
            type: MovementType.TRANSFER,
            quantity: item.quantity,
            referenceType: "STOCK_TRANSFER",
            referenceId: transferId,
          },
        });
      }
    }

    return db.stockTransfer.update({
      where: { id: transferId },
      data: { status: "RECEIVED", receivedDate: new Date() },
    });
  },

  async adjustStock(data: {
    itemId: string;
    type: string;
    quantity: number;
    reason: string;
    adjustedBy: string;
    locationId?: string;
  }) {
    const adjustment = await db.stockAdjustment.create({
      data: {
        itemId: data.itemId,
        type: data.type as any,
        quantity: data.quantity,
        reason: data.reason,
        adjustedBy: data.adjustedBy,
        locationId: data.locationId,
      },
    });

    const item = await db.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (item) {
      const newStock = item.currentStock + data.quantity;
      await db.inventoryItem.update({
        where: { id: data.itemId },
        data: { currentStock: newStock, availableStock: newStock - item.reservedStock },
      });

      await db.inventoryMovement.create({
        data: {
          itemId: data.itemId,
          type: MovementType.ADJUSTMENT,
          quantity: data.quantity,
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: adjustment.id,
          performedBy: data.adjustedBy,
        },
      });
    }

    return adjustment;
  },
};

// ─── COSTING SERVICE ─────────────────────────────────
export const CostingService = {
  async calculateProductCost(productId: string) {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Product not found");

    const bom = await db.bOM.findFirst({
      where: { productId, isDefault: true, isActive: true },
      include: { items: true },
    });

    let materialCost = 0;
    if (bom) {
      for (const item of bom.items) {
        const invItem = await db.inventoryItem.findFirst({ where: { materialCode: item.materialCode } });
        const unitCost = invItem?.unitCost || item.unitCost || 0;
        materialCost += item.quantity * unitCost * (1 + item.wastagePercent / 100);
      }
    }

    const existingCosts = await db.productCost.findMany({ where: { productId } });
    const laborCost = existingCosts.find((c) => c.costType === "LABOR")?.amount || materialCost * 0.3;
    const overheadCost = existingCosts.find((c) => c.costType === "OVERHEAD")?.amount || materialCost * 0.15;
    const totalCost = materialCost + laborCost + overheadCost;

    await db.product.upsert({
      where: { id: productId },
      update: { standardCost: totalCost },
      create: { ...product, standardCost: totalCost },
    });

    const costData = [
      { costType: "MATERIAL", amount: materialCost, description: "BOM Material Cost" },
      { costType: "LABOR", amount: laborCost, description: "Direct Labor" },
      { costType: "OVERHEAD", amount: overheadCost, description: "Manufacturing Overhead" },
    ];

    for (const c of costData) {
      const existing = await db.productCost.findFirst({
        where: { productId, costType: c.costType as any, period: null },
      });
      if (existing) {
        await db.productCost.update({
          where: { id: existing.id },
          data: { amount: c.amount, unitCost: c.amount },
        });
      } else {
        await db.productCost.create({
          data: { productId, costType: c.costType as any, amount: c.amount, unitCost: c.amount, description: c.description },
        });
      }
    }

    return { productId, materialCost, laborCost, overheadCost, totalCost };
  },

  async getTrialBalance() {
    const accounts = await db.account.findMany({ where: { isActive: true }, orderBy: { code: "asc" } });
    const lines = await db.journalLine.groupBy({
      by: ["accountCode"],
      _sum: { debit: true, credit: true },
    });

    return accounts.map((acc) => {
      const line = lines.find((l) => l.accountCode === acc.code);
      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: line?._sum.debit || 0,
        credit: line?._sum.credit || 0,
        balance: (line?._sum.debit || 0) - (line?._sum.credit || 0),
      };
    });
  },

  async getProfitLoss(startDate: Date, endDate: Date) {
    const entries = await db.journalEntry.findMany({
      where: {
        entryDate: { gte: startDate, lte: endDate },
        isPosted: true,
      },
      include: { lines: true },
    });

    const lines = entries.flatMap((e) => e.lines);
    const revenue = lines.filter((l) => l.accountCode.startsWith("4")).reduce((s, l) => s + l.credit - l.debit, 0);
    const cogs = lines.filter((l) => l.accountCode.startsWith("5")).reduce((s, l) => s + l.debit - l.credit, 0);
    const expenses = lines.filter((l) => l.accountCode.startsWith("6")).reduce((s, l) => s + l.debit - l.credit, 0);
    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - expenses;

    return { revenue, cogs, grossProfit, expenses, netIncome };
  },
};
