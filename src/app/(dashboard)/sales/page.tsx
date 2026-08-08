"use client";

import { useEffect, useState } from "react";
import {
  Truck, Plus, Search, CheckCircle, Clock, Package, FileText, X,
} from "lucide-react";

export default function SalesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [form, setForm] = useState({ customerId: "", expectedDate: "", notes: "" });
  const [lines, setLines] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([]);
  const [lineDraft, setLineDraft] = useState({ productId: "", quantity: 1, unitPrice: 0 });

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch("/api/customers?limit=1000"),
          fetch("/api/products/catalog"),
        ]);
        const custJson = await custRes.json();
        const prodJson = await prodRes.json();
        if (custJson.success) setCustomers(custJson.data);
        if (prodJson.success) setProducts(prodJson.data);
      } catch (e) { console.error(e); } finally { setLoadingDropdowns(false); }
    };
    loadDropdowns();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/sales/orders");
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = orders.filter(o => !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()));

  const addLine = () => {
    if (!lineDraft.productId || lineDraft.quantity <= 0) return;
    setLines([...lines, { ...lineDraft }]);
    setLineDraft({ productId: "", quantity: 1, unitPrice: 0 });
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!form.customerId || !form.expectedDate) {
      setError("Customer and Expected Date are required");
      return;
    }
    if (lines.length === 0) {
      setError("At least one line item is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.customerId,
          requiredDate: form.expectedDate,
          notes: form.notes,
          items: lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ customerId: "", expectedDate: "", notes: "" });
        setLines([]);
        setError("");
        fetchOrders();
      } else {
        setError(json.error || "Failed to create sales order");
      }
    } catch (e) {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading sales orders...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Sales</h1>
          <p className="text-surface-500 text-sm mt-0.5">Manage sales orders and deliveries</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New SO
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total SOs", value: orders.length, color: "text-surface-900", bg: "bg-violet-50", iconText: "text-violet-600", icon: Truck },
          { label: "Pending", value: orders.filter(o => o.status === "CONFIRMED" || o.status === "PENDING").length, color: "text-amber-600", bg: "bg-amber-50", iconText: "text-amber-600", icon: Clock },
          { label: "Delivered", value: orders.filter(o => o.status === "DELIVERED" || o.status === "COMPLETED").length, color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: CheckCircle },
        ].map((s, i) => (
          <div key={i} className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={20} className={s.iconText} />
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input type="text" placeholder="Search sales orders..." value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10 w-full" />
      </div>

      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">SO Number</th>
              <th className="px-5 py-3.5 text-left">Customer</th>
              <th className="px-5 py-3.5 text-right">Total</th>
              <th className="px-5 py-3.5 text-left">Delivery Date</th>
              <th className="px-5 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((so, idx) => (
              <tr key={so.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{so.orderNumber}</td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">{so.customer?.name || "-"}</td>
                <td className="px-5 py-4 text-sm font-bold text-surface-900 text-right">Rp {(so.totalAmount || 0).toLocaleString()}</td>
                <td className="px-5 py-4 text-sm text-surface-600">{so.deliveryDate ? new Date(so.deliveryDate).toLocaleDateString() : "-"}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`status-badge ${
                    so.status === "DELIVERED" || so.status === "COMPLETED" ? "status-done" :
                    so.status === "CONFIRMED" ? "status-in-progress" :
                    so.status === "PARTIAL" ? "status-idle" : "status-planned"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {so.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-16 text-surface-400">
                <Truck size={40} className="mx-auto mb-3 text-surface-300" />
                <p className="font-medium">No sales orders found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-lg p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">New Sales Order</h3>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Customer <span className="text-red-500">*</span></label>
                {loadingDropdowns ? (
                  <div className="input-field text-sm text-surface-400">Loading...</div>
                ) : (
                  <select value={form.customerId} onChange={e => setForm({ ...form, customerId: e.target.value })} className="input-field">
                    <option value="">Select customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="label">Expected Delivery Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} className="input-field" />
              </div>

              <div>
                <label className="label">Line Items <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <select value={lineDraft.productId} onChange={e => setLineDraft({ ...lineDraft, productId: e.target.value })} className="input-field flex-1 text-sm">
                    <option value="">Product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
                    ))}
                  </select>
                  <input type="number" min={1} value={lineDraft.quantity} onChange={e => setLineDraft({ ...lineDraft, quantity: parseInt(e.target.value) || 1 })} className="input-field w-20 text-sm" placeholder="Qty" />
                  <input type="number" min={0} value={lineDraft.unitPrice || ""} onChange={e => setLineDraft({ ...lineDraft, unitPrice: parseFloat(e.target.value) || 0 })} className="input-field w-28 text-sm" placeholder="Unit Price" />
                  <button type="button" onClick={addLine} className="btn-primary px-3 py-1.5 text-sm whitespace-nowrap">Add</button>
                </div>
                {lines.length > 0 ? (
                  <div className="space-y-1.5">
                    {lines.map((line, idx) => {
                      const prod = products.find(p => p.id === line.productId);
                      return (
                        <div key={idx} className="flex items-center justify-between bg-surface-50 rounded-lg px-3 py-2 text-sm">
                          <span className="font-medium text-surface-800 truncate">
                            {prod?.name || line.productId} &times; {line.quantity} @ Rp {line.unitPrice.toLocaleString()}
                          </span>
                          <button type="button" onClick={() => removeLine(idx)} className="text-surface-400 hover:text-red-500 transition-colors ml-2">
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-surface-400 mt-1">No line items added yet.</p>
                )}
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setError(""); setLines([]); }} className="btn-secondary" disabled={saving}>Cancel</button>
              <button onClick={handleCreate} className="btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
