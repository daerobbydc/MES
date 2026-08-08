"use client";

import { useEffect, useState } from "react";
import {
  Factory, Plus, Search, Filter, Play, CheckCircle, Clock, Pause,
  Package, Users, AlertTriangle, Eye, ChevronDown, ChevronRight, Calendar,
} from "lucide-react";

export default function ProductionPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [form, setForm] = useState({ productId: "", quantity: 1, priority: "MEDIUM", lineId: "", plannedStart: "", plannedEnd: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOrders(); fetchProducts(); fetchLines(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/production/orders");
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products/catalog");
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (e) { console.error(e); }
  };

  const fetchLines = async () => {
    try {
      const res = await fetch("/api/machine?limit=100");
      const json = await res.json();
      if (json.success) {
        const uniqueLines = new Map();
        json.data.forEach((m: any) => {
          if (m.line) uniqueLines.set(m.line.id, m.line);
        });
        setLines(Array.from(uniqueLines.values()));
      }
    } catch (e) { console.error(e); }
  };

  const createOrder = async () => {
    setFormError("");
    if (!form.productId) { setFormError("Product is required."); return; }
    if (!form.quantity || form.quantity <= 0) { setFormError("Quantity must be greater than 0."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/production/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          lineId: form.lineId || undefined,
          plannedStart: form.plannedStart || undefined,
          plannedEnd: form.plannedEnd || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ productId: "", quantity: 1, priority: "MEDIUM", lineId: "", plannedStart: "", plannedEnd: "" });
        fetchOrders();
      } else {
        setFormError(json.message || "Failed to create production order.");
      }
    } catch (e) { setFormError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const startOrder = async (id: string) => {
    await fetch(`/api/production/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
    fetchOrders();
  };

  const holdOrder = async (id: string) => {
    await fetch(`/api/production/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hold" }) });
    fetchOrders();
  };

  const completeOrder = async (id: string) => {
    await fetch(`/api/production/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) });
    fetchOrders();
  };

  const reopenOrder = async (id: string) => {
    await fetch(`/api/production/orders/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen" }) });
    fetchOrders();
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || o.product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    PLANNED: { bg: "bg-surface-100", text: "text-surface-600", dot: "bg-surface-400" },
    IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    COMPLETED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    ON_HOLD: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    CANCELLED: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
  };

  const stats = {
    total: orders.length,
    planned: orders.filter(o => o.status === "PLANNED").length,
    inProgress: orders.filter(o => o.status === "IN_PROGRESS").length,
    completed: orders.filter(o => o.status === "COMPLETED").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading orders...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Production Orders</h1>
          <p className="text-surface-500 text-sm mt-0.5">Manage and track manufacturing orders</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: stats.total, color: "text-surface-900", bg: "bg-surface-100", iconText: "text-surface-700", icon: Factory },
          { label: "Planned", value: stats.planned, color: "text-surface-600", bg: "bg-surface-100", iconText: "text-surface-600", icon: Calendar },
          { label: "In Progress", value: stats.inProgress, color: "text-blue-600", bg: "bg-blue-50", iconText: "text-blue-600", icon: Play },
          { label: "Completed", value: stats.completed, color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: CheckCircle },
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

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input type="text" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-auto">
          <option value="ALL">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      </div>

      {/* Orders */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card-static text-center py-16 text-surface-400">
            <Factory size={40} className="mx-auto mb-3 text-surface-300" />
            <p className="font-medium">No orders found</p>
          </div>
        )}
        {filtered.map((order, idx) => {
          const isExpanded = expandedOrder === order.id;
          const progress = order.quantity > 0 ? ((order.completedQty || 0) / order.quantity) * 100 : 0;
          const sc = statusConfig[order.status] || statusConfig.PLANNED;
          return (
            <div key={order.id} className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: `${idx * 0.03}s` }}>
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                <div className="text-surface-400 transition-transform duration-200">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono font-bold text-surface-900">{order.orderNumber}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                      {order.status}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      order.priority === "HIGH" || order.priority === "URGENT" ? "bg-rose-50 text-rose-600" :
                      order.priority === "MEDIUM" ? "bg-amber-50 text-amber-600" : "bg-surface-100 text-surface-500"
                    }`}>{order.priority}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-surface-500">
                    <span>{order.product?.name}</span>
                    <span>Qty: {order.quantity}</span>
                    <span>Due: {new Date(order.plannedEnd || order.plannedStart || order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="w-36">
                  <div className="progress-bar h-1.5">
                    <div className="progress-bar-fill bg-gradient-to-r from-primary-400 to-primary-500" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                  </div>
                  <p className="text-[10px] text-surface-400 text-right mt-1 font-medium">{order.completedQty || 0}/{order.quantity} ({progress.toFixed(0)}%)</p>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {(order.status === "PLANNED" || order.status === "RELEASED") && (
                    <button onClick={() => startOrder(order.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                      <Play size={13} /> Mulai (Start)
                    </button>
                  )}
                  {order.status === "IN_PROGRESS" && (
                    <>
                      <button onClick={() => holdOrder(order.id)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100">
                        <Pause size={13} /> Tahan (Hold)
                      </button>
                      <button onClick={() => completeOrder(order.id)} className="btn-success text-xs py-1.5 px-3 flex items-center gap-1">
                        <CheckCircle size={13} /> Selesai (Complete)
                      </button>
                    </>
                  )}
                  {order.status === "ON_HOLD" && (
                    <>
                      <button onClick={() => startOrder(order.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                        <Play size={13} /> Lanjutkan (Resume)
                      </button>
                      <button onClick={() => completeOrder(order.id)} className="btn-success text-xs py-1.5 px-3 flex items-center gap-1">
                        <CheckCircle size={13} /> Selesai (Complete)
                      </button>
                    </>
                  )}
                  {order.status === "COMPLETED" && (
                    <button onClick={() => reopenOrder(order.id)} className="btn-ghost text-xs py-1.5 px-2.5 flex items-center gap-1 text-surface-500 hover:text-primary-600">
                      Buka Kembali
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-surface-100 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                  <div>
                    <h4 className="font-semibold text-xs text-surface-500 uppercase tracking-wider mb-3">Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-surface-500">Material Cost</span><span className="font-medium">Rp {(order.materialCost || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-surface-500">Labor Cost</span><span className="font-medium">Rp {(order.laborCost || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-surface-500">Total Cost</span><span className="font-bold">Rp {(order.totalCost || 0).toLocaleString()}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-surface-500 uppercase tracking-wider mb-3">Materials Issued ({order.materialIssues?.length || 0})</h4>
                    {order.materialIssues?.length > 0 ? (
                      <div className="space-y-1.5">
                        {order.materialIssues.map((m: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm p-2.5 bg-surface-50 rounded-xl">
                            <span className="text-surface-700">{m.materialItem?.name || "Material"}</span>
                            <span className="font-mono text-surface-600 font-medium">{m.quantityIssued}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-surface-400">No materials issued</p>}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-surface-500 uppercase tracking-wider mb-3">Work Orders ({order.workOrders?.length || 0})</h4>
                    {order.workOrders?.length > 0 ? (
                      <div className="space-y-1.5">
                        {order.workOrders.map((wo: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm p-2.5 bg-surface-50 rounded-xl">
                            <span className="font-mono text-surface-700">{wo.workOrderNumber}</span>
                            <span className={`status-badge text-[10px] ${wo.status === "COMPLETED" ? "status-completed" : wo.status === "IN_PROGRESS" ? "status-in-progress" : "status-planned"}`}>{wo.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-surface-400">No work orders</p>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">New Production Order</h3>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">{formError}</div>
            )}
            <div className="space-y-4">
              <div>
                <label className="label">Product <span className="text-red-500">*</span></label>
                <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className="input-field">
                  <option value="">Select a product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity <span className="text-red-500">*</span></label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                    className="input-field" min="1" />
                </div>
                <div>
                  <label className="label">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="select">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              {lines.length > 0 && (
                <div>
                  <label className="label">Production Line</label>
                  <select value={form.lineId} onChange={e => setForm({ ...form, lineId: e.target.value })} className="input-field">
                    <option value="">Auto-assign</option>
                    {lines.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Planned Start Date</label>
                  <input type="date" value={form.plannedStart} onChange={e => setForm({ ...form, plannedStart: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="label">Planned End Date</label>
                  <input type="date" value={form.plannedEnd} onChange={e => setForm({ ...form, plannedEnd: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="btn-secondary">Cancel</button>
              <button onClick={createOrder} disabled={saving} className="btn-primary flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {saving ? "Creating..." : "Create Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
