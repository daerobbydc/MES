"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertOctagon, Plus, Search, Clock, RefreshCw, Filter,
  Wrench, Activity, ChevronDown, XCircle, TrendingDown,
  CheckCircle2, BarChart3, Timer
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DowntimeRecord {
  id: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  lineName: string;
  alertType: string;
  severity: string;
  category: string;
  description: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMin: number | null;
  status: string;
  acknowledgedBy: string | null;
}

interface Summary {
  totalEvents: number;
  totalDowntimeMin: number;
  totalDowntimeHrs: number;
  avgDurationMin: number;
  openAlerts: number;
  machinesDown: number;
  totalMachines: number;
}

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: "text-rose-600 bg-rose-50 border-rose-200",
  HIGH: "text-orange-600 bg-orange-50 border-orange-200",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200",
  LOW: "text-blue-600 bg-blue-50 border-blue-200",
};

const BAR_COLORS = ["#f43f5e", "#f97316", "#f59e0b", "#a855f7", "#3b82f6", "#10b981"];

export default function DowntimePage() {
  const [records, setRecords] = useState<DowntimeRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<any[]>([]);
  const [topMachines, setTopMachines] = useState<any[]>([]);
  const [machineList, setMachineList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("week");
  const [machineFilter, setMachineFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ machineId: "", alertType: "BREAKDOWN", severity: "HIGH", description: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range });
      if (machineFilter) params.set("machineId", machineFilter);
      const res = await fetch(`/api/machine/downtime?${params}`);
      const json = await res.json();
      if (json.success) {
        setRecords(json.data.records || []);
        setSummary(json.data.summary);
        setByCategory(json.data.byCategory || []);
        setTopMachines(json.data.topMachines || []);
        setMachineList(json.data.machineList || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [range, machineFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/machine/downtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchData();
        setForm({ machineId: "", alertType: "BREAKDOWN", severity: "HIGH", description: "" });
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = records.filter(r =>
    !search ||
    r.machineName.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (min: number | null) => {
    if (min === null) return "Ongoing";
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Machine Downtime Log</h1>
            {summary && summary.openAlerts > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                {summary.openAlerts} Active
              </span>
            )}
          </div>
          <p className="page-subtitle">Downtime tracking & analysis — MTTR, MTBF & breakdown categories</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={range} onChange={e => setRange(e.target.value)} className="select text-xs w-auto">
            <option value="today">Today</option>
            <option value="week">7 Days</option>
            <option value="month">30 Days</option>
          </select>
          <button onClick={fetchData} className="btn-secondary text-xs flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs flex items-center gap-2">
            <Plus size={14} /> Log Downtime
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-gradient">
            <p className="text-xs font-bold text-primary-200 uppercase tracking-widest">Total Downtime</p>
            <p className="text-3xl font-black text-white mt-1">{summary.totalDowntimeHrs}<span className="text-lg font-semibold"> hrs</span></p>
            <p className="text-xs text-primary-100 mt-2">{summary.totalEvents} downtime events</p>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Machines Down</p>
                <p className="stat-value text-rose-600">{summary.machinesDown}</p>
                <p className="text-xs text-surface-400 mt-0.5">out of {summary.totalMachines} machines</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertOctagon size={20} className="text-rose-500" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Avg Duration (MTTR)</p>
                <p className="stat-value text-amber-600">{formatDuration(summary.avgDurationMin)}</p>
                <p className="text-xs text-surface-400 mt-0.5">per incident</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Timer size={20} className="text-amber-500" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="stat-label">Open Alerts</p>
                <p className="stat-value text-violet-600">{summary.openAlerts}</p>
                <p className="text-xs text-surface-400 mt-0.5">unresolved</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <Activity size={20} className="text-violet-500" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Downtime by Category */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Downtime by Category</h3>
              <p className="text-xs text-surface-400">Total minutes per breakdown category</p>
            </div>
            <BarChart3 size={18} className="text-surface-400" />
          </div>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [`${v} min`, "Downtime"]} contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: "12px" }} />
                <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-surface-400">
              <p className="text-sm">No downtime records</p>
            </div>
          )}
        </div>

        {/* Top Machines by Downtime */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Top Machines — Highest Downtime</h3>
              <p className="text-xs text-surface-400">Machines with highest cumulative downtime</p>
            </div>
            <Wrench size={18} className="text-surface-400" />
          </div>
          {topMachines.length > 0 ? (
            <div className="space-y-3 mt-2">
              {topMachines.map((m, i) => {
                const maxMin = topMachines[0]?.minutes || 1;
                const pct = Math.round((m.minutes / maxMin) * 100);
                return (
                  <div key={m.machineId} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-surface-400 w-4">#{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-surface-800">{m.name}</span>
                        <span className="text-surface-500">{formatDuration(m.minutes)} ({m.count}x)</span>
                      </div>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-surface-400">
              <p className="text-sm">No machine data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search machine, category, description..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 text-sm" />
        </div>
        <select value={machineFilter} onChange={e => setMachineFilter(e.target.value)} className="select text-sm w-auto">
          <option value="">All Machines</option>
          {machineList.map(m => (
            <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
          ))}
        </select>
      </div>

      {/* Records Table */}
      <div className="card-static p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-surface-400">
              <CheckCircle2 size={36} className="mb-3 opacity-40" />
              <p className="font-semibold text-sm">No downtime logged</p>
              <p className="text-xs mt-1">All machines running normally</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {["Machine / Line", "Category", "Severity", "Description", "Started At", "Resolved At", "Duration", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-sm text-surface-900">{r.machineName}</p>
                      <p className="text-[11px] font-mono text-surface-400">{r.machineCode} · {r.lineName}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-semibold text-surface-700">{r.category}</p>
                      <p className="text-[11px] text-surface-400">{r.alertType}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${SEVERITY_COLOR[r.severity] || "text-surface-600 bg-surface-50 border-surface-200"}`}>
                        {r.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <p className="text-xs text-surface-600 line-clamp-2">{r.description}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-surface-600">
                        {new Date(r.startedAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-surface-500">
                        {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString("en-US", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-bold ${r.durationMin === null ? "text-rose-500 animate-pulse" : "text-surface-700"}`}>
                        {formatDuration(r.durationMin)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${r.status === "ACTIVE" ? "bg-rose-50 text-rose-600 border-rose-200" : r.status === "RESOLVED" ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-surface-50 text-surface-500 border-surface-200"}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - Log Downtime */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in-up duration-300">
            <div className="flex items-center justify-between p-6 border-b border-surface-100">
              <div>
                <h2 className="font-bold text-surface-900 text-lg">Log New Downtime Event</h2>
                <p className="text-xs text-surface-400 mt-0.5">Record machine downtime incident</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-surface-400">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="label">Machine *</label>
                <select value={form.machineId} onChange={e => setForm({ ...form, machineId: e.target.value })} className="select w-full" required>
                  <option value="">Select Machine...</option>
                  {machineList.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Alert Type</label>
                  <select value={form.alertType} onChange={e => setForm({ ...form, alertType: e.target.value })} className="select w-full">
                    <option value="BREAKDOWN">Breakdown</option>
                    <option value="OVERHEATING">Overheating</option>
                    <option value="VIBRATION">Vibration</option>
                    <option value="SPEED_DEVIATION">Speed Deviation</option>
                    <option value="ERROR_CODE">Error Code</option>
                    <option value="MAINTENANCE_DUE">Maintenance Due</option>
                  </select>
                </div>
                <div>
                  <label className="label">Severity</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="select w-full">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Problem Description *</label>
                <textarea rows={3} className="input-field resize-none" placeholder="Describe root cause and downtime conditions..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                  Save Downtime
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
