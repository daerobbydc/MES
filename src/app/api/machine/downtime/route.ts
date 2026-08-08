import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Downtime log list and summary
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");
    const range = searchParams.get("range") || "week";

    const now = new Date();
    const from = new Date();
    if (range === "today") from.setHours(0, 0, 0, 0);
    else if (range === "week") from.setDate(now.getDate() - 7);
    else if (range === "month") from.setDate(now.getDate() - 30);

    const alertWhere: any = { createdAt: { gte: from } };
    if (machineId) alertWhere.machineId = machineId;

    const [machines, alerts, machineList] = await Promise.all([
      prisma.machine.findMany({
        select: { id: true, code: true, name: true, status: true, line: { select: { name: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.machineAlert.findMany({
        where: alertWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          machine: { select: { name: true, code: true, line: { select: { name: true } } } },
          acknowledger: { select: { name: true } },
        },
      }),
      prisma.machine.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    ]);

    const downtimeRecords = alerts.map((a) => {
      const resolvedAt = a.resolvedAt || null;
      const startedAt = a.createdAt;
      const durationMin = resolvedAt
        ? Math.round((resolvedAt.getTime() - startedAt.getTime()) / 60000)
        : null;
      return {
        id: a.id,
        machineId: a.machineId,
        machineName: a.machine?.name || "Unknown",
        machineCode: a.machine?.code || "",
        lineName: a.machine?.line?.name || "—",
        alertType: a.type,
        severity: a.severity,
        category: mapAlertCategory(a.type),
        description: a.message,
        startedAt,
        resolvedAt,
        durationMin,
        status: a.isResolved ? "RESOLVED" : "ACTIVE",
        acknowledgedBy: a.acknowledger?.name || null,
      };
    });

    const totalDowntimeMin = downtimeRecords
      .filter((d) => d.durationMin !== null)
      .reduce((sum, d) => sum + (d.durationMin || 0), 0);

    const resolvedRecords = downtimeRecords.filter((d) => d.durationMin !== null);
    const avgDuration = resolvedRecords.length > 0
      ? Math.round(totalDowntimeMin / resolvedRecords.length)
      : 0;
    const openAlerts = downtimeRecords.filter((d) => d.status === "ACTIVE").length;

    const byCategory: Record<string, number> = {};
    downtimeRecords.forEach((d) => {
      byCategory[d.category] = (byCategory[d.category] || 0) + (d.durationMin || 30);
    });

    const byMachine: Record<string, { name: string; minutes: number; count: number }> = {};
    downtimeRecords.forEach((d) => {
      if (!byMachine[d.machineId]) byMachine[d.machineId] = { name: d.machineName, minutes: 0, count: 0 };
      byMachine[d.machineId].minutes += d.durationMin || 30;
      byMachine[d.machineId].count += 1;
    });
    const topMachines = Object.entries(byMachine)
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 5)
      .map(([id, v]) => ({ machineId: id, ...v }));

    return successResponse({
      records: downtimeRecords,
      summary: {
        totalEvents: downtimeRecords.length,
        totalDowntimeMin,
        totalDowntimeHrs: parseFloat((totalDowntimeMin / 60).toFixed(1)),
        avgDurationMin: avgDuration,
        openAlerts,
        machinesDown: machines.filter((m) => m.status === "DOWN").length,
        totalMachines: machines.length,
      },
      byCategory: Object.entries(byCategory).map(([name, minutes]) => ({ name, minutes })),
      topMachines,
      machineList,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

// POST - Log a new downtime event
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { machineId, alertType, severity, description } = body;

    if (!machineId || !description) {
      return errorResponse("Machine and description are required", 400);
    }

    // Map alertType string to valid AlertType enum value
    const validTypes = ["BREAKDOWN", "MAINTENANCE_DUE", "THRESHOLD_EXCEEDED", "QUALITY_ALERT", "SAFETY"];
    const mappedType = validTypes.includes(alertType) ? alertType : "BREAKDOWN";

    const alert = await prisma.machineAlert.create({
      data: {
        machineId,
        type: mappedType as any,
        severity: (severity as any) || "HIGH",
        message: description,
        isResolved: false,
      },
      include: {
        machine: { select: { name: true, code: true } },
      },
    });

    // Update machine status to DOWN
    await prisma.machine.update({
      where: { id: machineId },
      data: { status: "DOWN" },
    });

    return successResponse(alert, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

function mapAlertCategory(type: string): string {
  const map: Record<string, string> = {
    BREAKDOWN: "Equipment Breakdown",
    MAINTENANCE_DUE: "Planned Maintenance",
    THRESHOLD_EXCEEDED: "Process Parameter",
    QUALITY_ALERT: "Quality Issue",
    SAFETY: "Safety Issue",
  };
  return map[type] || "Other";
}
