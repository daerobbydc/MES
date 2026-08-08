"use client";

import { useEffect, useState } from "react";
import {
  Warehouse, Plus, Search, ArrowRightLeft, MapPin, Package, Settings, CheckCircle2, X, PlusCircle,
  Truck, Clock, CheckCircle,
} from "lucide-react";

export default function WarehousePage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"transfers" | "adjustments">("transfers");

  // Modal & Form State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [form, setForm] = useState({
    fromWarehouseId: "",
    toWarehouseId: "",
    notes: "",
  });
  const [transferItems, setTransferItems] = useState<{ materialCode: string; quantity: number; unit: string }[]>([]);
  const [itemDraft, setItemDraft] = useState({ materialCode: "", quantity: 1, unit: "PCS" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
    fetchDropdowns();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/warehouse/transfers");
      const json = await res.json();
      if (json.success) setTransfers(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [matRes] = await Promise.all([
        fetch("/api/inventory/items?limit=200"),
      ]);
      const matJson = await matRes.json();
      if (matJson.success) setMaterials(matJson.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addItemToTransfer = () => {
    if (!itemDraft.materialCode || itemDraft.quantity <= 0) return;
    setTransferItems([...transferItems, { ...itemDraft }]);
    setItemDraft({ materialCode: "", quantity: 1, unit: "PCS" });
  };

  const removeItem = (idx: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== idx));
  };

  const handleCreateTransfer = async () => {
    setError("");
    if (!form.fromWarehouseId || !form.toWarehouseId) {
      setError("Please select source and destination warehouses.");
      return;
    }
    if (form.fromWarehouseId === form.toWarehouseId) {
      setError("Source and destination warehouses cannot be the same.");
      return;
    }
    if (transferItems.length === 0) {
      setError("At least one item is required in the transfer.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/warehouse/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          notes: form.notes,
          items: transferItems,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowTransferModal(false);
        setForm({ fromWarehouseId: "", toWarehouseId: "", notes: "" });
        setTransferItems([]);
        fetchData();
      } else {
        setError(json.error || json.message || "Failed to create transfer.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReceiveTransfer = async (transferId: string) => {
    try {
      const res = await fetch("/api/warehouse/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive", transferId }),
      });
      const json = await res.json();
      if (json.success) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-surface-500 font-medium">Loading warehouse data...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Warehouse size={22} className="text-primary-500" />
            Warehouse Management
          </h1>
          <p className="page-subtitle">Stock transfers, warehouse routing, and location control</p>
        </div>
        <button onClick={() => setShowTransferModal(true)} className="btn-primary text-xs flex items-center gap-2">
          <Plus size={16} /> New Stock Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Transfers", value: transfers.length, color: "text-surface-900", bg: "bg-primary-50", iconText: "text-primary-600", icon: Truck },
          { label: "Pending Transfers", value: transfers.filter((t) => t.status === "PENDING").length, color: "text-amber-600", bg: "bg-amber-50", iconText: "text-amber-600", icon: Clock },
          { label: "Completed", value: transfers.filter((t) => t.status === "COMPLETED" || t.status === "RECEIVED").length, color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: CheckCircle },
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

      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Transfer #</th>
              <th className="px-5 py-3.5 text-left">From Warehouse</th>
              <th className="px-5 py-3.5 text-center">
                <ArrowRightLeft size={14} className="mx-auto text-surface-400" />
              </th>
              <th className="px-5 py-3.5 text-left">To Warehouse</th>
              <th className="px-5 py-3.5 text-right">Items / Qty</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t, idx) => (
              <tr
                key={t.id}
                className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in"
                style={{ animationDelay: `${idx * 0.02}s` }}
              >
                <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{t.transferNumber}</td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">
                  {t.fromWarehouse?.name || t.fromWarehouseId || "Main Store"}
                </td>
                <td className="px-5 py-4 text-center text-surface-400">
                  <ArrowRightLeft size={14} />
                </td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">
                  {t.toWarehouse?.name || t.toWarehouseId || "Secondary Store"}
                </td>
                <td className="px-5 py-4 text-sm font-bold text-right">
                  {t.items?.length || t.quantity || 1} item(s)
                </td>
                <td className="px-5 py-4 text-center">
                  <span
                    className={`status-badge ${
                      t.status === "COMPLETED" || t.status === "RECEIVED"
                        ? "status-done"
                        : t.status === "IN_TRANSIT"
                        ? "status-in-progress"
                        : "status-planned"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  {t.status === "PENDING" || t.status === "IN_TRANSIT" ? (
                    <button
                      onClick={() => handleReceiveTransfer(t.id)}
                      className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-200"
                    >
                      Receive Transfer
                    </button>
                  ) : (
                    <span className="text-xs text-surface-400 font-medium">Recorded</span>
                  )}
                </td>
              </tr>
            ))}

            {transfers.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-16 text-surface-400">
                  <Warehouse size={40} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-medium">No stock transfers found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE STOCK TRANSFER */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-lg p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">New Stock Transfer</h3>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From Warehouse / Location <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.fromWarehouseId}
                    onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}
                    className="input-field"
                    placeholder="e.g. WH-RAW-01"
                  />
                </div>
                <div>
                  <label className="label">To Warehouse / Location <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.toWarehouseId}
                    onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}
                    className="input-field"
                    placeholder="e.g. WH-FG-02"
                  />
                </div>
              </div>

              <div>
                <label className="label">Transfer Items <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={itemDraft.materialCode}
                    onChange={(e) => setItemDraft({ ...itemDraft, materialCode: e.target.value })}
                    className="input-field flex-1 text-xs"
                  >
                    <option value="">Select Item / Material...</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.materialCode || m.sku}>
                        {m.name} ({m.materialCode || m.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={itemDraft.quantity}
                    onChange={(e) => setItemDraft({ ...itemDraft, quantity: parseFloat(e.target.value) || 1 })}
                    className="input-field w-20 text-xs font-bold"
                    placeholder="Qty"
                  />
                  <button type="button" onClick={addItemToTransfer} className="btn-primary px-3 text-xs flex items-center gap-1">
                    <PlusCircle size={14} /> Add
                  </button>
                </div>

                {transferItems.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-surface-200 rounded-xl p-2 bg-surface-50">
                    {transferItems.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-surface-100">
                        <span className="font-bold text-surface-900 truncate">
                          {it.materialCode} &times; {it.quantity} {it.unit}
                        </span>
                        <button type="button" onClick={() => removeItem(idx)} className="text-surface-400 hover:text-red-500">
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-surface-400 italic">No transfer items added yet.</p>
                )}
              </div>

              <div>
                <label className="label">Notes / Instructions</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTransferModal(false)} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleCreateTransfer} className="btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create Transfer Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
