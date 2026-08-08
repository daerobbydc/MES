import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - Live telemetry data & stream points
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get("machineId");

    const machines = await prisma.machine.findMany({
      include: {
        line: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    const targetMachineId = machineId || machines[0]?.id;

    // Get recent telemetry stream for target machine
    const recentData = targetMachineId
      ? await prisma.machineData.findMany({
          where: { machineId: targetMachineId },
          orderBy: { timestamp: "desc" },
          take: 30,
        })
      : [];

    // Reverse to chronological order
    const stream = recentData.reverse().map((d) => {
      const meta = (d.metadata as any) || {};
      return {
        timestamp: d.timestamp.toISOString(),
        timeLabel: d.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        temperature: d.temperature ?? 65.5,
        spindleSpeed: d.spindleSpeed ?? 1800,
        powerConsumption: d.powerConsumption ?? 12.5,
        vibration: meta.vibration ?? 1.8,
        pressure: meta.pressure ?? 4.2,
      };
    });

    // Overview metrics per machine
    const machineTelemetry = machines.map((m, idx) => {
      const isRunning = m.status === "RUNNING";
      const isDown = m.status === "DOWN";

      const temp = isDown ? 28.5 : isRunning ? 72.4 + (idx * 2.1) : 45.0;
      const speed = isDown ? 0 : isRunning ? 2200 + (idx * 150) : 0;
      const power = isDown ? 0.5 : isRunning ? 15.8 + (idx * 1.2) : 2.1;
      const vibration = isDown ? 0.1 : isRunning ? 1.6 + (idx * 0.3) : 0.4;
      const pressure = isDown ? 0.0 : isRunning ? 4.5 + (idx * 0.2) : 1.2;

      const tempStatus = temp > 85 ? "CRITICAL" : temp > 75 ? "WARNING" : "NORMAL";
      const vibStatus = vibration > 4.5 ? "CRITICAL" : vibration > 3.0 ? "WARNING" : "NORMAL";

      return {
        machineId: m.id,
        machineName: m.name,
        machineCode: m.code,
        lineName: m.line?.name || "Lini Produksi Utama",
        workCenter: m.type || "Pemesinan CNC",
        status: m.status,
        sensors: {
          temperature: { value: parseFloat(temp.toFixed(1)), unit: "°C", status: tempStatus },
          spindleSpeed: { value: Math.round(speed), unit: "RPM", status: speed > 3200 ? "WARNING" : "NORMAL" },
          powerConsumption: { value: parseFloat(power.toFixed(1)), unit: "kW", status: "NORMAL" },
          vibration: { value: parseFloat(vibration.toFixed(2)), unit: "mm/s", status: vibStatus },
          pressure: { value: parseFloat(pressure.toFixed(1)), unit: "bar", status: "NORMAL" },
        },
      };
    });

    return successResponse({
      machines: machineTelemetry,
      activeMachineId: targetMachineId,
      stream,
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}

// POST - Push simulated sensor telemetry & create auto-alert if thresholds exceeded
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { machineId, temperature, spindleSpeed, powerConsumption, vibration, pressure, isAnomaly } = body;

    if (!machineId) {
      return errorResponse("Machine ID is required", 400);
    }

    const temp = temperature ?? (isAnomaly ? 94.2 : 68.0);
    const speed = spindleSpeed ?? (isAnomaly ? 3800 : 2100);
    const power = powerConsumption ?? (isAnomaly ? 28.4 : 14.2);
    const vib = vibration ?? (isAnomaly ? 5.8 : 1.5);
    const press = pressure ?? (isAnomaly ? 7.2 : 4.2);

    const data = await prisma.machineData.create({
      data: {
        machineId,
        temperature: temp,
        spindleSpeed: speed,
        powerConsumption: power,
        metadata: { vibration: vib, pressure: press, isSimulated: true },
      },
    });

    // Auto-create alert if anomaly detected
    let alertCreated = null;
    if (temp > 85 || vib > 4.5) {
      alertCreated = await prisma.machineAlert.create({
        data: {
          machineId,
          type: temp > 85 ? "THRESHOLD_EXCEEDED" : "VIBRATION" as any,
          severity: "CRITICAL" as any,
          message: `[IoT Sensor Alert] ${temp > 85 ? `Suhu tinggi: ${temp}°C` : `Vibrasi berlebih: ${vib} mm/s`}`,
          isResolved: false,
        },
      });

      // Update machine status to DOWN if critical anomaly
      if (temp > 90 || vib > 5.0) {
        await prisma.machine.update({
          where: { id: machineId },
          data: { status: "DOWN" },
        });
      }
    }

    return successResponse({ data, alertCreated }, 201);
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
