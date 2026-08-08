import { db } from "@/lib/db";

export const BarcodeService = {
  async getTemplates() {
    let templates = await db.barcodeTemplate.findMany({
      orderBy: { name: "asc" },
    });

    if (templates.length === 0) {
      await this.seedDefaultTemplates();
      templates = await db.barcodeTemplate.findMany({
        orderBy: { name: "asc" },
      });
    }

    return templates;
  },

  async seedDefaultTemplates() {
    const defaults = [
      { name: "Product Standard SKU Label", module: "Product", format: "CODE128", width: 220, height: 90, showLabel: true, showDate: true },
      { name: "Warehouse Shelf Tag", module: "Location", format: "QR_CODE", width: 180, height: 180, showLabel: true, showDate: false },
      { name: "Work Order Batch Tag", module: "WorkOrder", format: "CODE128", width: 260, height: 100, showLabel: true, showDate: true },
      { name: "Inventory Lot Sticker", module: "Lot", format: "CODE39", width: 200, height: 80, showLabel: true, showDate: true },
      { name: "Machine Equipment Tag", module: "Machine", format: "QR_CODE", width: 160, height: 160, showLabel: true, showDate: false },
    ];

    for (const d of defaults) {
      await db.barcodeTemplate.create({ data: d });
    }
  },

  async createTemplate(data: {
    name: string;
    module: string;
    format?: string;
    width?: number;
    height?: number;
    showLabel?: boolean;
    showDate?: boolean;
  }) {
    return db.barcodeTemplate.create({
      data: {
        name: data.name,
        module: data.module,
        format: data.format || "CODE128",
        width: data.width || 200,
        height: data.height || 100,
        showLabel: data.showLabel ?? true,
        showDate: data.showDate ?? false,
      },
    });
  },

  async updateTemplate(id: string, data: any) {
    return db.barcodeTemplate.update({
      where: { id },
      data,
    });
  },

  async deleteTemplate(id: string) {
    return db.barcodeTemplate.delete({ where: { id } });
  },

  generateBarcode(module: string, recordId: string, customCode?: string): string {
    if (customCode && customCode.trim()) {
      return customCode.trim().toUpperCase();
    }
    const prefix = module.toUpperCase().slice(0, 3);
    const idFragment = recordId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
    return `${prefix}-${idFragment}`;
  },

  async getModuleRecords(module: string, query: string = "") {
    const q = query.trim();
    if (module === "Product") {
      const products = await db.product.findMany({
        where: q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        } : undefined,
        take: 20,
        orderBy: { name: "asc" },
      });
      return products.map(p => ({
        id: p.id,
        code: p.sku,
        name: p.name,
        subtitle: `${p.type} • Price: Rp ${p.sellingPrice.toLocaleString()}`,
        badge: p.unit,
      }));
    }

    if (module === "Lot") {
      const items = await db.inventoryItem.findMany({
        where: q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { materialCode: { contains: q, mode: "insensitive" } },
          ],
        } : undefined,
        take: 20,
        orderBy: { name: "asc" },
      });
      return items.map(i => ({
        id: i.id,
        code: i.materialCode,
        name: i.name,
        subtitle: `Stock: ${i.currentStock} ${i.unit} • ${i.type}`,
        badge: i.unit,
      }));
    }

    if (module === "Location") {
      const locations = await db.warehouseLocation.findMany({
        where: q ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { zone: { contains: q, mode: "insensitive" } },
          ],
        } : undefined,
        include: { warehouse: true },
        take: 20,
        orderBy: { code: "asc" },
      });
      return locations.map(l => ({
        id: l.id,
        code: l.code,
        name: l.name || `Location ${l.code}`,
        subtitle: `${l.warehouse?.name || "Warehouse"} ${l.zone ? "• Zone " + l.zone : ""}`,
        badge: "LOC",
      }));
    }

    if (module === "WorkOrder") {
      const workOrders = await db.workOrder.findMany({
        where: q ? {
          OR: [
            { workOrderNumber: { contains: q, mode: "insensitive" } },
            { operation: { contains: q, mode: "insensitive" } },
          ],
        } : undefined,
        include: { order: { include: { product: true } } },
        take: 20,
        orderBy: { workOrderNumber: "asc" },
      });
      return workOrders.map(w => ({
        id: w.id,
        code: w.workOrderNumber,
        name: `${w.operation} (${w.order?.product?.name || "Product"})`,
        subtitle: `Status: ${w.status} • Planned: ${w.plannedQty} PCS`,
        badge: w.status,
      }));
    }

    if (module === "Machine") {
      const workCenters = await db.workCenter.findMany({
        where: q ? {
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        } : undefined,
        take: 20,
        orderBy: { name: "asc" },
      });
      return workCenters.map(m => ({
        id: m.id,
        code: m.code,
        name: m.name,
        subtitle: `Cost: Rp ${m.costPerHour.toLocaleString()}/hr`,
        badge: "MACHINE",
      }));
    }

    return [];
  },

  async scanAndLookup(code: string) {
    const cleanCode = code.trim().toUpperCase();

    // 1. Search in Product
    const product = await db.product.findFirst({
      where: { OR: [{ sku: { equals: cleanCode, mode: "insensitive" } }, { id: cleanCode }] },
    });
    if (product) {
      return {
        matched: true,
        module: "Product",
        code: product.sku,
        name: product.name,
        details: {
          Category: product.category || "-",
          Type: product.type,
          Unit: product.unit,
          "Selling Price": `Rp ${product.sellingPrice.toLocaleString()}`,
          "Standard Cost": `Rp ${product.standardCost.toLocaleString()}`,
        },
        link: `/products`,
      };
    }

    // 2. Search in Inventory Item
    const item = await db.inventoryItem.findFirst({
      where: { OR: [{ materialCode: { equals: cleanCode, mode: "insensitive" } }, { id: cleanCode }] },
    });
    if (item) {
      return {
        matched: true,
        module: "Lot",
        code: item.materialCode,
        name: item.name,
        details: {
          Type: item.type,
          "Current Stock": `${item.currentStock} ${item.unit}`,
          "Reserved Stock": `${item.reservedStock} ${item.unit}`,
          "Unit Cost": `Rp ${item.unitCost.toLocaleString()}`,
        },
        link: `/inventory`,
      };
    }

    // 3. Search in Warehouse Location
    const loc = await db.warehouseLocation.findFirst({
      where: { OR: [{ code: { equals: cleanCode, mode: "insensitive" } }, { id: cleanCode }] },
      include: { warehouse: true },
    });
    if (loc) {
      return {
        matched: true,
        module: "Location",
        code: loc.code,
        name: loc.name || `Location ${loc.code}`,
        details: {
          Warehouse: loc.warehouse?.name || "-",
          Zone: loc.zone || "-",
          Aisle: loc.aisle || "-",
          Rack: loc.rack || "-",
        },
        link: `/warehouse`,
      };
    }

    // 4. Search in Work Order
    const wo = await db.workOrder.findFirst({
      where: { OR: [{ workOrderNumber: { equals: cleanCode, mode: "insensitive" } }, { id: cleanCode }] },
      include: { order: { include: { product: true } } },
    });
    if (wo) {
      return {
        matched: true,
        module: "WorkOrder",
        code: wo.workOrderNumber,
        name: `WO: ${wo.operation}`,
        details: {
          Product: wo.order?.product?.name || "-",
          Status: wo.status,
          "Planned Qty": `${wo.plannedQty} PCS`,
          "Completed Qty": `${wo.completedQty} PCS`,
        },
        link: `/work-orders`,
      };
    }

    // 5. Search in Work Center / Machine
    const wc = await db.workCenter.findFirst({
      where: { OR: [{ code: { equals: cleanCode, mode: "insensitive" } }, { id: cleanCode }] },
    });
    if (wc) {
      return {
        matched: true,
        module: "Machine",
        code: wc.code,
        name: wc.name,
        details: {
          "Cost / Hour": `Rp ${wc.costPerHour.toLocaleString()}`,
          Capacity: wc.capacity || "N/A",
          Status: wc.isActive ? "ACTIVE" : "INACTIVE",
        },
        link: `/machine`,
      };
    }

    return {
      matched: false,
      code: cleanCode,
      message: `No record found matching code '${cleanCode}' across Products, Inventory, Locations, Work Orders, or Machines.`,
    };
  },
};
