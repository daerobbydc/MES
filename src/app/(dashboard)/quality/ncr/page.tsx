"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle, Plus, Search, XCircle, Clock, RefreshCw,
  AlertOctagon, CheckCircle2, Filter, FileWarning, ChevronDown,
  ClipboardX, TrendingDown, Layers
} from "lucide-react";

interface NCR {
  id: string;
  ncrNumber: string;
  type: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  status: "OPEN" | "UNDER_REVIEW" | "CLOSED";
  productName: string;
  productCode: string;
  orderNumber: string;
  lotBatchNumber: string;
  defectQty: number;
  sampleSize: number;
  defectRate: number;
  inspector: string;
  description: string;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-700 border-rose-200",
  MAJOR: "bg-amber-100 text-amber-700 border-amber-200",
  MINOR: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-rose-50 text-rose-600 border-rose-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-600 border-amber-200",
  CLOSED: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

export default function NCRPage() {
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({
    orderId: "", inspectorId: "", lotBatchNumber: "",
    sampleSize: 100, defectQty: 0, defectType: "Surface Defect",
    description: "", severity: "MAJOR"
  });

  const fetchNCRs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/quality/ncr?${params}`);
      const json = await res.json();
      if (json.success) setNcrs(json.data.ncrs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { fetchNCRs(); }, [fetchNCRs]);

  useEffect(() => {
    Promise.all([
      fetch("/api/production/orders?limit=500").then(r => r.json()),
      fetch("/api/users?limit=500").then(r => r.json()),
    ]).then(([oJson, uJson]) => {
      if (oJson.success) setOrders(oJson.data || []);
      if (uJson.success) setUsers(uJson.data || []);
    }).catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/quality/ncr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        fetchNCRs();
        setForm({ orderId: "", inspectorId: "", lotBatchNumber: "", sampleSize: 100, defectQty: 0, defectType: "Surface Defect", description: "", severity: "MAJOR" });
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const filtered = ncrs.filter(n => {
    const matchSearch = !search || n.ncrNumber.toLowerCase().includes(search.toLowerCase()) ||
      n.productName.toLowerCase().includes(search.toLowerCase()) ||
      n.orderNumber.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = severityFilter === "ALL" || n.severity === severityFilter;
    return matchSearch && matchSeverity;
  });

  const openCount = ncrs.filter(n => n.status === "OPEN").length;
  const criticalCount = ncrs.filter(n => n.severity === "CRITICAL").length;
  const totalDefects = ncrs.reduce((s, n) => s + n.defectQty, 0);
  const avgDefectRate = ncrs.length > 0
    ? (ncrs.reduce((s, n) => s + n.defectRate, 0) / ncrs.length).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title">Non-Conformance Reports (NCR)</h1>
            {openCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                {openCount} Open
              </span>
            )}
          </div>
          <p className="page-subtitle">Product non-conformance logging — defect tracking, root cause & corrective action</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchNCRs} className="btn-secondary text-xs flex items-center gap-2">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs flex items-center gap-2">
            <Plus size={14} /> Create NCR
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Total NCRs</p>
              <p className="stat-value">{ncrs.length}</p>
              <p className="text-xs text-surface-400 mt-0.5">Current Period</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <ClipboardX size={20} className="text-rose-500" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Open / Unresolved</p>
              <p className="stat-value text-rose-600">{openCount}</p>
              <p className="text-xs text-surface-400 mt-0.5">Action Required</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
              <AlertOctagon size={20} className="text-rose-500" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Critical NCRs</p>
              <p className="stat-value text-amber-600">{criticalCount}</p>
              <p className="text-xs text-surface-400 mt-0.5">High Severity</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-label">Total Defect Qty</p>
              <p className="stat-value text-violet-600">{totalDefects.toLocaleString()}</p>
              <p className="text-xs text-surface-400 mt-0.5">Avg rate: {avgDefectRate}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <TrendingDown size={20} className="text-violet-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search NCR number, product, order..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-sm w-auto">
          <option value="ALL">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="select text-sm w-auto">
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="MAJOR">Major</option>
          <option value="MINOR">Minor</option>
        </select>
      </div>

      {/* NCR Table */}
      <div className="card-static p-0 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-surface-400">
              <FileWarning size={36} className="mb-3 opacity-40" />
              <p className="font-semibold text-sm">No NCRs found</p>
              <p className="text-xs mt-1">Create a new NCR when product non-conformance is identified</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  {["NCR Number", "Product / Order", "Lot / Batch", "Severity", "Status", "Defect Qty", "Defect Rate", "Inspector", "Date"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map(ncr => (
                  <tr key={ncr.id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-sm text-primary-600 font-mono">{ncr.ncrNumber}</p>
                      <p className="text-[11px] text-surface-400">{ncr.type}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-sm text-surface-900">{ncr.productName}</p>
                      <p className="text-[11px] font-mono text-surface-400">{ncr.orderNumber}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs font-mono text-surface-600">{ncr.lotBatchNumber}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${SEVERITY_STYLES[ncr.severity]}`}>
                        {ncr.severity === "CRITICAL" && <AlertOctagon size={10} />}
                        {ncr.severity === "MAJOR" && <AlertTriangle size={10} />}
                        {ncr.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_STYLES[ncr.status]}`}>
                        {ncr.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-rose-600">{ncr.defectQty.toLocaleString()}</p>
                      <p className="text-[11px] text-surface-400">out of {ncr.sampleSize}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-sm font-bold ${ncr.defectRate > 10 ? "text-rose-600" : ncr.defectRate > 5 ? "text-amber-600" : "text-emerald-600"}`}>
                        {ncr.defectRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-surface-600">{ncr.inspector}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-surface-500">
                        {new Date(ncr.createdAt).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal - Create NCR */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in fade-in-up duration-300">
            <div className="flex items-center justify-between p-6 border-b border-surface-100">
              <div>
                <h2 className="font-bold text-surface-900 text-lg">Create Non-Conformance Report</h2>
                <p className="text-xs text-surface-400 mt-0.5">Document product defects & non-conformances</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-surface-100 text-surface-400 transition-colors">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Production Order *</label>
                  <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} className="select w-full" required>
                    <option value="">Select Order...</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>{o.orderNumber} — {o.product?.name || o.productId}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Lot / Batch Number</label>
                  <input type="text" className="input-field" placeholder="LOT-001" value={form.lotBatchNumber} onChange={e => setForm({ ...form, lotBatchNumber: e.target.value })} />
                </div>
                <div>
                  <label className="label">Inspector</label>
                  <select value={form.inspectorId} onChange={e => setForm({ ...form, inspectorId: e.target.value })} className="select w-full">
                    <option value="">Select Inspector...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Sample Size *</label>
                  <input type="number" min={1} className="input-field" value={form.sampleSize} onChange={e => setForm({ ...form, sampleSize: parseInt(e.target.value) || 0 })} required />
                </div>
                <div>
                  <label className="label">Defect Quantity *</label>
                  <input type="number" min={0} className="input-field" value={form.defectQty} onChange={e => setForm({ ...form, defectQty: parseInt(e.target.value) || 0 })} required />
                </div>
                <div>
                  <label className="label">Defect Type</label>
                  <select value={form.defectType} onChange={e => setForm({ ...form, defectType: e.target.value })} className="select w-full">
                    <option>Surface Defect</option>
                    <option>Dimensional Out of Spec</option>
                    <option>Functional Failure</option>
                    <option>Material Defect</option>
                    <option>Assembly Error</option>
                    <option>Contamination</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Severity</label>
                  <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="select w-full">
                    <option value="MINOR">Minor</option>
                    <option value="MAJOR">Major</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Non-Conformance Description</label>
                  <textarea rows={3} className="input-field resize-none" placeholder="Describe the defect found during inspection..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={16} />}
                  Save NCR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
