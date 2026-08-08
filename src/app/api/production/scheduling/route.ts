import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (type === "capacity") {
      const workCenters = await prisma.workCenter.findMany({
        include: {
          workOrders: { where: { status: { in: ["IN_PROGRESS", "PENDING"] } } },
          line: { select: { name: true } },
        },
      });
      const capacity = workCenters.map((wc) => ({
        id: wc.id,
        name: wc.name,
        lineId: wc.lineId,
        lineName: wc.line?.name || "Unassigned",
        type: "Assembly",
        capacity: wc.capacity || 100,
        scheduled: wc.workOrders.reduce((sum: number, wo: any) => sum + (wo.plannedQty || 0), 0),
        utilization:
          (wc.capacity || 0) > 0
            ? (wc.workOrders.reduce((sum: number, wo: any) => sum + (wo.plannedQty || 0), 0) / (wc.capacity || 1)) * 100
            : 0,
      }));
      return successResponse(capacity);
    }

    if (type === "lines") {
      const lines = await prisma.productionLine.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      });
      return successResponse(lines);
    }

    if (type === "unscheduled") {
      const orders = await prisma.productionOrder.findMany({
        where: {
          status: { in: ["PLANNED", "RELEASED"] },
          OR: [{ plannedStart: null }, { lineId: null }],
        },
        include: {
          product: { select: { name: true, sku: true } },
          line: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });

      return successResponse(
        orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          productName: o.product?.name || "Unknown",
          sku: o.product?.sku || "",
          lineName: o.line?.name || null,
          lineId: o.lineId,
          quantity: o.quantity,
          completedQty: o.completedQty || 0,
          plannedStart: o.plannedStart,
          plannedEnd: o.plannedEnd,
          status: o.status,
          priority: o.priority || 0,
          notes: o.notes,
        }))
      );
    }

    // Default: return all scheduled orders
    const orders = await prisma.productionOrder.findMany({
      where: { status: { in: ["PLANNED", "RELEASED", "IN_PROGRESS", "ON_HOLD"] } },
      include: {
        product: { select: { name: true, sku: true } },
        line: { select: { id: true, name: true } },
        workCenter: { select: { name: true } },
      },
      orderBy: { plannedStart: "asc" },
    });

    const schedule = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      productName: o.product?.name || "Unknown",
      sku: o.product?.sku || "",
      lineId: o.line?.id || null,
      lineName: o.line?.name || null,
      workCenter: o.workCenter?.name || null,
      quantity: o.quantity,
      completedQty: o.completedQty || 0,
      plannedStart: o.plannedStart,
      plannedEnd: o.plannedEnd,
      actualStart: o.actualStart,
      status: o.status,
      priority: o.priority || 0,
      notes: o.notes,
    }));

    return successResponse(schedule);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    const schedule = await prisma.productionSchedule.create({
      data: {
        planId: body.planId,
        scheduledDate: new Date(body.scheduledDate || body.startDate),
        startTime: new Date(body.startTime || body.startDate),
        endTime: new Date(body.endTime || body.endDate),
        quantity: body.quantity || 1,
        lineId: body.lineId,
        machineId: body.machineId,
        shift: body.shift,
        status: "PLANNED",
      },
    });

    return successResponse(schedule, 201);
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}

// Reschedule / reassign one or many orders
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();

    if (body.autoOptimize) {
      // APS Auto-Optimize: fetch unscheduled + planned orders and distribute them
      const lines = await prisma.productionLine.findMany({ where: { isActive: true } });
      const orders = await prisma.productionOrder.findMany({
        where: { status: { in: ["PLANNED", "RELEASED"] } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });

      if (lines.length === 0) return successResponse({ updated: 0 });

      // Simple round-robin + priority distribution across lines
      const now = new Date();
      const updates: Array<{
        id: string;
        lineId: string;
        plannedStart: Date;
        plannedEnd: Date;
      }> = [];

      const lineCursors: Record<string, Date> = {};
      lines.forEach((l) => {
        lineCursors[l.id] = new Date(now);
      });

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const lineIndex = i % lines.length;
        const line = lines[lineIndex];
        const cursor = lineCursors[line.id];

        // Estimate 1 working day per 100 units
        const daysDuration = Math.max(1, Math.ceil(order.quantity / 100));
        const plannedEnd = new Date(cursor);
        plannedEnd.setDate(cursor.getDate() + daysDuration);

        updates.push({
          id: order.id,
          lineId: line.id,
          plannedStart: new Date(cursor),
          plannedEnd,
        });

        // Advance cursor for this line
        lineCursors[line.id] = new Date(plannedEnd);
        lineCursors[line.id].setDate(plannedEnd.getDate() + 0); // no gap
      }

      await prisma.$transaction(
        updates.map((u) =>
          prisma.productionOrder.update({
            where: { id: u.id },
            data: { lineId: u.lineId, plannedStart: u.plannedStart, plannedEnd: u.plannedEnd },
          })
        )
      );

      return successResponse({ updated: updates.length, assignments: updates });
    }

    // Single order reschedule
    const { id, lineId, plannedStart, plannedEnd } = body;
    if (!id) return errorResponse("Order ID required", 400);

    const updated = await prisma.productionOrder.update({
      where: { id },
      data: {
        ...(lineId !== undefined && { lineId }),
        ...(plannedStart && { plannedStart: new Date(plannedStart) }),
        ...(plannedEnd && { plannedEnd: new Date(plannedEnd) }),
      },
      include: {
        product: { select: { name: true } },
        line: { select: { name: true } },
      },
    });

    return successResponse({
      id: updated.id,
      orderNumber: updated.orderNumber,
      productName: updated.product?.name,
      lineName: updated.line?.name,
      lineId: updated.lineId,
      plannedStart: updated.plannedStart,
      plannedEnd: updated.plannedEnd,
      status: updated.status,
    });
  } catch (error: any) {
    return errorResponse(error.message, 500);
  }
}
