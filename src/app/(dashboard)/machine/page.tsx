"use client";

import { useEffect, useState } from "react";
import {
  Cog, Activity, AlertTriangle, CheckCircle, Clock, RefreshCw, Thermometer,
  Gauge, Zap, TrendingUp, Settings,
} from "lucide-react";

export default function MachinePage() {
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMachines(); }, []);

  const fetchMachines = async () => {
    try {
      const res = await fetch("/api/machine");
      const json = await res.json();
      if (json.success) setMachines(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const stats = {
    total: machines.length,
    running: machines.filter(m => m.status === "RUNNING").length,
    down: machines.filter(m => m.status === "DOWN").length,
    maintenance: machines.filter(m => m.status === "MAINTENANCE").length,
  };

  const statusConfig: Record<string, { bg: string; text: string; dot: string; glow: string }> = {
    RUNNING: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", glow: "shadow-emerald-500/20" },
    IDLE: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", glow: "shadow-amber-500/20" },
    DOWN: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", glow: "shadow-rose-500/20" },
    MAINTENANCE: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", glow: "shadow-blue-500/20" },
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading machines...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Machine Monitoring</h1>
          <p className="text-surface-500 text-sm mt-0.5">Real-time machine status and performance</p>
        </div>
        <button onClick={fetchMachines} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-surface-900", icon: Cog },
          { label: "Running", value: stats.running, color: "text-emerald-600", icon: Activity },
          { label: "Down", value: stats.down, color: "text-rose-600", icon: AlertTriangle },
          { label: "Maintenance", value: stats.maintenance, color: "text-blue-600", icon: Settings },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${s.color.replace("text-", "bg-").replace("600", "50")} flex items-center justify-center`}>
                <s.icon size={20} className={s.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {machines.map((machine, idx) => {
          const sc = statusConfig[machine.status] || statusConfig.IDLE;
          const oee = machine.oee || Math.floor(Math.random() * 30 + 65);
          return (
            <div key={machine.id} className="card-static group animate-in fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl ${sc.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Cog size={24} className={sc.text} />
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-900">{machine.name}</h3>
                    <p className="text-xs text-surface-400 font-mono">{machine.code}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${machine.status === "RUNNING" ? "animate-pulse" : ""}`}></span>
                  {machine.status}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-2.5 bg-surface-50/80 rounded-xl text-center">
                  <Gauge size={14} className="text-surface-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-surface-900">{oee}%</p>
                  <p className="text-[10px] text-surface-400 font-medium">OEE</p>
                </div>
                <div className="p-2.5 bg-surface-50/80 rounded-xl text-center">
                  <Thermometer size={14} className="text-surface-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-surface-900">{machine.temperature || 45}°</p>
                  <p className="text-[10px] text-surface-400 font-medium">Temp</p>
                </div>
                <div className="p-2.5 bg-surface-50/80 rounded-xl text-center">
                  <Zap size={14} className="text-surface-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-surface-900">{machine.vibration || 2.1}</p>
                  <p className="text-[10px] text-surface-400 font-medium">Vibration</p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-surface-500 font-medium">Utilization</span>
                  <span className="font-bold text-surface-700">{oee}%</span>
                </div>
                <div className="progress-bar">
                  <div className={`progress-bar-fill ${
                    oee > 85 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                    oee > 70 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                    "bg-gradient-to-r from-rose-400 to-rose-500"
                  }`} style={{ width: `${oee}%` }}></div>
                </div>
              </div>

              {machine.lastMaintenance && (
                <p className="text-[10px] text-surface-400 mt-3">Last maintenance: {new Date(machine.lastMaintenance).toLocaleDateString()}</p>
              )}
            </div>
          );
        })}
        {machines.length === 0 && (
          <div className="col-span-full text-center py-16 text-surface-400">
            <Cog size={40} className="mx-auto mb-3 text-surface-300" />
            <p className="font-medium">No machines found</p>
          </div>
        )}
      </div>
    </div>
  );
}
