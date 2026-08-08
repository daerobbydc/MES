"use client";

import { useEffect, useState } from "react";
import {
  Users, Plus, Search, Edit, Trash2, Shield, Key, UserCheck, UserX, AlertTriangle,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200/50" },
  MANAGER: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200/50" },
  SUPERVISOR: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/50" },
  OPERATOR: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/50" },
  QUALITY_INSPECTOR: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200/50" },
  WAREHOUSE: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200/50" },
  PURCHASER: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200/50" },
  SALES: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200/50" },
  ACCOUNTANT: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200/50" },
};

const ROLES = ["ADMIN", "MANAGER", "SUPERVISOR", "OPERATOR", "QUALITY_INSPECTOR", "WAREHOUSE", "PURCHASER", "SALES", "ACCOUNTANT"];

const DEPARTMENTS = ["Production", "Quality", "Warehouse", "Purchasing", "Sales", "Accounting", "HR", "IT", "Maintenance", "Logistics"];

function getRoleBadge(role: string) {
  const colors = ROLE_COLORS[role] || { bg: "bg-surface-100", text: "text-surface-600", border: "border-surface-200/50" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
      <Shield size={12} />
      {role.replace(/_/g, " ")}
    </span>
  );
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: "", color: "bg-surface-200", width: "w-0" };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "w-1/3" };
  if (score <= 3) return { label: "Fair", color: "bg-amber-500", width: "w-2/3" };
  return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", confirmPassword: "", role: "OPERATOR", department: "Production" });
  const [addErrors, setAddErrors] = useState<string[]>([]);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "OPERATOR", department: "Production", isActive: true });
  const [resetForm, setResetForm] = useState({ newPassword: "" });

  const [saving, setSaving] = useState(false);

  const passwordStrength = getPasswordStrength(addForm.password);

  useEffect(() => { fetchUsers(); }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalUsers(json.pagination?.total || json.data.length);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const activeCount = users.filter(u => u.isActive).length;
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});
  const topRoles = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const handleAdd = async () => {
    const errors: string[] = [];
    if (!addForm.name) errors.push("Name is required.");
    if (!addForm.email) errors.push("Email is required.");
    else if (!isValidEmail(addForm.email)) errors.push("Please enter a valid email address.");
    if (!addForm.password) errors.push("Password is required.");
    if (addForm.password !== addForm.confirmPassword) errors.push("Passwords do not match.");
    if (addForm.password && addForm.password.length < 6) errors.push("Password must be at least 6 characters.");
    if (errors.length > 0) { setAddErrors(errors); return; }
    setAddErrors([]);
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addForm.name, email: addForm.email, password: addForm.password, role: addForm.role, department: addForm.department }),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        setShowAddModal(false);
        setAddForm({ name: "", email: "", password: "", confirmPassword: "", role: "OPERATOR", department: "Production" });
        fetchUsers();
      } else {
        setAddErrors([json.message || "Failed to create user."]);
      }
    } catch (e) { setAddErrors(["Network error. Please try again."]); } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    const errors: string[] = [];
    if (!editForm.name) errors.push("Name is required.");
    if (!editForm.email) errors.push("Email is required.");
    else if (!isValidEmail(editForm.email)) errors.push("Please enter a valid email address.");
    if (errors.length > 0) { setAddErrors(errors); return; }
    setAddErrors([]);
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (res.ok && json.success !== false) {
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        setAddErrors([json.message || "Failed to update user."]);
      }
    } catch (e) { setAddErrors(["Network error. Please try again."]); } finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetForm.newPassword }),
      });
      if (res.ok) { setShowResetModal(false); setSelectedUser(null); setResetForm({ newPassword: "" }); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: "DELETE" });
      if (res.ok) { setShowDeleteModal(false); setSelectedUser(null); fetchUsers(); }
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, department: user.department, isActive: user.isActive });
    setAddErrors([]);
    setShowEditModal(true);
  };

  const openReset = (user: User) => { setSelectedUser(user); setResetForm({ newPassword: "" }); setShowResetModal(true); };
  const openDelete = (user: User) => { setSelectedUser(user); setShowDeleteModal(true); };

  const handleStatusToggle = () => {
    if (!selectedUser) return;
    setShowStatusConfirm(true);
  };

  const confirmStatusToggle = () => {
    setEditForm({ ...editForm, isActive: !editForm.isActive });
    setShowStatusConfirm(false);
  };

  const filtered = users.filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="text-sm text-surface-500 font-medium">Loading users...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={22} className="text-primary-500" />
            User Management
          </h1>
          <p className="page-subtitle">Manage system users, roles, permissions and security access</p>
        </div>
        <button onClick={() => { setShowAddModal(true); setAddErrors([]); }} className="btn-primary text-xs flex items-center gap-2">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers, color: "text-surface-900", bg: "bg-primary-50", iconText: "text-primary-600", icon: Users },
          { label: "Active", value: activeCount, color: "text-emerald-600", bg: "bg-emerald-50", iconText: "text-emerald-600", icon: UserCheck },
          ...topRoles.map(([role, count]) => ({
            label: role.replace(/_/g, " "),
            value: count,
            color: ROLE_COLORS[role]?.text || "text-surface-600",
            bg: "bg-surface-100",
            iconText: "text-surface-500",
            icon: Shield,
          })),
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
        <input type="text" placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-10 w-full" />
      </div>

      <div className="card-static overflow-hidden animate-in fade-in-up" style={{ animationDelay: "0.2s" }}>
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="px-5 py-3.5 text-left">Name</th>
              <th className="px-5 py-3.5 text-left">Email</th>
              <th className="px-5 py-3.5 text-center">Role</th>
              <th className="px-5 py-3.5 text-left">Department</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-left">Last Login</th>
              <th className="px-5 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => (
              <tr key={user.id} className="border-b border-surface-100/50 hover:bg-surface-50/60 transition-colors animate-in fade-in" style={{ animationDelay: `${idx * 0.02}s` }}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-surface-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-surface-600">{user.email}</td>
                <td className="px-5 py-4 text-center">{getRoleBadge(user.role)}</td>
                <td className="px-5 py-4 text-sm font-medium text-surface-800">{user.department}</td>
                <td className="px-5 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    user.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50" : "bg-surface-100 text-surface-500 border border-surface-200/50"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-surface-400"}`}></span>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-surface-500">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(user)} className="btn-icon" title="Edit">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => openReset(user)} className="btn-icon" title="Reset Password">
                      <Key size={16} />
                    </button>
                    <button onClick={() => openDelete(user)} className="btn-icon text-rose-500 hover:text-rose-700 hover:bg-rose-50/80" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-16 text-surface-400">
                <Users size={40} className="mx-auto mb-3 text-surface-300" />
                <p className="font-medium">No users found</p>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-surface-500 font-medium px-3">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5 flex items-center gap-2">
              <UserCheck size={20} className="text-primary-500" /> Add New User
            </h3>
            {addErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                {addErrors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600 font-medium">{err}</p>
                ))}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="input-field" placeholder="Enter full name" />
              </div>
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className="input-field" placeholder="Enter email address" />
              </div>
              <div>
                <label className="label">Password <span className="text-red-500">*</span></label>
                <input type="password" value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} className="input-field" placeholder="Enter password" />
                {addForm.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}></div>
                      </div>
                      <span className={`text-xs font-semibold ${passwordStrength.color === "bg-red-500" ? "text-red-600" : passwordStrength.color === "bg-amber-500" ? "text-amber-600" : "text-emerald-600"}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Confirm Password <span className="text-red-500">*</span></label>
                <input type="password" value={addForm.confirmPassword} onChange={e => setAddForm({ ...addForm, confirmPassword: e.target.value })} className="input-field" placeholder="Confirm password" />
                {addForm.confirmPassword && addForm.password !== addForm.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500 font-medium">Passwords do not match</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} className="select">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select value={addForm.department} onChange={e => setAddForm({ ...addForm, department: e.target.value })} className="select">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setAddErrors([]); }} className="btn-secondary">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !addForm.name || !addForm.email || !addForm.password} className="btn-primary flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-5 flex items-center gap-2">
              <Edit size={20} className="text-primary-500" /> Edit User
            </h3>
            {addErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                {addErrors.map((err, i) => (
                  <p key={i} className="text-sm text-red-600 font-medium">{err}</p>
                ))}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="select">
                    {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Department</label>
                  <select value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="select">
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="label mb-0">Status</label>
                <button type="button" onClick={handleStatusToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${editForm.isActive ? "bg-emerald-500" : "bg-surface-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${editForm.isActive ? "translate-x-6" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-surface-600">{editForm.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); setAddErrors([]); }} className="btn-secondary">Cancel</button>
              <button onClick={handleEdit} disabled={saving || !editForm.name || !editForm.email} className="btn-primary flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusConfirm && selectedUser && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-sm p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-3 flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" /> Confirm Status Change
            </h3>
            <p className="text-sm text-surface-600 mb-1">
              Are you sure you want to set <span className="font-semibold text-surface-900">{selectedUser.name}</span> as
            </p>
            <p className={`text-sm font-bold mb-5 ${editForm.isActive ? "text-emerald-600" : "text-surface-500"}`}>
              {editForm.isActive ? "Active" : "Inactive"}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowStatusConfirm(false)} className="btn-secondary">Cancel</button>
              <button onClick={confirmStatusToggle} className="btn-primary">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-2 flex items-center gap-2">
              <Key size={20} className="text-amber-500" /> Reset Password
            </h3>
            <p className="text-sm text-surface-500 mb-5">Set a new password for <span className="font-semibold text-surface-700">{selectedUser.name}</span></p>
            <div>
              <label className="label">New Password</label>
              <input type="password" value={resetForm.newPassword} onChange={e => setResetForm({ newPassword: e.target.value })} className="input-field" placeholder="Enter new password" />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowResetModal(false); setSelectedUser(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleResetPassword} disabled={saving || !resetForm.newPassword} className="btn-primary">
                {saving ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-float w-full max-w-md p-7 animate-in scale-in duration-300 border border-white/60">
            <h3 className="text-lg font-bold text-surface-900 mb-2 flex items-center gap-2">
              <UserX size={20} className="text-rose-500" /> Delete User
            </h3>
            <p className="text-sm text-surface-500 mb-1">
              Are you sure you want to delete <span className="font-semibold text-surface-700">{selectedUser.name}</span>?
            </p>
            <p className="text-sm text-rose-500 font-medium">This action cannot be undone.</p>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="btn-danger">
                {saving ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
