"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar as CalendarIcon, Clock, Plus, Search, RefreshCw, Filter,
  Wrench, CheckCircle2, AlertOctagon, ChevronLeft, ChevronRight,
  Layers, AlertTriangle, ShieldCheck, Activity, BarChart2, XCircle
} from "lucide-react";

interface GanttEvent {
  id: string;
  title: string;
  type: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  startDate: string;
  endDate: string;
  dayOfMonth: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" | "PENDING";
  intervalDays: number;
}

interface MachineRow {
  machineId: string;
  machineName: string;
  machineCode: string;
  lineName: string;
  status: string;
  events: GanttEvent[];
}

interface Summary {
  totalScheduled: number;
  overdueCount: number;
  completedCount: number;
  inProgressCount: number;
  totalMachines: number;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  PREVENTIVE: { bg: "bg-blue-500", text: "text-white", border: "border-blue-600" },
  CORRECTIVE: { bg: "bg-rose-500", text: "text-white", border: "border-rose-600" },
  PREDICTIVE: { bg: "bg-violet-500", text: "text-white", border: "border-violet-600" },
  INSPECTION: { bg: "bg-emerald-500", text: "text-white", border: "border-emerald-600" },
};

export default function MaintenanceCalendarPage() {
  const [viewMode, setViewMode] = useState<"GANTT" | "CALENDAR">("GANTT");
  const [ganttData, setGanttData] = useState<MachineRow[]>([]);
  const [events, setEvents] = useState<GanttEvent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [currentMonth, setCurrentMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [showModal, setShowModal] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const [form, setForm] = useState({
    machineId: "",
    title: "",
    type: "PREVENTIVE",
    nextDueDate: new Date().toISOString().slice(0, 10),
    intervalDays: "30",
    priority: "MEDIUM",
    description: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month: currentMonth });
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const res = await fetch(`/api/maintenance/calendar?${params}`);
      const json = await res.json();
      if (json.success) {
        setGanttData(json.data.ganttByMachine || []);
        setEvents(json.data.events || []);
        setSummary(json.data.summary);
        setMachines(json.data.machines || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/maintenance/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchData();
        setForm({
          machineId: "",
          title: "",
          type: "PREVENTIVE",
          nextDueDate: new Date().toISOString().slice(0, 10),
          intervalDays: "30",
          priority: "MEDIUM",
          description: "",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const shiftMonth = (delta: number) => {
    const [year, month] = currentMonth.split("-").map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${yStr}-${mStr}`);
  };

  const [yearNum, monthNum] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Preventive Maintenance Calendar & Gantt</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
              ISO 55000 Asset Management
            </span>
          </div>
          <p className="page-subtitle">Preventive maintenance schedules, periodic inspections & machine Gantt timeline</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="bg-surface-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode("GANTT")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "GANTT" ? "bg-white text-surface-900 shadow-sm" : "text-surface-600 hover:text-surface-900"
              }`}
            >
              📊 Gantt View
            </button>
            <button
              onClick={() => setViewMode("CALENDAR")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "CALENDAR" ? "bg-white text-surface-900 shadow-sm" : "text-surface-600 hover:text-surface-900"
              }`}
            >
              📅 Calendar View
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs flex items-center gap-2">
            <Plus size={14} /> Schedule PM
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Scheduled (PM)</p>
                <p className="stat-value text-blue-600">{summary.totalScheduled}</p>
                <p className="text-xs text-surface-400 mt-0.5">This Month</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <CalendarIcon size={20} />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Overdue Tasks</p>
                <p className="stat-value text-rose-600">{summary.overdueCount}</p>
                <p className="text-xs text-surface-400 mt-0.5">Requires Attention</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <AlertOctagon size={20} />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">In Progress</p>
                <p className="stat-value text-amber-600">{summary.inProgressCount}</p>
                <p className="text-xs text-surface-400 mt-0.5">Active Servicing</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Completed</p>
                <p className="stat-value text-emerald-600">{summary.completedCount}</p>
                <p className="text-xs text-surface-400 mt-0.5">This Month</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Month Navigator & Type Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-surface-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-xl border border-surface-200 hover:bg-surface-50 text-surface-600">
            <ChevronLeft size={16} />
          </button>
          <span className="font-bold text-surface-900 text-sm w-36 text-center">
            {new Date(yearNum, monthNum - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-xl border border-surface-200 hover:bg-surface-50 text-surface-600">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-400 font-semibold uppercase tracking-wider pr-1">Type:</span>
          {["ALL", "PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "INSPECTION"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                typeFilter === t ? "bg-primary-500 text-white shadow-sm" : "bg-surface-100 text-surface-600 hover:bg-surface-200"
              }`}
            >
              {t === "ALL" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN VIEW: GANTT CHART */}
      {viewMode === "GANTT" && (
        <div className="card-static p-0 overflow-hidden">
          <div className="p-4 border-b border-surface-100 flex items-center justify-between">
            <h3 className="font-bold text-surface-900 text-sm">Machine Gantt Chart Timeline — {currentMonth}</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-blue-500"></span>Preventive</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-500"></span>Corrective</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-violet-500"></span>Predictive</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-500"></span>Inspection</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Gantt Header Days Row */}
              <div className="flex border-b border-surface-200 bg-surface-50 text-[11px] font-bold text-surface-500">
                <div className="w-56 p-3 flex-shrink-0 border-r border-surface-200 sticky left-0 bg-surface-50 z-10">
                  Machine & Fleet
                </div>
                <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))` }}>
                  {daysArray.map((d) => (
                    <div key={d} className="p-2 text-center border-r border-surface-200/60 font-mono">
                      {d}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Rows per Machine */}
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : ganttData.length === 0 ? (
                <div className="p-8 text-center text-surface-400 text-sm font-semibold">No machine fleet registered</div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {ganttData.map((m) => (
                    <div key={m.machineId} className="flex items-center hover:bg-surface-50/50 transition-colors">
                      {/* Left Machine Column */}
                      <div className="w-56 p-3 flex-shrink-0 border-r border-surface-200 sticky left-0 bg-white z-10">
                        <p className="font-bold text-xs text-surface-900 truncate">{m.machineName}</p>
                        <p className="text-[10px] font-mono text-surface-400">{m.machineCode} · {m.lineName}</p>
                      </div>

                      {/* Right 30-Day Grid Timeline */}
                      <div className="flex-1 grid relative py-2.5" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(28px, 1fr))` }}>
                        {/* Day Column Grid Lines */}
                        {daysArray.map((d) => (
                          <div key={d} className="h-full border-r border-surface-100/60 pointer-events-none min-h-[36px]" />
                        ))}

                        {/* Render Events inside Grid */}
                        {m.events.map((evt) => {
                          const style = TYPE_STYLES[evt.type] || TYPE_STYLES.PREVENTIVE;
                          const startCol = Math.max(1, Math.min(daysInMonth, evt.dayOfMonth));
                          const spanDays = 2;

                          return (
                            <div
                              key={evt.id}
                              style={{
                                gridColumnStart: startCol,
                                gridColumnEnd: `span ${spanDays}`,
                              }}
                              className={`my-auto mx-0.5 p-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all hover:scale-105 cursor-pointer truncate z-20 ${style.bg} ${style.text}`}
                              title={`${evt.title} (${evt.type}) - Due: Day ${evt.dayOfMonth}`}
                            >
                              {evt.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALTERNATIVE VIEW: CALENDAR MATRIX */}
      {viewMode === "CALENDAR" && (
        <div className="card-static p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-surface-400 mb-2 border-b border-surface-100 pb-2">
            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysArray.map((dayNum) => {
              const dayEvents = events.filter((e) => e.dayOfMonth === dayNum);
              return (
                <div key={dayNum} className="min-h-[90px] p-2 bg-surface-50 rounded-xl border border-surface-100 flex flex-col justify-between">
                  <span className="text-xs font-mono font-bold text-surface-600">{dayNum}</span>
                  <div className="space-y-1 mt-1">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className={`p-1 rounded text-[10px] font-bold truncate text-white ${
                          evt.type === "PREVENTIVE" ? "bg-blue-500" : evt.type === "CORRECTIVE" ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                      >
                        {evt.machineCode}: {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal - Schedule Preventive Maintenance */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in-up duration-300">
            <div className="flex items-center justify-between p-6 border-b border-surface-100">
              <div>
                <h2 className="font-bold text-surface-900 text-lg">Schedule Maintenance (PM)</h2>
                <p className="text-xs text-surface-400 mt-0.5">Create a new preventive maintenance entry</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-surface-400">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Machine *</label>
                <select
                  value={form.machineId}
                  onChange={(e) => setForm({ ...form, machineId: e.target.value })}
                  className="select w-full"
                  required
                >
                  <option value="">Select Machine...</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Maintenance Title *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Oil Change & Spindle Calibration"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Maintenance Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="select w-full"
                  >
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective</option>
                    <option value="PREDICTIVE">Predictive</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="select w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Next Due Date *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.nextDueDate}
                    onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Recurrence Interval (Days)</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={form.intervalDays}
                    onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Task Description</label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Describe scope of service & parts to replace..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
