import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const [
      totalOrders,
      activeOrders,
      completedOrders,
      totalProducts,
      totalMachines,
      runningMachines,
      downMachines,
      totalInspections,
      failedInspections,
      lowStockItems,
      recentAlerts,
    ] = await Promise.all([
      db.productionOrder.count(),
      db.productionOrder.count({ where: { status: "IN_PROGRESS" } }),
      db.productionOrder.count({ where: { status: "COMPLETED" } }),
      db.product.count({ where: { isActive: true } }),
      db.machine.count({ where: { isActive: true } }),
      db.machine.count({ where: { status: "RUNNING" } }),
      db.machine.count({ where: { status: "DOWN" } }),
      db.qualityInspection.count(),
      db.qualityInspection.count({ where: { status: "FAILED" } }),
      db.inventoryItem.findMany({
        where: {
          isActive: true,
          currentStock: { lte: db.inventoryItem.fields.minStock },
        },
      }),
      db.machineAlert.findMany({
        where: { isResolved: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { machine: true },
      }),
    ]);

    const oeeData = await db.machineData.findMany({
      orderBy: { timestamp: "desc" },
      take: 24,
    });

    const productionSummary = await db.productionOrder.groupBy({
      by: ["status"],
      _count: true,
    });

    return successResponse({
      production: {
        totalOrders,
        activeOrders,
        completedOrders,
        summary: productionSummary,
      },
      products: { totalProducts },
      machines: {
        total: totalMachines,
        running: runningMachines,
        down: downMachines,
      },
      quality: {
        totalInspections,
        failedInspections,
        passRate: totalInspections > 0
          ? ((totalInspections - failedInspections) / totalInspections * 100).toFixed(1)
          : 0,
      },
      inventory: {
        lowStockCount: lowStockItems.length,
        lowStockItems,
      },
      alerts: recentAlerts,
      oee: oeeData,
    });
  } catch (error: any) {
    return errorResponse(error.message || "Internal server error", 500);
  }
}
