"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList, Plus, Search, ChevronDown, ChevronRight,
  Play, CheckCircle, Clock, Pause, Package, Users, Eye, X, RefreshCw
} from "lucide-react";

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ productName: "", productId: "", quantity: 1, priority: "MEDIUM", assignedTo: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchOrders(); fetchProducts(); fetchUsers(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
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

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users?limit=100");
      const json = await res.json();
      if (json.success) setUsers(json.data);
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
          productId: form.productId,
          quantity: Number(form.quantity),
          priority: form.priority,
          assignedTo: form.assignedTo || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ productName: "", productId: "", quantity: 1, priority: "MEDIUM", assignedTo: "" });
        fetchOrders();
      } else {
        setFormError(json.message || "Failed to create work order.");
      }
    } catch (e) { setFormError("Network error. Please try again."); } finally { setSaving(false); }
  };

  const startWork = async (orderId: string) => {
    await fetch(`/api/production/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
    fetchOrders();
  };

  const holdOrder = async (orderId: string) => {
    await fetch(`/api/production/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "hold" }) });
    fetchOrders();
  };

  const completeOrder = async (orderId: string) => {
    await fetch(`/api/production/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) });
    fetchOrders();
  };

  const reopenOrder = async (orderId: string) => {
    await fetch(`/api/production/orders/${orderId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reopen" }) });
    fetchOrders();
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = !search || o.orderNumber?.toLowerCase().includes(search.toLowerCase()) || o.product?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadge = (s: string) => {
    switch (s) {
      case "PLANNED": return "status-planned";
      case "IN_PROGRESS": return "status-in-progress";
      case "COMPLETED": return "status-completed";
      case "ON_HOLD": return "status-idle";
      case "CANCELLED": return "status-down";
      default: return "status-planned";
    }
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
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-xs text-surface-500 font-semibold">Loading Work Orders...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList size={22} className="text-primary-500" />
            Production Work Orders
          </h1>
          <p className="page-subtitle">Manage shop floor execution, dispatching, and material tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-xs flex items-center gap-2">
          <Plus size={16} /> New Work Order
        </button>
      </div>

      {/* KPI Cards with Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: stats.total, color: "text-surface-900", bg: "bg-surface-100", iconText: "text-surface-700", icon: ClipboardList },
          { label: "Planned", value: stats.planned, color: "text-surface-600", bg: "bg-surface-100", iconText: "text-surface-600", icon: Clock },
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
      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search order number or product name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-xs w-full"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select w-auto text-xs">
          <option value="ALL">All Status</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Work Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 && (
          <div className="card-static text-center py-16">
            <ClipboardList size={36} className="mx-auto text-surface-300 mb-3" />
            <p className="font-semibold text-surface-600">No work orders found</p>
            <p className="text-xs text-surface-400 mt-1">Try adjusting search or status filters</p>
          </div>
        )}
        {filteredOrders.map(order => {
          const isExpanded = expandedOrder === order.id;
          const progress = order.quantity > 0 ? ((order.completedQty || 0) / order.quantity) * 100 : 0;
          return (
            <div key={order.id} className="card-static hover:border-surface-300 transition-all">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                <div className="text-surface-400 hover:text-surface-700">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-sm text-surface-900">{order.orderNumber}</span>
                    <span className={`status-badge text-[10px] ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.priority === "HIGH" || order.priority === "URGENT" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      order.priority === "MEDIUM" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-surface-100 text-surface-600"
                    }`}>
                      {order.priority || "MEDIUM"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-surface-500 flex-wrap">
                    <span className="font-semibold text-surface-700">{order.product?.name || "—"}</span>
                    <span>Qty: {order.quantity} pcs</span>
                    <span>Due: {new Date(order.plannedEnd || order.plannedStart || Date.now()).toLocaleDateString("id-ID")}</span>
                    {order.assignedTo && (
                      <span className="flex items-center gap-1 text-surface-600"><Users size={12} /> {order.assignedTo.name}</span>
                    )}
                  </div>
                </div>

                <div className="w-36 flex-shrink-0">
                  <div className="flex justify-between text-[10px] text-surface-500 font-semibold mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill bg-primary-500" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-right text-surface-400 mt-1 font-mono">{order.completedQty || 0} / {order.quantity}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {(order.status === "PLANNED" || order.status === "RELEASED") && (
                    <button onClick={(e) => { e.stopPropagation(); startWork(order.id); }} className="btn-primary text-xs flex items-center gap-1.5">
                      <Play size={13} /> Mulai (Start)
                    </button>
                  )}
                  {order.status === "IN_PROGRESS" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); holdOrder(order.id); }} className="btn-secondary text-xs flex items-center gap-1 text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100">
                        <Pause size={13} /> Tahan (Hold)
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); completeOrder(order.id); }} className="btn-success text-xs flex items-center gap-1.5">
                        <CheckCircle size={13} /> Selesai (Complete)
                      </button>
                    </>
                  )}
                  {order.status === "ON_HOLD" && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); startWork(order.id); }} className="btn-primary text-xs flex items-center gap-1.5">
                        <Play size={13} /> Lanjutkan (Resume)
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); completeOrder(order.id); }} className="btn-success text-xs flex items-center gap-1.5">
                        <CheckCircle size={13} /> Selesai (Complete)
                      </button>
                    </>
                  )}
                  {order.status === "COMPLETED" && (
                    <button onClick={(e) => { e.stopPropagation(); reopenOrder(order.id); }} className="btn-ghost text-xs flex items-center gap-1 text-surface-500 hover:text-primary-600">
                      Buka Kembali
                    </button>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-surface-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-bold text-xs text-surface-800 mb-2 uppercase tracking-wider">
                        Material Issues ({order.materialIssues?.length || 0})
                      </h4>
                      {order.materialIssues?.length > 0 ? (
                        <div className="space-y-1.5">
                          {order.materialIssues.map((m: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs p-2.5 rounded-xl bg-surface-50 border border-surface-100">
                              <span className="font-medium text-surface-700">{m.materialItem?.name || "Material"}</span>
                              <span className="font-mono font-bold text-surface-900">{m.quantityIssued} {m.materialItem?.unit}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-surface-400 italic">No materials issued yet</p>}
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-surface-800 mb-2 uppercase tracking-wider">
                        Activity Log ({order.shopFloorLogs?.length || 0})
                      </h4>
                      {order.shopFloorLogs?.length > 0 ? (
                        <div className="space-y-1.5">
                          {order.shopFloorLogs.slice(0, 5).map((l: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-surface-50 border border-surface-100">
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  l.logType === "OUTPUT" ? "bg-emerald-500" : l.logType === "SCRAP" ? "bg-rose-500" : "bg-amber-500"
                                }`} />
                                <span className="font-semibold text-surface-700">{l.logType}: {l.goodCount || 0} good / {l.scrapCount || 0} scrap</span>
                              </div>
                              <span className="text-surface-400 text-[10px]">{new Date(l.timestamp).toLocaleTimeString("id-ID")}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-surface-400 italic">No activity logged yet</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-surface-200/80 p-6 w-full max-w-md">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <h3 className="text-base font-bold text-surface-900">New Work Order</h3>
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-semibold">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Target Product *</label>
                <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className="select">
                  <option value="">Select a product...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Target Quantity *</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min="1"
                  />
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

              <div>
                <label className="label">Assigned Operator (optional)</label>
                <select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })} className="select">
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-surface-100">
              <button onClick={() => { setShowModal(false); setFormError(""); }} className="btn-secondary text-xs">
                Cancel
              </button>
              <button onClick={createOrder} disabled={saving} className="btn-primary text-xs flex items-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
                {saving ? "Creating..." : "Create Work Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
