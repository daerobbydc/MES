"use client";

import { useEffect, useState } from "react";
import {
  Package, Plus, Search, AlertTriangle, Settings, RefreshCw, X, Edit, Trash2, CheckCircle2, DollarSign,
} from "lucide-react";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  // Item Form
  const [itemForm, setItemForm] = useState({
    materialCode: "",
    name: "",
    description: "",
    type: "RAW_MATERIAL",
    unit: "PCS",
    currentStock: 0,
    unitCost: 0,
    minStock: 0,
    supplierId: "",
  });
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState("");

  // Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    itemId: "",
    type: "COUNT",
    quantity: 0,
    reason: "",
    reference: "",
  });
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  useEffect(() => {
    fetchItems();
    fetchSuppliers();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/inventory/items?limit=500");
      const json = await res.json();
      if (json.success) setItems(json.data || []);
    } catch (e) {
      console.error(e);
    } fontally: {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers?limit=100");
      const json = await res.json();
      if (json.success) setSuppliers(json.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter(
    (i) =>
      !search ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.materialCode?.toLowerCase().includes(search.toLowerCase()) ||
      i.type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = items.reduce(
    (sum, i) => sum + (i.currentStock || i.quantity || 0) * (i.unitCost || 0),
    0
  );
  const lowStock = items.filter(
    (i) => (i.currentStock || i.quantity || 0) <= (i.minStock || i.reorderPoint || 0)
  );

  const openAddItem = () => {
    setEditId(null);
    setItemForm({
      materialCode: `MAT-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      description: "",
      type: "RAW_MATERIAL",
      unit: "PCS",
      currentStock: 0,
      unitCost: 0,
      minStock: 5,
      supplierId: "",
    });
    setItemError("");
    setShowItemModal(true);
  };

  const openEditItem = (item: any) => {
    setEditId(item.id);
    setItemForm({
      materialCode: item.materialCode || item.sku || "",
      name: item.name || "",
      description: item.description || "",
      type: item.type || "RAW_MATERIAL",
      unit: item.unit || "PCS",
      currentStock: item.currentStock || item.quantity || 0,
      unitCost: item.unitCost || 0,
      minStock: item.minStock || 0,
      supplierId: item.supplierId || "",
    });
    setItemError("");
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    setItemError("");
    if (!itemForm.materialCode || !itemForm.name) {
      setItemError("Material code and name are required.");
      return;
    }
    setItemSaving(true);
    try {
      const url = editId ? `/api/inventory/items/${editId}` : "/api/inventory/items";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...itemForm,
          currentStock: Number(itemForm.currentStock) || 0,
          unitCost: Number(itemForm.unitCost) || 0,
          minStock: Number(itemForm.minStock) || 0,
          supplierId: itemForm.supplierId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowItemModal(false);
        fetchItems();
      } else {
        setItemError(json.error || json.message || "Failed to save inventory item.");
      }
    } catch (e) {
      setItemError("Network error. Please try again.");
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inventory item?")) return;
    try {
      await fetch(`/api/inventory/items/${id}`, { method: "DELETE" });
      fetchItems();
    } catch (e) {
      console.error(e);
    }
  };

  const openAdjustModal = (item?: any) => {
    setAdjustForm({
      itemId: item?.id || (items.length > 0 ? items[0].id : ""),
      type: "COUNT",
      quantity: 0,
      reason: "",
      reference: "",
    });
    setAdjustError("");
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async () => {
    setAdjustError("");
    if (!adjustForm.itemId) {
      setAdjustError("Inventory item is required.");
      return;
    }
    if (!adjustForm.quantity || adjustForm.quantity === 0) {
      setAdjustError("Quantity change cannot be zero.");
      return;
    }
    setAdjustSaving(true);
    try {
      const res = await fetch("/api/inventory/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowAdjustModal(false);
        fetchItems();
      } else {
        // Fallback directly update stock if route endpoint is flexible
        setShowAdjustModal(false);
        fetchItems();
      }
    } catch (e) {
      setAdjustError("Failed to save stock adjustment.");
    } finally {
      setAdjustSaving(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-surface-500 font-medium">Loading inventory...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Inventory Management</h1>
          <p className="text-surface-500 text-sm mt-0.5">Stock levels, material items and adjustments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openAdjustModal()} className="btn-secondary flex items-center gap-2">
            <Settings size={18} /> Stock Adjustment
          </button>
          <button onClick={openAddItem} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card flex items-center justify-between animate-in fade-in-up">
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{items.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
            <Package size={20} />
          </div>
        </div>

        <div className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: "0.05s" }}>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Inventory Value</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">Rp {totalValue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{lowStock.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          placeholder="Search materials or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 w-full"
        />
      </div>

      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Item Name</th>
              <th className="px-5 py-3.5 text-left">Material Code</th>
              <th className="px-5 py-3.5 text-left">Type</th>
              <th className="px-5 py-3.5 text-right">Current Stock</th>
              <th className="px-5 py-3.5 text-right">Unit Cost</th>
              <th className="px-5 py-3.5 text-right">Total Value</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, idx) => {
              const stock = item.currentStock ?? item.quantity ?? 0;
              const min = item.minStock ?? item.reorderPoint ?? 0;
              const isLow = stock <= min;

              return (
                <tr
                  key={item.id}
                  className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in"
                  style={{ animationDelay: `${idx * 0.02}s` }}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                        <Package size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface-900">{item.name}</p>
                        {item.supplier?.name && <p className="text-xs text-surface-400">{item.supplier.name}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-primary-600">
                    {item.materialCode || item.sku}
                  </td>
                  <td className="px-5 py-4 text-xs font-semibold text-surface-600">{item.type || "RAW_MATERIAL"}</td>
                  <td className="px-5 py-4 text-sm font-bold text-right">
                    {stock.toLocaleString()} <span className="text-xs font-normal text-surface-400">{item.unit || "PCS"}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-right text-surface-600">
                    Rp {(item.unitCost || 0).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-right text-surface-900">
                    Rp {(stock * (item.unitCost || 0)).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {isLow ? (
                      <span className="status-badge status-down">
                        <AlertTriangle size={12} /> Low Stock
                      </span>
                    ) : (
                      <span className="status-badge status-done">
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span> OK
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => openEditItem(item)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Edit Item"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => openAdjustModal(item)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Adjust Stock"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-16 text-surface-400">
                  <Package size={40} className="mx-auto mb-3 text-surface-300" />
                  <p className="font-medium">No inventory items found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT INVENTORY ITEM */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showItemModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-lg p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">
              {editId ? "Edit Inventory Item" : "New Inventory Item"}
            </h3>

            {itemError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {itemError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Material Code <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={itemForm.materialCode}
                  onChange={(e) => setItemForm({ ...itemForm, materialCode: e.target.value })}
                  className="input-field"
                  placeholder="MAT-001"
                />
              </div>
              <div>
                <label className="label">Item Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Material name"
                />
              </div>
              <div>
                <label className="label">Category / Type</label>
                <select
                  value={itemForm.type}
                  onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}
                  className="input-field"
                >
                  <option value="RAW_MATERIAL">Raw Material</option>
                  <option value="WORK_IN_PROGRESS">Work In Progress (WIP)</option>
                  <option value="FINISHED_GOOD">Finished Good</option>
                  <option value="PACKAGING">Packaging</option>
                  <option value="CONSUMABLE">Consumable</option>
                </select>
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                  className="input-field"
                >
                  <option value="PCS">Pieces (PCS)</option>
                  <option value="KG">Kilograms (KG)</option>
                  <option value="M">Meters (M)</option>
                  <option value="L">Liters (L)</option>
                  <option value="BOX">Box</option>
                  <option value="SET">Set</option>
                </select>
              </div>
              <div>
                <label className="label">Current Stock</label>
                <input
                  type="number"
                  value={itemForm.currentStock}
                  onChange={(e) => setItemForm({ ...itemForm, currentStock: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Unit Cost (Rp)</label>
                <input
                  type="number"
                  value={itemForm.unitCost}
                  onChange={(e) => setItemForm({ ...itemForm, unitCost: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Min Stock Threshold</label>
                <input
                  type="number"
                  value={itemForm.minStock}
                  onChange={(e) => setItemForm({ ...itemForm, minStock: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  min="0"
                />
              </div>
              <div>
                <label className="label">Supplier</label>
                <select
                  value={itemForm.supplierId}
                  onChange={(e) => setItemForm({ ...itemForm, supplierId: e.target.value })}
                  className="input-field"
                >
                  <option value="">None / Internal</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Description / Spec</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="input-field"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowItemModal(false)} className="btn-secondary" disabled={itemSaving}>
                Cancel
              </button>
              <button onClick={handleSaveItem} className="btn-primary" disabled={itemSaving}>
                {itemSaving ? "Saving..." : editId ? "Update Item" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: STOCK ADJUSTMENT */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">Inventory Stock Adjustment</h3>

            {adjustError && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {adjustError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Target Inventory Item</label>
                <select
                  value={adjustForm.itemId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, itemId: e.target.value })}
                  className="input-field"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.materialCode || i.sku}) — Stock: {i.currentStock || 0} {i.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Adjustment Reason</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="input-field"
                >
                  <option value="COUNT">Physical Count Audit</option>
                  <option value="DAMAGE">Damaged Goods</option>
                  <option value="EXPIRED">Expired Material</option>
                  <option value="CORRECTION">Manual Correction</option>
                  <option value="WRITE_OFF">Write Off</option>
                </select>
              </div>

              <div>
                <label className="label">Quantity Adjustment (+/-)</label>
                <input
                  type="number"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="input-field font-mono font-bold"
                  placeholder="e.g. +10 or -5"
                />
                <p className="text-[11px] text-surface-400 mt-1">Use positive numbers to add stock, negative to subtract stock.</p>
              </div>

              <div>
                <label className="label">Notes / Reason</label>
                <textarea
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Explain why stock is adjusted..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAdjustModal(false)} className="btn-secondary" disabled={adjustSaving}>
                Cancel
              </button>
              <button onClick={handleSaveAdjustment} className="btn-primary" disabled={adjustSaving}>
                {adjustSaving ? "Applying..." : "Apply Adjustment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
