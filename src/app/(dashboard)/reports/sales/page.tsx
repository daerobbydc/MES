"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, Download, Filter, ArrowLeft, RefreshCw, BarChart3, ShoppingCart,
} from "lucide-react";
import Link from "next/link";

const fmt = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

function downloadCSV(data: any[], filename: string) {
  if (!data.length) return;
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

export default function SalesReportPage() {
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
      const res = await fetch(`/api/reports/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ...data.byCustomer.map((c: any) => ({ Type: "Customer", Name: c.name, Revenue: c.total, Count: c.orders })),
      ...data.byProduct.map((p: any) => ({ Type: "Product", Name: p.name, Revenue: p.revenue, Count: p.quantity })),
    ];
    downloadCSV(rows, `sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading report...</p>
      </div>
    </div>
  );

  const { summary, byProduct, byCustomer, monthly } = data || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
            <ArrowLeft size={18} className="text-surface-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Sales Report</h1>
            <p className="text-surface-500 text-sm mt-0.5">Revenue analytics and customer insights</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchReport} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2 text-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-static p-4 flex items-center gap-4">
        <Filter size={16} className="text-surface-400" />
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1 block">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1 block">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input-field text-sm" />
          </div>
          <button onClick={fetchReport} className="btn-primary text-sm self-end">Apply</button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="stat-card animate-in fade-in-up" style={{ animationDelay: "0s" }}>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{summary.totalOrders}</p>
          </div>
          <div className="stat-card animate-in fade-in-up" style={{ animationDelay: "0.05s" }}>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{fmt(summary.totalRevenue)}</p>
          </div>
          <div className="stat-card animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Avg Order Value</p>
            <p className="text-2xl font-bold mt-1 text-violet-600">{fmt(summary.avgOrderValue)}</p>
          </div>
        </div>
      )}

      {/* Monthly Revenue Chart */}
      {monthly?.length > 0 && (
        <div className="card-static p-5 animate-in fade-in-up" style={{ animationDelay: "0.15s" }}>
          <h3 className="font-semibold text-surface-900 mb-4">Monthly Revenue Trend</h3>
          <div className="flex items-end gap-2 h-40">
            {monthly.map((m: any, i: number) => {
              const max = Math.max(...monthly.map((x: any) => x.revenue), 1);
              const height = (m.revenue / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-surface-600">{fmt(m.revenue).slice(0, -3)}K</span>
                  <div className="w-full bg-blue-100 rounded-t-lg relative" style={{ height: `${height}%` }}>
                    <div className="absolute inset-0 bg-blue-500 rounded-t-lg transition-all duration-500" />
                  </div>
                  <span className="text-[10px] text-surface-400">{m.month.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Customers */}
        <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h3 className="font-semibold text-surface-900">Top Customers</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-right">Revenue</th>
                <th className="px-5 py-3 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {byCustomer?.map((c: any, i: number) => (
                <tr key={i} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                  <td className="px-5 py-3 text-sm font-medium text-surface-800">{c.name}</td>
                  <td className="px-5 py-3 text-sm text-right font-semibold">{fmt(c.total)}</td>
                  <td className="px-5 py-3 text-sm text-right">{c.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Revenue by Product */}
        <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="px-5 py-3.5 border-b border-surface-100">
            <h3 className="font-semibold text-surface-900">Revenue by Product</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-right">Quantity</th>
                <th className="px-5 py-3 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {byProduct?.map((p: any, i: number) => (
                <tr key={i} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                  <td className="px-5 py-3 text-sm font-medium text-surface-800">{p.name}</td>
                  <td className="px-5 py-3 text-sm text-right">{p.quantity}</td>
                  <td className="px-5 py-3 text-sm text-right font-semibold">{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
