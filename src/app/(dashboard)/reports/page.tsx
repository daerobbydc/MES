"use client";

import { useEffect, useState } from "react";
import {
  FileBarChart, Download, Calendar, Filter, TrendingUp, BarChart3, PieChart,
  ShoppingCart, Package, ShieldCheck, DollarSign, Factory, Activity, RefreshCw,
} from "lucide-react";

type Tab = "kpis" | "production" | "sales" | "purchase" | "inventory" | "financial" | "quality";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "kpis", label: "Dashboard", icon: Activity },
  { key: "production", label: "Production", icon: Factory },
  { key: "sales", label: "Sales", icon: TrendingUp },
  { key: "purchase", label: "Purchase", icon: ShoppingCart },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "quality", label: "Quality", icon: ShieldCheck },
];

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);

function BarChartSimple({ data = [], maxVal }: { data?: { label: string; value: number; color?: string }[]; maxVal?: number }) {
  if (!data || !data.length) return null;
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-surface-500 w-24 truncate text-right">{d.label}</span>
          <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${d.color || "bg-primary-500"}`}
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-surface-700 w-20 text-right">{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieChartSimple({ data = [] }: { data?: { label: string; value: number; color: string }[] }) {
  if (!data || !data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cum = 0;
  const segments = data.map(d => {
    const pct = (d.value / total) * 100;
    const start = cum;
    cum += pct;
    return { ...d, start, pct };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="w-28 h-28 rounded-full overflow-hidden relative" style={{
        background: `conic-gradient(${segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(", ")})`,
      }}>
        <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-surface-700">{total.toLocaleString()}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-surface-600">{s.label}</span>
            <span className="text-xs font-semibold text-surface-800">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function downloadCSV(data: any[], filename: string) {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("kpis");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/reports/${tab}?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleTabChange = (newTab: Tab) => {
    setData(null);
    setTab(newTab);
  };

  useEffect(() => { fetchReport(); }, [tab, from, to]);

  const handleExport = () => {
    if (!data) return;
    let rows: any[] = [];
    if (tab === "production" && data.details) {
      rows = data.details.map((d: any) => ({
        Order: d.orderNumber, Product: d.product?.name, Quantity: d.quantity,
        Completed: d.completedQty, Rejected: d.rejectedQty, Status: d.status,
        Created: d.createdAt?.slice(0, 10),
      }));
    } else if (tab === "sales") {
      rows = data.byCustomer?.map((c: any) => ({ Customer: c.name, Revenue: c.total, Orders: c.orders })) || [];
    } else if (tab === "purchase") {
      rows = data.bySupplier?.map((s: any) => ({ Supplier: s.name, Spend: s.total, Orders: s.orders })) || [];
    } else if (tab === "inventory") {
      rows = data.lowStock?.map((i: any) => ({ Item: i.name, Code: i.materialCode, Current: i.currentStock, Min: i.minStock })) || [];
    } else if (tab === "financial") {
      rows = data.byAccount?.map((a: any) => ({ Code: a.code, Name: a.name, Debit: a.debit, Credit: a.credit, Balance: a.balance })) || [];
    } else if (tab === "quality") {
      rows = data.byType?.map((t: any) => ({ Type: t.type, Inspections: t.count, Passed: t.passCount, Failed: t.failCount })) || [];
    }
    if (rows.length) downloadCSV(rows, `${tab}-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileBarChart size={22} className="text-primary-500" />
            Reports & Analytics
          </h1>
          <p className="page-subtitle">Executive business intelligence, operational logs and financial reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReport} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          {tab !== "kpis" && (
            <button onClick={handleExport} className="btn-primary text-xs flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 pb-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
              tab === t.key ? "tab-active" : "tab-inactive"
            }`}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab !== "kpis" && (
        <div className="card-static p-4 flex items-center gap-4">
          <Filter size={16} className="text-surface-400" />
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-bold text-surface-500 mb-1 block uppercase tracking-wider">From</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field text-xs" />
            </div>
            <div>
              <label className="text-xs font-bold text-surface-500 mb-1 block uppercase tracking-wider">To</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field text-xs" />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="text-xs text-surface-500 font-medium">Loading analytics data...</p>
          </div>
        </div>
      ) : !data ? (
        <div className="card-static text-center py-16">
          <FileBarChart size={40} className="mx-auto mb-3 text-surface-300" />
          <p className="font-semibold text-surface-700">No report data available</p>
          <p className="text-xs text-surface-400 mt-1">Try selecting a different date range or category</p>
        </div>
      ) : (
        <div className="animate-in fade-in duration-300">
          {tab === "kpis" && <KPIsView data={data} />}
          {tab === "production" && <ProductionView data={data} />}
          {tab === "sales" && <SalesView data={data} />}
          {tab === "purchase" && <PurchaseView data={data} />}
          {tab === "inventory" && <InventoryView data={data} />}
          {tab === "financial" && <FinancialView data={data} />}
          {tab === "quality" && <QualityView data={data} />}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: any; color: string; sub?: string }) {
  return (
    <div className="stat-card flex items-center justify-between">
      <div>
        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value ?? 0}</p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color.replace("text-", "bg-").replace("-600", "-50")}`}>
        <Icon size={20} className={color} />
      </div>
    </div>
  );
}

function KPIsView({ data }: { data: any }) {
  const d = data || {};
  const orders = d.orders || { active: 0, completed: 0 };
  const quality = d.quality || { passRate: 0, inspections: 0 };
  const machines = d.machines || { running: 0, total: 0 };
  const sales = d.sales || { openSOs: 0 };
  const inventory = d.inventory || { lowStockCount: 0 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={fmt(d.revenue)} icon={DollarSign} color="text-blue-600" />
        <StatCard label="Costs" value={fmt(d.costs)} icon={Package} color="text-rose-600" />
        <StatCard label="Profit" value={fmt(d.profit)} icon={TrendingUp} color={(d.profit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"} />
        <StatCard label="Active Orders" value={orders.active || 0} icon={Factory} color="text-violet-600" sub={`${orders.completed || 0} completed this month`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Quality Pass Rate" value={`${quality.passRate || 0}%`} icon={ShieldCheck} color="text-cyan-600" sub={`${quality.inspections || 0} inspections`} />
        <StatCard label="Machines Running" value={`${machines.running || 0}/${machines.total || 0}`} icon={Activity} color="text-emerald-600" />
        <StatCard label="Open SOs" value={sales.openSOs || 0} icon={TrendingUp} color="text-amber-600" />
        <StatCard label="Low Stock Items" value={inventory.lowStockCount || 0} icon={Package} color="text-rose-600" />
      </div>
    </div>
  );
}

function ProductionView({ data }: { data: any }) {
  const summary = data?.summary || { totalOrders: 0, totalProduced: 0, totalRejected: 0, yieldRate: 0, statusBreakdown: [] };
  const details = data?.details || [];

  const statusColors: Record<string, string> = {
    PLANNED: "bg-blue-50 text-blue-700 border-blue-200",
    RELEASED: "bg-amber-50 text-amber-700 border-amber-200",
    IN_PROGRESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-violet-50 text-violet-700 border-violet-200",
    ON_HOLD: "bg-surface-100 text-surface-600 border-surface-200",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={summary.totalOrders || 0} icon={Factory} color="text-blue-600" />
        <StatCard label="Produced" value={summary.totalProduced || 0} icon={TrendingUp} color="text-emerald-600" />
        <StatCard label="Rejected" value={summary.totalRejected || 0} icon={Package} color="text-rose-600" />
        <StatCard label="Yield Rate" value={`${summary.yieldRate || 0}%`} icon={ShieldCheck} color="text-cyan-600" />
      </div>

      {summary.statusBreakdown && summary.statusBreakdown.length > 0 && (
        <div className="card-static p-5">
          <h3 className="font-bold text-surface-900 text-sm mb-4">Status Breakdown</h3>
          <BarChartSimple data={summary.statusBreakdown.map((s: any) => ({
            label: s.status, value: s.count,
            color: s.status === "COMPLETED" ? "bg-emerald-500" : s.status === "IN_PROGRESS" ? "bg-blue-500" : s.status === "CANCELLED" ? "bg-rose-500" : "bg-surface-400",
          }))} />
        </div>
      )}

      <div className="card-static overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100">
          <h3 className="font-bold text-surface-900 text-sm">Production Orders Details</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Order</th>
              <th className="px-5 py-3.5 text-left">Product</th>
              <th className="px-5 py-3.5 text-right">Quantity</th>
              <th className="px-5 py-3.5 text-right">Completed</th>
              <th className="px-5 py-3.5 text-right">Rejected</th>
              <th className="px-5 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {details.slice(0, 50).map((o: any) => (
              <tr key={o.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors">
                <td className="px-5 py-3.5 font-mono text-sm font-bold text-primary-600">{o.orderNumber}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-surface-800">{o.product?.name || "-"}</td>
                <td className="px-5 py-3.5 text-sm text-right">{o.quantity}</td>
                <td className="px-5 py-3.5 text-sm text-right font-bold text-emerald-600">{o.completedQty}</td>
                <td className="px-5 py-3.5 text-sm text-right font-bold text-rose-600">{o.rejectedQty}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`status-badge ${statusColors[o.status] || "status-idle"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {o.status}
                  </span>
                </td>
              </tr>
            ))}
            {details.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-surface-400 text-sm font-medium">
                  No production order details found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesView({ data }: { data: any }) {
  const summary = data?.summary || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 };
  const byProduct = data?.byProduct || [];
  const byCustomer = data?.byCustomer || [];
  const monthly = data?.monthly || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={summary.totalOrders || 0} icon={ShoppingCart} color="text-blue-600" />
        <StatCard label="Total Revenue" value={fmt(summary.totalRevenue)} icon={DollarSign} color="text-emerald-600" />
        <StatCard label="Avg Order Value" value={fmt(summary.avgOrderValue)} icon={BarChart3} color="text-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {monthly.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Monthly Revenue</h3>
            <BarChartSimple data={monthly.map((m: any) => ({ label: m.month, value: m.revenue, color: "bg-blue-500" }))} />
          </div>
        )}
        {byCustomer.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Top Customers</h3>
            <PieChartSimple data={byCustomer.slice(0, 5).map((c: any, i: number) => ({
              label: c.name, value: c.total,
              color: ["#3366ff", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"][i],
            }))} />
          </div>
        )}
      </div>

      <div className="card-static overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100">
          <h3 className="font-bold text-surface-900 text-sm">Revenue by Product</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Product</th>
              <th className="px-5 py-3.5 text-right">Quantity</th>
              <th className="px-5 py-3.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {byProduct.map((p: any, i: number) => (
              <tr key={i} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors">
                <td className="px-5 py-3.5 text-sm font-medium text-surface-800">{p.name}</td>
                <td className="px-5 py-3.5 text-sm text-right">{p.quantity}</td>
                <td className="px-5 py-3.5 text-sm text-right font-bold text-surface-900">{fmt(p.revenue)}</td>
              </tr>
            ))}
            {byProduct.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-12 text-surface-400 text-sm font-medium">
                  No product sales data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PurchaseView({ data }: { data: any }) {
  const summary = data?.summary || { totalOrders: 0, totalSpend: 0, avgOrderValue: 0, statusBreakdown: [] };
  const bySupplier = data?.bySupplier || [];
  const monthly = data?.monthly || [];

  const statusLabels: Record<string, string> = {
    DRAFT: "Draft", PENDING_APPROVAL: "Pending", APPROVED: "Approved",
    PARTIALLY_RECEIVED: "Partial", RECEIVED: "Received", CANCELLED: "Cancelled",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={summary.totalOrders || 0} icon={ShoppingCart} color="text-blue-600" />
        <StatCard label="Total Spend" value={fmt(summary.totalSpend)} icon={DollarSign} color="text-rose-600" />
        <StatCard label="Avg Order Value" value={fmt(summary.avgOrderValue)} icon={BarChart3} color="text-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {monthly.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Monthly Spend</h3>
            <BarChartSimple data={monthly.map((m: any) => ({ label: m.month, value: m.spend, color: "bg-rose-500" }))} />
          </div>
        )}
        {bySupplier.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Top Suppliers</h3>
            <PieChartSimple data={bySupplier.slice(0, 5).map((s: any, i: number) => ({
              label: s.name, value: s.total,
              color: ["#3366ff", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"][i],
            }))} />
          </div>
        )}
      </div>

      {summary.statusBreakdown && summary.statusBreakdown.length > 0 && (
        <div className="card-static p-5">
          <h3 className="font-bold text-surface-900 text-sm mb-4">Status Breakdown</h3>
          <BarChartSimple data={summary.statusBreakdown.map((s: any) => ({
            label: statusLabels[s.status] || s.status, value: s.count, color: "bg-blue-500",
          }))} />
        </div>
      )}
    </div>
  );
}

function InventoryView({ data }: { data: any }) {
  const summary = data?.summary || { totalItems: 0, totalStock: 0, lowStockCount: 0, overStockCount: 0 };
  const byCategory = data?.byCategory || [];
  const lowStock = data?.lowStock || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Items" value={summary.totalItems || 0} icon={Package} color="text-blue-600" />
        <StatCard label="Total Stock" value={(summary.totalStock || 0).toLocaleString()} icon={BarChart3} color="text-emerald-600" />
        <StatCard label="Low Stock" value={summary.lowStockCount || 0} icon={TrendingUp} color="text-amber-600" />
        <StatCard label="Over Stock" value={summary.overStockCount || 0} icon={Activity} color="text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {byCategory.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Stock by Category</h3>
            <BarChartSimple data={byCategory.map((c: any) => ({
              label: c.type, value: c.totalStock, color: "bg-blue-500",
            }))} />
          </div>
        )}
        {lowStock.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Low Stock Items Alert</h3>
            <div className="space-y-2">
              {lowStock.slice(0, 8).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/80 border border-amber-200/60">
                  <div>
                    <p className="text-sm font-semibold text-surface-800">{item.name}</p>
                    <p className="text-xs font-mono text-surface-400">{item.materialCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">{item.currentStock} {item.unit}</p>
                    <p className="text-xs text-surface-400">Min: {item.minStock}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FinancialView({ data }: { data: any }) {
  const summary = data?.summary || { revenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, netIncome: 0, netMargin: 0 };
  const byAccount = data?.byAccount || [];
  const incomeStatement = data?.incomeStatement || { revenue: 0, cogs: 0, grossProfit: 0, operatingExpenses: 0, netIncome: 0 };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={fmt(summary.revenue)} icon={DollarSign} color="text-blue-600" />
        <StatCard label="COGS" value={fmt(summary.cogs)} icon={Package} color="text-rose-600" />
        <StatCard label="Gross Profit" value={fmt(summary.grossProfit)} icon={TrendingUp} color="text-emerald-600" sub={`${summary.grossMargin || 0}% margin`} />
        <StatCard label="Net Income" value={fmt(summary.netIncome)} icon={BarChart3} color={(summary.netIncome || 0) >= 0 ? "text-violet-600" : "text-rose-600"} sub={`${summary.netMargin || 0}% margin`} />
      </div>

      <div className="card-static p-5">
        <h3 className="font-bold text-surface-900 text-sm mb-4">Income Statement Summary</h3>
        <div className="space-y-3">
          {[
            { label: "Revenue", value: incomeStatement.revenue || 0, color: "text-blue-600" },
            { label: "Cost of Goods Sold", value: -(incomeStatement.cogs || 0), color: "text-rose-600" },
            { label: "Gross Profit", value: incomeStatement.grossProfit || 0, color: "text-emerald-600", bold: true },
            { label: "Operating Expenses", value: -(incomeStatement.operatingExpenses || 0), color: "text-rose-600" },
            { label: "Net Income", value: incomeStatement.netIncome || 0, color: (incomeStatement.netIncome || 0) >= 0 ? "text-emerald-600" : "text-rose-600", bold: true },
          ].map((item, i) => (
            <div key={i} className={`flex items-center justify-between py-2 ${item.bold ? "border-t border-surface-200 pt-3" : ""}`}>
              <span className={`text-sm ${item.bold ? "font-bold text-surface-900" : "text-surface-600"}`}>{item.label}</span>
              <span className={`text-sm font-semibold ${item.color}`}>{fmt(Math.abs(item.value))}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card-static overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-100">
          <h3 className="font-bold text-surface-900 text-sm">Account Balances</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Code</th>
              <th className="px-5 py-3.5 text-left">Account</th>
              <th className="px-5 py-3.5 text-left">Type</th>
              <th className="px-5 py-3.5 text-right">Debit</th>
              <th className="px-5 py-3.5 text-right">Credit</th>
              <th className="px-5 py-3.5 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {byAccount.map((a: any) => (
              <tr key={a.code} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors">
                <td className="px-5 py-3.5 font-mono text-sm font-bold text-primary-600">{a.code}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-surface-800">{a.name}</td>
                <td className="px-5 py-3.5 text-sm text-surface-500">{a.type}</td>
                <td className="px-5 py-3.5 text-sm text-right">{fmt(a.debit)}</td>
                <td className="px-5 py-3.5 text-sm text-right">{fmt(a.credit)}</td>
                <td className={`px-5 py-3.5 text-sm text-right font-bold ${(a.balance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {fmt(a.balance)}
                </td>
              </tr>
            ))}
            {byAccount.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-surface-400 text-sm font-medium">
                  No financial account records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QualityView({ data }: { data: any }) {
  const summary = data?.summary || { totalInspections: 0, passed: 0, failed: 0, passRate: 0 };
  const byType = data?.byType || [];
  const byStatus = data?.byStatus || [];
  const topDefects = data?.topDefects || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Inspections" value={summary.totalInspections || 0} icon={ShieldCheck} color="text-blue-600" />
        <StatCard label="Passed" value={summary.passed || 0} icon={TrendingUp} color="text-emerald-600" />
        <StatCard label="Failed" value={summary.failed || 0} icon={Package} color="text-rose-600" />
        <StatCard label="Pass Rate" value={`${summary.passRate || 0}%`} icon={Activity} color="text-cyan-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {byType.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Inspections by Type</h3>
            <BarChartSimple data={byType.map((t: any) => ({
              label: t.type, value: t.count, color: "bg-blue-500",
            }))} />
          </div>
        )}
        {topDefects.length > 0 && (
          <div className="card-static p-5">
            <h3 className="font-bold text-surface-900 text-sm mb-4">Top Defects</h3>
            <BarChartSimple data={topDefects.map((d: any) => ({
              label: d.code, value: d.count, color: "bg-rose-500",
            }))} />
          </div>
        )}
      </div>

      {byStatus.length > 0 && (
        <div className="card-static p-5">
          <h3 className="font-bold text-surface-900 text-sm mb-4">Inspection Status Distribution</h3>
          <PieChartSimple data={byStatus.map((s: any, i: number) => ({
            label: s.status, value: s.count,
            color: ["#10b981", "#f43f5e", "#f59e0b", "#3366ff", "#94a3b8"][i],
          }))} />
        </div>
      )}
    </div>
  );
}
