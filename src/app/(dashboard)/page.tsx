"use client";

import { useEffect, useState } from "react";
import { 
  Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, 
  ArrowRight, Factory, ShieldCheck, BarChart3, Activity, Users, Truck,
  Zap, Box, RefreshCw, Clock, CheckCircle2, AlertOctagon, Layers, Sparkles
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import Link from "next/link";

interface DashboardData {
  production: { activeOrders: number; completedOrders: number; totalOrders: number };
  machines: { total: number; running: number; down: number };
  quality: { totalInspections: number; failedInspections: number; passRate: number };
  inventory: { lowStockCount: number; lowStockItems: any[] };
  purchasing: { openPOs: number; pendingGRN: number; totalSpend: number };
  sales: { openSOs: number; pendingDelivery: number; totalRevenue: number };
  costing: { totalMaterialCost: number; totalLaborCost: number; totalOverhead: number };
  financials: { revenue: number; cogs: number; grossProfit: number; expenses: number; netIncome: number };
  alerts: any[];
}

const COLORS = ["#3366ff", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, finRes] = await Promise.all([
        fetch("/api/dashboard"),
        fetch("/api/accounting/financial-statements"),
      ]);
      const dashJson = await dashRes.json();
      const finJson = await finRes.json();
      setData({
        production: dashJson.data?.production || { activeOrders: 0, completedOrders: 0, totalOrders: 0 },
        machines: dashJson.data?.machines || { total: 0, running: 0, down: 0 },
        quality: dashJson.data?.quality || { totalInspections: 0, failedInspections: 0, passRate: 0 },
        inventory: dashJson.data?.inventory || { lowStockCount: 0, lowStockItems: [] },
        purchasing: { openPOs: 12, pendingGRN: 5, totalSpend: 450000000 },
        sales: { openSOs: 8, pendingDelivery: 3, totalRevenue: 780000000 },
        costing: { totalMaterialCost: 320000000, totalLaborCost: 96000000, totalOverhead: 48000000 },
        financials: finJson.data || { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netIncome: 0 },
        alerts: dashJson.data?.alerts || [],
      });
    } catch (error) { console.error("Failed to fetch dashboard:", error); } finally { setLoading(false); }
  };

  const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading Intelligent Dashboard...</p>
      </div>
    </div>
  );
  if (!data) return <div className="text-center py-20 text-surface-500">Failed to load dashboard data</div>;

  const pieData = [
    { name: "Material", value: data.costing.totalMaterialCost },
    { name: "Labor", value: data.costing.totalLaborCost },
    { name: "Overhead", value: data.costing.totalOverhead },
  ];

  const machineStatus = [
    { name: "Running", value: data.machines.running, color: "#10b981" },
    { name: "Down", value: data.machines.down, color: "#f43f5e" },
    { name: "Idle", value: Math.max(0, data.machines.total - data.machines.running - data.machines.down), color: "#94a3b8" },
  ];

  return (
    <div className="space-y-6 page-enter">

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-surface-900 via-surface-800 to-primary-950 p-7 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-primary-200 border border-white/10">
              <Sparkles size={13} className="text-primary-300" />
              <span>Smart Manufacturing Execution System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Factory Operations Overview
            </h1>
            <p className="text-surface-300 text-sm max-w-xl">
              Real-time monitoring of shop floor production, machine health, quality metrics, and business intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={fetchDashboard} className="btn-secondary text-xs flex items-center gap-2 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 backdrop-blur-md">
              <RefreshCw size={14} /> Refresh Data
            </button>
            <Link href="/production/scheduling" className="btn-primary text-xs flex items-center gap-2 shadow-glow">
              <Zap size={14} /> APS Scheduler
            </Link>
          </div>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Revenue", value: fmt(data.financials.revenue || data.sales.totalRevenue), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "COGS", value: fmt(data.financials.cogs), icon: Package, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          { label: "Gross Profit", value: fmt(data.financials.grossProfit), icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", sub: data.financials.revenue ? `${((data.financials.grossProfit / data.financials.revenue) * 100).toFixed(1)}% margin` : "" },
          { label: "Net Income", value: fmt(data.financials.netIncome), icon: BarChart3, color: data.financials.netIncome >= 0 ? "text-violet-600" : "text-rose-600", bg: data.financials.netIncome >= 0 ? "bg-violet-50" : "bg-rose-50", border: data.financials.netIncome >= 0 ? "border-violet-100" : "border-rose-100" },
        ].map((kpi, i) => (
          <div key={i} className={`stat-card group animate-in fade-in-up stagger-${i+1}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-xl font-bold mt-1 tracking-tight ${kpi.color}`}>{kpi.value}</p>
                {kpi.sub && <p className="text-xs text-surface-500 mt-1 font-medium">{kpi.sub}</p>}
              </div>
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operations Quick Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Orders", value: data.production.activeOrders, sub: `${data.production.completedOrders} completed`, color: "text-primary-600", dot: "pulse-dot-blue" },
          { label: "Machine Fleet", value: `${data.machines.running}/${data.machines.total}`, sub: `${data.machines.down} down`, color: "text-emerald-600", dot: "pulse-dot-green" },
          { label: "Quality Pass Rate", value: `${data.quality.passRate}%`, sub: `${data.quality.totalInspections} inspected`, color: "text-cyan-600", dot: "pulse-dot-blue" },
          { label: "Low Stock Alert", value: data.inventory.lowStockCount, sub: "requires reorder", color: "text-amber-600", dot: "pulse-dot-yellow" },
        ].map((item, i) => (
          <div key={i} className="stat-card group animate-in fade-in-up">
            <div className="flex items-center gap-3">
              <div className={`pulse-dot ${item.dot}`}></div>
              <div>
                <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">{item.label}</p>
                <p className={`text-2xl font-extrabold ${item.color} mt-0.5 tracking-tight`}>{item.value}</p>
                <p className="text-xs text-surface-400 mt-0.5">{item.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cost Pie */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Manufacturing Cost Breakdown</h3>
              <p className="text-xs text-surface-400">Material, Labor & Overhead distribution</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <BarChart3 size={16} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {pieData.map((_, index) => <Cell key={index} fill={COLORS[index]} />)}
              </Pie>
              <Tooltip 
                formatter={(v: number) => fmt(v)} 
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: "12px" }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-surface-100">
            {pieData.map((p, i) => (
              <div key={p.name} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></span>
                  <span className="text-[10px] text-surface-500 font-bold uppercase">{p.name}</span>
                </div>
                <p className="text-xs font-bold text-surface-800 mt-0.5">{(p.value / 1000000).toFixed(0)}M</p>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Bar */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Financial Performance</h3>
              <p className="text-xs text-surface-400">Revenue, COGS & Expenses comparison</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { name: "Revenue", value: data.financials.revenue || data.sales.totalRevenue },
              { name: "COGS", value: data.financials.cogs },
              { name: "Expenses", value: data.financials.expenses },
            ]} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: "12px" }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {[0, 1, 2].map(i => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Machine Status */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">Machine Fleet Status</h3>
              <p className="text-xs text-surface-400">Real-time availability</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
              <Activity size={16} />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={machineStatus} cx="50%" cy="50%" outerRadius={85} dataKey="value" strokeWidth={0}>
                {machineStatus.map((entry, index) => <Cell key={index} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontSize: "12px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-surface-100">
            {machineStatus.map((m, i) => (
              <div key={i} className="text-center p-2 rounded-xl bg-surface-50">
                <p className="text-sm font-extrabold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[10px] text-surface-400 font-bold uppercase">{m.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Alerts & Business Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Alerts */}
        <div className="card-static">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="font-bold text-surface-900 text-sm">Active System Alerts</h3>
            </div>
            {data.alerts.length > 0 && (
              <span className="text-xs bg-rose-50 text-rose-600 border border-rose-200/60 px-2.5 py-0.5 rounded-full font-bold">
                {data.alerts.length} critical
              </span>
            )}
          </div>
          {data.alerts.length > 0 ? (
            <div className="space-y-2.5">
              {data.alerts.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/50 hover:bg-amber-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={15} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-surface-800 truncate">{alert.message}</p>
                    <p className="text-[10px] text-surface-400">{alert.machine?.name}</p>
                  </div>
                  <span className={`status-badge text-[10px] ${alert.severity === "CRITICAL" ? "status-down" : "status-idle"}`}>
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-surface-400">
              <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-500 opacity-80" />
              <p className="text-sm font-semibold text-surface-700">All Systems Nominal</p>
              <p className="text-xs text-surface-400 mt-0.5">No critical alerts detected across factory operations</p>
            </div>
          )}
        </div>

        {/* Business Modules Overview */}
        <div className="card-static">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-surface-900 text-sm">Quick Operations Navigation</h3>
            <span className="text-xs text-surface-400">Active status</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: ShoppingCart, label: "Purchasing", value: `${data.purchasing.openPOs} POs`, sub: `${data.purchasing.pendingGRN} pending GRN`, href: "/purchasing", color: "text-blue-600 bg-blue-50" },
              { icon: Truck, label: "Sales & DO", value: `${data.sales.openSOs} SOs`, sub: `${data.sales.pendingDelivery} to deliver`, href: "/sales", color: "text-violet-600 bg-violet-50" },
              { icon: Box, label: "Inventory", value: `${data.inventory.lowStockCount} Low Stock`, sub: "Reorder alert", href: "/inventory", color: "text-amber-600 bg-amber-50" },
              { icon: ShieldCheck, label: "Quality QC", value: `${data.quality.passRate}% Pass`, sub: `${data.quality.totalInspections} inspected`, href: "/quality", color: "text-emerald-600 bg-emerald-50" },
            ].map((item, i) => (
              <Link key={i} href={item.href} className="p-3.5 rounded-xl border border-surface-200/60 hover:border-primary-300 hover:shadow-sm transition-all group bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <item.icon size={16} />
                  </div>
                  <ArrowRight size={14} className="text-surface-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs font-bold text-surface-800">{item.label}</p>
                <p className="text-sm font-extrabold text-primary-600 mt-0.5">{item.value}</p>
                <p className="text-[10px] text-surface-400 mt-0.5">{item.sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
