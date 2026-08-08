import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Maintenance Calendar & Gantt timeline data
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
    const type = searchParams.get("type");

    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    const whereSchedule: any = { isActive: true };
    const whereTask: any = { createdAt: { gte: new Date(startDate.getTime() - 14 * 86400000) } };

    if (type && type !== "ALL") {
      whereSchedule.type = type as any;
      whereTask.type = type as any;
    }

    const [machines, schedules, tasks] = await Promise.all([
      prisma.machine.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          line: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.maintenanceSchedule.findMany({
        where: whereSchedule,
        include: {
          machine: { select: { id: true, name: true, code: true } },
        },
        orderBy: { nextDueDate: "asc" },
      }),
      prisma.maintenanceTask.findMany({
        where: whereTask,
        include: {
          machine: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Build timeline items for Gantt chart view
    const ganttItems = schedules.map((s) => {
      const dueDate = new Date(s.nextDueDate);
      // Scheduled duration default: 4 hours
      const endDate = new Date(dueDate.getTime() + 4 * 3600000);
      const isPast = dueDate < new Date();

      return {
        id: s.id,
        title: s.title,
        type: s.type,
        machineId: s.machineId,
        machineName: s.machine?.name || "Unknown",
        machineCode: s.machine?.code || "",
        startDate: dueDate.toISOString(),
        endDate: endDate.toISOString(),
        dayOfMonth: dueDate.getDate(),
        priority: s.priority,
        status: isPast ? "OVERDUE" : "SCHEDULED",
        intervalDays: s.intervalDays || 30,
      };
    });

    // Also include active tasks in timeline
    tasks.forEach((t) => {
      const start = t.startedAt || t.createdAt;
      const end = t.completedAt || new Date(start.getTime() + 3 * 3600000);

      ganttItems.push({
        id: t.id,
        title: t.title,
        type: t.type,
        machineId: t.machineId,
        machineName: t.machine?.name || "Unknown",
        machineCode: t.machine?.code || "",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        dayOfMonth: new Date(start).getDate(),
        priority: "MEDIUM",
        status: t.status === "COMPLETED" ? "COMPLETED" : t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING",
        intervalDays: 0,
      });
    });

    // Group items by machine for Gantt machine rows
    const ganttByMachine = machines.map((m) => {
      const machineItems = ganttItems.filter((i) => i.machineId === m.id);
      return {
        machineId: m.id,
        machineName: m.name,
        machineCode: m.code,
        lineName: m.line?.name || "Utama",
        status: m.status,
        events: machineItems,
      };
    });

    // Summary statistics
    const totalScheduled = ganttItems.filter((i) => i.status === "SCHEDULED" || i.status === "PENDING").length;
    const overdueCount = ganttItems.filter((i) => i.status === "OVERDUE").length;
    const completedCount = ganttItems.filter((i) => i.status === "COMPLETED").length;
    const inProgressCount = ganttItems.filter((i) => i.status === "IN_PROGRESS").length;

    return successResponse({
      month,
      ganttByMachine,
      events: ganttItems,
      machines,
      summary: {
        totalScheduled,
        overdueCount,
        completedCount,
        inProgressCount,
        totalMachines: machines.length,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

// POST - Schedule new preventive maintenance
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { machineId, title, type, nextDueDate, intervalDays, priority, description } = body;

    if (!machineId || !title || !nextDueDate) {
      return errorResponse("Machine, title, and due date are required", 400);
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        machineId,
        title,
        type: (type as any) || "PREVENTIVE",
        nextDueDate: new Date(nextDueDate),
        intervalDays: intervalDays ? parseInt(intervalDays) : 30,
        priority: (priority as any) || "MEDIUM",
        description: description || "",
        isActive: true,
      },
      include: {
        machine: { select: { name: true, code: true } },
      },
    });

    return successResponse(schedule, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
