"use client";

import { useEffect, useState } from "react";
import {
  Building2, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, Star,
} from "lucide-react";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "", name: "", contact: "", phone: "", email: "", address: "",
    taxNumber: "", paymentTerms: "30",
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (json.success) setSuppliers(json.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filtered = suppliers.filter(s =>
    !search ||
    s.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === "ACTIVE").length,
    avgPaymentTerms: suppliers.length > 0
      ? Math.round(suppliers.reduce((sum, s) => sum + (s.paymentTerms || 0), 0) / suppliers.length)
      : 0,
  };

  const openAdd = () => {
    setEditId(null);
    setForm({
      code: "", name: "", contact: "", phone: "", email: "", address: "",
      taxNumber: "", paymentTerms: "30",
    });
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      code: s.code || "", name: s.name || "", contact: s.contact || "",
      phone: s.phone || "", email: s.email || "", address: s.address || "",
      taxNumber: s.taxNumber || "", paymentTerms: s.paymentTerms?.toString() || "30",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const method = editId ? "PUT" : "POST";
      const url = editId ? `/api/suppliers/${editId}` : "/api/suppliers";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, paymentTerms: Number(form.paymentTerms) || 30 }),
      });
      setShowModal(false);
      fetchSuppliers();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      setShowDeleteConfirm(null);
      fetchSuppliers();
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading suppliers...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Building2 size={22} className="text-primary-500" />
            Suppliers
          </h1>
          <p className="page-subtitle">Manage your supplier directory, contacts and payment terms</p>
        </div>
        <button onClick={openAdd} className="btn-primary text-xs flex items-center gap-2">
          <Plus size={16} /> New Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Suppliers", value: stats.total, color: "text-surface-900", bg: "bg-primary-50", iconText: "text-primary-600", icon: Building2 },
          { label: "Active", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: Building2 },
          { label: "Avg Payment Terms", value: `${stats.avgPaymentTerms} days`, color: "text-primary-600", bg: "bg-amber-50", iconText: "text-amber-600", icon: Star },
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
        <input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)}
          className="input-field pl-10 w-full" />
      </div>

      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Code</th>
              <th className="px-5 py-3.5 text-left">Name</th>
              <th className="px-5 py-3.5 text-left">Contact</th>
              <th className="px-5 py-3.5 text-left">Phone</th>
              <th className="px-5 py-3.5 text-left">Email</th>
              <th className="px-5 py-3.5 text-center">Payment Terms</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => (
              <tr key={s.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                <td className="px-5 py-4 font-mono text-sm font-bold text-primary-600">{s.code}</td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">{s.name}</td>
                <td className="px-5 py-4 text-sm text-surface-600">{s.contact || "-"}</td>
                <td className="px-5 py-4 text-sm text-surface-600">
                  <div className="flex items-center gap-1.5"><Phone size={13} className="text-surface-400" /> {s.phone || "-"}</div>
                </td>
                <td className="px-5 py-4 text-sm text-surface-600">
                  <div className="flex items-center gap-1.5"><Mail size={13} className="text-surface-400" /> {s.email || "-"}</div>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-surface-700 text-center">{s.paymentTerms || 30} days</td>
                <td className="px-5 py-4 text-center">
                  <span className={`status-badge ${
                    s.status === "ACTIVE" ? "status-done" :
                    s.status === "INACTIVE" ? "status-idle" : "status-planned"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {s.status || "ACTIVE"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(s)} className="p-2 rounded-xl text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-all">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => setShowDeleteConfirm(s.id)} className="p-2 rounded-xl text-surface-400 hover:text-red-600 hover:bg-red-50 transition-all">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-surface-400">
                <Building2 size={40} className="mx-auto mb-3 text-surface-300" />
                <p className="font-medium">No suppliers found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-lg p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5">{editId ? "Edit Supplier" : "New Supplier"}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Code</label>
                <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="SUP-001" />
              </div>
              <div>
                <label className="label">Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Supplier name" />
              </div>
              <div>
                <label className="label">Contact Person</label>
                <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="input-field" placeholder="Contact name" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="Phone number" />
              </div>
              <div className="col-span-2">
                <label className="label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="email@example.com" />
              </div>
              <div className="col-span-2">
                <label className="label">Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input-field" placeholder="Full address" />
              </div>
              <div>
                <label className="label">Tax Number</label>
                <input value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} className="input-field" placeholder="Tax ID" />
              </div>
              <div>
                <label className="label">Payment Terms (days)</label>
                <input type="number" value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })} className="input-field" placeholder="30" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} className="btn-primary">{editId ? "Update" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-sm p-7 animate-in scale-in duration-300 border border-white/60 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-2">Delete Supplier</h3>
            <p className="text-sm text-surface-500 mb-6">Are you sure you want to delete this supplier? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-primary bg-red-600 hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
