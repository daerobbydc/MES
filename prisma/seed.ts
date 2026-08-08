import {
  PrismaClient,
  Role,
  OrderStatus,
  MachineStatus,
  ProductType,
  AccountType,
  POStatus,
  SOStatus,
  InspectResult,
  InspectionStatus,
  WorkOrderStatus,
  ApprovalStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Comprehensive MES Demo Data Seeder...");

  const password = await bcrypt.hash("password123", 10);

  // ─── 0. CLEANUP RECENT DEMO TRANSACTIONS FOR FRESH SEED ─────
  console.log("🧹 Cleaning old demo transaction records...");
  await prisma.notification.deleteMany({});
  await prisma.approvalRequest.deleteMany({});
  await prisma.qualityInspection.deleteMany({});
  await prisma.shopFloorLog.deleteMany({});
  await prisma.workOrder.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.bOMItem.deleteMany({});
  await prisma.bOM.deleteMany({});
  await prisma.barcodeTemplate.deleteMany({});

  // ─── 1. USERS ─────────────────────────────────────────────
  console.log("👤 Creating Users & Roles...");
  const admin = await prisma.user.upsert({
    where: { email: "admin@mes.com" },
    update: {},
    create: {
      email: "admin@mes.com",
      password,
      name: "Administrator",
      role: Role.ADMIN,
      department: "Plant Management",
    },
  });
  const supervisor = await prisma.user.upsert({
    where: { email: "supervisor@mes.com" },
    update: {},
    create: {
      email: "supervisor@mes.com",
      password,
      name: "Budi Santoso",
      role: Role.SUPERVISOR,
      department: "Production",
    },
  });
  const quality = await prisma.user.upsert({
    where: { email: "quality@mes.com" },
    update: {},
    create: {
      email: "quality@mes.com",
      password,
      name: "Dewi Lestari",
      role: Role.QUALITY_INSPECTOR,
      department: "Quality Control",
    },
  });
  const operator = await prisma.user.upsert({
    where: { email: "operator@mes.com" },
    update: {},
    create: {
      email: "operator@mes.com",
      password,
      name: "Agus Setiawan",
      role: Role.OPERATOR,
      department: "Shop Floor Operations",
    },
  });
  const planner = await prisma.user.upsert({
    where: { email: "planner@mes.com" },
    update: {},
    create: {
      email: "planner@mes.com",
      password,
      name: "Rina Wijaya",
      role: Role.SUPERVISOR,
      department: "PPIC & Material Planning",
    },
  });

  // ─── 2. GL ACCOUNTS ──────────────────────────────────────
  console.log("💰 Creating Financial GL Accounts...");
  const accounts = [
    { code: "1101", name: "Kas Utama (Cash)", type: AccountType.ASSET },
    { code: "1102", name: "Piutang Usaha (AR)", type: AccountType.ASSET },
    { code: "1201", name: "Persediaan Bahan Baku (Raw Material)", type: AccountType.ASSET },
    { code: "1202", name: "Persediaan Dalam Proses (WIP)", type: AccountType.ASSET },
    { code: "1203", name: "Persediaan Barang Jadi (Finished Goods)", type: AccountType.ASSET },
    { code: "2101", name: "Hutang Usaha (AP)", type: AccountType.LIABILITY },
    { code: "2102", name: "Hutang Pajak (Tax Payable)", type: AccountType.LIABILITY },
    { code: "3101", name: "Laba Ditahan (Retained Earnings)", type: AccountType.EQUITY },
    { code: "4101", name: "Pendapatan Penjualan (Sales Revenue)", type: AccountType.REVENUE },
    { code: "4102", name: "Retur Penjualan (Sales Returns)", type: AccountType.REVENUE },
    { code: "5101", name: "Harga Pokok Penjualan (COGS)", type: AccountType.COST_OF_GOODS },
    { code: "5201", name: "Biaya Tenaga Kerja Langsung (Labor)", type: AccountType.EXPENSE },
    { code: "5301", name: "Biaya Overhead Pabrik (Overhead)", type: AccountType.EXPENSE },
    { code: "6101", name: "Biaya Pembelian (Purchase Expense)", type: AccountType.EXPENSE },
    { code: "6102", name: "Diskon Pembelian (Purchase Discount)", type: AccountType.EXPENSE },
    { code: "9101", name: "Keuntungan/Kerugian Pelepasan Aset", type: AccountType.REVENUE },
  ];
  for (const a of accounts) {
    await prisma.account.upsert({ where: { code: a.code }, update: {}, create: a });
  }

  // ─── 3. CUSTOMERS & SUPPLIERS ────────────────────────────
  console.log("🏢 Creating Customers & Suppliers...");
  const customer1 = await prisma.customer.upsert({
    where: { code: "CUS-001" },
    update: {},
    create: {
      code: "CUS-001",
      name: "PT Maju Bersama Automotive",
      contact: "Budi Santoso",
      email: "budi@majubersama.co.id",
      phone: "021-5551234",
      city: "Cikarang",
      country: "Indonesia",
      taxNumber: "01.234.567.8-012.000",
      creditLimit: 500000000,
      paymentTerms: 30,
    },
  });
  const customer2 = await prisma.customer.upsert({
    where: { code: "CUS-002" },
    update: {},
    create: {
      code: "CUS-002",
      name: "CV Sumber Jaya Metal",
      contact: "Andi Wijaya",
      email: "andi@sumberjaya.co.id",
      phone: "021-8884321",
      city: "Karawang",
      country: "Indonesia",
      taxNumber: "02.987.654.3-043.000",
      creditLimit: 300000000,
      paymentTerms: 45,
    },
  });

  const supplier1 = await prisma.supplier.upsert({
    where: { code: "SUP-001" },
    update: {},
    create: {
      code: "SUP-001",
      name: "PT Krakatau Steel Tbk",
      contact: "John Doe",
      email: "sales@krakatausteel.com",
      phone: "0254-391234",
      address: "Kawasan Industri Cilegon, Banten",
      taxNumber: "01.111.222.3-011.000",
      paymentTerms: 30,
    },
  });
  const supplier2 = await prisma.supplier.upsert({
    where: { code: "SUP-002" },
    update: {},
    create: {
      code: "SUP-002",
      name: "PT Plastik Mandiri Utama",
      contact: "Jane Smith",
      email: "sales@plastikmandiri.co.id",
      phone: "021-7778899",
      address: "Jl. Raya Serpong No. 45, Tangerang",
      paymentTerms: 30,
    },
  });

  // ─── 4. WAREHOUSES ───────────────────────────────────────
  console.log("🏬 Creating Warehouses...");
  const whRM = await prisma.warehouse.upsert({
    where: { code: "WH-RM" },
    update: {},
    create: { code: "WH-RM", name: "Raw Material Warehouse A", type: "RAW_MATERIAL" },
  });
  const whFG = await prisma.warehouse.upsert({
    where: { code: "WH-FG" },
    update: {},
    create: { code: "WH-FG", name: "Finished Goods Warehouse B", type: "FINISHED_GOOD" },
  });

  // ─── 5. PRODUCTION LINES & WORK CENTERS ───────────────────
  console.log("🏭 Creating Production Lines & Work Centers...");
  const line1 = await prisma.productionLine.upsert({
    where: { code: "LINE-01" },
    update: {},
    create: { code: "LINE-01", name: "Assembly Line 1 (Automotive)", capacity: 150 },
  });
  const line2 = await prisma.productionLine.upsert({
    where: { code: "LINE-02" },
    update: {},
    create: { code: "LINE-02", name: "Machining Line 2 (Precision)", capacity: 100 },
  });

  const wc1 = await prisma.workCenter.upsert({
    where: { code: "WC-01" },
    update: {},
    create: { code: "WC-01", name: "CNC Milling Work Center", lineId: line2.id, costPerHour: 180000, capacity: 24 },
  });
  const wc2 = await prisma.workCenter.upsert({
    where: { code: "WC-02" },
    update: {},
    create: { code: "WC-02", name: "Robotic Welding Center", lineId: line1.id, costPerHour: 140000, capacity: 30 },
  });

  // ─── 6. MACHINES ─────────────────────────────────────────
  console.log("⚙️ Creating Machines...");
  const machine1 = await prisma.machine.upsert({
    where: { code: "CNC-001" },
    update: {},
    create: {
      code: "CNC-001",
      name: "CNC Milling Machine 5-Axis",
      lineId: line2.id,
      type: "CNC",
      manufacturer: "Fanuc",
      model: "Robodrill Alpha",
      status: MachineStatus.RUNNING,
    },
  });
  const machine2 = await prisma.machine.upsert({
    where: { code: "PRESS-001" },
    update: {},
    create: {
      code: "PRESS-001",
      name: "Hydraulic Heavy Press 100T",
      lineId: line1.id,
      type: "Press",
      manufacturer: "Schuler",
      model: "HP-100",
      status: MachineStatus.RUNNING,
    },
  });

  // ─── 7. PRODUCTS ─────────────────────────────────────────
  console.log("🏷️ Creating Products...");
  const prod1 = await prisma.product.upsert({
    where: { sku: "FG-001" },
    update: {},
    create: {
      sku: "FG-001",
      name: "Widget Assembly Heavy Duty A1",
      type: ProductType.FINISHED_GOOD,
      unit: "PCS",
      sellingPrice: 285000,
      category: "Assembly",
      description: "High precision automotive assembly unit with steel enclosure",
    },
  });
  const prod2 = await prisma.product.upsert({
    where: { sku: "FG-002" },
    update: {},
    create: {
      sku: "FG-002",
      name: "Precision Helical Gear B2",
      type: ProductType.FINISHED_GOOD,
      unit: "PCS",
      sellingPrice: 480000,
      category: "Machining",
      description: "Heat-treated steel helical gear for transmission systems",
    },
  });

  // ─── 8. INVENTORY ITEMS ──────────────────────────────────
  console.log("📦 Creating Inventory Items...");
  const mat1 = await prisma.inventoryItem.upsert({
    where: { materialCode: "MAT-001" },
    update: {},
    create: {
      materialCode: "MAT-001",
      name: "Steel Sheet SPCC 3.0mm 4x8",
      type: ProductType.RAW_MATERIAL,
      unit: "SHEET",
      currentStock: 350,
      availableStock: 320,
      minStock: 100,
      maxStock: 1000,
      defaultWarehouseId: whRM.id,
      unitCost: 195000,
      lastPurchasePrice: 195000,
    },
  });
  const mat2 = await prisma.inventoryItem.upsert({
    where: { materialCode: "MAT-002" },
    update: {},
    create: {
      materialCode: "MAT-002",
      name: "ABS Plastic Polymer Pellets",
      type: ProductType.RAW_MATERIAL,
      unit: "KG",
      currentStock: 18, // LOW STOCK TRIGGER
      availableStock: 18,
      minStock: 50,
      maxStock: 600,
      defaultWarehouseId: whRM.id,
      unitCost: 35000,
      lastPurchasePrice: 35000,
    },
  });

  // ─── 9. BILL OF MATERIALS (BOM) ──────────────────────────
  console.log("📋 Creating Bill of Materials (BOM)...");
  await prisma.bOM.create({
    data: {
      productId: prod1.id,
      version: "1.0",
      description: "Standard Production BOM for Widget Assembly A1",
      isDefault: true,
      items: {
        create: [
          { materialCode: "MAT-001", materialName: "Steel Sheet SPCC 3.0mm 4x8", quantity: 2, unit: "SHEET", unitCost: 195000, wastagePercent: 4.0 },
        ],
      },
    },
  });

  // ─── 10. SALES ORDERS ─────────────────────────────────────
  console.log("🛍️ Creating Sales Orders...");
  const so1 = await prisma.salesOrder.create({
    data: {
      soNumber: "SO-20260801-0001",
      customerId: customer1.id,
      status: SOStatus.IN_PRODUCTION,
      totalAmount: 85500000,
      grandTotal: 85500000,
      requiredDate: new Date(Date.now() + 10 * 86400000),
      createdBy: admin.id,
      items: {
        create: [
          { productId: prod1.id, quantity: 300, unitPrice: 285000, totalPrice: 85500000 },
        ],
      },
    },
  });

  // ─── 11. PRODUCTION ORDERS & WORK ORDERS ───────────────────
  console.log("🛠️ Creating Production Orders & Work Orders...");
  const mo1 = await prisma.productionOrder.create({
    data: {
      orderNumber: "MO-20260801-0001",
      salesOrderId: so1.id,
      productId: prod1.id,
      lineId: line1.id,
      workCenterId: wc2.id,
      quantity: 300,
      completedQty: 185,
      rejectedQty: 3,
      status: OrderStatus.IN_PROGRESS,
      materialCost: 117000000,
      laborCost: 18000000,
      overheadCost: 16200000,
      totalCost: 151200000,
      unitCost: 504000,
      createdBy: admin.id,
      actualStart: new Date(Date.now() - 3 * 86400000),
    },
  });

  await prisma.workOrder.create({
    data: {
      workOrderNumber: "WO-20260801-0001",
      orderId: mo1.id,
      workCenterId: wc2.id,
      operation: "Primary Enclosure Assembly & Spot Welding",
      plannedQty: 300,
      completedQty: 185,
      rejectedQty: 3,
      status: WorkOrderStatus.IN_PROGRESS,
      laborHours: 28.5,
      machineHours: 24.0,
      startTime: new Date(Date.now() - 3 * 86400000),
    },
  });

  await prisma.shopFloorLog.create({
    data: {
      orderId: mo1.id,
      machineId: machine1.id,
      operatorId: operator.id,
      logType: "OUTPUT",
      goodCount: 185,
      scrapCount: 3,
      downtimeMinutes: 0,
      timestamp: new Date(Date.now() - 2 * 3600000),
    },
  });

  await prisma.shopFloorLog.create({
    data: {
      orderId: mo1.id,
      machineId: machine1.id,
      operatorId: operator.id,
      logType: "DOWNTIME",
      goodCount: 0,
      scrapCount: 0,
      downtimeMinutes: 15,
      downtimeReason: "Feeder Jam & Calibration",
      timestamp: new Date(Date.now() - 5 * 3600000),
    },
  });

  // ─── 12. QUALITY INSPECTIONS ─────────────────────────────
  console.log("🔬 Creating Quality Inspection Logs...");
  await prisma.qualityInspection.create({
    data: {
      inspectionNumber: "QC-20260801-0001",
      orderId: mo1.id,
      productId: prod1.id,
      inspectorId: quality.id,
      inspectionType: "IN_PROCESS",
      status: InspectionStatus.PASSED,
      result: InspectResult.PASS,
      sampleSize: 30,
      passCount: 29,
      failCount: 1,
      notes: "Minor surface scratch on sample #14. Dimensions within tolerance.",
    },
  });

  // ─── 13. PURCHASE ORDERS ─────────────────────────────────
  console.log("🛒 Creating Purchase Orders...");
  await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-20260801-0001",
      supplierId: supplier1.id,
      status: POStatus.APPROVED,
      totalAmount: 39000000,
      grandTotal: 39000000,
      createdBy: admin.id,
      approvedBy: admin.id,
      approvedAt: new Date(),
      items: {
        create: [
          {
            materialCode: "MAT-001",
            description: "Steel Sheet SPCC 3.0mm 4x8",
            quantity: 200,
            unitPrice: 195000,
            totalPrice: 39000000,
            unit: "SHEET",
          },
        ],
      },
    },
  });

  // ─── 14. BARCODE TEMPLATES ────────────────────────────────
  console.log("🏷️ Creating Barcode Studio Templates...");
  await prisma.barcodeTemplate.create({
    data: {
      name: "Standard Product Label 50x30mm",
      module: "Product",
      format: "CODE128",
      width: 50,
      height: 30,
      showLabel: true,
    },
  });

  // ─── 15. APPROVAL QUEUE & NOTIFICATIONS ──────────────────
  console.log("🔔 Creating Approvals & Operational Notifications...");
  await prisma.approvalRequest.create({
    data: {
      type: "PO_APPROVAL",
      recordId: "PO-20260801-0001",
      requestedBy: planner.id,
      status: ApprovalStatus.PENDING,
      notes: "Purchase Order exceeds auto-approval threshold (> Rp 25.000.000)",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        type: "QUALITY",
        title: "Quality Inspection Complete (Pass)",
        message: "Final inspection for Order #MO-20260801-0001 passed (50/50 samples).",
        module: "QUALITY",
        isRead: false,
      },
      {
        userId: admin.id,
        type: "LOW_STOCK",
        title: "Low Stock Alert: ABS Plastic Pellets",
        message: "Material ABS Plastic Pellets is at 18 KG (below reorder point 50 KG).",
        module: "INVENTORY",
        isRead: false,
      },
    ],
  });

  console.log("\n✅ Demo Seeding Completed Successfully!");
  console.log("--------------------------------------------------");
  console.log("🔑 Demo Login Credentials:");
  console.log("  1. Admin      : admin@mes.com / password123");
  console.log("  2. Supervisor : supervisor@mes.com / password123");
  console.log("  3. Quality    : quality@mes.com / password123");
  console.log("  4. Operator   : operator@mes.com / password123");
  console.log("  5. Planner    : planner@mes.com / password123");
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
