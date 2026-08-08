"use client";

import { useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Factory, Package,
  BarChart3, PieChart as PieChartIcon, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export default function CostAnalysisPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "workcenters" | "materials" | "subcontract">("overview");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [res1, res2, res3] = await Promise.all([
        fetch("/api/costing/analysis?type=workcenters"),
        fetch("/api/costing/analysis?type=materials"),
        fetch("/api/costing/analysis?type=subcontract"),
      ]);
      const [j1, j2, j3] = await Promise.all([res1.json(), res2.json(), res3.json()]);
      setData({
        workcenters: j1.success ? j1.data : [],
        materials: j2.success ? j2.data : [],
        subcontract: j3.success ? j3.data : [],
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const COLORS = ["#3366ff", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#84cc16", "#ec4899"];
  const fmt = (n: number) => `Rp ${n.toLocaleString()}`;

  const totalWC = (data?.workcenters || []).reduce((s: number, w: any) => s + (w.totalCost || 0), 0);
  const totalMat = (data?.materials || []).reduce((s: number, m: any) => s + (m.totalCost || 0), 0);
  const totalSub = (data?.subcontract || []).reduce((s: number, sc: any) => s + (sc.totalCost || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading cost data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BarChart3 size={22} className="text-primary-500" />
            Cost Analysis
          </h1>
          <p className="page-subtitle">Production cost breakdown — work centers, materials & subcontracting</p>
        </div>
        <div className="flex gap-2">
          {(["overview", "workcenters", "materials", "subcontract"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${tab === t ? "tab-active" : "tab-inactive"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Work Center", value: totalWC, color: "text-blue-600", bg: "bg-blue-50", iconText: "text-blue-600", icon: Factory },
          { label: "Material", value: totalMat, color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: Package },
          { label: "Subcontract", value: totalSub, color: "text-violet-600", bg: "bg-violet-50", iconText: "text-violet-600", icon: TrendingUp },
          { label: "Total", value: totalWC + totalMat + totalSub, color: "text-amber-600", bg: "bg-amber-50", iconText: "text-amber-600", icon: DollarSign },
        ].map((s, i) => (
          <div key={i} className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label} Cost</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{fmt(s.value)}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={20} className={s.iconText} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card-static">
            <h3 className="font-semibold text-surface-900 mb-4">Cost Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={[
                  { name: "Work Center", value: totalWC },
                  { name: "Materials", value: totalMat },
                  { name: "Subcontract", value: totalSub },
                ]} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  <Cell fill="#3366ff" /><Cell fill="#10b981" /><Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card-static">
            <h3 className="font-semibold text-surface-900 mb-4">Cost by Work Center</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(data?.workcenters || []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="totalCost" fill="#3366ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tables */}
      {tab === "workcenters" && (
        <div className="card-static overflow-hidden animate-in fade-in-up">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3.5 text-left">Work Center</th>
                <th className="px-5 py-3.5 text-right">Hours</th>
                <th className="px-5 py-3.5 text-right">Cost/Hour</th>
                <th className="px-5 py-3.5 text-right">Total Cost</th>
                <th className="px-5 py-3.5 text-right">Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {(data?.workcenters || []).map((wc: any, idx: number) => (
                <tr key={wc.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td className="px-5 py-4 font-medium text-surface-800">{wc.name}</td>
                  <td className="px-5 py-4 text-sm text-right">{wc.totalHours?.toFixed(1) || "0"}</td>
                  <td className="px-5 py-4 text-sm text-right">{fmt(wc.costPerHour || 0)}</td>
                  <td className="px-5 py-4 text-sm text-right font-bold">{fmt(wc.totalCost || 0)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-bold ${(wc.efficiency || 0) > 85 ? "text-emerald-600" : (wc.efficiency || 0) > 70 ? "text-amber-600" : "text-rose-600"}`}>
                      {wc.efficiency?.toFixed(0) || "0"}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "materials" && (
        <div className="card-static overflow-hidden animate-in fade-in-up">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3.5 text-left">Material</th>
                <th className="px-5 py-3.5 text-right">Total Used</th>
                <th className="px-5 py-3.5 text-right">Unit Cost</th>
                <th className="px-5 py-3.5 text-right">Total Cost</th>
                <th className="px-5 py-3.5 text-right">Waste %</th>
              </tr>
            </thead>
            <tbody>
              {(data?.materials || []).map((m: any, idx: number) => (
                <tr key={idx} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td className="px-5 py-4 font-medium text-surface-800">{m.name}</td>
                  <td className="px-5 py-4 text-sm text-right">{m.totalUsed?.toFixed(0) || "0"}</td>
                  <td className="px-5 py-4 text-sm text-right">{fmt(m.unitCost || 0)}</td>
                  <td className="px-5 py-4 text-sm text-right font-bold">{fmt(m.totalCost || 0)}</td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-bold ${m.waste > 5 ? "text-rose-600" : m.waste > 2 ? "text-amber-600" : "text-emerald-600"}`}>
                      {m.waste?.toFixed(1) || "0"}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "subcontract" && (
        <div className="card-static overflow-hidden animate-in fade-in-up">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3.5 text-left">Supplier</th>
                <th className="px-5 py-3.5 text-left">Process</th>
                <th className="px-5 py-3.5 text-right">Qty</th>
                <th className="px-5 py-3.5 text-right">Unit Price</th>
                <th className="px-5 py-3.5 text-right">Total Cost</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.subcontract || []).map((s: any, idx: number) => (
                <tr key={s.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td className="px-5 py-4 font-medium text-surface-800">{s.supplierName}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{s.processType}</td>
                  <td className="px-5 py-4 text-sm text-right">{s.quantity}</td>
                  <td className="px-5 py-4 text-sm text-right">{fmt(s.unitPrice || 0)}</td>
                  <td className="px-5 py-4 text-sm text-right font-bold">{fmt(s.totalCost || 0)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`status-badge ${s.status === "COMPLETED" ? "status-done" : s.status === "IN_PROGRESS" ? "status-in-progress" : "status-planned"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>{s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
