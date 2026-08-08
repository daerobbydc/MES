"use client";

import { useEffect, useState } from "react";
import {
  Shield, Search, Filter, Clock, User, FileText, ChevronDown, ChevronRight,
} from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  UPDATE: "bg-blue-50 text-blue-700 border-blue-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
};

const ACTION_DOT: Record<string, string> = {
  CREATE: "bg-emerald-500",
  UPDATE: "bg-blue-500",
  DELETE: "bg-red-500",
};

const MODULE_ICONS: Record<string, string> = {
  Product: "bg-purple-100 text-purple-600",
  Lot: "bg-amber-100 text-amber-600",
  Location: "bg-cyan-100 text-cyan-600",
  WorkOrder: "bg-blue-100 text-blue-600",
  Machine: "bg-slate-100 text-slate-600",
  Supplier: "bg-green-100 text-green-600",
  PurchaseOrder: "bg-indigo-100 text-indigo-600",
  SalesOrder: "bg-pink-100 text-pink-600",
  User: "bg-violet-100 text-violet-600",
};

const MODULES = ["Product", "Lot", "Location", "WorkOrder", "Machine", "Supplier", "PurchaseOrder", "SalesOrder", "User"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE"];

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    module: "", action: "", userId: "", from: "", to: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchLogs(); }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (filters.module) params.set("module", filters.module);
      if (filters.action) params.set("action", filters.action);
      if (filters.userId) params.set("userId", filters.userId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data);
        setTotal(json.pagination?.total || 0);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const totalPages = Math.ceil(total / limit);

  const today = new Date().toISOString().split("T")[0];
  const todayCount = logs.filter(l => l.createdAt?.startsWith(today)).length;
  const uniqueUsers = new Set(logs.map(l => l.user?.id)).size;
  const uniqueModules = new Set(logs.map(l => l.module)).size;

  const stats = [
    { label: "Total Logs", value: total, color: "text-surface-900" },
    { label: "Shown Entries", value: logs.length, color: "text-blue-600" },
    { label: "Active Users", value: uniqueUsers, color: "text-emerald-600" },
    { label: "Modules Affected", value: uniqueModules, color: "text-amber-600" },
  ];

  const formatJson = (obj: any) => {
    if (!obj || typeof obj !== "object") return String(obj || "-");
    return JSON.stringify(obj, null, 2);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Audit Trail</h1>
          <p className="text-surface-500 text-sm mt-0.5">Track all system changes and user actions</p>
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`btn-secondary flex items-center gap-2 ${showFilters ? "ring-2 ring-primary-200" : ""}`}>
          <Filter size={16} /> Filters
          <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {showFilters && (
        <div className="card-static p-4 animate-in fade-in-up">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="label">Module</label>
              <select value={filters.module} onChange={e => { setFilters({ ...filters, module: e.target.value }); setPage(1); }} className="input-field">
                <option value="">All Modules</option>
                {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Action</label>
              <select value={filters.action} onChange={e => { setFilters({ ...filters, action: e.target.value }); setPage(1); }} className="input-field">
                <option value="">All Actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">From</label>
              <input type="date" value={filters.from} onChange={e => { setFilters({ ...filters, from: e.target.value }); setPage(1); }} className="input-field" />
            </div>
            <div>
              <label className="label">To</label>
              <input type="date" value={filters.to} onChange={e => { setFilters({ ...filters, to: e.target.value }); setPage(1); }} className="input-field" />
            </div>
            <div>
              <label className="label">User ID</label>
              <input type="text" placeholder="Filter by user..." value={filters.userId}
                onChange={e => { setFilters({ ...filters, userId: e.target.value }); setPage(1); }} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button onClick={() => { setFilters({ module: "", action: "", userId: "", from: "", to: "" }); setPage(1); }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
            <p className="text-sm text-surface-500 font-medium">Loading audit logs...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-0">
          {logs.map((log, idx) => {
            const isExpanded = expandedId === log.id;
            const moduleStyle = MODULE_ICONS[log.module] || "bg-surface-100 text-surface-600";
            return (
              <div key={log.id} className="animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                <div className="flex items-start gap-4 py-4 px-4 hover:bg-surface-50/60 transition-colors cursor-pointer rounded-xl"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${moduleStyle}`}>
                      <Shield size={18} />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${ACTION_DOT[log.action] || "bg-surface-400"}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-surface-900">{log.user?.name || "System"}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${ACTION_COLORS[log.action] || "bg-surface-100 text-surface-600 border-surface-200"}`}>
                        {log.action}
                      </span>
                      <span className="text-sm text-surface-500">on</span>
                      <span className="text-sm font-semibold text-surface-700">{log.module}</span>
                      {log.recordId && (
                        <span className="text-xs font-mono text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">{log.recordId}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-surface-400 flex items-center gap-1">
                        <Clock size={12} /> {formatTime(log.createdAt)}
                      </span>
                      {log.user?.email && (
                        <span className="text-xs text-surface-400 flex items-center gap-1">
                          <User size={12} /> {log.user.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="text-surface-400 mt-1">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-14 mr-4 mb-4 p-4 bg-surface-50 rounded-xl border border-surface-100 animate-in fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span> Old Values
                        </p>
                        <pre className="text-xs font-mono bg-white rounded-lg p-3 border border-surface-100 overflow-x-auto max-h-48 overflow-y-auto text-surface-600 whitespace-pre-wrap">
                          {formatJson(log.oldValues)}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span> New Values
                        </p>
                        <pre className="text-xs font-mono bg-white rounded-lg p-3 border border-surface-100 overflow-x-auto max-h-48 overflow-y-auto text-surface-600 whitespace-pre-wrap">
                          {formatJson(log.newValues)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="text-center py-16 text-surface-400">
              <Shield size={40} className="mx-auto mb-3 text-surface-300" />
              <p className="font-medium">No audit logs found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-surface-400">
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button key={pageNum} onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    page === pageNum ? "bg-primary-600 text-white" : "hover:bg-surface-100 text-surface-600"
                  }`}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
