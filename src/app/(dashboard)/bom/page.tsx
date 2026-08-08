"use client";

import { useEffect, useState } from "react";
import {
  Layers, Plus, Search, ChevronDown, ChevronRight, Package, Trash2, X, PlusCircle, AlertCircle,
} from "lucide-react";

export default function BomPage() {
  const [boms, setBoms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedBom, setExpandedBom] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  // BOM Form State
  const [form, setForm] = useState({
    productId: "",
    version: "1.0",
    description: "",
    isDefault: true,
  });

  const [items, setItems] = useState<
    { materialCode: string; materialName: string; quantity: number; unit: string; unitCost: number }[]
  >([]);

  const [lineDraft, setLineDraft] = useState({
    materialCode: "",
    materialName: "",
    quantity: 1,
    unit: "PCS",
    unitCost: 0,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBoms();
    fetchDropdowns();
  }, []);

  const fetchBoms = async () => {
    try {
      const res = await fetch("/api/bom");
      const json = await res.json();
      if (json.success) setBoms(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [prodRes, matRes] = await Promise.all([
        fetch("/api/products/catalog"),
        fetch("/api/inventory/items?limit=200"),
      ]);
      const prodJson = await prodRes.json();
      const matJson = await matRes.json();
      if (prodJson.success) setProducts(prodJson.data || []);
      if (matJson.success) setMaterials(matJson.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const addLineItem = () => {
    if (!lineDraft.materialCode || !lineDraft.materialName || lineDraft.quantity <= 0) {
      return;
    }
    setItems([...items, { ...lineDraft }]);
    setLineDraft({ materialCode: "", materialName: "", quantity: 1, unit: "PCS", unitCost: 0 });
  };

  const removeLineItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleCreateBom = async () => {
    setError("");
    if (!form.productId) {
      setError("Please select a target product.");
      return;
    }
    if (items.length === 0) {
      setError("At least one component material is required in the BOM.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({
            materialCode: i.materialCode,
            materialName: i.materialName,
            quantity: Number(i.quantity) || 1,
            unit: i.unit || "PCS",
            unitCost: Number(i.unitCost) || 0,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ productId: "", version: "1.0", description: "", isDefault: true });
        setItems([]);
        fetchBoms();
      } else {
        setError(json.error || json.message || "Failed to create BOM.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this BOM?")) return;
    try {
      await fetch(`/api/bom/${id}`, { method: "DELETE" });
      fetchBoms();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = boms.filter(
    (b) => !search || b.product?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          <p className="text-sm text-surface-500 font-medium">Loading BOMs...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Layers size={22} className="text-primary-500" />
            Bill of Materials (BOM)
          </h1>
          <p className="page-subtitle">Product component structures and material breakdowns</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary text-xs flex items-center gap-2">
          <Plus size={16} /> New BOM Structure
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card flex items-center justify-between animate-in fade-in-up">
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total BOMs</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{boms.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
            <Layers size={20} />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: "0.05s" }}>
          <div>
            <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">Total Active Components</p>
            <p className="text-2xl font-bold text-primary-600 mt-1">
              {boms.reduce((sum, b) => sum + (b.items?.length || 0), 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Package size={20} />
          </div>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="text"
          placeholder="Search BOMs by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10 w-full"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((bom, idx) => {
          const isExpanded = expandedBom === bom.id;
          return (
            <div
              key={bom.id}
              className="card-static overflow-hidden animate-in fade-in-up"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div
                className="flex items-center gap-4 cursor-pointer p-2"
                onClick={() => setExpandedBom(isExpanded ? null : bom.id)}
              >
                <div className="text-surface-400 transition-transform duration-200">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Layers size={18} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-surface-900">{bom.product?.name || "Unknown Product"}</p>
                  <p className="text-xs text-surface-400">
                    Version {bom.version || "1.0"} • {bom.items?.length || 0} component items
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-badge ${bom.isDefault ? "status-done" : "status-planned"}`}>
                    {bom.isDefault ? "Default" : `v${bom.version || "1.0"}`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBom(bom.id);
                    }}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-surface-100 animate-in fade-in duration-300">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                        <th className="text-left px-4 py-2">Material / Component</th>
                        <th className="text-left px-4 py-2">Code</th>
                        <th className="text-right px-4 py-2">Quantity</th>
                        <th className="text-right px-4 py-2">Unit</th>
                        <th className="text-right px-4 py-2">Unit Cost</th>
                        <th className="text-right px-4 py-2">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bom.items?.map((item: any, i: number) => (
                        <tr key={i} className="border-t border-surface-50 hover:bg-surface-50/60 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-surface-800">
                            {item.materialName || item.materialCode}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-surface-500">{item.materialCode}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold font-mono">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right text-surface-600">{item.unit}</td>
                          <td className="px-4 py-3 text-sm text-right">Rp {(item.unitCost || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right font-bold">
                            Rp {((item.quantity || 0) * (item.unitCost || 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {(!bom.items || bom.items.length === 0) && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-surface-400 text-sm">
                            No components defined for this BOM
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="card-static text-center py-16 text-surface-400">
            <Layers size={40} className="mx-auto mb-3 text-surface-300" />
            <p className="font-medium">No BOMs found</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE BOM */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-xl p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">Create Bill of Materials (BOM)</h3>

            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Target Finished Product <span className="text-red-500">*</span></label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">BOM Version</label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 1.0"
                  />
                </div>
                <div>
                  <label className="label">Default Version?</label>
                  <select
                    value={form.isDefault ? "YES" : "NO"}
                    onChange={(e) => setForm({ ...form, isDefault: e.target.value === "YES" })}
                    className="input-field"
                  >
                    <option value="YES">Yes (Default BOM)</option>
                    <option value="NO">No</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Add Component Materials <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <select
                    value={lineDraft.materialCode}
                    onChange={(e) => {
                      const mat = materials.find((m) => (m.materialCode || m.sku) === e.target.value);
                      setLineDraft({
                        ...lineDraft,
                        materialCode: e.target.value,
                        materialName: mat?.name || e.target.value,
                        unit: mat?.unit || "PCS",
                        unitCost: mat?.unitCost || 0,
                      });
                    }}
                    className="input-field flex-1 text-xs"
                  >
                    <option value="">Select Material...</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.materialCode || m.sku}>
                        {m.name} ({m.materialCode || m.sku})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={lineDraft.quantity}
                    onChange={(e) => setLineDraft({ ...lineDraft, quantity: parseFloat(e.target.value) || 1 })}
                    className="input-field w-20 text-xs font-bold"
                    placeholder="Qty"
                  />
                  <button type="button" onClick={addLineItem} className="btn-primary px-3 text-xs flex items-center gap-1">
                    <PlusCircle size={14} /> Add
                  </button>
                </div>

                {items.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto border border-surface-200 rounded-xl p-2 bg-surface-50">
                    {items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-surface-100">
                        <span className="font-bold text-surface-900 truncate">
                          {it.materialName} ({it.materialCode}) &times; {it.quantity} {it.unit}
                        </span>
                        <button type="button" onClick={() => removeLineItem(idx)} className="text-surface-400 hover:text-red-500">
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-surface-400 italic">No component materials added yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleCreateBom} className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Create BOM Structure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}