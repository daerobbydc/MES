"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar, ChevronLeft, ChevronRight, Factory, BarChart3,
  AlertTriangle, CheckCircle, Zap, GripVertical, X,
  Clock, Package, RefreshCw, List, Play, TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GanttOrder {
  id: string;
  orderNumber: string;
  productName: string;
  sku: string;
  lineId: string | null;
  lineName: string | null;
  quantity: number;
  completedQty: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  status: string;
  priority: number;
  notes?: string | null;
}

interface ProductionLine {
  id: string;
  name: string;
  capacity: number | null;
}

interface CapacityData {
  id: string;
  name: string;
  lineName: string;
  capacity: number;
  scheduled: number;
  utilization: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-violet-500 to-violet-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-amber-500 to-amber-600",
  "from-fuchsia-500 to-fuchsia-600",
];

const LINE_BARS = [
  "bg-blue-100 border border-blue-300 text-blue-800",
  "bg-violet-100 border border-violet-300 text-violet-800",
  "bg-emerald-100 border border-emerald-300 text-emerald-800",
  "bg-orange-100 border border-orange-300 text-orange-800",
  "bg-rose-100 border border-rose-300 text-rose-800",
  "bg-cyan-100 border border-cyan-300 text-cyan-800",
  "bg-amber-100 border border-amber-300 text-amber-800",
  "bg-fuchsia-100 border border-fuchsia-300 text-fuchsia-800",
];

const LINE_DOTS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-500",
  "bg-rose-500", "bg-cyan-500", "bg-amber-500", "bg-fuchsia-500",
];

const LINE_FILL = [
  "bg-blue-200", "bg-violet-200", "bg-emerald-200", "bg-orange-200",
  "bg-rose-200", "bg-cyan-200", "bg-amber-200", "bg-fuchsia-200",
];

const STATUS_BADGE: Record<string, string> = {
  PLANNED:     "bg-surface-100 text-surface-600 border border-surface-200",
  RELEASED:    "bg-sky-50 text-sky-700 border border-sky-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border border-blue-200",
  ON_HOLD:     "bg-amber-50 text-amber-700 border border-amber-200",
  COMPLETED:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CANCELLED:   "bg-rose-50 text-rose-700 border border-rose-200",
};

const DAY_WIDTH = 68;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function stripTime(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function daysBetween(a: Date, b: Date) { return Math.round((stripTime(b).getTime() - stripTime(a).getTime()) / 86400000); }
function fmtShort(d: Date) { return d.toLocaleDateString("id-ID", { month: "short", day: "numeric" }); }
function fmtFull(iso: string | null) { if (!iso) return "—"; return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); }
function priorityLabel(p: number) { return p >= 3 ? "URGENT" : p >= 2 ? "HIGH" : p >= 1 ? "MEDIUM" : "LOW"; }
function priorityColor(p: number) { return p >= 3 ? "text-rose-600 bg-rose-50" : p >= 2 ? "text-orange-600 bg-orange-50" : p >= 1 ? "text-amber-600 bg-amber-50" : "text-surface-500 bg-surface-100"; }

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
  const [orders, setOrders] = useState<GanttOrder[]>([]);
  const [unscheduled, setUnscheduled] = useState<GanttOrder[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [capacity, setCapacity] = useState<CapacityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewMode, setViewMode] = useState<"gantt" | "capacity">("gantt");
  const [zoomDays, setZoomDays] = useState(14);
  const [dayOffset, setDayOffset] = useState(0);

  const [selectedOrder, setSelectedOrder] = useState<GanttOrder | null>(null);
  const [showPool, setShowPool] = useState(false);

  const [dragging, setDragging] = useState<GanttOrder | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ lineId: string; di: number } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, uRes, lRes, cRes] = await Promise.all([
        fetch("/api/production/scheduling"),
        fetch("/api/production/scheduling?type=unscheduled"),
        fetch("/api/production/scheduling?type=lines"),
        fetch("/api/production/scheduling?type=capacity"),
      ]);
      const [oJ, uJ, lJ, cJ] = await Promise.all([oRes.json(), uRes.json(), lRes.json(), cRes.json()]);
      if (oJ.success) setOrders(oJ.data);
      if (uJ.success) setUnscheduled(uJ.data);
      if (lJ.success) setLines(lJ.data);
      if (cJ.success) setCapacity(cJ.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const timelineStart = stripTime(addDays(new Date(), dayOffset));
  const days = Array.from({ length: zoomDays }, (_, i) => addDays(timelineStart, i));

  const getBarGeometry = (order: GanttOrder) => {
    if (!order.plannedStart || !order.plannedEnd) return null;
    const s = stripTime(new Date(order.plannedStart));
    const e = stripTime(new Date(order.plannedEnd));
    const left = daysBetween(timelineStart, s);
    const width = Math.max(1, daysBetween(s, e) + 1);
    if (left + width <= 0 || left >= zoomDays) return null;
    const cl = Math.max(0, left);
    const cw = Math.min(width - (cl - left), zoomDays - cl);
    return { left: cl, width: cw };
  };

  const handleDrop = async (lineId: string, di: number) => {
    if (!dragging) return;
    const newStart = addDays(timelineStart, di);
    const dur = dragging.plannedStart && dragging.plannedEnd
      ? daysBetween(new Date(dragging.plannedStart), new Date(dragging.plannedEnd))
      : Math.max(1, Math.ceil(dragging.quantity / 100));
    const newEnd = addDays(newStart, dur);
    setSaving(true);
    try {
      await fetch("/api/production/scheduling", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dragging.id, lineId, plannedStart: newStart.toISOString(), plannedEnd: newEnd.toISOString() }),
      });
      await fetchAll();
    } catch (e) { console.error(e); }
    finally { setSaving(false); setDragging(null); setDragOverCell(null); }
  };

  const handleAutoOptimize = async () => {
    setOptimizing(true);
    try {
      await fetch("/api/production/scheduling", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoOptimize: true }),
      });
      await fetchAll();
    } catch (e) { console.error(e); }
    finally { setOptimizing(false); }
  };

  const scheduledCount = orders.filter(o => o.plannedStart && o.lineId).length;
  const inProgressCount = orders.filter(o => o.status === "IN_PROGRESS").length;
  const overdueCount = orders.filter(o => o.plannedEnd && new Date(o.plannedEnd) < new Date() && o.status !== "COMPLETED").length;
  const lineColorMap = Object.fromEntries(lines.map((l, i) => [l.id, i % LINE_GRADIENTS.length]));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-sm text-surface-500">Loading schedule...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Production Scheduling</h1>
          <p className="text-sm text-surface-500 mt-0.5">Interactive Gantt Chart · APS Load Balancing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPool(!showPool)}
            className="relative btn-secondary flex items-center gap-2 text-sm"
          >
            <List size={15} />
            Unscheduled Pool
            {unscheduled.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
                {unscheduled.length}
              </span>
            )}
          </button>
          <button
            onClick={handleAutoOptimize}
            disabled={optimizing}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {optimizing ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
            APS Auto-Optimize
          </button>
          <button
            onClick={() => setViewMode(viewMode === "gantt" ? "capacity" : "gantt")}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {viewMode === "gantt" ? <BarChart3 size={15} /> : <Calendar size={15} />}
            {viewMode === "gantt" ? "Capacity View" : "Gantt View"}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Scheduled Orders", value: scheduledCount, icon: Calendar, iconCls: "text-primary-600", bg: "bg-primary-50" },
          { label: "Unscheduled", value: unscheduled.length, icon: AlertTriangle, iconCls: "text-orange-600", bg: "bg-orange-50" },
          { label: "In Progress", value: inProgressCount, icon: Play, iconCls: "text-blue-600", bg: "bg-blue-50" },
          { label: "Overdue", value: overdueCount, icon: Clock, iconCls: "text-rose-600", bg: "bg-rose-50" },
        ].map(kpi => (
          <div key={kpi.label} className="card flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
              <kpi.icon size={20} className={kpi.iconCls} />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">{kpi.value}</p>
              <p className="text-xs text-surface-500">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── GANTT VIEW ── */}
      {viewMode === "gantt" && (
        <div className="card-static overflow-hidden p-0 rounded-2xl border border-surface-200/60 shadow-sm">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100 bg-surface-50/50 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setDayOffset(dayOffset - zoomDays)} className="btn-icon">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-surface-700 min-w-[180px] text-center">
                {fmtShort(days[0])} — {fmtShort(days[days.length - 1])}
              </span>
              <button onClick={() => setDayOffset(dayOffset + zoomDays)} className="btn-icon">
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setDayOffset(0)} className="text-xs px-3 py-1.5 rounded-lg bg-white border border-surface-200 text-surface-600 hover:bg-surface-50 transition-all font-medium">
                Today
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-surface-400 mr-1">Zoom:</span>
              {[14, 21, 28].map(z => (
                <button
                  key={z}
                  onClick={() => setZoomDays(z)}
                  className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all ${
                    zoomDays === z
                      ? "bg-primary-500 border-primary-500 text-white shadow-sm shadow-primary-200"
                      : "bg-white border-surface-200 text-surface-500 hover:border-surface-300"
                  }`}
                >
                  {z}D
                </button>
              ))}
            </div>
          </div>

          {/* Gantt Grid */}
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${180 + zoomDays * DAY_WIDTH}px` }}>

              {/* Day Header */}
              <div
                className="grid sticky top-0 z-10 bg-surface-50 border-b border-surface-200"
                style={{ gridTemplateColumns: `180px repeat(${zoomDays}, ${DAY_WIDTH}px)` }}
              >
                <div className="px-4 py-2.5 text-xs font-bold text-surface-400 uppercase tracking-widest border-r border-surface-100">
                  Production Line
                </div>
                {days.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <div key={i} className={`px-1 py-2 text-center border-r border-surface-100 last:border-r-0 ${isToday ? "bg-primary-50" : isWeekend ? "bg-surface-100/40" : ""}`}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-primary-500" : isWeekend ? "text-surface-300" : "text-surface-400"}`}>
                        {day.toLocaleDateString("en-ID", { weekday: "short" })}
                      </div>
                      <div className={`text-sm font-bold mt-0.5 ${isToday ? "text-primary-600" : isWeekend ? "text-surface-300" : "text-surface-600"}`}>
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lines */}
              {lines.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-surface-400">
                  <Factory size={36} className="text-surface-300" />
                  <p className="text-sm font-medium">No production lines configured</p>
                  <p className="text-xs text-surface-300">Add production lines to start scheduling</p>
                </div>
              ) : lines.map((line) => {
                const ci = lineColorMap[line.id] ?? 0;
                const lineOrders = orders.filter(o => o.lineId === line.id && o.plannedStart && o.plannedEnd);

                // Row packing to avoid bar overlap
                const rows: GanttOrder[][] = [];
                for (const order of lineOrders) {
                  const geo = getBarGeometry(order);
                  if (!geo) continue;
                  let placed = false;
                  for (const row of rows) {
                    const conflict = row.some(ro => {
                      const rg = getBarGeometry(ro);
                      return rg ? geo.left < rg.left + rg.width && geo.left + geo.width > rg.left : false;
                    });
                    if (!conflict) { row.push(order); placed = true; break; }
                  }
                  if (!placed) rows.push([order]);
                }

                const rowCount = Math.max(1, rows.length);
                const rowH = rowCount * 42 + 20;

                return (
                  <div key={line.id} className="relative border-b border-surface-100 last:border-b-0 hover:bg-surface-50/50 transition-colors">
                    <div
                      className="grid"
                      style={{ gridTemplateColumns: `180px repeat(${zoomDays}, ${DAY_WIDTH}px)`, minHeight: `${rowH}px` }}
                    >
                      {/* Line label */}
                      <div className="px-3 py-3 border-r border-surface-100 flex items-start gap-2 sticky left-0 bg-white z-[5] shadow-[1px_0_0_#f1f5f9]">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${LINE_DOTS[ci]}`} />
                        <div>
                          <span className="text-xs font-semibold text-surface-800 leading-tight block">{line.name}</span>
                          <p className="text-[10px] text-surface-400 mt-0.5">{lineOrders.length} orders</p>
                        </div>
                      </div>

                      {/* Day drop zones */}
                      {days.map((_, di) => {
                        const isDO = dragOverCell?.lineId === line.id && dragOverCell?.di === di;
                        const isToday = days[di]?.toDateString() === new Date().toDateString();
                        const isWeekend = days[di]?.getDay() === 0 || days[di]?.getDay() === 6;
                        return (
                          <div
                            key={di}
                            className={`border-r border-surface-100/70 last:border-r-0 transition-colors ${
                              isToday ? "bg-primary-50/30" : isWeekend ? "bg-surface-50/50" : ""
                            } ${isDO ? "bg-primary-100/60 ring-2 ring-inset ring-primary-300" : ""}`}
                            onDragOver={e => { e.preventDefault(); setDragOverCell({ lineId: line.id, di }); }}
                            onDragLeave={() => setDragOverCell(null)}
                            onDrop={() => handleDrop(line.id, di)}
                          />
                        );
                      })}
                    </div>

                    {/* Bars overlay */}
                    <div className="absolute inset-0 pointer-events-none" style={{ left: 180 }}>
                      {rows.map((row, ri) =>
                        row.map(order => {
                          const geo = getBarGeometry(order);
                          if (!geo) return null;
                          const progress = order.quantity > 0 ? Math.round((order.completedQty / order.quantity) * 100) : 0;
                          const isOverdue = order.plannedEnd && new Date(order.plannedEnd) < new Date() && order.status !== "COMPLETED";
                          return (
                            <div
                              key={order.id}
                              draggable
                              onDragStart={() => setDragging(order)}
                              onDragEnd={() => setDragging(null)}
                              onClick={() => setSelectedOrder(order)}
                              className={`absolute rounded-lg shadow-sm cursor-grab active:cursor-grabbing pointer-events-auto
                                hover:shadow-md hover:brightness-95 transition-all duration-150 select-none
                                ${isOverdue ? "bg-rose-100 border border-rose-300 text-rose-800" : LINE_BARS[ci]}`}
                              style={{
                                left: `${geo.left * DAY_WIDTH + 3}px`,
                                width: `${geo.width * DAY_WIDTH - 6}px`,
                                top: `${ri * 42 + 8}px`,
                                height: "34px",
                                zIndex: 10,
                              }}
                            >
                              {/* Progress fill */}
                              <div
                                className={`absolute inset-0 rounded-lg opacity-40 ${LINE_FILL[ci]}`}
                                style={{ width: `${progress}%` }}
                              />
                              <div className="relative z-10 flex items-center gap-1 h-full px-2 overflow-hidden">
                                <GripVertical size={10} className="flex-shrink-0 opacity-30" />
                                <div className="flex-1 min-w-0 truncate">
                                  <span className="text-[11px] font-bold block leading-none truncate">{order.orderNumber}</span>
                                  <span className="text-[10px] opacity-70 block truncate leading-none mt-0.5">{order.productName}</span>
                                </div>
                                {progress > 0 && (
                                  <span className="text-[10px] font-bold flex-shrink-0 ml-1">{progress}%</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-5 py-3 border-t border-surface-100 bg-surface-50/40 flex-wrap">
            <span className="text-[10px] text-surface-400 uppercase tracking-widest font-bold">Lines:</span>
            {lines.slice(0, 6).map(line => {
              const ci = lineColorMap[line.id] ?? 0;
              return (
                <div key={line.id} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${LINE_DOTS[ci]}`} />
                  <span className="text-[11px] text-surface-600 font-medium">{line.name}</span>
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-rose-200 border border-rose-300" />
                <span className="text-[11px] text-surface-500">Overdue</span>
              </div>
              <span className="text-[11px] text-surface-400 italic">Drag bars to reschedule</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CAPACITY VIEW ── */}
      {viewMode === "capacity" && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-surface-900">Work Center Capacity Overview</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-surface-500">Normal (&lt;70%)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-surface-500">High (70–90%)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-surface-500">Critical (&gt;90%)</span></div>
              </div>
            </div>
            {capacity.length === 0 ? (
              <div className="text-center py-10 text-surface-400 text-sm">No work center data available</div>
            ) : (
              <div className="space-y-3">
                {capacity.map(wc => (
                  <div key={wc.id} className="p-4 rounded-xl border border-surface-100 hover:border-surface-200 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          wc.utilization > 90 ? "bg-red-50" : wc.utilization > 70 ? "bg-amber-50" : "bg-emerald-50"
                        }`}>
                          <Factory size={16} className={
                            wc.utilization > 90 ? "text-red-500" : wc.utilization > 70 ? "text-amber-500" : "text-emerald-500"
                          } />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-800 text-sm">{wc.name}</p>
                          <p className="text-xs text-surface-400">{wc.lineName} · Capacity: {wc.capacity} units/day</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${
                          wc.utilization > 90 ? "text-red-600" : wc.utilization > 70 ? "text-amber-600" : "text-emerald-600"
                        }`}>{wc.utilization.toFixed(0)}%</p>
                        <p className="text-xs text-surface-400">{wc.scheduled}/{wc.capacity} units</p>
                      </div>
                    </div>
                    <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          wc.utilization > 90 ? "bg-gradient-to-r from-red-400 to-red-600" :
                          wc.utilization > 70 ? "bg-gradient-to-r from-amber-400 to-amber-600" :
                          "bg-gradient-to-r from-emerald-400 to-emerald-600"
                        }`}
                        style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { range: "< 70%", label: "Normal Capacity", desc: "Room for more orders. Lines are available.", icon: CheckCircle, color: "emerald" },
              { range: "70–90%", label: "High Utilization", desc: "Plan ahead. Consider rebalancing loads.", icon: AlertTriangle, color: "amber" },
              { range: "> 90%", label: "Critical Capacity", desc: "Risk of delays. Reassign orders or add shifts.", icon: AlertTriangle, color: "red" },
            ].map(r => (
              <div key={r.range} className={`card border-${r.color}-100 bg-${r.color}-50/30`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <r.icon size={15} className={`text-${r.color}-500`} />
                  <span className={`font-bold text-${r.color}-700 text-sm`}>{r.range}</span>
                </div>
                <p className="text-xs font-semibold text-surface-700 mb-0.5">{r.label}</p>
                <p className="text-xs text-surface-500">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Unscheduled Orders Pool Drawer ── */}
      {showPool && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white/95 backdrop-blur-xl border-l border-surface-200 shadow-2xl z-[100] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <div>
              <h3 className="font-bold text-surface-900 text-sm">Unscheduled Orders</h3>
              <p className="text-[11px] text-surface-400 mt-0.5">Drag items to Gantt chart to schedule</p>
            </div>
            <button onClick={() => setShowPool(false)} className="btn-icon w-7 h-7">
              <X size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {unscheduled.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-surface-400">
                <CheckCircle size={28} className="text-emerald-400" />
                <span className="text-sm font-medium">All orders scheduled!</span>
              </div>
            ) : unscheduled.map(order => (
              <div
                key={order.id}
                draggable
                onDragStart={() => setDragging(order)}
                onDragEnd={() => setDragging(null)}
                className="p-3 rounded-xl bg-surface-50 border border-surface-200 hover:border-surface-300 hover:bg-white cursor-grab active:cursor-grabbing transition-all group shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GripVertical size={12} className="text-surface-300 group-hover:text-surface-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-surface-900">{order.orderNumber}</p>
                      <p className="text-[11px] text-surface-500 truncate">{order.productName}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${priorityColor(order.priority)}`}>
                    {priorityLabel(order.priority)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 ml-5">
                  <span className="text-[11px] text-surface-400">
                    <Package size={10} className="inline mr-0.5" />{order.quantity} units
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${STATUS_BADGE[order.status] || ""}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Order Detail Panel ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[200] flex">
          <div className="flex-1 bg-surface-900/30 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="w-96 bg-white border-l border-surface-200 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <div>
                <h3 className="font-bold text-surface-900">{selectedOrder.orderNumber}</h3>
                <p className="text-[11px] text-surface-500 mt-0.5">{selectedOrder.productName}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="btn-icon w-7 h-7">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[selectedOrder.status] || ""}`}>
                {selectedOrder.status}
              </span>
              {[
                ["Production Line", selectedOrder.lineName || "—"],
                ["SKU", selectedOrder.sku],
                ["Planned Start", fmtFull(selectedOrder.plannedStart)],
                ["Planned End", fmtFull(selectedOrder.plannedEnd)],
                ["Target Qty", `${selectedOrder.quantity} units`],
                ["Completed", `${selectedOrder.completedQty} units`],
                ["Priority", `${priorityLabel(selectedOrder.priority)} (${selectedOrder.priority})`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between py-2 border-b border-surface-50">
                  <span className="text-xs text-surface-400">{label}</span>
                  <span className="text-xs text-surface-800 font-semibold text-right ml-4">{value}</span>
                </div>
              ))}

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-surface-500">Progress</span>
                  <span className="font-semibold text-surface-700">
                    {selectedOrder.quantity > 0 ? Math.round((selectedOrder.completedQty / selectedOrder.quantity) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all"
                    style={{ width: `${selectedOrder.quantity > 0 ? (selectedOrder.completedQty / selectedOrder.quantity) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <p className="text-[11px] text-surface-400 font-medium mb-1">Notes</p>
                  <p className="text-xs text-surface-700">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-surface-100">
              <a
                href={`/production`}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <TrendingUp size={15} />
                View Full Order
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Saving Toast */}
      {saving && (
        <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-surface-200 shadow-lg text-sm text-surface-700">
          <RefreshCw size={13} className="animate-spin text-primary-500" />
          Saving schedule...
        </div>
      )}
    </div>
  );
}
