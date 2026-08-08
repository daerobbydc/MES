"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Gauge, TrendingUp, Activity, CheckCircle2, AlertTriangle, RefreshCw,
  Zap, Clock, Factory, Layers, ShieldCheck, ArrowUpRight, ArrowDownRight,
  Filter, Play, AlertOctagon, HelpCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts";

interface OEESummary {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  worldClassTarget: { oee: number; availability: number; performance: number; quality: number };
  machineCounts: { total: number; running: number; down: number; idle: number };
}

interface MachineOEE {
  id: string;
  code: string;
  name: string;
  lineName: string;
  workCenter: string;
  status: string;
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  targetOee: number;
  statusColor: string;
}

interface SixBigLoss {
  category: string;
  name: string;
  hours: number;
  percentage: number;
  color: string;
}

export default function OEEAnalyticsPage() {
  const [summary, setSummary] = useState<OEESummary | null>(null);
  const [losses, setLosses] = useState<SixBigLoss[]>([]);
  const [machines, setMachines] = useState<MachineOEE[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLine, setFilterLine] = useState("ALL");
  const [timeRange, setTimeRange] = useState("today");

  const fetchOEE = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/production/oee?range=${timeRange}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setLosses(json.data.sixBigLosses);
        setMachines(json.data.machines);
        setTrend(json.data.hourlyTrend);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [timeRange]);

  useEffect(() => { fetchOEE(); }, [fetchOEE]);

  const filteredMachines = filterLine === "ALL"
    ? machines
    : machines.filter(m => m.lineName.toLowerCase().includes(filterLine.toLowerCase()));

  if (loading || !summary) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-semibold">Calculating Real-Time OEE Metrics...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Real-Time OEE Analytics</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-600 border border-primary-200">
              Six Big Losses Tracking
            </span>
          </div>
          <p className="page-subtitle">Overall Equipment Effectiveness (Availability × Performance × Quality)</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={timeRange} onChange={e => setTimeRange(e.target.value)} className="select text-xs w-auto">
            <option value="today">Today's Shift</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button onClick={fetchOEE} className="btn-secondary text-xs flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Main OEE Gauge Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall OEE */}
        <div className="card-gradient">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-primary-200 uppercase tracking-widest">Overall Factory OEE</p>
              <p className="text-3xl font-black text-white mt-1">{summary.oee}%</p>
              <div className="flex items-center gap-1.5 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${summary.oee >= 85 ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"}`}>
                  Target: {summary.worldClassTarget.oee}% (World Class)
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Gauge size={24} className="text-white" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-primary-100">
            <span>Machine Fleet: {summary.machineCounts.running}/{summary.machineCounts.total} Active</span>
            <span className="font-bold">{summary.oee >= 85 ? "Optimal" : "Needs Tuning"}</span>
          </div>
        </div>

        {/* Availability */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Availability (A)</p>
              <p className="text-2xl font-black text-blue-600 mt-1">{summary.availability}%</p>
              <p className="text-xs text-surface-500 mt-0.5">Operating Time / Planned Time</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
              A
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-surface-400 mb-1 font-medium">
              <span>Target {summary.worldClassTarget.availability}%</span>
              <span>{summary.availability >= 90 ? "Passed" : "Downtime alert"}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill bg-blue-500" style={{ width: `${summary.availability}%` }} />
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Performance (P)</p>
              <p className="text-2xl font-black text-violet-600 mt-1">{summary.performance}%</p>
              <p className="text-xs text-surface-500 mt-0.5">Actual Speed / Target Speed</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 font-bold">
              P
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-surface-400 mb-1 font-medium">
              <span>Target {summary.worldClassTarget.performance}%</span>
              <span>{summary.performance >= 95 ? "World Class" : "Speed loss"}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill bg-violet-500" style={{ width: `${summary.performance}%` }} />
            </div>
          </div>
        </div>

        {/* Quality */}
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Quality Rate (Q)</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{summary.quality}%</p>
              <p className="text-xs text-surface-500 mt-0.5">Good Qty / Total Qty</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold">
              Q
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-surface-400 mb-1 font-medium">
              <span>Target {summary.worldClassTarget.quality}%</span>
              <span>First Pass Yield</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill bg-emerald-500" style={{ width: `${summary.quality}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Hourly OEE Trend & Six Big Losses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hourly Trend Chart */}
        <div className="chart-card lg:col-span-2">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Live OEE Trend (Shift Hourly Telemetry)</h3>
              <p className="text-xs text-surface-400">Tracking OEE, Availability, Performance & Quality over time</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span>OEE</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Quality</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorOee" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3366ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3366ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: "12px" }} />
              <Area type="monotone" dataKey="oee" stroke="#3366ff" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOee)" />
              <Area type="monotone" dataKey="quality" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorQual)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Six Big Losses */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Six Big Losses Pareto</h3>
              <p className="text-xs text-surface-400">Downtime & defect loss factors</p>
            </div>
            <AlertOctagon size={18} className="text-amber-500" />
          </div>
          <div className="space-y-3">
            {losses.map(loss => (
              <div key={loss.name} className="p-2.5 rounded-xl bg-surface-50 border border-surface-100">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-surface-800 truncate pr-2">{loss.name}</span>
                  <span className="font-bold text-surface-900 flex-shrink-0">{loss.percentage}% ({loss.hours}h)</span>
                </div>
                <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${loss.percentage * 15}%`, backgroundColor: loss.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Machine Breakdown Table */}
      <div className="card-static p-0 overflow-hidden">
        <div className="p-5 border-b border-surface-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-surface-900 text-base">Machine OEE Breakdown</h3>
            <p className="text-xs text-surface-400">Live operational metrics per machine unit</p>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-surface-400" />
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)} className="select text-xs w-auto">
              <option value="ALL">All Lines</option>
              <option value="Line 1">Line 1</option>
              <option value="Line 2">Line 2</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                {["Machine", "Line / Work Center", "Status", "Availability (A)", "Performance (P)", "Quality (Q)", "Overall OEE", "Target"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredMachines.map(m => (
                <tr key={m.id} className="hover:bg-surface-50/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-sm text-surface-900">{m.name}</p>
                    <p className="text-[11px] font-mono text-surface-400">{m.code}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-xs font-semibold text-surface-700">{m.lineName}</p>
                    <p className="text-[11px] text-surface-400">{m.workCenter}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`status-badge ${
                      m.status === "RUNNING" ? "status-running" : m.status === "DOWN" ? "status-down" : "status-idle"
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-blue-600">{m.availability}%</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-violet-600">{m.performance}%</td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-emerald-600">{m.quality}%</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-sm font-extrabold px-2.5 py-1 rounded-xl border ${m.statusColor}`}>
                      {m.oee}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-surface-400 font-medium">{m.targetOee}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
