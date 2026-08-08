"use client";

import { useEffect, useState } from "react";
import {
  Package, Plus, Search, Eye, Layers, DollarSign,
  Grid, List, Trash2, Edit, X, RefreshCw
} from "lucide-react";

const PREDEFINED_CATEGORIES = [
  "Electronics", "Mechanical", "Chemical", "Textile", "Food & Beverage",
  "Automotive", "Medical", "Construction", "Packaging", "Raw Materials",
];

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const [form, setForm] = useState({
    name: "", sku: "", description: "", category: "", unit: "PCS",
    sellingPrice: 0, standardCost: 0, minStock: 0, maxStock: 0, reorderPoint: 0,
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/catalog");
      const json = await res.json();
      if (json.success) setProducts(json.data || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({
      name: "", sku: `PRD-${Math.floor(1000 + Math.random() * 9000)}`, description: "", category: "", unit: "PCS",
      sellingPrice: 0, standardCost: 0, minStock: 0, maxStock: 0, reorderPoint: 0,
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const openEdit = (product: any) => {
    setEditId(product.id);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      description: product.description || "",
      category: product.category || "",
      unit: product.unit || "PCS",
      sellingPrice: product.sellingPrice || 0,
      standardCost: product.standardCost || 0,
      minStock: product.minStock || 0,
      maxStock: product.maxStock || 0,
      reorderPoint: product.reorderPoint || 0,
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const saveProduct = async () => {
    const errors: string[] = [];
    if (!form.name) errors.push("Product name is required.");
    if (form.sellingPrice < 0) errors.push("Selling price cannot be negative.");
    if (form.standardCost < 0) errors.push("Standard cost cannot be negative.");
    if (errors.length > 0) { setFormErrors(errors); return; }

    setFormErrors([]);
    setSaving(true);
    try {
      const url = editId ? `/api/products/${editId}` : "/api/products/catalog";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setFormErrors([]);
        fetchProducts();
      } else {
        setFormErrors([json.message || json.error || "Failed to save product."]);
      }
    } catch (e) {
      setFormErrors(["Network error. Please try again."]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      setShowDeleteConfirm(null);
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredProducts = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  const allCategories = [...new Set([...PREDEFINED_CATEGORIES, ...categories])];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-xs text-surface-500 font-semibold">Loading product catalog...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Package size={22} className="text-primary-500" />
            Product Catalog
          </h1>
          <p className="page-subtitle">Manage product master data, categories, selling prices & standard costs</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-xs flex items-center gap-2">
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* Summary Stats with Icons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: products.length, icon: Package, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "Categories", value: categories.length, icon: Grid, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "With Active BOM", value: products.filter(p => p.bom?.length > 0).length, icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Avg Selling Price", value: `Rp ${products.length > 0 ? Math.round(products.reduce((s, p) => s + (p.sellingPrice || 0), 0) / products.length).toLocaleString() : 0}`, icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((s, i) => (
          <div key={i} className="stat-card flex items-center justify-between animate-in fade-in-up" style={{ animationDelay: `${i * 0.05}s` }}>
            <div>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={20} className={s.color} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search products by name, SKU or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-xs w-full"
          />
        </div>
        <div className="flex bg-surface-100 rounded-xl p-1">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-xs text-primary-600" : "text-surface-500"}`}>
            <Grid size={16} />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-xs text-primary-600" : "text-surface-500"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product, idx) => (
            <div
              key={product.id}
              className="card-static p-5 hover:border-primary-300 transition-all animate-in fade-in-up group flex flex-col justify-between"
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div>
                <div className="aspect-video bg-gradient-to-br from-primary-50/50 to-surface-100/80 rounded-2xl flex items-center justify-center mb-4 border border-surface-200/60 group-hover:border-primary-200 transition-colors">
                  <Package size={40} className="text-primary-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-surface-900 leading-snug text-sm">{product.name}</h3>
                    <p className="text-xs text-surface-400 font-mono mt-0.5">{product.sku}</p>
                  </div>
                  {product.category && (
                    <span className="bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {product.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-surface-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Selling Price:</span>
                  <span className="font-bold text-emerald-600">Rp {(product.sellingPrice || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-surface-400">Standard Cost:</span>
                  <span className="font-medium text-surface-700">Rp {(product.standardCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-4 pt-2 border-t border-surface-100">
                  <button onClick={() => setSelectedProduct(product)} className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1">
                    <Eye size={13} /> Detail
                  </button>
                  <button onClick={() => openEdit(product)} className="btn-icon w-8 h-8 text-surface-500 hover:text-primary-600 hover:bg-primary-50">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => setShowDeleteConfirm(product.id)} className="btn-icon w-8 h-8 text-surface-500 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="card-static p-0 overflow-hidden animate-in fade-in-up">
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs">Product</th>
                <th className="px-5 py-3.5 text-left text-xs">SKU</th>
                <th className="px-5 py-3.5 text-left text-xs">Category</th>
                <th className="px-5 py-3.5 text-right text-xs">Selling Price</th>
                <th className="px-5 py-3.5 text-right text-xs">Standard Cost</th>
                <th className="px-5 py-3.5 text-center text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-surface-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-500 flex-shrink-0">
                        <Package size={16} />
                      </div>
                      <span className="font-bold text-xs text-surface-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs font-bold text-primary-600">{product.sku}</td>
                  <td className="px-5 py-3.5 text-xs text-surface-600">{product.category || "—"}</td>
                  <td className="px-5 py-3.5 text-xs font-bold text-emerald-600 text-right">Rp {(product.sellingPrice || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-xs text-surface-600 text-right">Rp {(product.standardCost || 0).toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedProduct(product)} className="btn-icon w-7 h-7 text-surface-400 hover:text-surface-700">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openEdit(product)} className="btn-icon w-7 h-7 text-surface-400 hover:text-primary-600 hover:bg-primary-50">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(product.id)} className="btn-icon w-7 h-7 text-surface-400 hover:text-rose-600 hover:bg-rose-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in scale-in duration-300 border border-surface-200/80" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-surface-100 pb-3">
              <h3 className="text-base font-bold text-surface-900">{selectedProduct.name}</h3>
              <button onClick={() => setSelectedProduct(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-100"><span className="text-surface-400">SKU:</span> <p className="font-mono font-bold text-surface-900 mt-0.5">{selectedProduct.sku}</p></div>
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-100"><span className="text-surface-400">Category:</span> <p className="font-bold text-surface-900 mt-0.5">{selectedProduct.category || "N/A"}</p></div>
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-100"><span className="text-surface-400">Selling Price:</span> <p className="font-bold text-emerald-600 mt-0.5">Rp {(selectedProduct.sellingPrice || 0).toLocaleString()}</p></div>
                <div className="p-3 bg-surface-50 rounded-xl border border-surface-100"><span className="text-surface-400">Standard Cost:</span> <p className="font-bold text-surface-900 mt-0.5">Rp {(selectedProduct.standardCost || 0).toLocaleString()}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-6 animate-in scale-in duration-300 border border-surface-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <h3 className="text-base font-bold text-surface-900">{editId ? "Edit Product" : "New Product"}</h3>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={18} /></button>
            </div>

            {formErrors.length > 0 && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                {formErrors.map((err, i) => (
                  <p key={i} className="text-xs text-rose-600 font-semibold">{err}</p>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Product name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">SKU *</label>
                  <input type="text" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="input-field" placeholder="PRD-001" />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="select">
                    <option value="">Select category...</option>
                    {allCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Selling Price (Rp) *</label>
                  <input type="number" value={form.sellingPrice || ""} onChange={e => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} className="input-field" min="0" />
                </div>
                <div>
                  <label className="label">Standard Cost (Rp)</label>
                  <input type="number" value={form.standardCost || ""} onChange={e => setForm({ ...form, standardCost: parseFloat(e.target.value) || 0 })} className="input-field" min="0" />
                </div>
              </div>
              <div>
                <label className="label">Unit</label>
                <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="select">
                  <option value="PCS">Pieces (PCS)</option>
                  <option value="KG">Kilogram (KG)</option>
                  <option value="M">Meter (M)</option>
                  <option value="L">Liter (L)</option>
                  <option value="BOX">Box</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-surface-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary text-xs" disabled={saving}>Cancel</button>
              <button onClick={saveProduct} disabled={saving || !form.name} className="btn-primary text-xs flex items-center gap-2">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
                {saving ? "Saving..." : editId ? "Update Product" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in scale-in duration-300 border border-surface-200/80 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-3 text-rose-500">
              <Trash2 size={22} />
            </div>
            <h3 className="text-base font-bold text-surface-900 mb-1">Delete Product</h3>
            <p className="text-xs text-surface-500 mb-5">Are you sure you want to delete this product? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-danger text-xs">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
