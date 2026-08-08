"use client";

import { useEffect, useState } from "react";
import {
  BookOpen, Plus, Search, FileText, Calculator, TrendingUp, TrendingDown,
} from "lucide-react";

export default function AccountingPage() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"journals" | "trial-balance" | "journal-entries">("journals");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/accounting/journals");
      const json = await res.json();
      if (json.success) setJournals(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading accounting data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BookOpen size={22} className="text-primary-500" />
            Accounting
          </h1>
          <p className="page-subtitle">Journal entries, trial balance and financial records</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card flex items-center justify-between animate-in fade-in-up">
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Journal Entries</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{journals.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-primary-600" />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: "0.05s" }}>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Debit</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">Rp {journals.reduce((s, j) => s + (j.totalDebit || 0), 0).toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} className="text-emerald-600" />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Credit</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">Rp {journals.reduce((s, j) => s + (j.totalCredit || 0), 0).toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={20} className="text-rose-600" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["journals", "trial-balance", "journal-entries"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${tab === t ? "tab-active" : "tab-inactive"}`}>
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {tab === "journals" && (
        <div className="card-static overflow-hidden animate-in fade-in-up">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-5 py-3.5 text-left">Entry #</th>
                <th className="px-5 py-3.5 text-left">Description</th>
                <th className="px-5 py-3.5 text-right">Debit</th>
                <th className="px-5 py-3.5 text-right">Credit</th>
                <th className="px-5 py-3.5 text-left">Date</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((j, idx) => (
                <tr key={j.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                  <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{j.entryNumber}</td>
                  <td className="px-5 py-4 text-sm font-medium text-surface-800">{j.description}</td>
                  <td className="px-5 py-4 text-sm text-right">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <TrendingUp size={12} /> Rp {(j.totalDebit || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-right">
                    <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                      <TrendingDown size={12} /> Rp {(j.totalCredit || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-surface-600">{new Date(j.entryDate || j.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`status-badge ${j.status === "POSTED" ? "status-done" : "status-pending"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>{j.status}
                    </span>
                  </td>
                </tr>
              ))}
              {journals.length === 0 && (
                <tr><td colSpan={6} className="text-center py-16 text-surface-400">
                  <BookOpen size={40} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-medium">No journal entries found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "trial-balance" && (
        <div className="card-static animate-in fade-in-up">
          <p className="text-sm text-surface-500 text-center py-16">Trial balance data will appear here</p>
        </div>
      )}

      {tab === "journal-entries" && (
        <div className="card-static animate-in fade-in-up">
          <p className="text-sm text-surface-500 text-center py-16">Detailed journal entries will appear here</p>
        </div>
      )}
    </div>
  );
}
