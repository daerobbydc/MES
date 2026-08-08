"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, Plus, Search, CheckCircle, XCircle, Clock, AlertTriangle, Eye,
} from "lucide-react";

export default function QualityPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [form, setForm] = useState({ inspectionType: "INCOMING", orderId: "", inspectorId: "", lotBatchNumber: "", sampleSize: 10, notes: "" });

  useEffect(() => { fetchInspections(); loadDropdowns(); }, []);

  const fetchInspections = async () => {
    try {
      const res = await fetch("/api/quality/inspections");
      const json = await res.json();
      if (json.success) setInspections(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadDropdowns = async () => {
    try {
      const [oRes, uRes] = await Promise.all([
        fetch("/api/production/orders?limit=1000"),
        fetch("/api/users?limit=1000"),
      ]);
      const oJson = await oRes.json();
      const uJson = await uRes.json();
      if (oJson.success) setOrders(oJson.data.filter((o: any) => o.status === "COMPLETED" || o.status === "IN_PROGRESS"));
      if (uJson.success) setUsers(uJson.data);
    } catch (e) { console.error(e); } finally { setLoadingDropdowns(false); }
  };

  const createInspection = async () => {
    if (!form.inspectionType) { setError("Inspection Type is required."); return; }
    if (!form.orderId) { setError("Product/Work Order is required."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "Failed to create inspection."); return; }
      setShowModal(false);
      setForm({ inspectionType: "INCOMING", orderId: "", inspectorId: "", lotBatchNumber: "", sampleSize: 10, notes: "" });
      fetchInspections();
    } catch (e) { console.error(e); setError("An unexpected error occurred."); } finally { setSaving(false); }
  };

  const filtered = inspections.filter(i => {
    const matchSearch = !search || i.inspectionNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || i.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: inspections.length,
    passed: inspections.filter(i => i.status === "PASSED").length,
    failed: inspections.filter(i => i.status === "FAILED").length,
    pending: inspections.filter(i => i.status === "PENDING").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading inspections...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Quality Control</h1>
          <p className="text-surface-500 text-sm mt-0.5">Track inspections and ensure product quality</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Inspection
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-surface-900" },
          { label: "Passed", value: stats.passed, color: "text-emerald-600", icon: CheckCircle },
          { label: "Failed", value: stats.failed, color: "text-rose-600", icon: XCircle },
          { label: "Pending", value: stats.pending, color: "text-amber-600", icon: Clock },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
              {s.icon && <s.icon size={22} className={`${s.color} opacity-40`} />}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search inspections..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-auto">
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="IN_PROGRESS">In Progress</option>
        </select>
      </div>

      {/* Inspections Table */}
      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Inspection #</th>
              <th className="px-5 py-3.5 text-left">Type</th>
              <th className="px-5 py-3.5 text-left">Product</th>
              <th className="px-5 py-3.5 text-left">Inspector</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-center">Result</th>
              <th className="px-5 py-3.5 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((insp, idx) => (
              <tr key={insp.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{insp.inspectionNumber}</td>
                <td className="px-5 py-4 text-sm text-surface-600">{insp.inspectionType}</td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">{insp.order?.product?.name || insp.product?.name || "-"}</td>
                <td className="px-5 py-4 text-sm text-surface-600">{insp.inspector?.name || "-"}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`status-badge ${
                    insp.status === "PASSED" ? "status-done" :
                    insp.status === "FAILED" ? "status-down" :
                    insp.status === "IN_PROGRESS" ? "status-in-progress" : "status-pending"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {insp.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  {insp.result && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${insp.result === "PASS" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      {insp.result}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-sm text-surface-500">{new Date(insp.inspectedAt || insp.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-16 text-surface-400">
                <ShieldCheck size={40} className="mx-auto mb-3 text-surface-300" />
                <p className="font-medium">No inspections found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">New Quality Inspection</h3>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Inspection Type <span className="text-red-500">*</span></label>
                <select value={form.inspectionType} onChange={e => setForm({ ...form, inspectionType: e.target.value })} className="input-field">
                  <option value="INCOMING">Incoming</option>
                  <option value="IN_PROCESS">In Process</option>
                  <option value="FINAL">Final</option>
                </select>
              </div>
              <div>
                <label className="label">Product / Work Order <span className="text-red-500">*</span></label>
                {loadingDropdowns ? (
                  <div className="input-field text-sm text-surface-400">Loading...</div>
                ) : (
                  <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} className="input-field">
                    <option value="">Select order...</option>
                    {orders.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.product?.name || o.orderNumber || o.id} {o.status ? `(${o.status})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Inspector</label>
                {loadingDropdowns ? (
                  <div className="input-field text-sm text-surface-400">Loading...</div>
                ) : (
                  <select value={form.inspectorId} onChange={e => setForm({ ...form, inspectorId: e.target.value })} className="input-field">
                    <option value="">Select inspector...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Lot / Batch Number</label>
                <input value={form.lotBatchNumber} onChange={e => setForm({ ...form, lotBatchNumber: e.target.value })} className="input-field" placeholder="Enter lot or batch number" />
              </div>
              <div>
                <label className="label">Sample Size</label>
                <input type="number" value={form.sampleSize} onChange={e => setForm({ ...form, sampleSize: parseInt(e.target.value) || 0 })} className="input-field" min="1" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} placeholder="Inspection notes..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setError(""); }} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={createInspection} className="btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
