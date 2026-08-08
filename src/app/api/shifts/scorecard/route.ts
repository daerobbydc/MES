import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "month";

    const now = new Date();
    const from = new Date();
    if (range === "week") from.setDate(now.getDate() - 7);
    else if (range === "month") from.setDate(now.getDate() - 30);
    else if (range === "quarter") from.setDate(now.getDate() - 90);

    // Get operators
    const operators = await prisma.user.findMany({
      where: { role: "OPERATOR", isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });

    // Get shop floor logs (goodCount = production output)
    const shopFloorLogs = await prisma.shopFloorLog.findMany({
      where: { timestamp: { gte: from } },
      select: {
        operatorId: true,
        goodCount: true,
        scrapCount: true,
        timestamp: true,
        logType: true,
      },
    });

    // Get shift schedules for operators
    const shiftSchedules = await prisma.shiftSchedule.findMany({
      where: {
        date: { gte: from },
        userId: { in: operators.map((o) => o.id) },
      },
      select: {
        userId: true,
        date: true,
        status: true,
        shift: { select: { name: true, startTime: true } },
      },
    });

    // Quality rate from inspections
    const inspections = await prisma.qualityInspection.findMany({
      where: { createdAt: { gte: from } },
      select: { passCount: true, failCount: true, sampleSize: true },
    });

    const totalInspected = inspections.reduce((s, i) => s + i.sampleSize, 0);
    const totalPassed = inspections.reduce((s, i) => s + i.passCount, 0);
    const avgQualityRate = totalInspected > 0
      ? parseFloat(((totalPassed / totalInspected) * 100).toFixed(1))
      : 97.5;

    // Group logs by operator
    const logsByOperator: Record<string, typeof shopFloorLogs> = {};
    shopFloorLogs.forEach((log) => {
      if (log.operatorId) {
        if (!logsByOperator[log.operatorId]) logsByOperator[log.operatorId] = [];
        logsByOperator[log.operatorId].push(log);
      }
    });

    // Group schedules by operator
    const schedulesByOperator: Record<string, typeof shiftSchedules> = {};
    shiftSchedules.forEach((s) => {
      if (!schedulesByOperator[s.userId]) schedulesByOperator[s.userId] = [];
      schedulesByOperator[s.userId].push(s);
    });

    // Build scorecards
    const scorecards = operators.map((op) => {
      const logs = logsByOperator[op.id] || [];
      const schedules = schedulesByOperator[op.id] || [];

      const totalShifts = schedules.length;
      const attendedShifts = schedules.filter((s) => s.status === "CHECKED_IN" || s.status === "CHECKED_OUT").length;
      const attendanceRate = totalShifts > 0
        ? parseFloat(((attendedShifts / totalShifts) * 100).toFixed(1))
        : 0;

      const totalOutput = logs.reduce((s, l) => s + (l.goodCount || 0), 0);
      const totalScrap = logs.reduce((s, l) => s + (l.scrapCount || 0), 0);

      // Punctuality: CHECKED_IN on time (heuristic — schedule status available)
      const onTimeCount = schedules.filter((s) => s.status === "CHECKED_IN" || s.status === "CHECKED_OUT").length;
      const punctualityRate = attendedShifts > 0
        ? parseFloat(((onTimeCount / attendedShifts) * 100).toFixed(1))
        : 0;

      const qualityRate = avgQualityRate;

      // Output score: normalize relative to average (100 pts if above average)
      const avgOutput = Object.values(logsByOperator).reduce((s, l) => s + l.reduce((ss, ll) => ss + (ll.goodCount || 0), 0), 0) / (operators.length || 1);
      const outputScore = avgOutput > 0 ? Math.min(100, Math.round((totalOutput / avgOutput) * 80)) : 50;

      const score = parseFloat((
        attendanceRate * 0.30 +
        punctualityRate * 0.20 +
        qualityRate * 0.30 +
        outputScore * 0.20
      ).toFixed(1));

      const grade =
        score >= 90 ? "A" :
        score >= 80 ? "B" :
        score >= 70 ? "C" :
        score >= 60 ? "D" : "F";

      return {
        id: op.id,
        name: op.name,
        email: op.email,
        department: op.department || "Production",
        totalShifts,
        attendedShifts,
        attendanceRate,
        punctualityRate,
        totalOutput,
        totalScrap,
        qualityRate,
        score,
        grade,
        trend: score >= 85 ? "UP" : score >= 70 ? "STABLE" : "DOWN",
      };
    });

    scorecards.sort((a, b) => b.score - a.score);

    const avgScore = scorecards.length > 0
      ? parseFloat((scorecards.reduce((s, o) => s + o.score, 0) / scorecards.length).toFixed(1))
      : 0;

    return successResponse({
      scorecards,
      summary: {
        totalOperators: scorecards.length,
        avgScore,
        topPerformer: scorecards[0]?.name || "N/A",
        gradeDistribution: {
          A: scorecards.filter((o) => o.grade === "A").length,
          B: scorecards.filter((o) => o.grade === "B").length,
          C: scorecards.filter((o) => o.grade === "C").length,
          D: scorecards.filter((o) => o.grade === "D").length,
          F: scorecards.filter((o) => o.grade === "F").length,
        },
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
}
