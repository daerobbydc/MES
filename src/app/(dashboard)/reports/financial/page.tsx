"use client";

import { useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Download, Filter, ArrowLeft, RefreshCw, BarChart3,
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

export default function FinancialReportPage() {
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
      const res = await fetch(`/api/reports/financial?${params.toString()}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, []);

  const handleExport = () => {
    if (!data?.byAccount) return;
    const rows = data.byAccount.map((a: any) => ({
      Code: a.code, Name: a.name, Type: a.type,
      Debit: a.debit, Credit: a.credit, Balance: a.balance,
    }));
    downloadCSV(rows, `financial-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading report...</p>
      </div>
    </div>
  );

  const { summary, byAccount, incomeStatement } = data || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
            <ArrowLeft size={18} className="text-surface-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Financial Report</h1>
            <p className="text-surface-500 text-sm mt-0.5">Income statement and account balances</p>
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

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Revenue", value: fmt(summary.revenue), color: "text-blue-600", icon: DollarSign },
            { label: "Gross Profit", value: fmt(summary.grossProfit), color: "text-emerald-600", icon: TrendingUp, sub: `${summary.grossMargin}% margin` },
            { label: "Expenses", value: fmt(summary.expenses), color: "text-amber-600", icon: BarChart3 },
            { label: "Net Income", value: fmt(summary.netIncome), color: summary.netIncome >= 0 ? "text-violet-600" : "text-rose-600", icon: summary.netIncome >= 0 ? TrendingUp : TrendingDown, sub: `${summary.netMargin}% margin` },
          ].map((s, i) => (
            <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="text-xs text-surface-400 mt-0.5">{s.sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color.replace("text-", "bg-").replace("-600", "-50")}`}>
                  <s.icon size={20} className={s.color} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Income Statement */}
      {incomeStatement && (
        <div className="card-static p-6 animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="font-bold text-surface-900 mb-5">Income Statement</h3>
          <div className="space-y-0">
            {[
              { label: "Revenue", value: incomeStatement.revenue, indent: false, bold: false, color: "text-blue-600" },
              { label: "Cost of Goods Sold", value: -incomeStatement.cogs, indent: true, bold: false, color: "text-rose-600" },
              { label: "Gross Profit", value: incomeStatement.grossProfit, indent: false, bold: true, color: "text-emerald-600" },
              { label: "", value: 0, indent: false, bold: false, divider: true },
              { label: "Operating Expenses", value: -incomeStatement.operatingExpenses, indent: false, bold: false, color: "text-amber-600" },
              { label: "", value: 0, indent: false, bold: false, divider: true },
              { label: "Net Income", value: incomeStatement.netIncome, indent: false, bold: true, color: incomeStatement.netIncome >= 0 ? "text-emerald-600" : "text-rose-600" },
            ].map((item, i) => {
              if (item.divider) return <div key={i} className="border-t border-surface-200 my-2" />;
              return (
                <div key={i} className={`flex items-center justify-between py-2 ${item.indent ? "pl-6" : ""}`}>
                  <span className={`text-sm ${item.bold ? "font-bold text-surface-900" : "text-surface-600"}`}>{item.label}</span>
                  <span className={`text-sm font-semibold ${item.color}`}>{fmt(Math.abs(item.value))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Balance Summary */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card-static p-5 animate-in fade-in-up" style={{ animationDelay: "0.25s" }}>
            <h3 className="font-semibold text-surface-900 mb-3">Assets</h3>
            <p className="text-2xl font-bold text-blue-600">{fmt(summary.assets)}</p>
          </div>
          <div className="card-static p-5 animate-in fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h3 className="font-semibold text-surface-900 mb-3">Liabilities</h3>
            <p className="text-2xl font-bold text-rose-600">{fmt(summary.liabilities)}</p>
          </div>
          <div className="card-static p-5 animate-in fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h3 className="font-semibold text-surface-900 mb-3">Equity</h3>
            <p className="text-2xl font-bold text-emerald-600">{fmt(summary.equity)}</p>
          </div>
        </div>
      )}

      {/* Account Balances Table */}
      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.4s" }}>
        <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
          <h3 className="font-semibold text-surface-900">Account Balances</h3>
          <span className="text-xs text-surface-400">{byAccount?.length || 0} accounts</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3 text-left">Code</th>
              <th className="px-5 py-3 text-left">Account Name</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-right">Debit</th>
              <th className="px-5 py-3 text-right">Credit</th>
              <th className="px-5 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {byAccount?.map((a: any) => (
              <tr key={a.code} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in">
                <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{a.code}</td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">{a.name}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    a.type === "ASSET" ? "bg-blue-50 text-blue-600" :
                    a.type === "LIABILITY" ? "bg-rose-50 text-rose-600" :
                    a.type === "REVENUE" ? "bg-emerald-50 text-emerald-600" :
                    a.type === "EXPENSE" ? "bg-amber-50 text-amber-600" :
                    a.type === "EQUITY" ? "bg-violet-50 text-violet-600" :
                    "bg-surface-50 text-surface-600"
                  }`}>
                    {a.type}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-right font-medium">{fmt(a.debit)}</td>
                <td className="px-5 py-4 text-sm text-right font-medium">{fmt(a.credit)}</td>
                <td className={`px-5 py-4 text-sm text-right font-bold ${a.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {fmt(a.balance)}
                </td>
              </tr>
            ))}
            {!byAccount?.length && (
              <tr><td colSpan={6} className="text-center py-16 text-surface-400">
                <DollarSign size={40} className="mx-auto mb-3 text-surface-300" />
                <p className="font-medium">No account data found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
