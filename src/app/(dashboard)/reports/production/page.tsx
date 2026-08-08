"use client";

import { useEffect, useState } from "react";
import {
  Factory, TrendingUp, TrendingDown, Download, Calendar, Filter, ArrowLeft, RefreshCw,
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

export default function ProductionReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status) params.set("status", status);
      const res = await fetch(`/api/reports/production?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExport = () => {
    if (!data?.details) return;
    const rows = data.details.map((d: any) => ({
      Order: d.orderNumber, Product: d.product?.name, Line: d.line?.name,
      Quantity: d.quantity, Completed: d.completedQty, Rejected: d.rejectedQty,
      MaterialCost: d.materialCost, LaborCost: d.laborCost, TotalCost: d.totalCost,
      UnitCost: d.unitCost, Status: d.status, Priority: d.priority,
      PlannedStart: d.plannedStart?.slice(0, 10), PlannedEnd: d.plannedEnd?.slice(0, 10),
      ActualStart: d.actualStart?.slice(0, 10), ActualEnd: d.actualEnd?.slice(0, 10),
    }));
    downloadCSV(rows, `production-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading report...</p>
      </div>
    </div>
  );

  const { summary, details } = data || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
            <ArrowLeft size={18} className="text-surface-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Production Report</h1>
            <p className="text-surface-500 text-sm mt-0.5">Detailed production order analytics</p>
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
          <div>
            <label className="text-xs font-medium text-surface-500 mb-1 block">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field text-sm">
              <option value="">All Status</option>
              <option value="PLANNED">Planned</option>
              <option value="RELEASED">Released</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <button onClick={fetchReport} className="btn-primary text-sm self-end">Apply</button>
        </div>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Orders", value: summary.totalOrders, color: "text-blue-600" },
              { label: "Planned Qty", value: summary.totalPlanned, color: "text-surface-900" },
              { label: "Produced", value: summary.totalProduced, color: "text-emerald-600" },
              { label: "Rejected", value: summary.totalRejected, color: "text-rose-600" },
              { label: "Yield Rate", value: `${summary.yieldRate}%`, color: "text-cyan-600" },
            ].map((s, i) => (
              <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Cost Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Material Cost", value: fmt(summary.materialCost), color: "text-blue-600" },
              { label: "Labor Cost", value: fmt(summary.laborCost), color: "text-emerald-600" },
              { label: "Overhead Cost", value: fmt(summary.overheadCost), color: "text-amber-600" },
              { label: "Total Cost", value: fmt(summary.totalCost), color: "text-surface-900" },
            ].map((s, i) => (
              <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Status Breakdown */}
          {summary.statusBreakdown?.length > 0 && (
            <div className="card-static p-5">
              <h3 className="font-semibold text-surface-900 mb-4">Status Distribution</h3>
              <div className="flex items-end gap-3 h-32">
                {summary.statusBreakdown.map((s: any, i: number) => {
                  const maxCount = Math.max(...summary.statusBreakdown.map((x: any) => x.count), 1);
                  const height = (s.count / maxCount) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-surface-700">{s.count}</span>
                      <div className="w-full bg-primary-100 rounded-t-lg relative" style={{ height: `${height}%` }}>
                        <div className="absolute inset-0 bg-primary-500 rounded-t-lg" />
                      </div>
                      <span className="text-[10px] text-surface-400 text-center leading-tight">{s.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Table */}
      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.3s" }}>
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="font-semibold text-surface-900">Production Orders</h3>
          <span className="text-xs text-surface-400">{details?.length || 0} records</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3 text-left">Order Number</th>
              <th className="px-5 py-3 text-left">Product</th>
              <th className="px-5 py-3 text-left">Line</th>
              <th className="px-5 py-3 text-right">Quantity</th>
              <th className="px-5 py-3 text-right">Completed</th>
              <th className="px-5 py-3 text-right">Rejected</th>
              <th className="px-5 py-3 text-right">Yield %</th>
              <th className="px-5 py-3 text-right">Total Cost</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {details?.map((o: any) => {
              const yieldPct = o.completedQty > 0 ? ((o.completedQty - o.rejectedQty) / o.completedQty * 100).toFixed(1) : "0";
              return (
                <tr key={o.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in">
                  <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{o.orderNumber}</td>
                  <td className="px-5 py-4 text-sm font-medium text-surface-800">{o.product?.name || "-"}</td>
                  <td className="px-5 py-4 text-sm text-surface-600">{o.line?.name || "-"}</td>
                  <td className="px-5 py-4 text-sm text-right">{o.quantity}</td>
                  <td className="px-5 py-4 text-sm text-right font-semibold text-emerald-600">{o.completedQty}</td>
                  <td className="px-5 py-4 text-sm text-right text-rose-600">{o.rejectedQty}</td>
                  <td className="px-5 py-4 text-sm text-right font-semibold">{yieldPct}%</td>
                  <td className="px-5 py-4 text-sm text-right font-semibold">{fmt(o.totalCost || 0)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`status-badge ${
                      o.status === "COMPLETED" ? "status-done" :
                      o.status === "IN_PROGRESS" ? "status-in-progress" :
                      o.status === "CANCELLED" ? "status-down" :
                      o.status === "ON_HOLD" ? "status-idle" : "status-planned"
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      {o.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!details?.length && (
              <tr><td colSpan={9} className="text-center py-16 text-surface-400">
                <Factory size={40} className="mx-auto mb-3 text-surface-300" />
                <p className="font-medium">No production orders found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
